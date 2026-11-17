import {randomUUID} from "node:crypto";
import {z} from "zod";
import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {quoteSubscriptionPrice,type SubscriptionOfferRule,type SubscriptionPlanCode} from "./subscription-pricing.js";

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

type StoredOfferRule={
 plan_code:SubscriptionPlanCode;
 currency:string;
 standard_amount_minor:string;
 discount_basis_points:number;
 enabled:boolean;
 starts_at:Date|null;
 ends_at:Date|null;
 version:number;
};

function toOfferRule(row:StoredOfferRule):SubscriptionOfferRule {
 if(row.currency.trim()!=="INR")throw new Error("UNSUPPORTED_SUBSCRIPTION_CURRENCY");
 return {
  planCode:row.plan_code,
  currency:"INR",
  standardAmountMinor:Number(row.standard_amount_minor),
  discountBasisPoints:Number(row.discount_basis_points),
  enabled:row.enabled,
  startsAt:row.starts_at,
  endsAt:row.ends_at,
  version:Number(row.version)
 };
}

async function loadOfferRules(pool:Pool) {
 const result=await pool.query<StoredOfferRule>(
  "SELECT plan_code,currency,standard_amount_minor::text,discount_basis_points,enabled,starts_at,ends_at,version FROM subscription_offer_rules ORDER BY CASE plan_code WHEN 'monthly' THEN 1 WHEN 'yearly' THEN 2 END"
 );
 const byPlan=new Map(result.rows.map(row=>[row.plan_code,row]));
 const monthly=byPlan.get("monthly"),yearly=byPlan.get("yearly");
 if(!monthly||!yearly)throw new Error("SUBSCRIPTION_OFFER_CONFIGURATION_INCOMPLETE");
 return [toOfferRule(monthly),toOfferRule(yearly)] as const;
}

/** Server-side entitlement lookup. Paid routes must call this; never accept client flags. */
export async function getActiveSubscriptionEntitlement(pool:Pool,userId:string){
 const result=await pool.query<ActiveEntitlement>(
  "SELECT id,plan_code,currency,standard_amount_minor::text,discount_amount_minor::text,paid_amount_minor::text,period_start,period_end,verified_payment_at FROM active_subscription_entitlements WHERE user_id=$1 LIMIT 1",
  [userId]
 );
 return result.rows[0]??null;
}


export async function registerSubscriptionRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 const checkoutQuoteRequest=z.object({plan_code:z.enum(["monthly","yearly"])});
 // Create a short-lived immutable price quote for the signed-in learner.
 // This is not a payment intent and must never grant subscription access.
 app.post("/api/v1/subscriptions/checkout/quote",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return reply.code(401).send({error:{code:"VERIFIED_ACCOUNT_REQUIRED",message:"Please sign in with your verified account before continuing.",request_id:request.id}});
  const parsed=checkoutQuoteRequest.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Choose a valid monthly or yearly plan.",request_id:request.id}});
  try{
   const rules=await loadOfferRules(pool);
   const rule=rules.find(item=>item.planCode===parsed.data.plan_code);
   if(!rule)throw new Error("SUBSCRIPTION_OFFER_CONFIGURATION_INCOMPLETE");
   const quotedAt=new Date();
   const quote=quoteSubscriptionPrice(rule,quotedAt);
   const quoteId=randomUUID();
   const expiresAt=new Date(quotedAt.getTime()+15*60*1000);
   await pool.query(
    "INSERT INTO subscription_checkout_quotes(id,user_id,plan_code,currency,standard_amount_minor,discount_amount_minor,payable_amount_minor,discount_basis_points,offer_version,quoted_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [quoteId,learner.id,quote.planCode,quote.currency,quote.standardAmountMinor,quote.discountAmountMinor,quote.payableAmountMinor,quote.discountBasisPoints,quote.offerVersion,quotedAt,expiresAt]
   );
   return reply.code(201).send({
    quote_id:quoteId,
    plan_code:quote.planCode,
    currency:quote.currency,
    standard_amount_minor:quote.standardAmountMinor,
    discount_amount_minor:quote.discountAmountMinor,
    payable_amount_minor:quote.payableAmountMinor,
    discount_basis_points:quote.discountBasisPoints,
    offer_version:quote.offerVersion,
    quoted_at:quotedAt.toISOString(),
    expires_at:expiresAt.toISOString(),
    payment_required:true,
    access_granted:false
   });
  }catch{
   return reply.code(503).send({error:{code:"SUBSCRIPTION_QUOTE_UNAVAILABLE",message:"We could not prepare a subscription quote. Please try again later.",request_id:request.id}});
  }
 });

 // Public price display: the client selects a plan, but the server owns all amounts and offer eligibility.
 app.get("/api/v1/subscriptions/prices",async(_request,reply)=>{
  try{
   const rules=await loadOfferRules(pool);
   const evaluatedAt=new Date();
   const prices=rules.map(rule=>{
    const quote=quoteSubscriptionPrice(rule,evaluatedAt);
    return {
     plan_code:quote.planCode,
     currency:quote.currency,
     billing_days:quote.planCode==="monthly"?30:360,
     standard_amount_minor:quote.standardAmountMinor,
     discount_amount_minor:quote.discountAmountMinor,
     payable_amount_minor:quote.payableAmountMinor,
     discount_basis_points:quote.discountBasisPoints,
     offer_applied:quote.offerApplied,
     offer_version:quote.offerVersion,
     quoted_at:quote.evaluatedAt.toISOString()
    };
   });
   return {currency:"INR",prices};
  }catch{
   return reply.code(503).send({error:{code:"SUBSCRIPTION_PRICING_UNAVAILABLE",message:"Subscription pricing is temporarily unavailable. Please try again later.",request_id:_request.id}});
  }
 });

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
