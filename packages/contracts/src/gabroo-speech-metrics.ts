/**
 * Deterministic offline metrics for Gabroo STT benchmark reports.
 * This module handles text only; it never reads audio or contacts a provider.
 */

export interface SpeechTextMetrics {
 wordErrorRate:number;
 characterErrorRate:number;
 referenceWords:number;
 referenceCharacters:number;
 substitutions:number;
 deletions:number;
 insertions:number;
}

function normaliseText(value:string):string{
 return value.normalize("NFC").trim().replace(/\s+/gu," ");
}

function wordTokens(value:string):string[]{
 const normalised=normaliseText(value).toLocaleLowerCase();
 return normalised
  .replace(/[\p{P}\p{S}]/gu," ")
  .split(/\s+/u)
  .filter(Boolean);
}

/**
 * Uses Unicode code points rather than grapheme clusters. This is deterministic
 * across supported JS runtimes, but combining sequences that remain distinct
 * after NFC may count as multiple characters; benchmark reports must note it.
 */
function characterTokens(value:string):string[]{
 return Array.from(normaliseText(value).replace(/\s/gu,""));
}

function editCounts<T>(reference:T[],hypothesis:T[]):{substitutions:number;deletions:number;insertions:number}{
 const rows=reference.length+1;
 const cols=hypothesis.length+1;
 const distance=Array.from({length:rows},()=>new Array<number>(cols).fill(0));
 const operation=Array.from({length:rows},()=>new Array<"match"|"substitution"|"deletion"|"insertion">(cols));
 for(let i=1;i<rows;i++){distance[i][0]=i;operation[i][0]="deletion";}
 for(let j=1;j<cols;j++){distance[0][j]=j;operation[0][j]="insertion";}
 for(let i=1;i<rows;i++){
  for(let j=1;j<cols;j++){
   if(reference[i-1]===hypothesis[j-1]){
    distance[i][j]=distance[i-1][j-1];operation[i][j]="match";
   }else{
    const choices=[
     {cost:distance[i-1][j-1]+1,op:"substitution" as const},
     {cost:distance[i-1][j]+1,op:"deletion" as const},
     {cost:distance[i][j-1]+1,op:"insertion" as const}
    ].sort((a,b)=>a.cost-b.cost);
    distance[i][j]=choices[0].cost;operation[i][j]=choices[0].op;
   }
  }
 }
 let i=reference.length,j=hypothesis.length;
 let substitutions=0,deletions=0,insertions=0;
 while(i>0||j>0){
  const op=operation[i][j];
  if(op==="match"){i--;j--;}
  else if(op==="substitution"){substitutions++;i--;j--;}
  else if(op==="deletion"){deletions++;i--;}
  else if(op==="insertion"){insertions++;j--;}
  else break;
 }
 return {substitutions,deletions,insertions};
}

/**
 * WER tokenises on whitespace after punctuation/symbol removal.
 * CER uses NFC-normalised Unicode code points with whitespace removed.
 * Empty references return zero only when the hypothesis is also empty;
 * otherwise the error rate is the insertion count (unbounded by 1).
 */
export function scoreSpeechTranscript(reference:string,hypothesis:string):SpeechTextMetrics{
 if(typeof reference!=="string"||typeof hypothesis!=="string")throw new TypeError("Speech benchmark text must be strings.");
 const referenceWords=wordTokens(reference);
 const hypothesisWords=wordTokens(hypothesis);
 const referenceCharacters=characterTokens(reference);
 const hypothesisCharacters=characterTokens(hypothesis);
 const word=editCounts(referenceWords,hypothesisWords);
 const character=editCounts(referenceCharacters,hypothesisCharacters);
 const wordErrors=word.substitutions+word.deletions+word.insertions;
 const characterErrors=character.substitutions+character.deletions+character.insertions;
 return {
  wordErrorRate:referenceWords.length?wordErrors/referenceWords.length:(hypothesisWords.length?hypothesisWords.length:0),
  characterErrorRate:referenceCharacters.length?characterErrors/referenceCharacters.length:(hypothesisCharacters.length?hypothesisCharacters.length:0),
  referenceWords:referenceWords.length,
  referenceCharacters:referenceCharacters.length,
  ...word
 };
}
