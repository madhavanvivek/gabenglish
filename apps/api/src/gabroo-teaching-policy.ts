import type {GabrooConversationMode} from "./gabroo-conversations.js";

export type GabrooTeachingPolicy={
  mode:GabrooConversationMode;
  supportLanguage:"ml"|"en";
  learningDirection:"ml_to_en"|"en_to_ml";
  targetLanguage:"ml"|"en";
  correction:"none"|"gentle"|"detailed"|"task_focused";
  primaryGoal:"communicate"|"build_accuracy"|"practise_topic"|"rehearse_roleplay"|"grow_vocabulary"|"build_confidence";
  responseGuidance:string[];
  addressPolicy:string;
  stageGuidance:string;
  learnerContext:{preferredName?:string;learningGoal?:string;profileCorrectionPreference?:"gentle"|"balanced"|"detailed"};
  learnerMemory:Array<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memoryKey:string;content:string}>;
  vocabularyFocus:Array<{term:string;meaning:string;reason:"difficult"|"due"}>;
  skillFocus:Array<{skillKey:string;accuracy:number;attemptCount:number}>;
};

const policyByMode:Record<GabrooConversationMode,Omit<GabrooTeachingPolicy,"mode"|"supportLanguage"|"learningDirection"|"targetLanguage"|"addressPolicy"|"stageGuidance"|"learnerContext"|"learnerMemory"|"vocabularyFocus"|"skillFocus">>={
  free_flow:{correction:"none",primaryGoal:"communicate",responseGuidance:["Prioritise a natural conversation over teaching.","Do not interrupt the flow for minor errors.","Offer a correction only when meaning is unclear or the learner asks."]},
  gentle_correction:{correction:"gentle",primaryGoal:"build_accuracy",responseGuidance:["Acknowledge the learner's meaning first.","Correct at most one high-value issue in a turn.","Give a short, kind explanation and one natural example."]},
  detailed_correction:{correction:"detailed",primaryGoal:"build_accuracy",responseGuidance:["Give structured feedback on meaningful grammar and word-choice issues.","Distinguish errors from valid but less natural alternatives.","Avoid overwhelming the learner; group related feedback and invite a retry."]},
  topic_practice:{correction:"task_focused",primaryGoal:"practise_topic",responseGuidance:["Keep the conversation focused on the learner's chosen topic.","Ask one useful follow-up question at a time.","Use topic vocabulary in natural examples."]},
  role_play:{correction:"task_focused",primaryGoal:"rehearse_roleplay",responseGuidance:["Establish a realistic role and situation.","Stay in character unless the learner asks for coaching.","Offer a brief debrief and one improvement after a practice segment."]},
  vocabulary_building:{correction:"task_focused",primaryGoal:"grow_vocabulary",responseGuidance:["Teach a small number of useful words or phrases in context.","Include meaning, natural usage and one example.","Invite the learner to use a phrase in their own sentence."]},
  confidence_practice:{correction:"gentle",primaryGoal:"build_confidence",responseGuidance:["Make participation feel safe and achievable.","Praise specific communication successes without exaggeration.","Choose easy next steps and avoid correcting every mistake."]}
};

