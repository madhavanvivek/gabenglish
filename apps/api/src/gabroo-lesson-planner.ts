import type {GabrooLearningDecision,GabrooSkill} from "./gabroo-learning-model.js";

export type GabrooLessonBlueprint={
 version:"1.0.0";
 activity:GabrooLearningDecision["activity"];
 focus_skill:GabrooSkill|null;
 target_language:"en"|"ml";
 support_language:"ml"|"en";
 correction_style:GabrooLearningDecision["correctionStyle"];
 objective:string;
 format:"guided_example_then_recall"|"spaced_retrieval"|"listen_then_respond"|"supported_speaking"|"confidence_warmup"|"diagnostic_check";
 steps:string[];
 completion_check:string;
 scoring_boundary:string;
};

const skillContent:Record<GabrooSkill,{objective:string;format:GabrooLessonBlueprint["format"];steps:string[];completion:string}> = {
 grammar:{
  objective:"Notice one useful grammar pattern, practise it with support, then use it in a new sentence.",
  format:"guided_example_then_recall",
  steps:["Show one short example with a Malayalam explanation when support language is Malayalam.","Ask the learner to identify the pattern in a second example.","Give one guided transformation task.","Ask for one original sentence using the same pattern.","Offer a gentle correction and invite a retry."],
  completion:"The learner produces a new sentence that applies the target pattern."
 },
 vocabulary:{
  objective:"Retrieve useful words from memory and use them naturally in context.",
  format:"spaced_retrieval",
  steps:["Present a small set of due words with meaning in the support language.","Ask the learner to recall each meaning before revealing it.","Use a short contextual choice task.","Ask the learner to create one sentence with a recalled word.","Schedule missed words for an earlier review."],
  completion:"The learner recalls and uses at least one target word in a new context."
 },
 comprehension:{
  objective:"Understand the meaning and intent of a short message, then respond appropriately.",
  format:"listen_then_respond",
  steps:["Present a short spoken or written message in the target language.","Ask one meaning-focused question without showing the answer.","Offer a support-language hint only after the first attempt.","Ask the learner to choose or say an appropriate response.","Explain why the response fits the context."],
  completion:"The learner identifies the message's meaning and selects an appropriate response."
 },
 pronunciation:{
  objective:"Practise intelligibility of one sound or phrase using an audio-capable feedback path.",
  format:"supported_speaking",
  steps:["Play a short reference phrase at the learner's selected speed.","Invite a recording only after clear microphone consent.","Compare with a validated audio evaluator when configured.","Give one actionable sound or stress cue.","Allow a retry and compare the new attempt."],
  completion:"A consented audio attempt receives a valid evaluator result; otherwise mark the activity as practice-only."
 },
 fluency:{
  objective:"Build comfortable, connected speech without treating speed as the measure of fluency.",
  format:"supported_speaking",
  steps:["Give a familiar topic and a few optional idea prompts.","Invite a short spoken response at a comfortable pace.","Use audio timing only when an audio evaluator is available.","Reflect one strength and one manageable next step.","Invite a second attempt with the same meaning."],
  completion:"The learner completes a second response; score only with validated audio evidence."
 },
 confidence:{
  objective:"Make speaking practice feel manageable and let the learner control the level of challenge.",
  format:"confidence_warmup",
  steps:["Offer a low-pressure choice of familiar topics.","Ask the learner to choose how much support they want.","Begin with one short response and no interruption.","Ask the learner how comfortable the task felt.","Offer a slightly more challenging optional retry."],
  completion:"The learner completes a chosen low-pressure task and may optionally self-rate comfort."
 }
};

export function buildGabrooLessonBlueprint(decision:GabrooLearningDecision):GabrooLessonBlueprint{
 if(decision.status==="needs_placement"){
  return {
   version:"1.0.0",activity:"placement_task",focus_skill:null,
   target_language:decision.targetLanguage,support_language:decision.supportLanguage,
   correction_style:decision.correctionStyle,objective:"Gather a small amount of structured evidence without assigning a proficiency label.",
   format:"diagnostic_check",
   steps:["Explain that this is a supportive starting activity, not an exam.","Offer one short vocabulary task and one meaning-focused comprehension task.","Ask the learner to answer in their preferred supported format.","Record only explicit, task-linked rubric outcomes.","Leave skills without evidence unestimated."],
   completion_check:"At least one completed, versioned task produces a validated rubric outcome.",
   scoring_boundary:"Do not infer a level from response length, accent, demographics or unvalidated text heuristics."
  };
 }
 const skill=decision.focusSkill;
 if(!skill){
  return {
   version:"1.0.0",activity:decision.activity,focus_skill:null,
   target_language:decision.targetLanguage,support_language:decision.supportLanguage,
   correction_style:decision.correctionStyle,objective:"Practise communication broadly while collecting varied task evidence.",
   format:"supported_speaking",
   steps:["Offer a familiar, learner-chosen topic.","Invite a short response in the target language with support available.","Ask one natural follow-up question.","Give feedback only where the response provides valid evidence.","Let the learner choose whether to continue or switch to free conversation."],
   completion_check:"The learner completes a short interaction and can choose the next activity.",
   scoring_boundary:"Do not turn conversational volume or transcript statistics into proficiency scores."
  };
 }
 const content=skillContent[skill];
 return {
  version:"1.0.0",activity:decision.activity,focus_skill:skill,
  target_language:decision.targetLanguage,support_language:decision.supportLanguage,
  correction_style:decision.correctionStyle,objective:content.objective,
  format:content.format,steps:content.steps,completion_check:content.completion,
  scoring_boundary:skill==="pronunciation"||skill==="fluency"
   ?"Do not score from transcript text; require a consented, validated audio evaluation."
   :skill==="confidence"
    ?"Use learner self-report only; do not infer confidence from speech style or demographics."
    :"Record a score only from an explicit, versioned task rubric."
 };
}
