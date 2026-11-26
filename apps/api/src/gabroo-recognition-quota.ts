import type {Pool} from "pg";

export const GABROO_RECOGNITION_REQUESTS_PER_HOUR=20;

type QuotaRow={request_count:number;retry_after_seconds:number};

/**
 * Atomically consumes one learner-scoped transcription slot.
 * The rolling window is shared across API instances through PostgreSQL.
 */
export async function consumeGabrooRecognitionQuota(pool:Pick<Pool,"query">,userId:string):Promise<{
 allowed:boolean;remaining:number;retryAfterSeconds:number;
}>{
 const result=await pool.query<QuotaRow>(
  `INSERT INTO gabroo_recognition_quotas(user_id,window_started_at,request_count)
   VALUES($1,now(),1)
   ON CONFLICT(user_id) DO UPDATE SET
    window_started_at=CASE
     WHEN gabroo_recognition_quotas.window_started_at<=now()-interval '1 hour'
     THEN now() ELSE gabroo_recognition_quotas.window_started_at END,
    request_count=CASE
     WHEN gabroo_recognition_quotas.window_started_at<=now()-interval '1 hour'
     THEN 1 ELSE gabroo_recognition_quotas.request_count+1 END,
    updated_at=now()
   RETURNING request_count,
    GREATEST(1,CEIL(EXTRACT(EPOCH FROM (window_started_at+interval '1 hour'-now())))::integer) AS retry_after_seconds`,
  [userId]
 );
 const row=result.rows[0];
 if(!row)throw new Error("Gabroo recognition quota could not be checked.");
 return {
  allowed:row.request_count<=GABROO_RECOGNITION_REQUESTS_PER_HOUR,
  remaining:Math.max(0,GABROO_RECOGNITION_REQUESTS_PER_HOUR-row.request_count),
  retryAfterSeconds:row.retry_after_seconds
 };
}
