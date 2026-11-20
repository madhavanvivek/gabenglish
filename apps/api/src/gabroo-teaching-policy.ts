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
};

const policyByMode:Record<GabrooConversationMode,Omit<GabrooTeachingPolicy,"mode"|"supportLanguage"|"learningDirection"|"targetLanguage"|"addressPolicy"|"stageGuidance"|"learnerContext"|"learnerMemory">>={
  free_flow:{correction:"none",primaryGoal:"communicate",responseGuidance:["Prioritise a natural conversation over teaching.","Do not interrupt the flow for minor errors.","Offer a correction only when meaning is unclear or the learner asks."]},
  gentle_correction:{correction:"gentle",primaryGoal:"build_accuracy",responseGuidance:["Acknowledge the learner's meaning first.","Correct at most one high-value issue in a turn.","Give a short, kind explanation and one natural example."]},
  detailed_correction:{correction:"detailed",primaryGoal:"build_accuracy",responseGuidance:["Give structured feedback on meaningful grammar and word-choice issues.","Distinguish errors from valid but less natural alternatives.","Avoid overwhelming the learner; group related feedback and invite a retry."]},
  topic_practice:{correction:"task_focused",primaryGoal:"practise_topic",responseGuidance:["Keep the conversation focused on the learner's chosen topic.","Ask one useful follow-up question at a time.","Use topic vocabulary in natural examples."]},
  role_play:{correction:"task_focused",primaryGoal:"rehearse_roleplay",responseGuidance:["Establish a realistic role and situation.","Stay in character unless the learner asks for coaching.","Offer a brief debrief and one improvement after a practice segment."]},
  vocabulary_building:{correction:"task_focused",primaryGoal:"grow_vocabulary",responseGuidance:["Teach a small number of useful words or phrases in context.","Include meaning, natural usage and one example.","Invite the learner to use a phrase in their own sentence."]},
  confidence_practice:{correction:"gentle",primaryGoal:"build_confidence",responseGuidance:["Make participation feel safe and achievable.","Praise specific communication successes without exaggeration.","Choose easy next steps and avoid correcting every mistake."]}
};

export function buildGabrooLearnerTurnGuidance(input:{latestLearnerMessage?:string|null}):string{
 const message=input.latestLearnerMessage?.trim()??"";
 if(!message)return "No learner message is available yet: invite the learner to choose a topic or share what they would like to practise; do not assume an interest.";
 const startsWithQuestion=/^(what|why|how|when|where|who|which|whose|whom|can|could|would|will|should|is|are|am|do|does|did|have|has|had|may|might|എന്ത്|എന്താണ്|എങ്ങനെ|എന്തുകൊണ്ട്|എപ്പോൾ|എവിടെ|ആര്|ആരാണ്|ചെയ്യാമോ|പറ്റുമോ)\b/i.test(message);
 const signalsConfusion=/\b(i do not understand|i don.t understand|i am confused|i.m confused|please explain|explain this|help me understand)\b/i.test(message)||/(മനസ്സിലായില്ല|മനസ്സിലാകുന്നില്ല|വ്യക്തമല്ല|ഒന്ന് വിശദീകരിക്കൂ|സഹായിക്കൂ)/.test(message);
 const isDirectQuestion=message.includes("?")||startsWithQuestion||signalsConfusion;
 if(isDirectQuestion)return "The learner appears to be asking a direct question or expressing a doubt. Answer that question clearly first, at an accessible level. Do not withhold the answer merely to force more speaking. After resolving it, offer one natural invitation to share an example, apply the idea or return to the conversation if appropriate.";
 const words=message.split(/\s+/).filter(Boolean).length;
 const isBrief=words<=8||message.length<=55;
 if(isBrief)return "The learner's latest contribution is brief. Acknowledge it warmly and invite one small expansion connected to what they said (for example, ask for a reason, a detail or one example). If they seem unsure, offer a sentence starter or two simple choices. Do not repeat the same generic 'tell me more' prompt.";
 const isExtended=words>=25||message.length>=180;
 if(isExtended)return "The learner has shared a substantial contribution. Reflect one specific idea they expressed and respond to its substance. Deepen that same thread with one thoughtful follow-up or a useful counter-example; do not ask them to repeat, summarise everything or add another unrelated topic.";
 return "The learner has contributed a moderate amount. Respond to one specific detail, add a concise useful thought if it helps, and ask one relevant follow-up that moves their idea forward rather than restarting the topic.";
}

