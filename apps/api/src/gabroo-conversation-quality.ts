export type GabrooConversationQualityInput={
 learnerMessage:string;
 gabrooReply:string;
 previousGabrooReplies?:string[];
};
export type GabrooConversationQuality={
 score:number;
 checks:{
  concise:boolean;
  asksAtMostOneQuestion:boolean;
  encouragesLearnerToElaborate:boolean;
  staysConnectedToLearnerWords:boolean;
  avoidsRepeatedGenericPrompt:boolean;
 };
 flags:Array<"overlong_reply"|"multiple_questions"|"missing_invitation_after_short_answer"|"weak_lexical_connection"|"repeated_generic_prompt">;
 evidence:{replyWordCount:number;questionCount:number;learnerKeywordOverlap:number};
};

/**
 * Deterministic coaching-quality signals for fixtures and offline QA.
 * This is not an AI semantic judge and must not be used to infer proficiency.
 * It does not persist, log or transmit learner text.
 */
const stopWords=new Set(["about","after","again","also","because","could","does","from","have","into","just","like","more","only","please","really","should","some","that","their","them","then","there","these","they","this","those","very","what","when","where","which","while","with","would","your","you","എനിക്ക്","എന്താണ്","ആണ്","ഒരു","ഇത്","അത്","പിന്നെ"]);
function words(value:string):string[]{
 return (value.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu)??[]).filter(word=>word.length>2&&!stopWords.has(word));
}
function questionCount(value:string):number{
 return (value.match(/\?/g)??[]).length;
}
function hasInvitation(value:string):boolean{
 return /\b(tell me|can you share|could you share|what makes you|why do you|how do you|what do you think|give me an example|can you explain|would you describe|which part|what happened|how did that|what would you|can you think of|try completing|finish this sentence)\b/i.test(value)
  ||/(കൂടുതൽ പറയൂ|ഒരു ഉദാഹരണം|എന്തുകൊണ്ട്|എങ്ങനെ തോന്നുന്നു|നിങ്ങളുടെ അഭിപ്രായം|പറഞ്ഞുതരാമോ)/.test(value);
}
function isGenericPrompt(value:string):boolean{
 return /^(tell me more|can you tell me more|what do you think)\??[.! ]*$/i.test(value.trim());
}
export function evaluateGabrooConversationTurn(input:GabrooConversationQualityInput):GabrooConversationQuality{
 const reply=input.gabrooReply.trim();
 const replyWords=words(reply);
 const learnerWords=new Set(words(input.learnerMessage));
 const overlap=replyWords.filter(word=>learnerWords.has(word)).length;
 const questions=questionCount(reply);
 const concise=replyWords.length<=90;
 const asksAtMostOneQuestion=questions<=1;
 const encouragesLearnerToElaborate=hasInvitation(reply);
 const staysConnectedToLearnerWords=learnerWords.size===0||overlap>0;
 const repeatedGenericPrompt=isGenericPrompt(reply)||(input.previousGabrooReplies?.some(previous=>isGenericPrompt(previous))===true&&isGenericPrompt(reply));
 const learnerAskedDirectQuestion=input.learnerMessage.includes("?")||/^(what|why|how|when|where|who|which|can|could|would|will|should|is|are|do|does|did|have|has|may|might)\b/i.test(input.learnerMessage.trim())||/^(എന്ത്|എന്താണ്|എങ്ങനെ|എന്തുകൊണ്ട്|എപ്പോൾ|എവിടെ|ആര്|ആരാണ്|ചെയ്യാമോ|പറ്റുമോ)/.test(input.learnerMessage.trim());
 const shortLearnerAnswer=words(input.learnerMessage).length<=8;
 const missingInvitationAfterShortAnswer=shortLearnerAnswer&&!learnerAskedDirectQuestion&&!encouragesLearnerToElaborate;
 const checks={concise,asksAtMostOneQuestion,encouragesLearnerToElaborate,staysConnectedToLearnerWords,avoidsRepeatedGenericPrompt:!repeatedGenericPrompt};
 const flags:GabrooConversationQuality["flags"]=[];
 if(!concise)flags.push("overlong_reply");
 if(!asksAtMostOneQuestion)flags.push("multiple_questions");
 if(missingInvitationAfterShortAnswer)flags.push("missing_invitation_after_short_answer");
 if(!staysConnectedToLearnerWords)flags.push("weak_lexical_connection");
 if(repeatedGenericPrompt)flags.push("repeated_generic_prompt");
 const passed=Object.values(checks).filter(Boolean).length;
 return {score:Math.round(passed/Object.keys(checks).length*100),checks,flags,evidence:{replyWordCount:replyWords.length,questionCount:questions,learnerKeywordOverlap:overlap}};
}
