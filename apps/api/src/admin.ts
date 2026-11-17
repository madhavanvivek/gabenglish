import {createHash,createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import type {FastifyInstance,FastifyRequest} from "fastify";
import type {Pool} from "pg";
import {z} from "zod";
import type {AppConfig} from "./config.js";

const ADMIN_SESSION_TTL_DAYS=8;
type AdminClaims={sub:string;sid:string;exp:number;iss:"gabenglish-admin";aud:"gabenglish-console"};
type AdminAccount={id:string;email_normalized:string;password_hash:string|null;status:"invited"|"active"|"suspended";failed_login_attempts:number;locked_until:Date|null};
type AdminIdentity={id:string;email_normalized:string;roles:string[]};

function digest(value:string){return createHash("sha256").update(value).digest("hex");}
function signAdminToken(adminId:string,sessionId:string,secret:string){
 const payload=Buffer.from(JSON.stringify({sub:adminId,sid:sessionId,exp:Math.floor(Date.now()/1000)+ADMIN_SESSION_TTL_DAYS*86400,iss:"gabenglish-admin",aud:"gabenglish-console"} satisfies AdminClaims)).toString("base64url");
 return payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");
}
function verifyAdminToken(token:string,secret:string):AdminClaims|undefined{
 const parts=token.split(".");if(parts.length!==2)return;
 const expected=createHmac("sha256",secret).update(parts[0]!).digest();
 let supplied:Buffer;try{supplied=Buffer.from(parts[1]!,"base64url");}catch{return;}
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return;
 try{
  const claims=JSON.parse(Buffer.from(parts[0]!,"base64url").toString("utf8")) as AdminClaims;
  if(typeof claims.sub!=="string"||typeof claims.sid!=="string"||!Number.isInteger(claims.exp)||claims.exp<=Math.floor(Date.now()/1000)||claims.iss!=="gabenglish-admin"||claims.aud!=="gabenglish-console")return;
  return claims;
 }catch{return;}
}
function deriveKey(password:string,salt:Buffer,length:number,options:{N:number;r:number;p:number;maxmem:number}){
 return new Promise<Buffer>((resolve,reject)=>scryptCallback(password,salt,length,options,(error,key)=>error?reject(error):resolve(key as Buffer)));
}
async function verifyAdminPassword(password:string,encoded:string|null){
 if(!encoded)return false;
 const parts=encoded.split("$");
 if(parts.length!==6||parts[0]!=="scrypt")return false;
 const N=Number(parts[1]),r=Number(parts[2]),p=Number(parts[3]);
 if(!Number.isSafeInteger(N)||N<16384||N>32768||r!==8||p!==1)return false;
 try{
  const expected=Buffer.from(parts[5]!,"base64url");
  const actual=await deriveKey(password,Buffer.from(parts[4]!,"base64url"),expected.length,{N,r,p,maxmem:64*1024*1024});
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
 }catch{return false;}
}
async function authenticateAdmin(request:FastifyRequest,pool:Pool,secret:string):Promise<AdminIdentity|undefined>{
 const header=request.headers.authorization;if(!header?.startsWith("Bearer "))return;
 const claims=verifyAdminToken(header.slice(7),secret);if(!claims)return;
 const result=await pool.query<AdminIdentity>(
  "SELECT a.id,a.email_normalized,array_agg(r.code) FILTER (WHERE r.code IS NOT NULL) AS roles FROM admin_accounts a JOIN admin_sessions s ON s.admin_account_id=a.id AND s.id=$2 AND s.token_hash=$3 AND s.revoked_at IS NULL AND s.expires_at>now() LEFT JOIN admin_account_roles ar ON ar.admin_account_id=a.id LEFT JOIN admin_roles r ON r.id=ar.admin_role_id WHERE a.id=$1 AND a.status='active' GROUP BY a.id,a.email_normalized",
  [claims.sub,claims.sid,digest(header.slice(7))]
 );
 return result.rows[0];
}
const offerPatchSchema=z.object({
 discount_basis_points:z.number().int().min(0).max(9999),
 enabled:z.boolean(),
 starts_at:z.string().datetime({offset:true}).nullable(),
 ends_at:z.string().datetime({offset:true}).nullable()
}).strict().superRefine((value,ctx)=>{
 if(value.starts_at&&value.ends_at&&new Date(value.ends_at)<=new Date(value.starts_at))ctx.addIssue({code:"custom",path:["ends_at"],message:"Offer end must be later than offer start."});
});

export async function registerAdminRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 const secret=config.AUTH_TOKEN_SECRET;
 app.post("/api/v1/admin/auth/login",async(request,reply)=>{
  const parsed=z.object({email:z.string().email().max(254),password:z.string().min(1).max(128)}).strict().safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Enter your administrator email and password.",request_id:request.id}});
  const email=parsed.data.email.trim().toLowerCase();
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const found=await client.query<AdminAccount>("SELECT id,email_normalized,password_hash,status,failed_login_attempts,locked_until FROM admin_accounts WHERE email_normalized=$1 FOR UPDATE",[email]);
   const admin=found.rows[0];
   const currentlyLocked=admin?.locked_until&&new Date(admin.locked_until).getTime()>Date.now();
   const valid=admin&&admin.status==="active"&&!currentlyLocked?await verifyAdminPassword(parsed.data.password,admin.password_hash):false;
   if(!valid){
    if(admin&&admin.status==="active"){
     const attempts=admin.failed_login_attempts+1;
     await client.query("UPDATE admin_accounts SET failed_login_attempts=$2,locked_until=CASE WHEN $2>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",[admin.id,attempts]);
    }
    await client.query("COMMIT");
    return reply.code(401).send({error:{code:"ADMIN_AUTHENTICATION_FAILED",message:"Administrator sign-in failed. Check your credentials or try again later.",request_id:request.id}});
   }
   if(!admin)throw new Error("ADMIN_ACCOUNT_UNAVAILABLE");
   const roles=await client.query<{code:string}>("SELECT r.code FROM admin_account_roles ar JOIN admin_roles r ON r.id=ar.admin_role_id WHERE ar.admin_account_id=$1",[admin.id]);
   if(!roles.rows.some(row=>row.code==="superadmin")){
    await client.query("COMMIT");
    return reply.code(403).send({error:{code:"SUPERADMIN_REQUIRED",message:"This account is not authorised for subscription administration.",request_id:request.id}});
   }
   await client.query("UPDATE admin_accounts SET failed_login_attempts=0,locked_until=NULL WHERE id=$1",[admin.id]);
   const session=await client.query<{id:string}>("INSERT INTO admin_sessions(admin_account_id,token_hash,expires_at) VALUES($1,$2,now()+($3||' days')::interval) RETURNING id",[admin.id,digest(randomBytes(32).toString("base64url")),String(ADMIN_SESSION_TTL_DAYS)]);
   const accessToken=signAdminToken(admin.id,session.rows[0]!.id,secret);
   await client.query("UPDATE admin_sessions SET token_hash=$2 WHERE id=$1",[session.rows[0]!.id,digest(accessToken)]);
   await client.query("INSERT INTO admin_audit_events(admin_account_id,action,resource_type,request_id,details_redacted) VALUES($1,'admin.login','admin_session',$2,'{}'::jsonb)",[admin.id,request.id]);
   await client.query("COMMIT");
   return {access_token:accessToken,token_type:"Bearer",expires_in:ADMIN_SESSION_TTL_DAYS*86400,admin:{id:admin.id,email:admin.email_normalized,roles:roles.rows.map(row=>row.code)}};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
 });
 app.post("/api/v1/admin/auth/logout",async(request,reply)=>{
  const admin=await authenticateAdmin(request,pool,secret);
  if(!admin)return reply.code(401).send({error:{code:"ADMIN_UNAUTHENTICATED",message:"Please sign in again.",request_id:request.id}});
  const claims=verifyAdminToken(request.headers.authorization!.slice(7),secret)!;
  await pool.query("UPDATE admin_sessions SET revoked_at=now() WHERE id=$1 AND admin_account_id=$2 AND revoked_at IS NULL",[claims.sid,admin.id]);
  await pool.query("INSERT INTO admin_audit_events(admin_account_id,action,resource_type,request_id,details_redacted) VALUES($1,'admin.logout','admin_session',$2,'{}'::jsonb)",[admin.id,request.id]);
  return reply.code(204).send();
 });
 app.get("/api/v1/admin/subscription-offers",async(request,reply)=>{
  const admin=await authenticateAdmin(request,pool,secret);
  if(!admin)return reply.code(401).send({error:{code:"ADMIN_UNAUTHENTICATED",message:"Please sign in again.",request_id:request.id}});
  if(!admin.roles.includes("superadmin"))return reply.code(403).send({error:{code:"SUPERADMIN_REQUIRED",message:"Superadmin access is required.",request_id:request.id}});
  const result=await pool.query("SELECT plan_code,currency,standard_amount_minor::text,discount_basis_points,enabled,starts_at,ends_at,version,updated_at FROM subscription_offer_rules ORDER BY CASE plan_code WHEN 'monthly' THEN 1 ELSE 2 END");
  return {offers:result.rows.map((row:any)=>({...row,standard_amount_minor:Number(row.standard_amount_minor),currency:String(row.currency).trim()}))};
 });
 app.get("/api/v1/admin/audit-events",async(request,reply)=>{
  const admin=await authenticateAdmin(request,pool,secret);
  if(!admin)return reply.code(401).send({error:{code:"ADMIN_UNAUTHENTICATED",message:"Please sign in again.",request_id:request.id}});
  if(!admin.roles.includes("superadmin"))return reply.code(403).send({error:{code:"SUPERADMIN_REQUIRED",message:"Superadmin access is required.",request_id:request.id}});
  const query=z.object({
   limit:z.coerce.number().int().min(1).max(100).default(50),
   offset:z.coerce.number().int().min(0).max(100000).default(0),
   action:z.string().min(1).max(100).optional()
  }).strict().safeParse(request.query);
  if(!query.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Check the audit history filters.",request_id:request.id}});
  const [events,total]=await Promise.all([
   pool.query("SELECT id,action,resource_type,resource_id,request_id,details_redacted,created_at FROM admin_audit_events WHERE ($1::text IS NULL OR action=$1) ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3",[query.data.action??null,query.data.limit,query.data.offset]),
   pool.query<{count:string}>("SELECT count(*)::text AS count FROM admin_audit_events WHERE ($1::text IS NULL OR action=$1)",[query.data.action??null])
  ]);
  return {events:events.rows,total:Number(total.rows[0]?.count??0),limit:query.data.limit,offset:query.data.offset};
 });
 app.put("/api/v1/admin/subscription-offers/:planCode",async(request,reply)=>{
  const admin=await authenticateAdmin(request,pool,secret);
  if(!admin)return reply.code(401).send({error:{code:"ADMIN_UNAUTHENTICATED",message:"Please sign in again.",request_id:request.id}});
  if(!admin.roles.includes("superadmin"))return reply.code(403).send({error:{code:"SUPERADMIN_REQUIRED",message:"Superadmin access is required.",request_id:request.id}});
  const planCode=z.enum(["monthly","yearly"]).safeParse((request.params as {planCode?:string}).planCode);
  if(!planCode.success)return reply.code(404).send({error:{code:"SUBSCRIPTION_PLAN_NOT_FOUND",message:"The requested subscription plan does not exist.",request_id:request.id}});
  const parsed=offerPatchSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Check the offer discount and date window.",request_id:request.id,issues:parsed.error.issues.map(issue=>({field:issue.path.join("."),message:issue.message}))}});
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const updated=await client.query("UPDATE subscription_offer_rules SET discount_basis_points=$2,enabled=$3,starts_at=$4,ends_at=$5,updated_by_admin_id=$6 WHERE plan_code=$1 RETURNING plan_code,currency,standard_amount_minor::text,discount_basis_points,enabled,starts_at,ends_at,version,updated_at",[planCode.data,parsed.data.discount_basis_points,parsed.data.enabled,parsed.data.starts_at,parsed.data.ends_at,admin.id]);
   if(!updated.rows[0]){
    await client.query("ROLLBACK");
    return reply.code(404).send({error:{code:"SUBSCRIPTION_PLAN_NOT_FOUND",message:"The requested subscription plan does not exist.",request_id:request.id}});
   }
   await client.query("INSERT INTO admin_audit_events(admin_account_id,action,resource_type,resource_id,request_id,details_redacted) VALUES($1,'subscription.offer.updated','subscription_offer_rule',$2,$3,$4::jsonb)",[admin.id,planCode.data,request.id,JSON.stringify({discount_basis_points:parsed.data.discount_basis_points,enabled:parsed.data.enabled,starts_at:parsed.data.starts_at,ends_at:parsed.data.ends_at,version:updated.rows[0].version})]);
   await client.query("COMMIT");
   const row=updated.rows[0] as any;
   return {offer:{...row,standard_amount_minor:Number(row.standard_amount_minor),currency:String(row.currency).trim()}};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
 });
}