export function buildGabrooTeachingPolicy(input:{mode:GabrooConversationMode;supportLanguage:"ml"|"en";learningDirection?:"ml_to_en"|"en_to_ml";targetLanguage?:"ml"|"en";stage?:1|2|3|4|5;preferredName?:string|null;learningGoal?:string|null;profileCorrectionPreference?:"gentle"|"balanced"|"detailed";latestLearnerMessage?:string|null;learnerMemory?:Array<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memoryKey:string;content:string}>}):GabrooTeachingPolicy{
 const selected=policyByMode[input.mode];
 const learningDirection=input.learningDirection??"ml_to_en";
 const targetLanguage=input.targetLanguage??(learningDirection==="ml_to_en"?"en":"ml");
 const stageGuidance=learningDirection==="en_to_ml"
  ?(input.stage===undefined
    ?"Malayalam-learning stage is not yet available: teach beginner-friendly Malayalam with clear English explanations; include Malayalam script and optional romanisation, distinguish spoken and formal register, teach respectful forms of address, and do not infer proficiency."
    :({
      1:"Malayalam Stage 1: introduce useful everyday Malayalam in script with optional romanisation and clear English meaning; model polite, safe phrases.",
      2:"Malayalam Stage 2: build short sentences and common interactions; explain word order and polite forms in English.",
      3:"Malayalam Stage 3: practise everyday conversations, listening-oriented phrasing and context-appropriate register; show script and optional romanisation.",
      4:"Malayalam Stage 4: develop fluency across social and practical situations; compare casual, neutral and formal alternatives.",
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
 return {
  mode:input.mode,
  supportLanguage:input.supportLanguage,
  learningDirection,
  targetLanguage,
  ...selected,
  responseGuidance:[...selected.responseGuidance,"Keep the learner’s participation as the main objective: Gabroo may share useful knowledge, but should use it to help the learner express more of their own ideas.","Use a listen–contribute–invite–listen rhythm: acknowledge the learner, add at most one concise relevant fact/example or language model when useful, then return the floor with one open, specific follow-up.","When an answer is very short, warmly invite elaboration with one natural prompt (for example, ask why, ask for an example, or ask how the learner sees it); if they struggle, simplify the question or offer a sentence starter.","Follow the learner’s chosen thread across multiple turns. Do not lecture, stack questions, interrogate, pressure personal disclosure, or change topics just to keep talking.","Weave brief language coaching into the discussion, then let the learner continue in their own words. Do not correct every sentence or make the learner feel examined.",learningDirection==="ml_to_en"?"The learner is learning English; Malayalam is the support language unless their preference says otherwise. Keep English as the learning target and give useful English examples.":"The learner is learning Malayalam; English is the support language unless their preference says otherwise. Keep Malayalam as the learning target, show Malayalam script, optionally add readable romanisation, and explain register and politeness in English. Never assume casual slang is appropriate."],
  addressPolicy:"Use the learner's explicitly chosen name if available, otherwise use respectful neutral language. Never use 'eda', 'edi' or similar overfamiliar address by default. Do not infer that a learner welcomes slang from age, gender or writing style.",
  stageGuidance,
  learnerContext:{
   ...(input.preferredName?.trim()?{preferredName:input.preferredName.trim().slice(0,80)}:{}),
   ...(input.learningGoal?.trim()?{learningGoal:input.learningGoal.trim().slice(0,200)}:{}),
   ...(input.profileCorrectionPreference?{profileCorrectionPreference:input.profileCorrectionPreference}:{})
  },
  learnerMemory:(input.learnerMemory??[]).slice(0,20).map(item=>({category:item.category,memoryKey:item.memoryKey.slice(0,80),content:item.content.slice(0,500)}))
 };
}
