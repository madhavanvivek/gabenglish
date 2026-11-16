import type {GabrooConversationMode} from "./gabroo-conversations.js";

export type GabrooTeachingPolicy={
  mode:GabrooConversationMode;
  supportLanguage:"ml"|"en";
  correction:"none"|"gentle"|"detailed"|"task_focused";
  primaryGoal:"communicate"|"build_accuracy"|"practise_topic"|"rehearse_roleplay"|"grow_vocabulary"|"build_confidence";
  responseGuidance:string[];
  addressPolicy:string;
  stageGuidance:string;
};

const policyByMode:Record<GabrooConversationMode,Omit<GabrooTeachingPolicy,"mode"|"supportLanguage"|"addressPolicy"|"stageGuidance">>={
  free_flow:{correction:"none",primaryGoal:"communicate",responseGuidance:["Prioritise a natural conversation over teaching.","Do not interrupt the flow for minor errors.","Offer a correction only when meaning is unclear or the learner asks."]},
  gentle_correction:{correction:"gentle",primaryGoal:"build_accuracy",responseGuidance:["Acknowledge the learner's meaning first.","Correct at most one high-value issue in a turn.","Give a short, kind explanation and one natural example."]},
  detailed_correction:{correction:"detailed",primaryGoal:"build_accuracy",responseGuidance:["Give structured feedback on meaningful grammar and word-choice issues.","Distinguish errors from valid but less natural alternatives.","Avoid overwhelming the learner; group related feedback and invite a retry."]},
  topic_practice:{correction:"task_focused",primaryGoal:"practise_topic",responseGuidance:["Keep the conversation focused on the learner's chosen topic.","Ask one useful follow-up question at a time.","Use topic vocabulary in natural examples."]},
  role_play:{correction:"task_focused",primaryGoal:"rehearse_roleplay",responseGuidance:["Establish a realistic role and situation.","Stay in character unless the learner asks for coaching.","Offer a brief debrief and one improvement after a practice segment."]},
  vocabulary_building:{correction:"task_focused",primaryGoal:"grow_vocabulary",responseGuidance:["Teach a small number of useful words or phrases in context.","Include meaning, natural usage and one example.","Invite the learner to use a phrase in their own sentence."]},
  confidence_practice:{correction:"gentle",primaryGoal:"build_confidence",responseGuidance:["Make participation feel safe and achievable.","Praise specific communication successes without exaggeration.","Choose easy next steps and avoid correcting every mistake."]}
};

export function buildGabrooTeachingPolicy(input:{mode:GabrooConversationMode;supportLanguage:"ml"|"en";stage?:1|2|3|4|5}):GabrooTeachingPolicy{
 const selected=policyByMode[input.mode];
 const stageGuidance=input.stage===undefined
  ?"Learner stage is not yet available: use clear, accessible English and offer Malayalam support when requested; do not infer proficiency."
  :({
   1:"Stage 1 Malayalam Mode: explain mainly in Malayalam, introduce short useful English phrases, and build confidence.",
   2:"Stage 2 Malayalam + English Mix: explain in simple Malayalam-English mix and gradually increase useful English.",
   3:"Stage 3 English Practice Mode: use mostly simple English; provide Malayalam clarification when needed.",
   4:"Stage 4 English Immersion: use natural English and offer concise Malayalam clarification when requested.",
   5:"Stage 5 Expert Communication: focus on nuance, register, precision and professional communication; allow Malayalam clarification when requested."
  } as const)[input.stage];
 return {
  mode:input.mode,
  supportLanguage:input.supportLanguage,
  ...selected,
  addressPolicy:"Use the learner's explicitly chosen name if available, otherwise use respectful neutral language. Never use 'eda', 'edi' or similar overfamiliar address by default. Do not infer that a learner welcomes slang from age, gender or writing style.",
  stageGuidance
 };
}
