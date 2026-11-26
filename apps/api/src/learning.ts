import {evaluateAuthoredExercise,learningLessonProgressUpdateSchema} from "@gabenglish/contracts";
import {projectLearnerLessonContent} from "@gabenglish/contracts";
import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import {isSameExerciseSubmission} from "./learning-idempotency.js";

type Direction="ml_to_en"|"en_to_ml";
type CatalogRow={
 course_id:string;course_code:string;course_title:string;course_description:string|null;course_sort:number;
 learning_direction:Direction;source_language:"ml"|"en";target_language:"ml"|"en";support_language:"ml"|"en";
 course_progress_percent:string;course_completed_lessons:number;course_total_lessons:number;
 practice_attempts:number;practice_exercises_attempted:number;practice_correct_attempts:number;practice_exercises_to_review:number;
 module_id:string|null;module_title:string|null;module_sort:number|null;
 lesson_id:string|null;lesson_slug:string|null;lesson_title:string|null;lesson_sort:number|null;
 lesson_version_id:string|null;lesson_version_number:number|null;
 lesson_progress_status:"not_started"|"in_progress"|"completed"|null;lesson_progress_percent:string|null;
 script_mode:string|null;register:string|null;dialect_scope:string|null;romanisation:string|null;
};

function failure(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}

