import {evaluateAuthoredExercise} from "@gabenglish/contracts";
import {projectLearnerLessonContent} from "@gabenglish/contracts";
import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";

type Direction="ml_to_en"|"en_to_ml";
type CatalogRow={
 course_id:string;course_code:string;course_title:string;course_description:string|null;course_sort:number;
 learning_direction:Direction;source_language:"ml"|"en";target_language:"ml"|"en";support_language:"ml"|"en";
 module_id:string|null;module_title:string|null;module_sort:number|null;
 lesson_id:string|null;lesson_slug:string|null;lesson_title:string|null;lesson_sort:number|null;
 lesson_version_id:string|null;lesson_version_number:number|null;
 script_mode:string|null;register:string|null;dialect_scope:string|null;romanisation:string|null;
};

function failure(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}

/** Published, direction-scoped learning catalog. Draft content is never returned. */
export async function registerLearningRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/learning/courses",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to view your learning path.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to access lessons.");
  const preference=await pool.query<{learning_direction:Direction}>(
   "SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]
  );
  const direction=preference.rows[0]?.learning_direction??"ml_to_en";
  const rows=await pool.query<CatalogRow>(
   `SELECT c.id AS course_id,c.code AS course_code,c.title AS course_title,
     c.description AS course_description,c.sort_order AS course_sort,
     c.learning_direction,c.source_language,c.target_language,c.support_language,
     m.id AS module_id,m.title AS module_title,m.sort_order AS module_sort,
     l.id AS lesson_id,l.slug AS lesson_slug,l.title AS lesson_title,l.sort_order AS lesson_sort,
     lv.id AS lesson_version_id,lv.version_number AS lesson_version_number,
     lv.script_mode,lv.register,lv.dialect_scope,lv.romanisation
    FROM courses c
    LEFT JOIN modules m ON m.course_id=c.id
    LEFT JOIN lessons l ON l.module_id=m.id AND l.status='published'
    LEFT JOIN lesson_versions lv ON lv.id=l.current_published_version_id
      AND lv.lesson_id=l.id AND lv.status='published'
      AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
    WHERE c.status='published' AND c.learning_direction=$1
    ORDER BY c.sort_order,m.sort_order,l.sort_order`,
   [direction]
  );
  const courses=new Map<string,{id:string;code:string;title:string;description:string|null;direction:Direction;source_language:string;target_language:string;support_language:string;modules:Map<string,{id:string;title:string;lessons:Array<Record<string,unknown>>}>}>();
  for(const row of rows.rows){
   let course=courses.get(row.course_id);
   if(!course){
    course={id:row.course_id,code:row.course_code,title:row.course_title,description:row.course_description,direction:row.learning_direction,source_language:row.source_language,target_language:row.target_language,support_language:row.support_language,modules:new Map()};
    courses.set(row.course_id,course);
   }
   if(!row.module_id||!row.module_title)continue;
   let module=course.modules.get(row.module_id);
   if(!module){module={id:row.module_id,title:row.module_title,lessons:[]};course.modules.set(row.module_id,module);}
   // A lesson without a currently published, direction-approved version is intentionally hidden.
   if(!row.lesson_id||!row.lesson_version_id||!row.lesson_title)continue;
   module.lessons.push({
    id:row.lesson_id,slug:row.lesson_slug,title:row.lesson_title,
    version_id:row.lesson_version_id,version:row.lesson_version_number,
    script_mode:row.script_mode,register:row.register,
    dialect_scope:row.dialect_scope,romanisation:row.romanisation
   });
  }
  return {learning_direction:direction,target_language:direction==="ml_to_en"?"en":"ml",courses:[...courses.values()].map(course=>({...course,modules:[...course.modules.values()]})),publication_policy:{drafts_hidden:true,malayalam_requires_educator_approval:true}};
 });
 const lessonIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 app.get("/api/v1/learning/lessons/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to open this lesson.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to access lessons.");
  const id=(request.params as {id?:string}).id??"";
  if(!lessonIdPattern.test(id))return failure(reply,request.id,400,"INVALID_LESSON_ID","This lesson link is invalid.");
  const result=await pool.query<{
   course_id:string;learning_direction:Direction;source_language:string;target_language:string;support_language:string;
   lesson_id:string;slug:string;title:string;version_id:string;version_number:number;content:unknown;
   script_mode:string;register:string|null;dialect_scope:string|null;romanisation:string|null;
   progress_status:string|null;progress_percent:string|null;progress_updated_at:Date|null;
  }>(
   `SELECT c.id AS course_id,c.learning_direction,c.source_language,c.target_language,c.support_language,
     l.id AS lesson_id,l.slug,l.title,lv.id AS version_id,lv.version_number,lv.content,
     lv.script_mode,lv.register,lv.dialect_scope,lv.romanisation,
     p.status AS progress_status,p.progress_percent::text AS progress_percent,p.updated_at AS progress_updated_at
    FROM lessons l JOIN modules m ON m.id=l.module_id
    JOIN courses c ON c.id=m.course_id
    JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
    LEFT JOIN learner_lesson_progress p ON p.user_id=$2 AND p.lesson_id=l.id
      AND p.lesson_version_id=lv.id AND p.learning_direction=c.learning_direction
    WHERE l.id=$1 AND l.status='published' AND c.status='published'
      AND lv.status='published' AND c.learning_direction=COALESCE(
        (SELECT learning_direction FROM user_preferences WHERE user_id=$2),'ml_to_en')
      AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')`,
   [id,learner.id]
  );
  const lesson=result.rows[0];
  if(!lesson)return failure(reply,request.id,404,"LESSON_NOT_FOUND","This lesson is not published for your selected learning direction.");
  const safeContent=projectLearnerLessonContent(lesson.content);
  if(!safeContent){request.log.error({request_id:request.id,lesson_id:id},"Published lesson content does not match the learner-safe schema");return failure(reply,request.id,503,"LESSON_CONTENT_UNAVAILABLE","This lesson is being prepared and is not available yet.");}
  return {lesson:{id:lesson.lesson_id,slug:lesson.slug,title:lesson.title,version_id:lesson.version_id,version:lesson.version_number,learning_direction:lesson.learning_direction,source_language:lesson.source_language,target_language:lesson.target_language,support_language:lesson.support_language,content:safeContent,script_mode:lesson.script_mode,register:lesson.register,dialect_scope:lesson.dialect_scope,romanisation:lesson.romanisation},progress:lesson.progress_status?{status:lesson.progress_status,progress_percent:Number(lesson.progress_percent),updated_at:lesson.progress_updated_at}:null};
 });
 app.post("/api/v1/learning/lessons/:id/progress",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to save lesson progress.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to save lesson progress.");
  const id=(request.params as {id?:string}).id??"";
  if(!lessonIdPattern.test(id))return failure(reply,request.id,400,"INVALID_LESSON_ID","This lesson link is invalid.");
  const body=request.body as {progress_percent?:unknown}|null;
  const percent=body?.progress_percent;
  if(!body||typeof percent!=="number"||!Number.isInteger(percent)||percent<0||percent>100||Object.keys(body).some(key=>key!=="progress_percent")){
   return failure(reply,request.id,400,"VALIDATION_ERROR","Progress must be a whole number from 0 to 100.");
  }
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const current=await client.query<{course_id:string;direction:Direction;version_id:string}>(
    `SELECT c.id AS course_id,c.learning_direction AS direction,lv.id AS version_id
     FROM lessons l JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
     JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
     WHERE l.id=$1 AND l.status='published' AND c.status='published' AND lv.status='published'
       AND c.learning_direction=COALESCE((SELECT learning_direction FROM user_preferences WHERE user_id=$2),'ml_to_en')
       AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
     FOR SHARE OF l,c,lv`,
    [id,learner.id]
   );
   const lesson=current.rows[0];
   if(!lesson){await client.query("ROLLBACK");return failure(reply,request.id,404,"LESSON_NOT_FOUND","This lesson is not published for your selected learning direction.");}
   const status=percent===100?"completed":percent>0?"in_progress":"not_started";
   const saved=await client.query<{status:string;progress_percent:string;updated_at:Date}>(
    `INSERT INTO learner_lesson_progress(user_id,course_id,lesson_id,lesson_version_id,learning_direction,status,progress_percent,started_at,completed_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $6<>'not_started' THEN now() ELSE NULL END,CASE WHEN $6='completed' THEN now() ELSE NULL END)
     ON CONFLICT(user_id,lesson_id,lesson_version_id,learning_direction)
     DO UPDATE SET status=CASE WHEN learner_lesson_progress.status='completed' THEN 'completed' ELSE EXCLUDED.status END,
       progress_percent=CASE WHEN learner_lesson_progress.status='completed' THEN 100 ELSE EXCLUDED.progress_percent END,
       started_at=COALESCE(learner_lesson_progress.started_at,EXCLUDED.started_at),
       completed_at=COALESCE(learner_lesson_progress.completed_at,EXCLUDED.completed_at),updated_at=now()
     RETURNING status,progress_percent::text,updated_at`,
    [learner.id,lesson.course_id,id,lesson.version_id,lesson.direction,status,percent]
   );
   const aggregate=await client.query<{average:string;total:number;completed:number}>(
    `SELECT COALESCE(AVG(COALESCE(p.progress_percent,0)),0)::numeric(5,2)::text AS average,
      COUNT(l.id)::int AS total,COUNT(*) FILTER(WHERE p.status='completed')::int AS completed
     FROM lessons l JOIN modules m ON m.id=l.module_id
     JOIN courses c ON c.id=m.course_id
     JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
     LEFT JOIN learner_lesson_progress p ON p.user_id=$1 AND p.lesson_id=l.id
       AND p.lesson_version_id=lv.id AND p.learning_direction=c.learning_direction
     WHERE c.id=$2 AND c.learning_direction=$3 AND c.status='published'
       AND l.status='published' AND lv.status='published'
       AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')`,
    [learner.id,lesson.course_id,lesson.direction]
   );
   await client.query(
    `INSERT INTO learner_course_progress(user_id,course_id,learning_direction,status,progress_percent,started_at,completed_at)
     VALUES($1,$2,$3,$4,$5,now(),CASE WHEN $4='completed' THEN now() ELSE NULL END)
     ON CONFLICT(user_id,course_id,learning_direction)
     DO UPDATE SET status=CASE WHEN learner_course_progress.status='completed' THEN 'completed' ELSE EXCLUDED.status END,
      progress_percent=CASE WHEN learner_course_progress.status='completed' THEN 100 ELSE EXCLUDED.progress_percent END,
      started_at=COALESCE(learner_course_progress.started_at,EXCLUDED.started_at),
      completed_at=COALESCE(learner_course_progress.completed_at,EXCLUDED.completed_at),updated_at=now()`,
    [learner.id,lesson.course_id,lesson.direction,aggregate.rows[0]!.total>0&&aggregate.rows[0]!.completed===aggregate.rows[0]!.total?"completed":aggregate.rows[0]!.completed===0&&Number(aggregate.rows[0]!.average)===0?"not_started":"in_progress",Number(aggregate.rows[0]!.average)]
   );
   await client.query("COMMIT");
   return {lesson_id:id,learning_direction:lesson.direction,progress:{status:saved.rows[0]!.status,progress_percent:Number(saved.rows[0]!.progress_percent),updated_at:saved.rows[0]!.updated_at},course_progress:{progress_percent:Number(aggregate.rows[0]!.average),completed_lessons:aggregate.rows[0]!.completed,total_started_lessons:aggregate.rows[0]!.total}};
  }catch(error){
   await client.query("ROLLBACK").catch(()=>undefined);
   request.log.error({request_id:request.id},"Lesson progress save failed");
   return failure(reply,request.id,503,"PROGRESS_SAVE_UNAVAILABLE","Your progress could not be saved. Please try again.");
  }finally{client.release();}
 });

 app.post("/api/v1/learning/lessons/:id/exercises/:exerciseId/attempts",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to submit an exercise.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to submit exercises.");
  const params=request.params as {id?:string;exerciseId?:string};
  const id=params.id??"",exerciseId=params.exerciseId??"";
  if(!lessonIdPattern.test(id)||!/^[a-z0-9_-]{1,64}$/i.test(exerciseId))return failure(reply,request.id,400,"INVALID_EXERCISE_REFERENCE","This exercise link is invalid.");
  const body=request.body as {response?:unknown}|null;
  if(!body||typeof body.response!=="string"||!body.response.trim()||body.response.trim().length>2000||Object.keys(body).some(key=>key!=="response"))return failure(reply,request.id,400,"VALIDATION_ERROR","Enter an answer of up to 2,000 characters.");
  const result=await pool.query<{course_id:string;learning_direction:Direction;version_id:string;content:unknown}>(
   `SELECT c.id AS course_id,c.learning_direction,lv.id AS version_id,lv.content
    FROM lessons l JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
    JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
    WHERE l.id=$1 AND l.status='published' AND c.status='published' AND lv.status='published'
      AND c.learning_direction=COALESCE((SELECT learning_direction FROM user_preferences WHERE user_id=$2),'ml_to_en')
      AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')`,
   [id,learner.id]
  );
  const lesson=result.rows[0];
  if(!lesson)return failure(reply,request.id,404,"LESSON_NOT_FOUND","This lesson is not published for your selected learning direction.");
  const raw=lesson.content as {blocks?:unknown};
  const blocks=Array.isArray(raw?.blocks)?raw.blocks:[];
  const exercise=blocks.find((item):item is Record<string,unknown>=>typeof item==="object"&&item!==null&&(item as Record<string,unknown>).type==="exercise"&&(item as Record<string,unknown>).id===exerciseId);
  if(!exercise)return failure(reply,request.id,404,"EXERCISE_NOT_FOUND","This exercise is not part of the published lesson.");
  const submitted=body.response.trim();
  const evaluated=evaluateAuthoredExercise(exercise,submitted);
  if(!evaluated){
   if(exercise.response_type==="single_choice"&&Array.isArray(exercise.options)){
    const exists=exercise.options.some(option=>typeof option==="object"&&option!==null&&(option as Record<string,unknown>).id===submitted);
    if(!exists)return failure(reply,request.id,400,"INVALID_EXERCISE_RESPONSE","Choose one of the available answers.");
   }
   return failure(reply,request.id,503,"EXERCISE_NOT_CONFIGURED","This exercise is awaiting a valid answer key or accepted-answer rubric.");
  }
  const {correct,feedback}=evaluated;
  await pool.query(
   `INSERT INTO learner_exercise_attempts(user_id,course_id,lesson_id,lesson_version_id,learning_direction,exercise_id,response,is_correct,feedback)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
   [learner.id,lesson.course_id,id,lesson.version_id,lesson.learning_direction,exerciseId,submitted,correct,feedback]
  );
  return {lesson_id:id,exercise_id:exerciseId,result:{correct,feedback}};
 });

}
