import type {Pool} from "pg";

export type GabrooSpeechQuotaPeriod="day"|"month";
export class GabrooSpeechQuotaExceededError extends Error {
 constructor(readonly period:GabrooSpeechQuotaPeriod){super("Gabroo speech "+period+" character quota exceeded.");this.name="GabrooSpeechQuotaExceededError";}
}

/**
 * Atomically reserves characters in India-local daily and monthly buckets.
 * Reservations are deliberately not refunded on provider errors: a provider may
 * have processed the request even when the client did not receive the audio.
 */
export async function reserveGabrooSpeechUsage(input:{
 pool:Pool;userId:string;characters:number;dailyLimit:number;monthlyLimit:number
}):Promise<void>{
 const {pool,userId,characters,dailyLimit,monthlyLimit}=input;
 if(!Number.isSafeInteger(characters)||characters<1||characters>4_000)throw new Error("Invalid Gabroo speech character reservation.");
 if(!Number.isSafeInteger(dailyLimit)||dailyLimit<1||!Number.isSafeInteger(monthlyLimit)||monthlyLimit<1)throw new Error("Gabroo speech quotas must be positive safe integers.");
 if(characters>dailyLimit)throw new GabrooSpeechQuotaExceededError("day");
 if(characters>monthlyLimit)throw new GabrooSpeechQuotaExceededError("month");
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",[userId+":gabroo-speech-usage"]);
  const daily=await client.query(
   "INSERT INTO gabroo_speech_usage_buckets(user_id,bucket_type,bucket_start,characters_used,requests_count) VALUES($1,'day',timezone('Asia/Kolkata',now())::date,$2,1) ON CONFLICT(user_id,bucket_type,bucket_start) DO UPDATE SET characters_used=gabroo_speech_usage_buckets.characters_used+EXCLUDED.characters_used,requests_count=gabroo_speech_usage_buckets.requests_count+1,updated_at=now() WHERE gabroo_speech_usage_buckets.characters_used+EXCLUDED.characters_used<=$3 RETURNING characters_used",
   [userId,characters,dailyLimit]
  );
  if(daily.rowCount!==1)throw new GabrooSpeechQuotaExceededError("day");
  const monthly=await client.query(
   "INSERT INTO gabroo_speech_usage_buckets(user_id,bucket_type,bucket_start,characters_used,requests_count) VALUES($1,'month',date_trunc('month',timezone('Asia/Kolkata',now()))::date,$2,1) ON CONFLICT(user_id,bucket_type,bucket_start) DO UPDATE SET characters_used=gabroo_speech_usage_buckets.characters_used+EXCLUDED.characters_used,requests_count=gabroo_speech_usage_buckets.requests_count+1,updated_at=now() WHERE gabroo_speech_usage_buckets.characters_used+EXCLUDED.characters_used<=$3 RETURNING characters_used",
   [userId,characters,monthlyLimit]
  );
  if(monthly.rowCount!==1)throw new GabrooSpeechQuotaExceededError("month");
  await client.query("COMMIT");
 }catch(error){
  await client.query("ROLLBACK");
  throw error;
 }finally{client.release();}
}
