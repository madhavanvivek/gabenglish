import {createHash,createHmac,randomBytes,randomInt,randomUUID,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import type {FastifyInstance,FastifyRequest} from "fastify";
import type {Pool,PoolClient} from "pg";
import {authRegisterRequestSchema as registerSchema,authLoginRequestSchema as loginSchema,authRefreshRequestSchema as refreshSchema,learnerProfilePatchSchema as profilePatchSchema,learnerPreferencesPatchSchema as preferencesPatchSchema,learnerConsentRequestSchema as consentSchema,otpRequestSchema,otpVerifySchema} from "@gabenglish/contracts";
import type {AppConfig} from "./config.js";

function deriveKey(password:string,salt:Buffer,length:number,options:{N:number;r:number;p:number;maxmem:number}){
 return new Promise<Buffer>((resolve,reject)=>scryptCallback(password,salt,length,options,(error,key)=>error?reject(error):resolve(key as Buffer)));
}
const ACCESS_TTL_SECONDS=15*60;
const REFRESH_TTL_DAYS=30;
type Account={id:string;email:string|null;display_name:string|null;locale:string;timezone:string;status:string;email_verified_at:Date|null};
type AccessClaims={sub:string;sid:string;exp:number;iss:"gabenglish-api";aud:"gabenglish-app"};

function digest(token:string){return createHash("sha256").update(token).digest("hex");}
async function hashPassword(password:string){
 const salt=randomBytes(16);
 const derived=await deriveKey(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
 return "scrypt$16384$8$1$"+salt.toString("base64url")+"$"+derived.toString("base64url");
}
async function verifyPassword(password:string,encoded:string){
 const parts=encoded.split("$");
 if(parts.length!==6||parts[0]!=="scrypt")return false;
 const [,n,r,p,saltText,hashText]=parts;
 const N=Number(n),R=Number(r),P=Number(p);
 if(!Number.isSafeInteger(N)||N<16384||N>32768||R!==8||P!==1)return false;
 try{
  const expected=Buffer.from(hashText!,"base64url");
  const actual=await deriveKey(password,Buffer.from(saltText!,"base64url"),expected.length,{N,r:R,p:P,maxmem:64*1024*1024});
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
 }catch{return false;}
}
function signAccess(userId:string,sessionId:string,secret:string,now=Math.floor(Date.now()/1000)){
 const claims:AccessClaims={sub:userId,sid:sessionId,exp:now+ACCESS_TTL_SECONDS,iss:"gabenglish-api",aud:"gabenglish-app"};
 const payload=Buffer.from(JSON.stringify(claims)).toString("base64url");
 const signature=createHmac("sha256",secret).update(payload).digest("base64url");
 return payload+"."+signature;
}
function verifyAccess(token:string,secret:string,now=Math.floor(Date.now()/1000)):AccessClaims|undefined{
 const parts=token.split(".");
 if(parts.length!==2)return;
 const expected=createHmac("sha256",secret).update(parts[0]!).digest();
 let supplied:Buffer;
 try{supplied=Buffer.from(parts[1]!,"base64url");}catch{return;}
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return;
 try{
  const claims=JSON.parse(Buffer.from(parts[0]!,"base64url").toString("utf8")) as AccessClaims;
  if(typeof claims.sub!=="string"||!claims.sub||typeof claims.sid!=="string"||!claims.sid||!Number.isInteger(claims.exp)||claims.exp<=now||claims.iss!=="gabenglish-api"||claims.aud!=="gabenglish-app")return;
  return claims;
 }catch{return;}
}
function createRefreshToken(){return randomBytes(48).toString("base64url");}
function safeUser(row:Account){return {id:row.id,email:row.email,email_verified:Boolean(row.email_verified_at),display_name:row.display_name,locale:row.locale,timezone:row.timezone};}
function unauthorized(reply:any,requestId:string){return reply.code(401).send({error:{code:"UNAUTHORIZED",message:"Please sign in again to continue.",request_id:requestId}});}

export async function authenticateLearner(request:FastifyRequest,pool:Pool,config:AppConfig):Promise<Account|undefined>{
 const header=request.headers.authorization;
 if(!header?.startsWith("Bearer "))return;
 const claims=verifyAccess(header.slice(7),config.AUTH_TOKEN_SECRET);
 if(!claims)return;
 const result=await pool.query<Account>(
  "SELECT u.id,u.email,u.status,u.email_verified_at,p.display_name,p.locale,p.timezone FROM users u JOIN refresh_sessions s ON s.user_id=u.id AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=$1 AND u.status='active' AND u.deleted_at IS NULL AND (u.email_verified_at IS NOT NULL OR u.phone_verified_at IS NOT NULL)",
  [claims.sub,claims.sid]
 );
 return result.rows[0];
}

export type OtpDeliveryAdapter={send(input:{channel:"email"|"phone";destination:string;code:string;expiresInSeconds:number}):Promise<boolean>};
export async function registerAuthRoutes(app:FastifyInstance,pool:Pool,config:AppConfig,otpDelivery?:OtpDeliveryAdapter){
 const secret=config.AUTH_TOKEN_SECRET;
 const authenticate=(request:FastifyRequest)=>authenticateLearner(request,pool,config);
 const issueTokens=async(client:PoolClient,userId:string)=>{
  const refresh_token=createRefreshToken();
  const created=await client.query<{id:string}>(
   "INSERT INTO refresh_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+($3||' days')::interval) RETURNING id",
   [userId,digest(refresh_token),String(REFRESH_TTL_DAYS)]
  );
  const access_token=signAccess(userId,created.rows[0]!.id,secret);
  return {access_token,refresh_token,token_type:"Bearer",expires_in:ACCESS_TTL_SECONDS};
 };


 // Passwordless B2C OTP flow. Delivery remains fail-closed until an email/SMS adapter is configured.
 app.post("/api/v1/auth/otp/request",async(request,reply)=>{
  const parsed=otpRequestSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Enter a valid email address or international phone number.",request_id:request.id}});
  if(!otpDelivery)return reply.code(503).send({error:{code:"OTP_DELIVERY_UNAVAILABLE",message:"Verification is temporarily unavailable. Please try again later.",request_id:request.id}});
  const channel=parsed.data.channel;
  const destination=channel==="email"?parsed.data.destination.trim().toLowerCase():parsed.data.destination.trim();
  const ipDigest=createHmac("sha256",secret).update("ip:"+request.ip).digest("hex");
  const destinationDigest=createHmac("sha256",secret).update(channel+":"+destination).digest("hex");
  const limits=await pool.query<{recent:number;hourly:number}>(
   "SELECT count(*) FILTER(WHERE created_at>now()-interval '60 seconds')::int AS recent,count(*) FILTER(WHERE created_at>now()-interval '1 hour')::int AS hourly FROM auth_otp_challenges WHERE channel=$1 AND destination_normalized=$2",
   [channel,destination]
  );
  const ipLimits=await pool.query<{ip_hourly:number}>(
   "SELECT count(*)::int AS ip_hourly FROM auth_otp_challenges WHERE request_ip_digest=$1 AND created_at>now()-interval '1 hour'",
   [ipDigest]
  );
  const counts=limits.rows[0]!;
  if(counts.recent>0||counts.hourly>=5||(ipLimits.rows[0]?.ip_hourly??0)>=20)return reply.code(429).send({error:{code:"OTP_RATE_LIMITED",message:"Too many verification requests. Please wait before trying again.",request_id:request.id,retry_after_seconds:60}});
  const code=String(randomInt(0,1000000)).padStart(6,"0");
  const id=randomUUID();
  const codeDigest=createHmac("sha256",secret).update("otp:"+id+":"+code).digest("hex");
  await pool.query("INSERT INTO auth_otp_challenges(id,channel,destination_normalized,purpose,code_digest,request_ip_digest,expires_at) VALUES($1,$2,$3,'signup_signin',$4,$5,now()+interval '5 minutes')",[id,channel,destination,codeDigest,ipDigest]);
  let sent=false;
  try{sent=await otpDelivery.send({channel,destination,code,expiresInSeconds:300});}catch{sent=false;}
  await pool.query("UPDATE auth_otp_challenges SET delivery_status=$2 WHERE id=$1",[id,sent?"sent":"failed"]);
  if(!sent)return reply.code(503).send({error:{code:"OTP_DELIVERY_FAILED",message:"We could not send your verification code. Please try again later.",request_id:request.id}});
  const masked=channel==="email"?destination.replace(/^(.{1,2}).*(@.*)$/,"$1•••$2"):destination.slice(0,-4).replace(/./g,"•")+destination.slice(-4);
  return reply.code(202).send({challenge_id:id,channel,masked_destination:masked,expires_in_seconds:300,resend_after_seconds:60});
 });

 app.post("/api/v1/auth/otp/verify",async(request,reply)=>{
  const parsed=otpVerifySchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Enter the verification code sent to you.",request_id:request.id}});
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const found=await client.query<{id:string;channel:"email"|"phone";destination_normalized:string;code_digest:string;attempts:number;max_attempts:number;delivery_status:string;expires_at:Date;consumed_at:Date|null}>(
    "SELECT id,channel,destination_normalized,code_digest,attempts,max_attempts,delivery_status,expires_at,consumed_at FROM auth_otp_challenges WHERE id=$1 AND purpose='signup_signin' FOR UPDATE",[parsed.data.challenge_id]
   );
   const challenge=found.rows[0];
   if(!challenge||challenge.consumed_at||challenge.delivery_status!=="sent"||new Date(challenge.expires_at).getTime()<=Date.now()||challenge.attempts>=challenge.max_attempts){
    await client.query("ROLLBACK");
    return reply.code(400).send({error:{code:"OTP_INVALID_OR_EXPIRED",message:"This verification code is invalid or has expired. Request a new code.",request_id:request.id}});
   }
   const supplied=createHmac("sha256",secret).update("otp:"+challenge.id+":"+parsed.data.code).digest();
   const expected=Buffer.from(challenge.code_digest,"hex");
   if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){
    await client.query("UPDATE auth_otp_challenges SET attempts=attempts+1 WHERE id=$1",[challenge.id]);
    await client.query("COMMIT");
    return reply.code(400).send({error:{code:"OTP_INVALID_OR_EXPIRED",message:"This verification code is invalid or has expired. Request a new code.",request_id:request.id}});
   }
   let user=challenge.channel==="email"
    ?(await client.query<{id:string;status:string}>("SELECT id,status FROM users WHERE email_normalized=$1 AND deleted_at IS NULL FOR UPDATE",[challenge.destination_normalized])).rows[0]
    :(await client.query<{id:string;status:string}>("SELECT id,status FROM users WHERE phone_e164=$1 AND deleted_at IS NULL FOR UPDATE",[challenge.destination_normalized])).rows[0];
   if(user&&user.status!=="active"){await client.query("ROLLBACK");return reply.code(403).send({error:{code:"ACCOUNT_UNAVAILABLE",message:"This account is not available for sign-in. Please contact support.",request_id:request.id}});}
   if(!user){
    const created=challenge.channel==="email"
     ?await client.query<{id:string}>("INSERT INTO users(email,email_normalized,email_verified_at,status) VALUES($1,$1,now(),'active') RETURNING id",[challenge.destination_normalized])
     :await client.query<{id:string}>("INSERT INTO users(phone_e164,phone_verified_at,status) VALUES($1,now(),'active') RETURNING id",[challenge.destination_normalized]);
    user=created.rows[0]!;
    await client.query("INSERT INTO user_profiles(user_id) VALUES($1)",[user.id]);
    await client.query("INSERT INTO user_preferences(user_id) VALUES($1)",[user.id]);
   }else{
    await client.query(challenge.channel==="email"?"UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()),status='active',updated_at=now() WHERE id=$1":"UPDATE users SET phone_verified_at=COALESCE(phone_verified_at,now()),status='active',updated_at=now() WHERE id=$1",[user.id]);
   }
   await client.query("UPDATE auth_otp_challenges SET consumed_at=now() WHERE id=$1",[challenge.id]);
   const tokens=await issueTokens(client,user.id);
   await client.query("COMMIT");
   return {user:{id:user.id,verified_channel:challenge.channel},...tokens};
  }catch(error){await client.query("ROLLBACK");if((error as {code?:string}).code==="23505")return reply.code(409).send({error:{code:"CONTACT_ALREADY_LINKED",message:"This contact is already linked to another account.",request_id:request.id}});throw error;}
  finally{client.release();}
 });
 app.post("/api/v1/auth/register",async(request,reply)=>{
  const parsed=registerSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Enter a valid email, a password of at least 10 characters, and an optional display name.",request_id:request.id}});
  const email=parsed.data.email.toLowerCase();
  const passwordHash=await hashPassword(parsed.data.password);
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const created=await client.query<{id:string}>(
    "INSERT INTO users(email,email_normalized,password_hash,status) VALUES($1,$2,$3,'active') RETURNING id",
    [parsed.data.email,email,passwordHash]
   );
   const userId=created.rows[0]!.id;
   await client.query("INSERT INTO user_profiles(user_id,display_name) VALUES($1,$2)",[userId,parsed.data.display_name??null]);
   await client.query("INSERT INTO user_preferences(user_id) VALUES($1)",[userId]);
   const tokens=await issueTokens(client,userId);
   await client.query("COMMIT");
   return reply.code(201).send({user:{id:userId,email:parsed.data.email,display_name:parsed.data.display_name??null,locale:"ml-IN",timezone:"Asia/Kolkata"},...tokens,email_verified:false});
  }catch(error){
   await client.query("ROLLBACK");
   if((error as {code?:string}).code==="23505")return reply.code(409).send({error:{code:"ACCOUNT_EXISTS",message:"An account with this email already exists. Please sign in instead.",request_id:request.id}});
   throw error;
  }finally{client.release();}
 });

 app.post("/api/v1/auth/login",async(request,reply)=>{
  const parsed=loginSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Enter a valid email and password.",request_id:request.id}});
  await pool.query("DELETE FROM auth_login_attempts WHERE attempted_at<now()-interval '30 days'");
  const emailDigest=createHmac("sha256",secret).update("email:"+parsed.data.email.toLowerCase()).digest("hex");
  const ipDigest=createHmac("sha256",secret).update("ip:"+request.ip).digest("hex");
  const attempts=await pool.query<{email_count:number;ip_count:number}>(
   "SELECT count(*) FILTER (WHERE email_digest=$1)::int AS email_count,count(*) FILTER (WHERE ip_digest=$2)::int AS ip_count FROM auth_login_attempts WHERE attempted_at>now()-interval '15 minutes' AND succeeded=false AND (email_digest=$1 OR ip_digest=$2)",
   [emailDigest,ipDigest]
  );
  if((attempts.rows[0]?.email_count??0)>=10||(attempts.rows[0]?.ip_count??0)>=30)return reply.code(429).send({error:{code:"LOGIN_RATE_LIMITED",message:"Too many sign-in attempts. Please wait before trying again.",request_id:request.id,retry_after_seconds:900}});
  const result=await pool.query<{id:string;email:string;password_hash:string|null;status:string;email_verified_at:Date|null}>(
   "SELECT id,email,password_hash,status,email_verified_at FROM users WHERE email_normalized=$1 AND deleted_at IS NULL",
   [parsed.data.email.toLowerCase()]
  );
  const user=result.rows[0];
  const valid=user?.password_hash?await verifyPassword(parsed.data.password,user.password_hash):(await hashPassword(parsed.data.password),false);
  if(!user||user.status!=="active"||!valid){
   await pool.query("INSERT INTO auth_login_attempts(email_digest,ip_digest,succeeded) VALUES($1,$2,false)",[emailDigest,ipDigest]);
   return reply.code(401).send({error:{code:"INVALID_CREDENTIALS",message:"Email or password is incorrect.",request_id:request.id}});
  }
  await pool.query("INSERT INTO auth_login_attempts(email_digest,ip_digest,succeeded) VALUES($1,$2,true)",[emailDigest,ipDigest]);
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   await client.query("UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL AND expires_at<=now()",[user.id]);
   const tokens=await issueTokens(client,user.id);
   await client.query("COMMIT");
   return {user:{id:user.id,email:user.email,email_verified:Boolean(user.email_verified_at)},...tokens,email_verified:Boolean(user.email_verified_at)};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
 });

 app.post("/api/v1/auth/refresh",async(request,reply)=>{
  const parsed=refreshSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"A valid refresh token is required.",request_id:request.id}});
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const found=await client.query<{id:string;user_id:string;status:string}>(
    "SELECT s.id,s.user_id,u.status FROM refresh_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active' AND u.deleted_at IS NULL FOR UPDATE OF s",
    [digest(parsed.data.refresh_token)]
   );
   const session=found.rows[0];
   if(!session){await client.query("ROLLBACK");return unauthorized(reply,request.id);}
   await client.query("UPDATE refresh_sessions SET revoked_at=now() WHERE id=$1",[session.id]);
   const tokens=await issueTokens(client,session.user_id);
   await client.query("COMMIT");
   return { ...tokens };
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
 });

 app.post("/api/v1/auth/logout",async(request,reply)=>{
  const parsed=refreshSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"A valid refresh token is required.",request_id:request.id}});
  await pool.query("UPDATE refresh_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",[digest(parsed.data.refresh_token)]);
  return reply.code(204).send();
 });

 
 app.patch("/api/v1/auth/me",async(request,reply)=>{
  const user=await authenticate(request);
  if(!user)return unauthorized(reply,request.id);
  const parsed=profilePatchSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Provide at least one valid profile field.",request_id:request.id}});
  const values=parsed.data;
  const updated=await pool.query(
   "UPDATE user_profiles SET display_name=COALESCE($2,display_name),locale=COALESCE($3,locale),timezone=COALESCE($4,timezone),updated_at=now() WHERE user_id=$1 RETURNING user_id,display_name,locale,timezone",
   [user.id,values.display_name??null,values.locale??null,values.timezone??null]
  );
  return {user:updated.rows[0]};
 });

 app.patch("/api/v1/auth/me/preferences",async(request,reply)=>{
  const user=await authenticate(request);
  if(!user)return unauthorized(reply,request.id);
  const parsed=preferencesPatchSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Provide valid learning preferences.",request_id:request.id}});
  const values=parsed.data;
  const updated=await pool.query(
   "UPDATE user_preferences SET support_language=COALESCE($2,support_language),learning_goal=CASE WHEN $3::boolean THEN $4 ELSE learning_goal END,correction_mode=COALESCE($5,correction_mode),daily_target_minutes=COALESCE($6,daily_target_minutes),reminders_enabled=COALESCE($7,reminders_enabled),updated_at=now() WHERE user_id=$1 RETURNING support_language,learning_goal,correction_mode,daily_target_minutes,reminders_enabled",
   [user.id,values.support_language??null,Object.hasOwn(values,"learning_goal"),values.learning_goal??null,values.correction_mode??null,values.daily_target_minutes??null,values.reminders_enabled??null]
  );
  return {preferences:updated.rows[0]};
 });

 app.post("/api/v1/auth/me/consents",async(request,reply)=>{
  const user=await authenticate(request);
  if(!user)return unauthorized(reply,request.id);
  const parsed=consentSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Provide a valid consent purpose and policy version.",request_id:request.id}});
  const result=await pool.query(
   "INSERT INTO consent_records(user_id,purpose,policy_version,granted,withdrawn_at) VALUES($1,$2,$3,$4,CASE WHEN $4 THEN NULL ELSE now() END) RETURNING id,purpose,policy_version,granted,captured_at,withdrawn_at",
   [user.id,parsed.data.purpose,parsed.data.policy_version,parsed.data.granted]
  );
  return reply.code(201).send({consent:result.rows[0]});
 });

 app.post("/api/v1/auth/me/deletion-request",async(request,reply)=>{
  const user=await authenticate(request);
  if(!user)return unauthorized(reply,request.id);
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   await client.query("UPDATE users SET status='deletion_requested',updated_at=now() WHERE id=$1",[user.id]);
   await client.query("UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[user.id]);
   await client.query("COMMIT");
   return reply.code(202).send({status:"deletion_requested",message:"Your account is disabled and a deletion request has been recorded. Final deletion processing is not yet automated."});
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
 });

 app.get("/api/v1/auth/me",async(request,reply)=>{
  const user=await authenticate(request);
  if(!user)return unauthorized(reply,request.id);
  const preferences=await pool.query<{support_language:string;learning_goal:string|null;correction_mode:string;daily_target_minutes:number;reminders_enabled:boolean}>(
   "SELECT support_language,learning_goal,correction_mode,daily_target_minutes,reminders_enabled FROM user_preferences WHERE user_id=$1",[user.id]
  );
  return {user:safeUser(user),preferences:preferences.rows[0]??null};
 });
}