export function buildGabrooTeachingPolicy(input:{mode:GabrooConversationMode;supportLanguage:"ml"|"en";learningDirection?:"ml_to_en"|"en_to_ml";targetLanguage?:"ml"|"en";stage?:1|2|3|4|5;preferredName?:string|null;learningGoal?:string|null;profileCorrectionPreference?:"gentle"|"balanced"|"detailed";learnerMemory?:Array<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memoryKey:string;content:string}>;vocabularyFocus?:Array<{term:string;meaning:string;reason:"difficult"|"due"}>;skillFocus?:Array<{skillKey:string;accuracy:number;attemptCount:number}>}):GabrooTeachingPolicy{
 const selected=policyByMode[input.mode];
 const learningDirection=input.learningDirection??"ml_to_en";
 const targetLanguage=input.targetLanguage??(learningDirection==="ml_to_en"?"en":"ml");
 const stageGuidance=learningDirection==="en_to_ml"
  ?(input.stage===undefined
    ?"Malayalam-learning stage is not yet available: teach beginner-friendly Malayalam with clear English explanations; include Malayalam script and optional romanisation, distinguish spoken and formal register, teach respectful forms of address, and do not infer proficiency."
    :({
      1:"Malayalam Stage 1: introduce useful everyday Malayalam in script with optional romanisation and clear English meaning; model polite, safe phrases and context-appropriate register.",
      2:"Malayalam Stage 2: build short sentences and common interactions; explain word order, polite forms and context-appropriate register in English.",
      3:"Malayalam Stage 3: practise everyday conversations, listening-oriented phrasing and context-appropriate register; show script and optional romanisation.",
      4:"Malayalam Stage 4: develop fluency across social and practical situations; compare casual, neutral and formal alternatives and explain context-appropriate register.",
      5:"Malayalam Stage 5: focus on nuance, idiom, regional variation and formal accuracy; explain cultural/register choices without stereotyping."
    } as const)[input.stage])
  :(input.stage===undefined
    ?"English-learning stage is not yet available: use clear, accessible English and offer Malayalam support when requested; do not infer proficiency."
    :({
      1:"Stage 1 Malayalam Mode: explain mainly in Malayalam, introduce short useful English phrases, and build confidence.",
      2:"Stage 2 Malayalam + English Mix: explain in simple Malayalam-English mix and gradually increase useful English.",
      3:"Stage 3 English Practice Mode: use mostly simple English; provide Malayalam clarification when needed.",
      4:"Stage 4 English Immersion: use natural English and offer concise Malayalam clarification when requested.",
      5:"Stage 5 Expert Communication: focus on nuance, register, precision and professional communication; allow Malayalam clarification when requested."
    } as const)[input.stage]);
 const skillLabels:Record<string,string>={vocabulary:"vocabulary use",pronunciation:"pronunciation",sentence_formation:"sentence building",grammar:"grammar",listening:"listening comprehension",speaking:"speaking",fluency:"fluency",comprehension:"comprehension",conversation:"conversation skills",writing:"writing"};
 const skillFocus=(input.skillFocus??[]).filter(item=>Number.isFinite(item.accuracy)&&Number.isInteger(item.attemptCount)&&item.attemptCount>=5&&skillLabels[item.skillKey]!==undefined).slice(0,3).map(item=>({skillKey:item.skillKey,accuracy:Math.max(0,Math.min(1,item.accuracy)),attemptCount:item.attemptCount}));
 const skillEvidenceSummary=skillFocus.map(item=>`${skillLabels[item.skillKey]}: ${Math.round(item.accuracy*item.attemptCount)} of ${item.attemptCount} latest exercise attempts correct`).join("; ");
 return {
  mode:input.mode,
  supportLanguage:input.supportLanguage,
  learningDirection,
  targetLanguage,
  ...selected,
  responseGuidance:[...selected.responseGuidance,"Treat each learner message as a live conversational turn, not a worksheet. Identify the immediate intent before choosing whether to continue, explain, model, correct or ask a question.","When the learner asks a direct question or expresses confusion, resolve that doubt first in clear, stage-appropriate language. Do not ignore it to continue the previous exercise.","After resolving an interruption, briefly reconnect to the earlier topic or pending question when it is still relevant; do not make the learner repeat context already present in the conversation.","Use comprehensible stretch: keep most language accessible and introduce at most one manageable new phrase, richer structure or idea in a turn when it fits. Do not force advanced vocabulary into every reply.","Prefer one natural next step or one focused follow-up question. Check understanding through the conversation when useful, not with a repetitive quiz after every answer.",learningDirection==="ml_to_en"?"The learner is learning English; Malayalam is the support language unless their preference says otherwise. Keep English as the learning target and give useful English examples.":"The learner is learning Malayalam; English is the support language unless their preference says otherwise. Keep Malayalam as the learning target, show Malayalam script, optionally add readable romanisation, and explain register and politeness in English. Never assume casual slang is appropriate.",...(input.vocabularyFocus?.length?["When relevant, gently reuse one of the learner's difficult or due vocabulary items in a natural example. Do not turn every conversation into a quiz, interrupt the learner, or claim a word is mastered. Invite practice rather than forcing it."]:[]),...(skillFocus.length?[`Recent curriculum exercise evidence (not a proficiency assessment): ${skillEvidenceSummary}.`,"Use this evidence only to choose one small, relevant practice opportunity. Do not quote percentages or attempt counts to the learner; do not invent specific errors, label the learner, or present exercise performance as a speaking/proficiency diagnosis. Ask a natural question or offer one targeted example when it fits; otherwise keep the conversation flowing."]:[])],
  addressPolicy:"Use the learner's explicitly chosen name if available, otherwise use respectful neutral language. Never use 'eda', 'edi' or similar overfamiliar address by default. Do not infer that a learner welcomes slang from age, gender or writing style.",
  stageGuidance,
  learnerContext:{
   ...(input.preferredName?.trim()?{preferredName:input.preferredName.trim().slice(0,80)}:{}),
   ...(input.learningGoal?.trim()?{learningGoal:input.learningGoal.trim().slice(0,200)}:{}),
   ...(input.profileCorrectionPreference?{profileCorrectionPreference:input.profileCorrectionPreference}:{})
  },
  learnerMemory:(input.learnerMemory??[]).slice(0,20).map(item=>({category:item.category,memoryKey:item.memoryKey.slice(0,80),content:item.content.slice(0,500)})),
  vocabularyFocus:(input.vocabularyFocus??[]).filter(item=>item.term.trim()&&item.meaning.trim()).slice(0,5).map(item=>({term:item.term.slice(0,120),meaning:item.meaning.slice(0,240),reason:item.reason})),
  skillFocus
 };
}
