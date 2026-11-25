import {evaluateAuthoredExercise} from "@gabenglish/contracts";
import {projectLearnerLessonContent} from "@gabenglish/contracts";
import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import {evaluateLearningStage, type LearningStage} from "./learning-stage.js";
import {selectNextLessonRecommendation,type RecommendationCandidate} from "./lesson-recommendation.js";
import {initialVocabularyReview,scheduleVocabularyReview,type RecallRating} from "./vocabulary-scheduler.js";

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


 app.get("/api/v1/learning/recommendation",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to view your next learning recommendation.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to access lessons.");
  const preference=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preference.rows[0]?.learning_direction??"ml_to_en";
  const saved=await pool.query<{stage:LearningStage}>(
   "SELECT stage FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",[learner.id,direction]
  );
  const stage=saved.rows[0]?.stage;
  if(!stage)return {learning_direction:direction,stage:null,recommendation:null,reason:"stage_not_selected",message:"Choose your learning stage to receive a lesson recommendation."};
  const candidates=await pool.query<RecommendationCandidate>(
   `SELECT l.id AS "lessonId",c.id AS "courseId",l.title,l.slug,m.title AS "moduleTitle",
      p.status AS "progressStatus",COALESCE(p.progress_percent,0)::int AS "progressPercent",
      c.sort_order AS "courseSort",m.sort_order AS "moduleSort",l.sort_order AS "lessonSort"
    FROM lessons l
    JOIN modules m ON m.id=l.module_id
    JOIN courses c ON c.id=m.course_id
    JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
    LEFT JOIN learner_lesson_progress p ON p.user_id=$1 AND p.lesson_id=l.id
      AND p.lesson_version_id=lv.id AND p.learning_direction=c.learning_direction
    WHERE c.status='published' AND l.status='published' AND lv.status='published'
      AND c.learning_direction=$2
      AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(lv.content->'blocks','[]'::jsonb)) AS block
        WHERE block->>'type'='exercise'
          AND block->>'stage' ~ '^[1-5]async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to view your learning stage.");
  const preferences=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preferences.rows[0]?.learning_direction??"ml_to_en";
  const saved=await pool.query<{stage:number;stage_source:string;updated_at:Date}>(
   "SELECT stage,stage_source,updated_at FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",[learner.id,direction]
  );
  return {learning_direction:direction,stage:saved.rows[0]?.stage??null,stage_source:saved.rows[0]?.stage_source??null,updated_at:saved.rows[0]?.updated_at??null,stage_status:saved.rows[0]?"confirmed":"not_selected"};
 });
 app.put("/api/v1/learning/stage",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to update your learning stage.");
  const body=request.body as {stage?:unknown}|null;
  if(!body||typeof body.stage!=="number"||!Number.isInteger(body.stage)||body.stage<1||body.stage>5||Object.keys(body).some(key=>key!=="stage")){
   return failure(reply,request.id,400,"VALIDATION_ERROR","Choose a learning stage from 1 to 5.");
  }
  const preferences=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preferences.rows[0]?.learning_direction??"ml_to_en";
  const saved=await pool.query<{stage:number;stage_source:string;updated_at:Date}>(
   `INSERT INTO learner_learning_stages(user_id,learning_direction,stage,stage_source)
    VALUES($1,$2,$3,'learner_selected')
    ON CONFLICT(user_id,learning_direction) DO UPDATE SET stage=EXCLUDED.stage,stage_source='learner_selected',updated_at=now()
    RETURNING stage,stage_source,updated_at`,[learner.id,direction,body.stage]
  );
  return {learning_direction:direction,stage:saved.rows[0]!.stage,stage_source:saved.rows[0]!.stage_source,updated_at:saved.rows[0]!.updated_at,stage_status:"confirmed"};
 });
\n const lessonIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  const stageRow=await pool.query<{stage:LearningStage}>(
   "SELECT stage FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",
   [learner.id,lesson.learning_direction]
  );
  const currentStage=stageRow.rows[0]?.stage??null;
  const exerciseStage=typeof exercise.stage==="number"&&Number.isInteger(exercise.stage)&&exercise.stage>=1&&exercise.stage<=5?exercise.stage as LearningStage:null;
  const evidenceStage=currentStage!==null&&exerciseStage===currentStage?currentStage:null;
  await pool.query(
   `INSERT INTO learner_exercise_attempts(user_id,course_id,lesson_id,lesson_version_id,learning_direction,exercise_id,response,is_correct,feedback,learner_stage,skill_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
   [learner.id,lesson.course_id,id,lesson.version_id,lesson.learning_direction,exerciseId,submitted,correct,feedback,evidenceStage,typeof exercise.skill_key==="string"?exercise.skill_key:null]
  );
  let stageProgression:ReturnType<typeof evaluateLearningStage>|null=null;
  if(currentStage!==null&&evidenceStage===currentStage){
   const recent=await pool.query<{is_correct:boolean}>(
    `SELECT is_correct FROM (
       SELECT DISTINCT ON (lesson_id,exercise_id) is_correct,attempted_at
       FROM learner_exercise_attempts
       WHERE user_id=$1 AND learning_direction=$2 AND learner_stage=$3
       ORDER BY lesson_id,exercise_id,attempted_at DESC
     ) AS latest_per_exercise
     ORDER BY attempted_at DESC LIMIT 8`,
    [learner.id,lesson.learning_direction,currentStage]
   );
   stageProgression=evaluateLearningStage(currentStage,recent.rows.map(row=>row.is_correct));
   if(stageProgression.outcome==="promote"||stageProgression.outcome==="demote"){
    await pool.query(
     `UPDATE learner_learning_stages SET stage=$3,stage_source='evidence_progression',updated_at=now()
      WHERE user_id=$1 AND learning_direction=$2 AND stage=$4`,
     [learner.id,lesson.learning_direction,stageProgression.nextStage,currentStage]
    );
   }
  }
  return {lesson_id:id,exercise_id:exerciseId,result:{correct,feedback},stage_progression:stageProgression?{
   current_stage:stageProgression.currentStage,next_stage:stageProgression.nextStage,outcome:stageProgression.outcome,
   sample_size:stageProgression.sampleSize,correct_count:stageProgression.correctCount,accuracy:stageProgression.accuracy,
   rationale:stageProgression.rationale
  }:null,stage_evidence:{eligible:evidenceStage!==null,reason:evidenceStage!==null?"Exercise is tagged for the learner’s confirmed stage.":exerciseStage===null?"Exercise has no curriculum stage tag.":"Exercise stage does not match the learner’s confirmed stage."}};
 });

}

          AND (block->>'stage')::int=$3
      )
    ORDER BY c.sort_order,m.sort_order,l.sort_order`,
   [learner.id,direction,stage]
  );
  const recommendation=selectNextLessonRecommendation(stage,candidates.rows);
  return {
   learning_direction:direction,stage,recommendation,
   reason:recommendation?recommendation.reason:"no_published_content_for_stage",
   message:recommendation
    ?recommendation.reason==="continue_learning"?"Pick up where you left off.":"This is the next lesson in your learning path."
    :"There are no published lessons tagged for this stage yet."
  };
 });

 app.get("/api/v1/learning/vocabulary/reviews",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to review vocabulary.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to access vocabulary reviews.");
  const preference=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preference.rows[0]?.learning_direction??"ml_to_en";
  const query=(request.query??{}) as {limit?:string};
  const limit=query.limit===undefined?20:Number(query.limit);
  if(!Number.isInteger(limit)||limit<1||limit>50)return failure(reply,request.id,400,"VALIDATION_ERROR","Review queue limit must be from 1 to 50.");
  const due=await pool.query<{lesson_id:string;lesson_title:string;lesson_version_id:string;vocabulary_item_id:string;term:string;meaning:string;pronunciation:string|null;example:string|null;due_at:Date;repetitions:number;interval_days:number}>(
   `SELECT l.id AS lesson_id,l.title AS lesson_title,lv.id AS lesson_version_id,
      item->>'id' AS vocabulary_item_id,item->>'term' AS term,item->>'meaning' AS meaning,
      item->>'pronunciation' AS pronunciation,item->>'example' AS example,
      COALESCE(r.due_at,now()) AS due_at,COALESCE(r.repetitions,0)::int AS repetitions,
      COALESCE(r.interval_days,0)::int AS interval_days
    FROM lessons l
    JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
    JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(lv.content->'blocks','[]'::jsonb)) block
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN block->>'type'='vocabulary' THEN COALESCE(block->'items','[]'::jsonb) ELSE '[]'::jsonb END) item
    LEFT JOIN learner_vocabulary_reviews r ON r.user_id=$1 AND r.learning_direction=$2
      AND r.lesson_version_id=lv.id AND r.vocabulary_item_id=item->>'id'
    WHERE l.status='published' AND c.status='published' AND lv.status='published'
      AND c.learning_direction=$2 AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
      AND item->>'id' IS NOT NULL AND (r.user_id IS NULL OR r.due_at<=now())
    ORDER BY COALESCE(r.due_at,now()) ASC,l.title,item->>'term' LIMIT $3`,
   [learner.id,direction,limit]
  );
  return {learning_direction:direction,due_count:due.rows.length,items:due.rows.map(row=>({
   lesson_id:row.lesson_id,lesson_title:row.lesson_title,lesson_version_id:row.lesson_version_id,
   vocabulary_item_id:row.vocabulary_item_id,term:row.term,meaning:row.meaning,
   pronunciation:row.pronunciation,example:row.example,due_at:row.due_at,
   repetitions:row.repetitions,interval_days:row.interval_days
  })),policy:{only_current_published_versions:true,learner_reports_recall:true,missed_reviews_never_block_lessons:true}};
 });

 app.post("/api/v1/learning/lessons/:id/vocabulary/:itemId/review",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to save your vocabulary review.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to save vocabulary reviews.");
  const params=request.params as {id?:string;itemId?:string};
  const lessonId=params.id??"",itemId=params.itemId??"";
  if(!lessonIdPattern.test(lessonId)||!/^[a-zA-Z0-9_-]{1,64}$/.test(itemId))return failure(reply,request.id,400,"INVALID_VOCABULARY_REFERENCE","This vocabulary review link is invalid.");
  const body=request.body as {rating?:unknown}|null;
  if(!body||typeof body.rating!=="number"||!Number.isInteger(body.rating)||body.rating<0||body.rating>5||Object.keys(body).some(key=>key!=="rating"))return failure(reply,request.id,400,"VALIDATION_ERROR","Recall rating must be a whole number from 0 to 5.");
  const preference=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preference.rows[0]?.learning_direction??"ml_to_en";
  const published=await pool.query<{lesson_version_id:string}>(
   `SELECT lv.id AS lesson_version_id
    FROM lessons l JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
    JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(lv.content->'blocks','[]'::jsonb)) block
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN block->>'type'='vocabulary' THEN COALESCE(block->'items','[]'::jsonb) ELSE '[]'::jsonb END) item
    WHERE l.id=$1 AND l.status='published' AND c.status='published' AND lv.status='published'
      AND c.learning_direction=$2 AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
      AND item->>'id'=$3 LIMIT 1`,
   [lessonId,direction,itemId]
  );
  const versionId=published.rows[0]?.lesson_version_id;
  if(!versionId)return failure(reply,request.id,404,"VOCABULARY_ITEM_NOT_FOUND","This vocabulary item is not in your current published learning content.");
  const existing=await pool.query<{repetitions:number;interval_days:number;ease_factor:string}>(
   "SELECT repetitions,interval_days,ease_factor::text FROM learner_vocabulary_reviews WHERE user_id=$1 AND learning_direction=$2 AND lesson_version_id=$3 AND vocabulary_item_id=$4",
   [learner.id,direction,versionId,itemId]
  );
  const previous=existing.rows[0]??initialVocabularyReview();
  const schedule=scheduleVocabularyReview({repetitions:previous.repetitions,intervalDays:previous.interval_days,easeFactor:Number(previous.ease_factor)},body.rating as RecallRating,new Date());
  const saved=await pool.query<{due_at:Date;repetitions:number;interval_days:number;ease_factor:string}>(
   `INSERT INTO learner_vocabulary_reviews(user_id,learning_direction,lesson_id,lesson_version_id,vocabulary_item_id,repetitions,interval_days,ease_factor,due_at,last_rating,last_reviewed_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
    ON CONFLICT(user_id,learning_direction,lesson_version_id,vocabulary_item_id)
    DO UPDATE SET repetitions=EXCLUDED.repetitions,interval_days=EXCLUDED.interval_days,
      ease_factor=EXCLUDED.ease_factor,due_at=EXCLUDED.due_at,last_rating=EXCLUDED.last_rating,
      last_reviewed_at=now(),updated_at=now()
    RETURNING due_at,repetitions,interval_days,ease_factor::text`,
   [learner.id,direction,lessonId,versionId,itemId,schedule.repetitions,schedule.intervalDays,schedule.easeFactor,schedule.dueAt,body.rating]
  );
  return {lesson_id:lessonId,vocabulary_item_id:itemId,learning_direction:direction,
   rating:body.rating,schedule:{due_at:saved.rows[0]!.due_at,repetitions:saved.rows[0]!.repetitions,
    interval_days:saved.rows[0]!.interval_days,ease_factor:Number(saved.rows[0]!.ease_factor)}};
 });
 
 app.get("/api/v1/learning/skill-profile",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to view your learning profile.");
  if(!await getActiveSubscriptionEntitlement(pool,learner.id))return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to view detailed learning insights.");
  const preference=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preference.rows[0]?.learning_direction??"ml_to_en";
  const stage=await pool.query<{stage:LearningStage}>("SELECT stage FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",[learner.id,direction]);
  const evidence=await pool.query<{skill_key:string;attempt_count:number;correct_count:number;last_attempt_at:Date;recent_accuracy:string}>(
   `SELECT skill_key,COUNT(*)::int AS attempt_count,
      COUNT(*) FILTER(WHERE is_correct)::int AS correct_count,
      MAX(attempted_at) AS last_attempt_at,
      ROUND(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END)::numeric,2)::text AS recent_accuracy
    FROM (
      SELECT DISTINCT ON (lesson_id,exercise_id) skill_key,is_correct,attempted_at
      FROM learner_exercise_attempts
      WHERE user_id=$1 AND learning_direction=$2 AND skill_key IS NOT NULL
      ORDER BY lesson_id,exercise_id,attempted_at DESC
    ) latest
    GROUP BY skill_key ORDER BY skill_key`,
   [learner.id,direction]
  );
  return {learning_direction:direction,stage:stage.rows[0]?.stage??null,
   skills:evidence.rows.map(row=>({skill_key:row.skill_key,attempt_count:row.attempt_count,
    correct_count:row.correct_count,accuracy:Number(row.recent_accuracy),
    status:row.attempt_count<5?"insufficient_evidence":Number(row.recent_accuracy)>=0.8?"strong":Number(row.recent_accuracy)<=0.5?"needs_practice":"developing",
    last_attempt_at:row.last_attempt_at})),
   profile_policy:{only_latest_attempt_per_exercise:true,minimum_evidence_for_status:5,not_a_proficiency_certificate:true}};
 });
 
 app.get("/api/v1/learning/stage",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to view your learning stage.");
  const preferences=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preferences.rows[0]?.learning_direction??"ml_to_en";
  const saved=await pool.query<{stage:number;stage_source:string;updated_at:Date}>(
   "SELECT stage,stage_source,updated_at FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",[learner.id,direction]
  );
  return {learning_direction:direction,stage:saved.rows[0]?.stage??null,stage_source:saved.rows[0]?.stage_source??null,updated_at:saved.rows[0]?.updated_at??null,stage_status:saved.rows[0]?"confirmed":"not_selected"};
 });
 app.put("/api/v1/learning/stage",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to update your learning stage.");
  const body=request.body as {stage?:unknown}|null;
  if(!body||typeof body.stage!=="number"||!Number.isInteger(body.stage)||body.stage<1||body.stage>5||Object.keys(body).some(key=>key!=="stage")){
   return failure(reply,request.id,400,"VALIDATION_ERROR","Choose a learning stage from 1 to 5.");
  }
  const preferences=await pool.query<{learning_direction:Direction}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preferences.rows[0]?.learning_direction??"ml_to_en";
  const saved=await pool.query<{stage:number;stage_source:string;updated_at:Date}>(
   `INSERT INTO learner_learning_stages(user_id,learning_direction,stage,stage_source)
    VALUES($1,$2,$3,'learner_selected')
    ON CONFLICT(user_id,learning_direction) DO UPDATE SET stage=EXCLUDED.stage,stage_source='learner_selected',updated_at=now()
    RETURNING stage,stage_source,updated_at`,[learner.id,direction,body.stage]
  );
  return {learning_direction:direction,stage:saved.rows[0]!.stage,stage_source:saved.rows[0]!.stage_source,updated_at:saved.rows[0]!.updated_at,stage_status:"confirmed"};
 });
\n const lessonIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  const stageRow=await pool.query<{stage:LearningStage}>(
   "SELECT stage FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",
   [learner.id,lesson.learning_direction]
  );
  const currentStage=stageRow.rows[0]?.stage??null;
  const exerciseStage=typeof exercise.stage==="number"&&Number.isInteger(exercise.stage)&&exercise.stage>=1&&exercise.stage<=5?exercise.stage as LearningStage:null;
  const evidenceStage=currentStage!==null&&exerciseStage===currentStage?currentStage:null;
  await pool.query(
   `INSERT INTO learner_exercise_attempts(user_id,course_id,lesson_id,lesson_version_id,learning_direction,exercise_id,response,is_correct,feedback,learner_stage)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
   [learner.id,lesson.course_id,id,lesson.version_id,lesson.learning_direction,exerciseId,submitted,correct,feedback,evidenceStage]
  );
  let stageProgression:ReturnType<typeof evaluateLearningStage>|null=null;
  if(currentStage!==null&&evidenceStage===currentStage){
   const recent=await pool.query<{is_correct:boolean}>(
    `SELECT is_correct FROM (
       SELECT DISTINCT ON (lesson_id,exercise_id) is_correct,attempted_at
       FROM learner_exercise_attempts
       WHERE user_id=$1 AND learning_direction=$2 AND learner_stage=$3
       ORDER BY lesson_id,exercise_id,attempted_at DESC
     ) AS latest_per_exercise
     ORDER BY attempted_at DESC LIMIT 8`,
    [learner.id,lesson.learning_direction,currentStage]
   );
   stageProgression=evaluateLearningStage(currentStage,recent.rows.map(row=>row.is_correct));
   if(stageProgression.outcome==="promote"||stageProgression.outcome==="demote"){
    await pool.query(
     `UPDATE learner_learning_stages SET stage=$3,stage_source='evidence_progression',updated_at=now()
      WHERE user_id=$1 AND learning_direction=$2 AND stage=$4`,
     [learner.id,lesson.learning_direction,stageProgression.nextStage,currentStage]
    );
   }
  }
  return {lesson_id:id,exercise_id:exerciseId,result:{correct,feedback},stage_progression:stageProgression?{
   current_stage:stageProgression.currentStage,next_stage:stageProgression.nextStage,outcome:stageProgression.outcome,
   sample_size:stageProgression.sampleSize,correct_count:stageProgression.correctCount,accuracy:stageProgression.accuracy,
   rationale:stageProgression.rationale
  }:null,stage_evidence:{eligible:evidenceStage!==null,reason:evidenceStage!==null?"Exercise is tagged for the learner’s confirmed stage.":exerciseStage===null?"Exercise has no curriculum stage tag.":"Exercise stage does not match the learner’s confirmed stage."}};
 });

}
