import type {Pool,PoolClient} from "pg";

export class SubscriptionActivationError extends Error {
 constructor(readonly code:"PAYMENT_NOT_VERIFIED"|"PAYMENT_MISMATCH"|"SUBSCRIPTION_UNAVAILABLE"|"PAYMENT_ALREADY_ASSIGNED"){
  super(code);
  this.name="SubscriptionActivationError";
 }
}

/**
 * Activates a subscription only from a payment row already marked successful
 * and verified by a trusted server-side provider adapter. Never expose this
 * function through a learner-controlled HTTP route.
 */
export async function activateVerifiedSubscriptionPayment(pool:Pool,paymentTransactionId:string){
 const client:PoolClient=await pool.connect();
 try{
  await client.query("BEGIN");
  const payment=await client.query<{
   payment_id:string;subscription_id:string;user_id:string;provider_code:string;
   provider_event_id:string|null;status:string;verified_at:Date|null;
   amount_minor:string;currency:string;plan_code:string;billing_interval:string;
   price_amount_minor:string;price_currency:string;current_period_start:Date|null;current_period_end:Date|null;
   subscription_status:string;
  }>(`
   SELECT pt.id AS payment_id,pt.subscription_id,s.user_id,pt.provider_code,
    pt.provider_event_id,pt.status,pt.verified_at,pt.amount_minor::text,pt.currency,
    sp.code AS plan_code,rp.billing_interval,rp.amount_minor::text AS price_amount_minor,
    rp.currency AS price_currency,s.current_period_start,s.current_period_end,s.status AS subscription_status
   FROM payment_transactions pt
   JOIN subscriptions s ON s.id=pt.subscription_id
   JOIN subscription_plans sp ON sp.id=s.plan_id
   JOIN regional_prices rp ON rp.id=s.regional_price_id AND rp.plan_id=sp.id
   WHERE pt.id=$1
   FOR UPDATE OF pt,s
  `,[paymentTransactionId]);
  const row=payment.rows[0];
  if(!row||row.status!=="succeeded"||!row.verified_at||!row.provider_event_id){
   throw new SubscriptionActivationError("PAYMENT_NOT_VERIFIED");
  }
  if(row.amount_minor!==row.price_amount_minor||row.currency.trim()!==row.price_currency.trim()||
    (row.plan_code==="monthly"&&row.billing_interval!=="month")||
    (row.plan_code==="yearly"&&row.billing_interval!=="year")||
    !["monthly","yearly"].includes(row.plan_code)){
   throw new SubscriptionActivationError("PAYMENT_MISMATCH");
  }
  const existing=await client.query<{id:string;period_start:Date;period_end:Date}>(
   "SELECT id,period_start,period_end FROM subscription_entitlements WHERE payment_transaction_id=$1 OR (provider_code=$2 AND provider_event_id=$3) FOR UPDATE",
   [row.payment_id,row.provider_code,row.provider_event_id]
  );
  if(existing.rows[0]){
   if(existing.rows[0].id){
    await client.query("COMMIT");
    return {entitlement_id:existing.rows[0].id,period_start:existing.rows[0].period_start,period_end:existing.rows[0].period_end,idempotent:true};
   }
  }
  if(row.subscription_status!=="pending"&&row.subscription_status!=="active"){
   throw new SubscriptionActivationError("SUBSCRIPTION_UNAVAILABLE");
  }
  const verifiedAt=row.verified_at;
  // Early manual renewals preserve the remaining paid time instead of overwriting it.
  const currentPeriodEnd=row.current_period_end;
  const periodStart=currentPeriodEnd&&currentPeriodEnd.getTime()>verifiedAt.getTime()?currentPeriodEnd:verifiedAt;
  const days=row.plan_code==="monthly"?30:360;
  const inserted=await client.query<{id:string;period_start:Date;period_end:Date}>(`
   INSERT INTO subscription_entitlements(
    user_id,subscription_id,payment_transaction_id,provider_code,provider_event_id,
    plan_code,currency,standard_amount_minor,discount_amount_minor,paid_amount_minor,
    period_start,period_end,verified_payment_at
   )
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,$8,$9::timestamptz,$9::timestamptz+($10::integer*interval '1 day'),$9::timestamptz)
   RETURNING id,period_start,period_end
  `,[row.user_id,row.subscription_id,row.payment_id,row.provider_code,row.provider_event_id,row.plan_code,row.currency,row.amount_minor,periodStart,String(days)]);
  const entitlement=inserted.rows[0]!;
  await client.query(
   "UPDATE subscriptions SET status='active',current_period_start=$2,current_period_end=$3 WHERE id=$1",
   [row.subscription_id,entitlement.period_start,entitlement.period_end]
  );
  await client.query("COMMIT");
  return {entitlement_id:entitlement.id,period_start:entitlement.period_start,period_end:entitlement.period_end,idempotent:false};
 }catch(error){
  await client.query("ROLLBACK");
  if(error instanceof SubscriptionActivationError)throw error;
  // A duplicate provider event/payment race is resolved by the idempotent retry.
  if((error as {code?:string})?.code==="23505")throw new SubscriptionActivationError("PAYMENT_ALREADY_ASSIGNED");
  throw error;
 }finally{client.release();}
}
