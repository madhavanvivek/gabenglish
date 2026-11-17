/**
 * Draft-only assessment blueprint for the en_to_ml course.
 * Not an active assessment: no scoring, proficiency bands, or stage mapping.
 * Publish only after fluent Malayalam educator review and task validation.
 */
export type MalayalamAssessmentSkill =
  | "listening_comprehension" | "functional_vocabulary" | "phrase_recall"
  | "sentence_construction" | "conversational_response" | "script_recognition";
export type MalayalamAssessmentTask = {
  id: string;
  skill: MalayalamAssessmentSkill;
  taskType: "listen_and_choose" | "meaning_match" | "recall_phrase" | "build_response" | "scenario_reply" | "script_opt_in";
  learnerInstruction: string;
  evidenceCaptured: string[];
  limitations: string[];
};
export const malayalamAssessmentBlueprint = {
  id: "en_to_ml_foundation_v1",
  version: 1,
  direction: "en_to_ml",
  sourceLanguage: "en",
  targetLanguage: "ml",
  status: "draft_unreviewed",
  publicationEnabled: false,
  scoringEnabled: false,
  proficiencyLabel: null,
  tasks: [
    {id:"ml-listening-01",skill:"listening_comprehension",taskType:"listen_and_choose",learnerInstruction:"Listen to a reviewed Malayalam utterance and choose the meaning that best fits its context.",evidenceCaptured:["selected meaning","response time"],limitations:["Requires educator-reviewed recording and distractors.","A text-only substitute cannot assess listening."]},
    {id:"ml-vocabulary-01",skill:"functional_vocabulary",taskType:"meaning_match",learnerInstruction:"Match a familiar everyday Malayalam expression to its meaning in English.",evidenceCaptured:["selected meaning","item context"],limitations:["Recognition does not establish independent recall or conversational ability."]},
    {id:"ml-recall-01",skill:"phrase_recall",taskType:"recall_phrase",learnerInstruction:"Recall a suitable Malayalam phrase for a clearly described everyday situation.",evidenceCaptured:["learner response","script or romanisation mode"],limitations:["Acceptable variants and transliteration need educator-defined review."]},
    {id:"ml-sentence-01",skill:"sentence_construction",taskType:"build_response",learnerInstruction:"Arrange or construct a short Malayalam response for a practical situation.",evidenceCaptured:["constructed response","hint usage"],limitations:["Word order and inflection must be evaluated with reviewed alternatives."]},
    {id:"ml-conversation-01",skill:"conversational_response",taskType:"scenario_reply",learnerInstruction:"Respond to a short everyday scenario using an appropriate Malayalam expression.",evidenceCaptured:["response text","scenario context","chosen register when prompted"],limitations:["Text cannot establish pronunciation, listening fluency or real-time speaking ability."]},
    {id:"ml-script-01",skill:"script_recognition",taskType:"script_opt_in",learnerInstruction:"Optionally identify a familiar Malayalam character or word in Malayalam script.",evidenceCaptured:["opt-in choice","selected script item"],limitations:["Do not include in a learner's result unless script learning was explicitly enabled."]}
  ] satisfies MalayalamAssessmentTask[]
} as const;
