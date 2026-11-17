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
 lesson_version_id:string|null;lesson_version_number:number|null;lesson_content:unknown;
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
     lv.id AS lesson_version_id,lv.version_number AS lesson_version_number,lv.content AS lesson_content,
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
    content:row.lesson_content,script_mode:row.script_mode,register:row.register,
    dialect_scope:row.dialect_scope,romanisation:row.romanisation
   });
  }
  return {learning_direction:direction,target_language:direction==="ml_to_en"?"en":"ml",courses:[...courses.values()].map(course=>({...course,modules:[...course.modules.values()]})),publication_policy:{drafts_hidden:true,malayalam_requires_educator_approval:true}};
 });
}
