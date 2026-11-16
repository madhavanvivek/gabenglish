import {createHash,createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
import type {FastifyInstance,FastifyRequest} from "fastify";
import type {Pool,PoolClient} from "pg";
import {z} from "zod";
import type {AppConfig} from "./config.js";

const scrypt=promisify(scryptCallback);
const registerSchema=z.object({
 email:z.string().trim().email().max(254),
 password:z.string().min(10).max(128),
 display_name:z.string().trim().min(1).max(80).optional()
});
const loginSchema=z.object({email:z.string().trim().email().max(254),password:z.string().min(1).max(128)});
const refreshSchema=z.object({refresh_token:z.string().min(40).max(256)});
const ACCESS_TTL_SECONDS=15*60;
const REFRESH_TTL_DAYS=30;
type Account={id:string;email:string;display_name:string|null;locale:string;timezone:string;status:string};
type AccessClaims={sub:string;exp:number;iss:"gabenglish-api";aud:"gabenglish-app"};

function digest(token:string){return createHash("sha256").update(token).digest("hex");}
async function hashPassword(password:string){
 const salt=randomBytes(16);
 const derived=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}) as Buffer;
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
  const actual=await scrypt(password,Buffer.from(saltText!,"base64url"),expected.length,{N,r:R,p:P,maxmem:64*1024*1024}) as Buffer;
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
 }catch{return false;}
}
function signAccess(userId:string,secret:string,now=Math.floor(Date.now()/1000)){
 const claims:AccessClaims={sub:userId,exp:now+ACCESS_TTL_SECONDS,iss:"gabenglish-api",aud:"gabenglish-app"};
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
  if(typeof claims.sub!=="string"||!claims.sub||!Number.isInteger(claims.exp)||claims.exp<=now||claims.iss!=="gabenglish-api"||claims.aud!=="gabenglish-app")return;
  return claims;
 }catch{return;}
}
function createRefreshToken(){return randomBytes(48).toString("base64url");}
function safeUser(row:Account){return {id:row.id,email:row.email,display_name:row.display_name,locale:row.locale,timezone:row.timezone};}
function unauthorized(reply:any,requestId:string){return reply.code(401).send({error:{code:"UNAUTHORIZED",message:"Please sign in again to continue.",request_id:requestId}});}

export async function registerAuthRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 const secret=config.AUTH_TOKEN_SECRET;
 const authenticate=async(request:FastifyRequest):Promise<Account|undefined>=>{
  const header=request.headers.authorization;
  if(!header?.startsWith("Bearer "))return;
  const claims=verifyAccess(header.slice(7),secret);
  if(!claims)return;
  const result=await pool.query<Account>(
   "SELECT u.id,u.email,u.status,p.display_name,p.locale,p.timezone FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=$1 AND u.status='active' AND u.deleted_at IS NULL",
   [claims.sub]
  );
  return result.rows[0];
 };
 const issueTokens=async(client:PoolClient,userId:string)=>{
  const access_token=signAccess(userId,secret);
  const refresh_token=createRefreshToken();
  await client.query("INSERT INTO refresh_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+($3||' days')::interval)",[userId,digest(refresh_token),String(REFRESH_TTL_DAYS)]);
  return {access_token,refresh_token,token_type:"Bearer",expires_in:ACCESS_TTL_SECONDS};
 };

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
  const emailDigest=createHmac("sha256",secret).update("email:"+parsed.data.email.toLowerCase()).digest("hex");
  const ipDigest=createHmac("sha256",secret).update("ip:"+request.ip).digest("hex");
  const attempts=await pool.query<{email_count:number;ip_count:number}>(
   "SELECT count(*) FILTER (WHERE email_digest=$1)::int AS email_count,count(*) FILTER (WHERE ip_digest=$2)::int AS ip_count FROM auth_login_attempts WHERE attempted_at>now()-interval '15 minutes' AND succeeded=false AND (email_digest=$1 OR ip_digest=$2)",
   [emailDigest,ipDigest]
  );
  if((attempts.rows[0]?.email_count??0)>=10||(attempts.rows[0]?.ip_count??0)>=30)return reply.code(429).send({error:{code:"LOGIN_RATE_LIMITED",message:"Too many sign-in attempts. Please wait before trying again.",request_id:request.id}});
  const result=await pool.query<{id:string;email:string;password_hash:string|null;status:string}>(
   "SELECT id,email,password_hash,status FROM users WHERE email_normalized=$1 AND deleted_at IS NULL",
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
   return {user:{id:user.id,email:user.email},...tokens,email_verified:false};
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

 app.get("/api/v1/auth/me",async(request,reply)=>{
  const user=await authenticate(request);
  if(!user)return unauthorized(reply,request.id);
  const preferences=await pool.query<{support_language:string;learning_goal:string|null;correction_mode:string;daily_target_minutes:number;reminders_enabled:boolean}>(
   "SELECT support_language,learning_goal,correction_mode,daily_target_minutes,reminders_enabled FROM user_preferences WHERE user_id=$1",[user.id]
  );
  return {user:safeUser(user),preferences:preferences.rows[0]??null};
 });
}