function findLessonExercise(content:unknown,exerciseId:string):{exercise:Record<string,unknown>|null;ambiguous:boolean}{
 const blocks=(content as {blocks?:unknown}|null)?.blocks;
 if(!Array.isArray(blocks))return {exercise:null,ambiguous:false};
 const matches=blocks.filter((item):item is Record<string,unknown>=>typeof item==="object"&&item!==null&&(item as Record<string,unknown>).type==="exercise"&&(item as Record<string,unknown>).id===exerciseId);
 return matches.length>1?{exercise:null,ambiguous:true}:{exercise:matches[0]??null,ambiguous:false};
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
     cprog.progress_percent AS course_progress_percent,
     cprog.completed_lessons AS course_completed_lessons,
     cprog.total_lessons AS course_total_lessons,
     practice.attempts AS practice_attempts,
     practice.exercises_attempted AS practice_exercises_attempted,
     practice.correct_attempts AS practice_correct_attempts,
     practice.exercises_to_review AS practice_exercises_to_review,
     m.id AS module_id,m.title AS module_title,m.sort_order AS module_sort,
     l.id AS lesson_id,l.slug AS lesson_slug,l.title AS lesson_title,l.sort_order AS lesson_sort,
     lv.id AS lesson_version_id,lv.version_number AS lesson_version_number,
     lp.status AS lesson_progress_status,lp.progress_percent::text AS lesson_progress_percent,
     lv.script_mode,lv.register,lv.dialect_scope,lv.romanisation
    FROM courses c
    LEFT JOIN modules m ON m.course_id=c.id
    LEFT JOIN lessons l ON l.module_id=m.id AND l.status='published'
    LEFT JOIN lesson_versions lv ON lv.id=l.current_published_version_id
      AND lv.lesson_id=l.id AND lv.status='published'
      AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
    LEFT JOIN learner_lesson_progress lp ON lp.user_id=$2 AND lp.lesson_id=l.id
      AND lp.lesson_version_id=lv.id AND lp.learning_direction=c.learning_direction
    LEFT JOIN LATERAL (
      SELECT COALESCE(AVG(COALESCE(p.progress_percent,0)),0)::numeric(5,2)::text AS progress_percent,
        COUNT(l2.id)::int AS total_lessons,
        COUNT(*) FILTER(WHERE p.status='completed')::int AS completed_lessons
      FROM lessons l2 JOIN modules m2 ON m2.id=l2.module_id
      JOIN courses c2 ON c2.id=m2.course_id
      JOIN lesson_versions lv2 ON lv2.id=l2.current_published_version_id AND lv2.lesson_id=l2.id
      LEFT JOIN learner_lesson_progress p ON p.user_id=$2 AND p.lesson_id=l2.id
        AND p.lesson_version_id=lv2.id AND p.learning_direction=c2.learning_direction
      WHERE c2.id=c.id AND c2.learning_direction=c.learning_direction AND c2.status='published'
        AND l2.status='published' AND lv2.status='published'
        AND (c2.learning_direction<>'en_to_ml' OR lv2.educator_review_status='approved')
    ) cprog ON TRUE
    LEFT JOIN LATERAL (
      WITH current_attempts AS (
        SELECT a.lesson_id,a.exercise_id,a.is_correct,a.attempted_at,a.id
        FROM learner_exercise_attempts a
        JOIN lessons la ON la.id=a.lesson_id AND la.status='published'
        JOIN lesson_versions lva ON lva.id=la.current_published_version_id
          AND lva.id=a.lesson_version_id AND lva.status='published'
        WHERE a.user_id=$2 AND a.course_id=c.id
          AND a.learning_direction=c.learning_direction
          AND (c.learning_direction<>'en_to_ml' OR lva.educator_review_status='approved')
      ), latest_exercise_attempts AS (
        SELECT DISTINCT ON (lesson_id,exercise_id) lesson_id,exercise_id,is_correct
        FROM current_attempts
        ORDER BY lesson_id,exercise_id,attempted_at DESC,id DESC
      )
      SELECT
        (SELECT COUNT(*)::int FROM current_attempts) AS attempts,
        (SELECT COUNT(DISTINCT (lesson_id,exercise_id))::int FROM current_attempts) AS exercises_attempted,
        (SELECT COUNT(*) FILTER(WHERE is_correct)::int FROM current_attempts) AS correct_attempts,
        (SELECT COUNT(*) FILTER(WHERE NOT is_correct)::int FROM latest_exercise_attempts) AS exercises_to_review
    ) practice ON TRUE
    WHERE c.status='published' AND c.learning_direction=$1
    ORDER BY c.sort_order,m.sort_order,l.sort_order`,
   [direction,learner.id]
  );
  const courses=new Map<string,{id:string;code:string;title:string;description:string|null;direction:Direction;source_language:string;target_language:string;support_language:string;progress:{progress_percent:number;completed_lessons:number;total_lessons:number};practice:{attempts:number;exercises_attempted:number;correct_attempts:number;exercises_to_review:number};modules:Map<string,{id:string;title:string;lessons:Array<Record<string,unknown>>}>}>();
  for(const row of rows.rows){
   let course=courses.get(row.course_id);
   if(!course){
    course={id:row.course_id,code:row.course_code,title:row.course_title,description:row.course_description,direction:row.learning_direction,source_language:row.source_language,target_language:row.target_language,support_language:row.support_language,progress:{progress_percent:Number(row.course_progress_percent),completed_lessons:row.course_completed_lessons,total_lessons:row.course_total_lessons},practice:{attempts:row.practice_attempts,exercises_attempted:row.practice_exercises_attempted,correct_attempts:row.practice_correct_attempts,exercises_to_review:row.practice_exercises_to_review},modules:new Map()};
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
    dialect_scope:row.dialect_scope,romanisation:row.romanisation,
    progress:row.lesson_progress_status?{status:row.lesson_progress_status,progress_percent:Number(row.lesson_progress_percent)}:null
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
  const parsedProgress=learningLessonProgressUpdateSchema.safeParse(request.body);
  if(!parsedProgress.success)return failure(reply,request.id,400,"VALIDATION_ERROR","Progress must be a whole number from 0 to 100.");
  const {lesson_version_id:requestedVersionId,progress_percent:percent}=parsedProgress.data;
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
     FOR UPDATE OF c FOR SHARE OF l,lv`,
    [id,learner.id]
   );
   const lesson=current.rows[0];
   if(!lesson){await client.query("ROLLBACK");return failure(reply,request.id,404,"LESSON_NOT_FOUND","This lesson is not published for your selected learning direction.");}
   if(lesson.version_id!==requestedVersionId){
    await client.query("ROLLBACK");
    return failure(reply,request.id,409,"LESSON_VERSION_CHANGED","This lesson has been updated. Reload it before saving progress.");
   }
   const status=percent===100?"completed":percent>0?"in_progress":"not_started";
   const saved=await client.query<{status:string;progress_percent:string;updated_at:Date}>(
    `INSERT INTO learner_lesson_progress(user_id,course_id,lesson_id,lesson_version_id,learning_direction,status,progress_percent,started_at,completed_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $6<>'not_started' THEN now() ELSE NULL END,CASE WHEN $6='completed' THEN now() ELSE NULL END)
     ON CONFLICT(user_id,lesson_id,lesson_version_id,learning_direction)
     DO UPDATE SET
       status=CASE
         WHEN learner_lesson_progress.status='completed'
           OR GREATEST(learner_lesson_progress.progress_percent,EXCLUDED.progress_percent)=100 THEN 'completed'
         WHEN GREATEST(learner_lesson_progress.progress_percent,EXCLUDED.progress_percent)>0 THEN 'in_progress'
         ELSE 'not_started'
       END,
       progress_percent=GREATEST(learner_lesson_progress.progress_percent,EXCLUDED.progress_percent),
       started_at=COALESCE(learner_lesson_progress.started_at,EXCLUDED.started_at),
       completed_at=COALESCE(learner_lesson_progress.completed_at,
         CASE WHEN GREATEST(learner_lesson_progress.progress_percent,EXCLUDED.progress_percent)=100 THEN now() ELSE EXCLUDED.completed_at END),
       updated_at=now()
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
     DO UPDATE SET status=EXCLUDED.status,
      progress_percent=EXCLUDED.progress_percent,
      started_at=COALESCE(learner_course_progress.started_at,EXCLUDED.started_at),
      completed_at=CASE WHEN EXCLUDED.status='completed'
        THEN COALESCE(learner_course_progress.completed_at,EXCLUDED.completed_at) ELSE NULL END,
      updated_at=now()`,
    [learner.id,lesson.course_id,lesson.direction,aggregate.rows[0]!.total>0&&aggregate.rows[0]!.completed===aggregate.rows[0]!.total?"completed":aggregate.rows[0]!.completed===0&&Number(aggregate.rows[0]!.average)===0?"not_started":"in_progress",Number(aggregate.rows[0]!.average)]
   );
   await client.query("COMMIT");
   return {lesson_id:id,learning_direction:lesson.direction,progress:{status:saved.rows[0]!.status,progress_percent:Number(saved.rows[0]!.progress_percent),updated_at:saved.rows[0]!.updated_at},course_progress:{progress_percent:Number(aggregate.rows[0]!.average),completed_lessons:aggregate.rows[0]!.completed,total_lessons:aggregate.rows[0]!.total}};
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
  const body=request.body as {lesson_version_id?:unknown;submission_id?:unknown;response?:unknown}|null;
  const submissionIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(!body||typeof body.lesson_version_id!=="string"||!body.lesson_version_id.trim()||body.lesson_version_id.length>128||typeof body.submission_id!=="string"||!submissionIdPattern.test(body.submission_id)||typeof body.response!=="string"||!body.response.trim()||body.response.trim().length>2000||Object.keys(body).some(key=>key!=="lesson_version_id"&&key!=="submission_id"&&key!=="response"))return failure(reply,request.id,400,"VALIDATION_ERROR","Reload the lesson and enter an answer of up to 2,000 characters.");
  const submitted=body.response.trim();
  const previous=await pool.query<{lesson_id:string;lesson_version_id:string;exercise_id:string;response:string;is_correct:boolean;feedback:string|null}>(
   `SELECT lesson_id,lesson_version_id,exercise_id,response,is_correct,feedback
    FROM learner_exercise_attempts WHERE user_id=$1 AND submission_id=$2`,
   [learner.id,body.submission_id]
  );
  if(previous.rows[0]){
   const attempt=previous.rows[0];
   if(!isSameExerciseSubmission(attempt,{lessonId:id,lessonVersionId:body.lesson_version_id,exerciseId,response:submitted}))return failure(reply,request.id,409,"SUBMISSION_ID_CONFLICT","This retry identifier was already used for a different answer. Please submit again.");
   return {lesson_id:id,exercise_id:exerciseId,result:{correct:attempt.is_correct,feedback:attempt.feedback??(attempt.is_correct?"Good work.":"Review the lesson and try again.")}};
  }
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
  const match=findLessonExercise(lesson.content,exerciseId);
  if(match.ambiguous)return failure(reply,request.id,503,"EXERCISE_CONTENT_AMBIGUOUS","This exercise is temporarily unavailable because its published lesson content needs correction.");
  if(lesson.version_id!==body.lesson_version_id)return failure(reply,request.id,409,"LESSON_VERSION_CHANGED","This lesson has been updated. Reload it before submitting your answer.");
  const exercise=match.exercise;
  if(!exercise)return failure(reply,request.id,404,"EXERCISE_NOT_FOUND","This exercise is not part of the published lesson.");
  const evaluated=evaluateAuthoredExercise(exercise,submitted);
  if(!evaluated){
   if(exercise.response_type==="single_choice"&&Array.isArray(exercise.options)){
    const exists=exercise.options.some(option=>typeof option==="object"&&option!==null&&(option as Record<string,unknown>).id===submitted);
    if(!exists)return failure(reply,request.id,400,"INVALID_EXERCISE_RESPONSE","Choose one of the available answers.");
   }
   return failure(reply,request.id,503,"EXERCISE_NOT_CONFIGURED","This exercise is awaiting a valid answer key or accepted-answer rubric.");
  }
  const {correct,feedback}=evaluated;
  const inserted=await pool.query(
   `INSERT INTO learner_exercise_attempts(user_id,course_id,lesson_id,lesson_version_id,learning_direction,exercise_id,response,is_correct,feedback,submission_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT(user_id,submission_id) WHERE submission_id IS NOT NULL DO NOTHING
    RETURNING id`,
   [learner.id,lesson.course_id,id,lesson.version_id,lesson.learning_direction,exerciseId,submitted,correct,feedback,body.submission_id]
  );
  if(inserted.rowCount===0){
   const duplicate=await pool.query<{lesson_id:string;lesson_version_id:string;exercise_id:string;response:string;is_correct:boolean;feedback:string|null}>(
    `SELECT lesson_id,lesson_version_id,exercise_id,response,is_correct,feedback
     FROM learner_exercise_attempts WHERE user_id=$1 AND submission_id=$2`,
    [learner.id,body.submission_id]
   );
   const attempt=duplicate.rows[0];
   if(!attempt||!isSameExerciseSubmission(attempt,{lessonId:id,lessonVersionId:body.lesson_version_id,exerciseId,response:submitted}))return failure(reply,request.id,409,"SUBMISSION_ID_CONFLICT","This retry identifier was already used for a different answer. Please submit again.");
   return {lesson_id:id,exercise_id:exerciseId,result:{correct:attempt.is_correct,feedback:attempt.feedback??feedback}};
  }
  return {lesson_id:id,exercise_id:exerciseId,result:{correct,feedback}};
 });

 app.get("/api/v1/learning/lessons/:id/exercises/:exerciseId/attempts",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to view your exercise history.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to view exercise history.");
  const params=request.params as {id?:string;exerciseId?:string};
  const id=params.id??"",exerciseId=params.exerciseId??"";
  if(!lessonIdPattern.test(id)||!/^[a-z0-9_-]{1,64}$/i.test(exerciseId))return failure(reply,request.id,400,"INVALID_EXERCISE_REFERENCE","This exercise link is invalid.");
  const lesson=await pool.query<{learning_direction:Direction;version_id:string;content:unknown}>(
   `SELECT c.learning_direction,lv.id AS version_id,lv.content
    FROM lessons l JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
    JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
    WHERE l.id=$1 AND l.status='published' AND c.status='published' AND lv.status='published'
      AND c.learning_direction=COALESCE((SELECT learning_direction FROM user_preferences WHERE user_id=$2),'ml_to_en')
      AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')`,
   [id,learner.id]
  );
  const current=lesson.rows[0];
  if(!current)return failure(reply,request.id,404,"LESSON_NOT_FOUND","This lesson is not published for your selected learning direction.");
  const match=findLessonExercise(current.content,exerciseId);
  if(match.ambiguous)return failure(reply,request.id,503,"EXERCISE_CONTENT_AMBIGUOUS","This exercise history is temporarily unavailable because its published lesson content needs correction.");
  if(!match.exercise)return failure(reply,request.id,404,"EXERCISE_NOT_FOUND","This exercise is not part of the published lesson.");
  const history=await pool.query<{id:string;lesson_version_id:string;response:string;is_correct:boolean;feedback:string|null;attempted_at:Date}>(
   `SELECT id,lesson_version_id,response,is_correct,feedback,attempted_at
    FROM learner_exercise_attempts
    WHERE user_id=$1 AND lesson_id=$2 AND exercise_id=$3 AND learning_direction=$4 AND lesson_version_id=$5
    ORDER BY attempted_at DESC,id DESC LIMIT 50`,
   [learner.id,id,exerciseId,current.learning_direction,current.version_id]
  );
  return {lesson_id:id,exercise_id:exerciseId,current_version_id:current.version_id,attempts:history.rows.map(attempt=>({id:attempt.id,lesson_version_id:attempt.lesson_version_id,response:attempt.response,correct:attempt.is_correct,feedback:attempt.feedback,attempted_at:attempt.attempted_at}))};
 });


}
