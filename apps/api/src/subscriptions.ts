import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";

type ActiveEntitlement={
 id:string;
 plan_code:"monthly"|"yearly";
 currency:string;
 standard_amount_minor:string;
 discount_amount_minor:string;
 paid_amount_minor:string;
 period_start:Date;
 period_end:Date;
 verified_payment_at:Date;
};

/** Server-side entitlement lookup. Paid routes must call this; never accept client flags. */
export async function getActiveSubscriptionEntitlement(pool:Pool,userId:string){
 const result=await pool.query<ActiveEntitlement>(
  "SELECT id,plan_code,currency,standard_amount_minor::text,discount_amount_minor::text,paid_amount_minor::text,period_start,period_end,verified_payment_at FROM active_subscription_entitlements WHERE user_id=$1 LIMIT 1",
  [userId]
 );
 return result.rows[0]??null;
}

export async function registerSubscriptionRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/subscriptions/current",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return reply.code(401).send({error:{code:"VERIFIED_ACCOUNT_REQUIRED",message:"Please sign in with your verified account to view subscription access.",request_id:request.id}});
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return {access:"free",active:false,entitlement:null};
  return {
   access:"paid",
   active:true,
   entitlement:{
    id:entitlement.id,
    plan_code:entitlement.plan_code,
    currency:entitlement.currency.trim(),
    standard_amount_minor:Number(entitlement.standard_amount_minor),
    discount_amount_minor:Number(entitlement.discount_amount_minor),
    paid_amount_minor:Number(entitlement.paid_amount_minor),
    period_start:entitlement.period_start,
    period_end:entitlement.period_end,
    verified_payment_at:entitlement.verified_payment_at
   }
  };
 });
}
