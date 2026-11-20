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

type GrammarObservation = {category:"subject_verb_agreement"|"verb_form"|"past_tense_form";example:string;note:string};
function collectGrammarObservations(value:string):GrammarObservation[]{
 const findings:GrammarObservation[]=[];
 const add=(category:GrammarObservation["category"],example:string,note:string)=>{
  if(findings.length<3&&!findings.some(item=>item.category===category&&item.example.toLowerCase()===example.toLowerCase()))findings.push({category,example,note});
 };
 for(const match of value.matchAll(/\b(he|she|it)\s+(go|work|like|want|need|have|do|play|study|eat|speak|live|watch|make|take|come|know|say)\b/gi))add("subject_verb_agreement",match[0],"With he, she or it in the present simple, this verb often needs an -s or -es ending.");
 for(const match of value.matchAll(/\b(i|you|we|they)\s+has\b/gi))add("subject_verb_agreement",match[0],"Check the subject: has is normally used with he, she or it; use have with I, you, we or they.");
 for(const match of value.matchAll(/\b(he|she|it)\s+are\b/gi))add("subject_verb_agreement",match[0],"Check subject and be-verb agreement: he, she and it normally pair with is.");
 for(const match of value.matchAll(/\b(i|he|she|it|we|they|you)\s+am\s+(go|work|like|want|need|have|do|play|study|eat|speak|live|watch|make|take|come|know|say)\b/gi))add("verb_form",match[0],"After am, a continuous action usually needs an -ing form, or choose the simple present if it is a routine.");
 for(const match of value.matchAll(/\bdid\s+(went|ate|saw|did|made|took|came|spoke|wrote|bought)\b/gi))add("past_tense_form",match[0],"After did, use the base form of the main verb.");
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
