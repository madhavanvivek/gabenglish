import {describe,it,expect} from "vitest";
import {buildGabrooTeachingPolicy,buildGabrooLearnerTurnGuidance,buildGabrooConversationContinuityGuidance} from "./gabroo-teaching-policy.js";

describe("Gabroo conversation continuity",()=>{
 it("treats the latest learner turn as an answer to Gabroo's previous question",()=>{
  const guidance=buildGabrooConversationContinuityGuidance({history:[
   {role:"user",content:"I want to improve my English."},
   {role:"assistant",content:"What situations do you use English in most?"},
   {role:"user",content:"Mostly at work."}
  ]});
  expect(guidance).toContain("Treat it as an answer");
  expect(guidance).toContain("Do not repeat the previous question");
 });
 it("continues an established thread without restarting greetings",()=>{
  const guidance=buildGabrooConversationContinuityGuidance({history:[
   {role:"user",content:"I enjoy cooking."},
   {role:"assistant",content:"Cooking can be creative. Which dish do you enjoy making?"}
  ]});
  expect(guidance).toContain("avoid repeated greetings");
 });
 it("does not invent continuity for a first conversation turn",()=>{
  expect(buildGabrooConversationContinuityGuidance({history:[]})).toContain("do not pretend to remember");
 });
 it("adds conversation continuity guidance to the provider policy",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",latestLearnerMessage:"Mostly at work.",conversationHistory:[
   {role:"assistant",content:"What situations do you use English in most?"},
   {role:"user",content:"Mostly at work."}
  ]});
  expect(policy.responseGuidance.join(" ")).toContain("Treat it as an answer");
 });
});

describe("Gabroo learner-turn adaptation",()=>{
 it("encourages a small expansion after a brief answer",()=>{
  const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:"I like it."});
  expect(guidance).toContain("contribution is brief");
  expect(guidance).toContain("one small expansion");
 });
 it("answers direct questions before inviting further discussion",()=>{
  for(const message of ["Why does this happen?","How can I improve my English","എങ്ങനെ ഇത് ചെയ്യാം","എങ്ങനെ ഇത് ചെയ്യാം?"]){
   const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:message});
   expect(guidance).toContain("Answer that question clearly first");
   expect(guidance).toContain("Do not withhold the answer");
  }
 });
 it("resolves explicit confusion before asking the learner to elaborate",()=>{
  for(const message of ["I don't understand","I'm confused","Please explain this again","എനിക്ക് മനസ്സിലായില്ല"]){
   const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:message});
   expect(guidance).toContain("Answer that question clearly first");
   expect(guidance).toContain("Do not withhold the answer");
  }
 });
 it("deepens a substantial contribution instead of asking the learner to repeat it",()=>{
  const message="I believe technology can improve education because students can learn at their own pace, explore difficult subjects in different ways, receive immediate feedback, and practise skills whenever they have time.";
  const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:message});
  expect(guidance).toContain("substantial contribution");
  expect(guidance).toContain("one thoughtful follow-up");
 });
 it("uses a relevant follow-up for a moderate contribution",()=>{
  const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:"I use online lessons because they are flexible for my work schedule."});
  expect(guidance).toContain("moderate amount");
  expect(guidance).toContain("moves their idea forward");
 });
 it("does not assume an interest before the learner has spoken",()=>{
  expect(buildGabrooLearnerTurnGuidance({})).toContain("do not assume an interest");
 });
 it("adds adaptive guidance to the model policy using the current learner message",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",latestLearnerMessage:"I like it."});
  expect(policy.responseGuidance.join(" ")).toContain("contribution is brief");
 });

 it("uses only a bounded set of learner-approved, non-mastered vocabulary items",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learnerVocabulary:[
   {term:"confident",malayalamMeaning:"ആത്മവിശ്വാസമുള്ള",exampleSentence:"I feel confident speaking.",status:"learning"},
   {term:"improve",malayalamMeaning:"മെച്ചപ്പെടുത്തുക",exampleSentence:"I want to improve my English.",status:"familiar"},
   {term:"archived",malayalamMeaning:"പഴയത്",status:"mastered"},
   ...Array.from({length:6},(_,index)=>({term:`word-${index}`,malayalamMeaning:"അർത്ഥം",status:"learning" as const}))
  ]});
  expect(policy.learnerVocabulary).toHaveLength(5);
  expect(policy.learnerVocabulary.map(item=>item.term)).not.toContain("archived");
  expect(policy.responseGuidance.join(" ")).toContain("do not force a word into an unrelated answer");
 });
 it("marks overdue and Again-rated vocabulary for gentle contextual practice",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learnerVocabulary:[
   {term:"resilient",malayalamMeaning:"പ്രതിസന്ധികളെ അതിജീവിക്കുന്ന",status:"learning",isDue:false,lastReviewRating:"again"},
   {term:"curious",malayalamMeaning:"കൗതുകമുള്ള",status:"familiar",isDue:true,lastReviewRating:"good"},
   {term:"ordinary",malayalamMeaning:"സാധാരണ",status:"learning",isDue:false,lastReviewRating:null}
  ]});
  expect(policy.learnerVocabulary.map(item=>({term:item.term,needsPractice:item.needsPractice}))).toEqual([
   {term:"resilient",needsPractice:true},{term:"curious",needsPractice:true},{term:"ordinary",needsPractice:false}
  ]);
  expect(policy.responseGuidance.join(" ")).toContain("fresh, level-appropriate sentence");
  expect(policy.responseGuidance.join(" ")).toContain("Never announce that the learner struggled");
 });
 it("does not add revision coaching when no active word is due or Again-rated",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learnerVocabulary:[
   {term:"steady",malayalamMeaning:"സ്ഥിരതയുള്ള",status:"learning",isDue:false,lastReviewRating:"good"}
  ]});
  expect(policy.responseGuidance.join(" ")).not.toContain("Some saved words are due for revision");
 });
 it("does not add vocabulary guidance when the learner has no active saved words",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learnerVocabulary:[{term:"done",malayalamMeaning:"കഴിഞ്ഞു",status:"mastered"}]});
  expect(policy.learnerVocabulary).toEqual([]);
  expect(policy.responseGuidance.join(" ")).not.toContain("explicitly saved a small vocabulary list");
 });
});

