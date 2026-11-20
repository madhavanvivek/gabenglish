export type EvidenceSource = "text" | "voice_transcript";
export type EvidenceSampleSize = "brief" | "extended";

export type ResponseEvidence = {
  promptId: string;
  source: EvidenceSource;
  /** Empty until educator-reviewed prompt-to-skill mappings are implemented. */
  observedSkills: [];
  observations: string[];
  grammarObservations: GrammarObservation[];
  /** Describes sample length only; it is not confidence in learner ability. */
  sampleSize: EvidenceSampleSize;
  limitations: string[];
  metrics: {
    wordCount: number;
    uniqueWordCount: number;
    uniqueWordRatio: number;
    averageWordsPerSentence: number;
    sentenceCount: number;
    connectorCount: number;
    hasPastReference: boolean;
    hasReasoningMarker: boolean;
  };
};

const CONNECTORS = /\b(because|although|however|therefore|while|whereas|for example|if|when|since|but|so)\b/gi;
const PAST_MARKERS = /\b(yesterday|last\s+(?:week|month|year|weekend)|ago|was|were|did|went|had|visited|worked|studied|made|saw)\b/i;
const REASON_MARKERS = /\b(because|since|the reason|so that|therefore)\b/i;

type GrammarObservation = {category:"subject_verb_agreement"|"verb_form"|"past_tense_form";example:string;note:string;supportNoteMl:string;suggestion:string};
function buildMalayalamGrammarSupport(note:string):string{
 if(note.startsWith("With he, she or it"))return "Present simple-ൽ he, she, it എന്നിവയോടൊപ്പം ക്രിയയ്ക്ക് സാധാരണയായി -s അല്ലെങ്കിൽ -es ചേർക്കും.";
 if(note.startsWith("Has normally"))return "I, you, we, they എന്നിവയോടൊപ്പം have ഉപയോഗിക്കുക; he, she, it എന്നിവയോടൊപ്പം has ഉപയോഗിക്കുക.";
 if(note.startsWith("He, she and it"))return "He, she, it എന്നിവയോടൊപ്പം are-ന് പകരം is ഉപയോഗിക്കുക.";
 if(note.startsWith("I pairs"))return "I-യോടൊപ്പം am; you, we, they എന്നിവയോടൊപ്പം are ഉപയോഗിക്കുക.";
 if(note.startsWith("After am"))return "am-ന് ശേഷം ഇപ്പോൾ തുടരുന്ന പ്രവർത്തിക്ക് ക്രിയയുടെ -ing രൂപം ഉപയോഗിക്കുക. agree, know, understand പോലുള്ള ചില ക്രിയകൾ സാധാരണയായി ഈ രൂപത്തിൽ വരില്ല.";
 if(note.startsWith("After does"))return "does / does not വന്നാൽ പിന്നാലെയുള്ള പ്രധാന ക്രിയയുടെ അടിസ്ഥാനരൂപം ഉപയോഗിക്കുക. ഉദാഹരണം: does not go.";
 if(note.startsWith("After did"))return "did / did not വന്നാൽ പിന്നാലെയുള്ള പ്രധാന ക്രിയയുടെ അടിസ്ഥാനരൂപം ഉപയോഗിക്കുക. ഉദാഹരണം: did not go.";
 if(note.startsWith("After a modal"))return "can, should, will പോലുള്ള modal verb-ുകൾക്ക് ശേഷം പ്രധാന ക്രിയയുടെ അടിസ്ഥാനരൂപം ഉപയോഗിക്കുക. ഉദാഹരണം: can speak.";
 throw new Error("No Malayalam support copy for grammar note: "+note);
}
function collectGrammarObservations(value:string):GrammarObservation[]{
 const findings:GrammarObservation[]=[];
 const add=(category:GrammarObservation["category"],example:string,note:string,suggestion:string)=>{
  if(findings.length<3&&!findings.some(item=>item.category===category&&item.example.toLowerCase()===example.toLowerCase()))findings.push({category,example,note,supportNoteMl:buildMalayalamGrammarSupport(note),suggestion});
 };
 const verbs="go|work|like|want|need|have|do|play|study|eat|speak|live|watch|make|take|come|know|say|read|write|run|drink|buy|visit|teach|try";
 for(const match of value.matchAll(new RegExp("\\b(he|she|it)\\s+("+verbs+")\\b","gi"))){
  const base=match[2]!.toLowerCase();
  const thirdPerson=base==="have"?"has":base==="do"?"does":base==="go"?"goes":base.endsWith("y")?base.slice(0,-1)+"ies":base+"s";
  add("subject_verb_agreement",match[0],"With he, she or it in the present simple, this verb usually needs an -s or -es ending.",match[0].replace(new RegExp("\\b"+base+"$","i"),thirdPerson));
 }
 for(const match of value.matchAll(/\b(i|you|we|they)\s+has\b/gi))add("subject_verb_agreement",match[0],"Has normally pairs with he, she or it; use have with I, you, we or they.",match[0].replace(/has$/i,"have"));
 for(const match of value.matchAll(/\b(he|she|it)\s+are\b/gi))add("subject_verb_agreement",match[0],"He, she and it normally pair with is.",match[0].replace(/are$/i,"is"));
 for(const match of value.matchAll(/\b(i|you|we|they)\s+is\b/gi))add("subject_verb_agreement",match[0],"I pairs with am; you, we and they normally pair with are.",match[1]!.toLowerCase()==="i"?match[0].replace(/is$/i,"am"):match[0].replace(/is$/i,"are"));
 for(const match of value.matchAll(/\b(i|he|she|it|we|they|you)\s+am\s+(go|work|like|want|need|have|do|play|study|eat|speak|live|watch|make|take|come|know|say|agree|understand)\b/gi)){
  const verb=match[2]!.toLowerCase();
  const suggestion=["agree","understand","know","have","want","need","like"].includes(verb)?match[0].replace(/\bam\s+/i,""):match[0].replace(new RegExp("\\b"+verb+"$","i"),verb.endsWith("e")?verb.slice(0,-1)+"ing":verb+"ing");
  add("verb_form",match[0],"After am, use an -ing form for an action in progress. Verbs such as agree, know and understand are usually not used in this continuous form.",suggestion);
 }
 for(const match of value.matchAll(/\b((?:(?:he|she|it|i|you|we|they)\s+)?does(?:\s+not|n't))\s+(goes|works|likes|wants|needs|has|does|plays|studies|eats|speaks|lives|watches|makes|takes|comes|knows|says)\b/gi)){
  const form=match[2]!.toLowerCase();
  const base=form==="has"?"have":form==="does"?"do":form==="goes"?"go":form==="studies"?"study":form.replace(/s$/,"");
  add("verb_form",match[0],"After does or doesn't, use the base form of the main verb.",match[0].replace(new RegExp(form+"$","i"),base));
 }
 for(const match of value.matchAll(/\b(did|didn't|did\s+not)\s+(went|ate|saw|did|made|took|came|spoke|wrote|bought|visited|worked|studied)\b/gi)){
  const base:Record<string,string>={went:"go",ate:"eat",saw:"see",did:"do",made:"make",took:"take",came:"come",spoke:"speak",wrote:"write",bought:"buy",visited:"visit",worked:"work",studied:"study"};
  add("past_tense_form",match[0],"After did or didn't, use the base form of the main verb.",match[0].replace(new RegExp(match[2]+"$","i"),base[match[2]!.toLowerCase()]!));
 }
 for(const match of value.matchAll(/\b(can|could|should|would|will|must|may|might)\s+(goes|works|likes|wants|needs|has|does|plays|studies|eats|speaks|lives|watches|makes|takes|comes|knows|says)\b/gi)){
  const form=match[2]!.toLowerCase();
  const base=form==="has"?"have":form==="does"?"do":form==="goes"?"go":form==="studies"?"study":form.replace(/s$/,"");
  add("verb_form",match[0],"After a modal verb such as can, should or will, use the base form of the next verb.",match[0].replace(new RegExp(form+"$","i"),base));
 }
 return findings;
}

function countMatches(value: string, expression: RegExp): number {
  return [...value.matchAll(expression)].length;
}

/**
 * Extracts observable response features only. It deliberately does not grade
 * grammar, vocabulary, comprehension, pronunciation or proficiency.
 */
export function extractResponseEvidence(
  promptId: string,
  response: string,
  source: EvidenceSource = "text",
): ResponseEvidence {
  const clean = response.trim();
  const words = clean.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu) ?? [];
  const sentenceParts = clean.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const normalizedWords = words.map((word) => word.toLocaleLowerCase());
  const uniqueWordCount = new Set(normalizedWords).size;
  const uniqueWordRatio = words.length === 0 ? 0 : Math.round((uniqueWordCount / words.length) * 100) / 100;
  const averageWordsPerSentence = sentenceParts.length === 0 ? 0 : Math.round((words.length / sentenceParts.length) * 10) / 10;
  const connectorCount = countMatches(clean, CONNECTORS);
  const hasPastReference = PAST_MARKERS.test(clean);
  const hasReasoningMarker = REASON_MARKERS.test(clean);
  const observations: string[] = [];
  const grammarObservations = collectGrammarObservations(clean);

  if (words.length >= 20) observations.push("The response contains an extended sample.");
  else if (words.length >= 8) observations.push("The response contains a short connected sample.");
  else observations.push("The response is brief; more evidence is needed.");

  if (sentenceParts.length > 1) observations.push("More than one sentence was provided.");
  if (connectorCount > 0) observations.push("One or more discourse connectors were used.");
  if (hasPastReference) observations.push("A possible past-time reference appears in the response.");
  if (hasReasoningMarker) observations.push("A possible reason or explanation marker appears.");
  if (grammarObservations.length > 0) observations.push("A few grammar patterns may be worth reviewing; automated checks can miss context and valid alternatives.");

  const limitations = source === "text"
    ? ["Text does not provide evidence of pronunciation or spoken fluency.", "Automated surface features are not a validated grammar or proficiency score."]
    : ["Transcript text cannot establish pronunciation quality.", "Speech-recognition errors may affect the transcript and must be reviewed separately."];

  return {
    promptId,
    source,
    observedSkills: [],
    observations,
    grammarObservations,
    sampleSize: words.length >= 20 ? "extended" : "brief",
    limitations,
    metrics: {
      wordCount: words.length,
      uniqueWordCount,
      uniqueWordRatio,
      averageWordsPerSentence,
      sentenceCount: sentenceParts.length,
      connectorCount,
      hasPastReference,
      hasReasoningMarker,
    },
  };
}
