import {describe,expect,it} from "vitest";
import {learnerLessonContentSchema,projectLearnerLessonContent} from "./lesson-content.js";

describe("learner-safe lesson content",()=>{
 it("accepts supported lesson blocks",()=>{
  const content={schema_version:1,blocks:[
   {type:"text",heading:"Today",body:"Introduce yourself."},
   {type:"vocabulary",items:[{term:"hello",meaning:"നമസ്കാരം"}]},
   {type:"examples",items:[{target:"My name is Anu.",support:"എന്റെ പേര് അനു എന്നാണ്."}]},
   {type:"exercise",id:"greeting-choice",instruction:"Choose a greeting.",prompt:"You meet someone in the morning.",response_type:"single_choice",options:[{id:"a",label:"Good morning"},{id:"b",label:"Good night"}]}
  ]};
  expect(learnerLessonContentSchema.safeParse(content).success).toBe(true);
 });
 it("rejects malformed or unsupported content blocks",()=>{
  expect(learnerLessonContentSchema.safeParse({schema_version:1,blocks:[{type:"video",url:"https://example.com"}]}).success).toBe(false);
  expect(learnerLessonContentSchema.safeParse({schema_version:2,blocks:[{type:"text",body:"Hello"}]}).success).toBe(false);
 });
 it("requires choice options and rejects options for free-text exercises",()=>{
  const base={type:"exercise",id:"q1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice"};
  expect(learnerLessonContentSchema.safeParse({schema_version:1,blocks:[base]}).success).toBe(false);
  expect(learnerLessonContentSchema.safeParse({schema_version:1,blocks:[{...base,options:[{id:"a",label:"A"},{id:"b",label:"B"}]}]}).success).toBe(true);
  expect(learnerLessonContentSchema.safeParse({schema_version:1,blocks:[{...base,response_type:"text",options:[{id:"a",label:"A"}]}]}).success).toBe(false);
 });
 it("rejects duplicate exercise IDs within a lesson",()=>{
  const exercise={type:"exercise",id:"same-question",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]};
  expect(learnerLessonContentSchema.safeParse({schema_version:1,blocks:[exercise,{...exercise,prompt:"A second question"}]}).success).toBe(false);
 });
 it("rejects duplicate choice option IDs",()=>{
  const exercise={type:"exercise",id:"q1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"a",label:"Another A"}]};
  expect(learnerLessonContentSchema.safeParse({schema_version:1,blocks:[exercise]}).success).toBe(false);
 });
 it("projects only learner-visible fields and strips authoring answer keys",()=>{
  const content={schema_version:1,blocks:[{type:"exercise",id:"q1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}],correct_option_id:"a",answer_key:["a"],rubric:{secret:"private"}}]};
  const projected=projectLearnerLessonContent(content);
  expect(projected).toEqual({schema_version:1,blocks:[{type:"exercise",id:"q1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]}]});
  expect(projectLearnerLessonContent({schema_version:1,blocks:[]})).toBeNull();
 });
});
