import {createHash,randomBytes,randomUUID} from "node:crypto";
import type {FastifyInstance} from "fastify";
import type {Pool,PoolClient} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";

const TICKET_TTL_SECONDS=60;
const TICKET_PATTERN=/^[0-9a-f]{64}$/;

export type GabrooRealtimeTicket={sessionId:string;connectionTicket:string;expiresAt:Date};
export type ConsumedGabrooRealtimeTicket={sessionId:string;userId:string}|undefined;

/** Issue a short-lived one-use capability; the raw token is never persisted. */
export async function issueGabrooRealtimeSessionTicket(pool:Pool,userId:string):Promise<GabrooRealtimeTicket>{
 const connectionTicket=randomBytes(32).toString("hex");
 const tokenDigest=createHash("sha256").update(connectionTicket).digest("hex");
 const sessionId=randomUUID();
 const client:PoolClient=await pool.connect();
 let inTransaction=false;
 try{
  await client.query("BEGIN");
  inTransaction=true;
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",[userId]);
  await client.query("UPDATE gabroo_realtime_session_tickets SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL",[userId]);
  const inserted=await client.query<{expires_at:Date|string}>(
   "INSERT INTO gabroo_realtime_session_tickets(token_digest,session_id,user_id,expires_at) VALUES($1,$2,$3,now()+($4||' seconds')::interval) RETURNING expires_at",
   [tokenDigest,sessionId,userId,String(TICKET_TTL_SECONDS)]
  );
  const expiresAt=inserted.rows[0]?.expires_at;
  if(!expiresAt)throw new Error("Realtime session ticket insert returned no expiry");
  await client.query("COMMIT");
  inTransaction=false;
  return {sessionId,connectionTicket,expiresAt:expiresAt instanceof Date?expiresAt:new Date(expiresAt)};
 }catch(error){
  if(inTransaction)await client.query("ROLLBACK");
  throw error;
 }finally{client.release();}
}

/** Atomic consume operation for the future websocket handshake. */
export async function consumeGabrooRealtimeSessionTicket(pool:Pool,connectionTicket:string):Promise<ConsumedGabrooRealtimeTicket>{
 if(!TICKET_PATTERN.test(connectionTicket))return undefined;
 const tokenDigest=createHash("sha256").update(connectionTicket).digest("hex");
 const result=await pool.query<{session_id:string;user_id:string}>(
  "UPDATE gabroo_realtime_session_tickets SET consumed_at=now() WHERE token_digest=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING session_id,user_id",
  [tokenDigest]
 );
 const row=result.rows[0];
 return row?{sessionId:row.session_id,userId:row.user_id}:undefined;
}

function sendError(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}

export async function registerGabrooRealtimeSessionRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.post("/api/v1/gabroo/realtime/session-ticket",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to prepare a Gabroo voice session.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo realtime voice.");
  try{
   const ticket=await issueGabrooRealtimeSessionTicket(pool,learner.id);
   reply.header("cache-control","private, no-store");
   reply.header("pragma","no-cache");
   return reply.code(201).send({
    session_id:ticket.sessionId,
    connection_ticket:ticket.connectionTicket,
    expires_at:ticket.expiresAt.toISOString(),
    expires_in_seconds:TICKET_TTL_SECONDS,
    single_use:true,
    transport:"websocket_handshake_pending"
   });
  }catch{
   return sendError(reply,request.id,503,"REALTIME_SESSION_UNAVAILABLE","A Gabroo realtime session could not be prepared. Please try again.");
  }
 });
}