describe("Gabroo teaching policy",()=>{
 it("prioritises learner participation while allowing concise knowledge contributions in every mode",()=>{
  const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
  for(const mode of modes){
   const guidance=buildGabrooTeachingPolicy({mode,supportLanguage:"ml"}).responseGuidance.join(" ");
   expect(guidance).toContain("help the learner express more of their own ideas");
   expect(guidance).toContain("listen–contribute–invite–listen");
   expect(guidance).toContain("invite elaboration");
   expect(guidance).toContain("Follow the learner’s chosen thread");
   expect(guidance).toContain("Do not correct every sentence");
  }
 });
 it("keeps free-flow conversation natural and correction-light",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml"});
  expect(policy.correction).toBe("none");
  expect(policy.primaryGoal).toBe("communicate");
  expect(policy.responseGuidance.some(x=>x.includes("natural conversation"))).toBe(true);
 });
 it("enforces respectful neutral address by default",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml"});
  expect(policy.addressPolicy).toContain("Never use 'eda', 'edi'");
  expect(policy.addressPolicy).toContain("respectful neutral language");
 });
 it("adapts guidance to all five learner stages without claiming a stage when unknown",()=>{
  for(const stage of [1,2,3,4,5] as const){
   expect(buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"ml",stage}).stageGuidance).toContain(`Stage ${stage}`);
  }
  expect(buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"ml"}).stageGuidance).toContain("not yet available");
 });
 it("passes only bounded learner-owned profile preferences into policy context",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",preferredName:"  Anu K  ",learningGoal:"Speak confidently at work",profileCorrectionPreference:"detailed"});
  expect(policy.learnerContext).toEqual({preferredName:"Anu K",learningGoal:"Speak confidently at work",profileCorrectionPreference:"detailed"});
 });
 it("omits blank profile values rather than inventing learner details",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",preferredName:" ",learningGoal:null});
  expect(policy.learnerContext).toEqual({});
 });
 it("includes only bounded learner-approved memory entries",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learnerMemory:[{category:"saved_phrase",memoryKey:"Useful phrase",content:"Could you please clarify?"}]});
  expect(policy.learnerMemory).toEqual([{category:"saved_phrase",memoryKey:"Useful phrase",content:"Could you please clarify?"}]);
  expect(buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml"}).learnerMemory).toEqual([]);
 });
 it("defines distinct correction and learning goals for each mode",()=>{
  const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
  const policies=modes.map(mode=>buildGabrooTeachingPolicy({mode,supportLanguage:"en"}));
  expect(new Set(policies.map(x=>x.primaryGoal)).size).toBeGreaterThanOrEqual(5);
 });
 it("keeps English acquisition and Malayalam support as separate language roles",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en"});
  expect(policy.learningDirection).toBe("ml_to_en");
  expect(policy.targetLanguage).toBe("en");
  expect(policy.supportLanguage).toBe("ml");
  expect(policy.responseGuidance.join(" ")).toContain("learner is learning English");
 });
 it("teaches Malayalam acquisition through English with script, romanisation and register safeguards",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml",stage:2});
  expect(policy.learningDirection).toBe("en_to_ml");
  expect(policy.targetLanguage).toBe("ml");
  expect(policy.supportLanguage).toBe("en");
  expect(policy.stageGuidance).toContain("Malayalam Stage 2");
  expect(policy.responseGuidance.join(" ")).toContain("show Malayalam script");
  expect(policy.responseGuidance.join(" ")).toContain("Never assume casual slang");
 });
 it("does not infer a Malayalam proficiency stage when none is supplied",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"en",learningDirection:"en_to_ml"});
  expect(policy.stageGuidance).toContain("stage is not yet available");
  expect(policy.stageGuidance).toContain("do not infer proficiency");
 });

});
