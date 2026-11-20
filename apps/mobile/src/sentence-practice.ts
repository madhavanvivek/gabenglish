export type SentencePracticeCategory="word_order"|"present_simple"|"questions"|"negatives"|"past_tense"|"modals"|"sentence_expansion"|"frequency";
export type SentencePracticeExercise={
 id:string;
 category:SentencePracticeCategory;
 title:string;
 instruction:string;
 prompt:string;
 options:{id:string;text:string}[];
 correctOptionId:string;
 explanationEn:string;
 explanationMl:string;
};
const exercises:SentencePracticeExercise[]=[
 {id:"word-order-01",category:"word_order",title:"Build a simple sentence",instruction:"Choose the words in a natural English order.",prompt:"Arrange this idea: ഞാൻ എല്ലാ ദിവസവും ചായ കുടിക്കും.",options:[{id:"a",text:"I drink tea every day."},{id:"b",text:"I tea drink every day."},{id:"c",text:"Every day drink I tea."}],correctOptionId:"a",explanationEn:"A common English pattern is Subject + Verb + Object: I + drink + tea. A time phrase can come at the end.",explanationMl:"സാധാരണ ഇംഗ്ലീഷ് ക്രമം Subject + Verb + Object ആണ്: I + drink + tea. സമയം സൂചിപ്പിക്കുന്ന വാക്കുകൾ പലപ്പോഴും വാക്യത്തിന്റെ അവസാനം വരും."},
 {id:"present-01",category:"present_simple",title:"Present simple agreement",instruction:"Choose the sentence that agrees with the subject.",prompt:"അവൾ എല്ലാ ദിവസവും ജോലി ചെയ്യുന്നു.",options:[{id:"a",text:"She work every day."},{id:"b",text:"She works every day."},{id:"c",text:"She working every day."}],correctOptionId:"b",explanationEn:"In the present simple, he, she and it usually take -s or -es on the main verb: work → works.",explanationMl:"Present simple-ൽ he, she, it എന്നിവയോടൊപ്പം പ്രധാന ക്രിയയ്ക്ക് സാധാരണയായി -s അല്ലെങ്കിൽ -es ചേർക്കും: work → works."},
 {id:"question-01",category:"questions",title:"Form a question",instruction:"Choose the natural English question.",prompt:"നീ എവിടെയാണ് താമസിക്കുന്നത്?",options:[{id:"a",text:"Where you live?"},{id:"b",text:"Where do you live?"},{id:"c",text:"Where does you live?"}],correctOptionId:"b",explanationEn:"For a present-simple question with you, use question word + do + subject + base verb: Where do you live?",explanationMl:"You ഉപയോഗിച്ചുള്ള present-simple ചോദ്യത്തിൽ question word + do + subject + ക്രിയയുടെ അടിസ്ഥാനരൂപം ഉപയോഗിക്കുക: Where do you live?"},
 {id:"negative-01",category:"negatives",title:"Make a negative sentence",instruction:"Choose the correct negative form.",prompt:"എനിക്ക് കാപ്പി ഇഷ്ടമല്ല.",options:[{id:"a",text:"I don't like coffee."},{id:"b",text:"I doesn't like coffee."},{id:"c",text:"I don't likes coffee."}],correctOptionId:"a",explanationEn:"With I, use don't + the base form of the verb. After don't, say like—not likes.",explanationMl:"I-യോടൊപ്പം don't + ക്രിയയുടെ അടിസ്ഥാനരൂപം ഉപയോഗിക്കുക. don't-ന് ശേഷം like ആണ്; likes അല്ല."},
 {id:"past-01",category:"past_tense",title:"Talk about yesterday",instruction:"Choose the correct past-tense sentence.",prompt:"ഞങ്ങൾ ഇന്നലെ സിനിമ കണ്ടു.",options:[{id:"a",text:"We see a film yesterday."},{id:"b",text:"We did saw a film yesterday."},{id:"c",text:"We saw a film yesterday."}],correctOptionId:"c",explanationEn:"Use the past form saw for a completed past action. If you use did, the next verb returns to its base form: did see.",explanationMl:"കഴിഞ്ഞുപോയ പ്രവർത്തിക്ക് saw എന്ന past രൂപം ഉപയോഗിക്കുക. did ഉപയോഗിച്ചാൽ പിന്നാലെയുള്ള ക്രിയയുടെ അടിസ്ഥാനരൂപം വേണം: did see."},
 {id:"modal-01",category:"modals",title:"Use a modal verb",instruction:"Choose the correct sentence.",prompt:"അവന് ഇംഗ്ലീഷ് സംസാരിക്കാൻ കഴിയും.",options:[{id:"a",text:"He can speaks English."},{id:"b",text:"He can speak English."},{id:"c",text:"He cans speak English."}],correctOptionId:"b",explanationEn:"After can, use the base form of the verb: can speak. Do not add -s to speak.",explanationMl:"can-ന് ശേഷം ക്രിയയുടെ അടിസ്ഥാനരൂപം ഉപയോഗിക്കുക: can speak. speak-ന് -s ചേർക്കരുത്."},
 {id:"expand-01",category:"sentence_expansion",title:"Add a reason",instruction:"Choose the sentence that adds a clear reason.",prompt:"ഞാൻ ഇംഗ്ലീഷ് പഠിക്കുന്നു, കാരണം എനിക്ക് യാത്ര ചെയ്യണം.",options:[{id:"a",text:"I study English because I want to travel."},{id:"b",text:"I study English because want travel."},{id:"c",text:"Because I want travel I studying English."}],correctOptionId:"a",explanationEn:"Because introduces a reason. Keep a subject and verb in the reason clause: because I want to travel.",explanationMl:"കാരണം പറയാൻ because ഉപയോഗിക്കാം. അതിന് ശേഷമുള്ള ഭാഗത്തും subject-ഉം verb-ഉം വേണം: because I want to travel."},
 {id:"frequency-01",category:"frequency",title:"Place a frequency word",instruction:"Choose the natural position for usually.",prompt:"ഞാൻ സാധാരണയായി ബസിലാണ് ജോലിക്ക് പോകുന്നത്.",options:[{id:"a",text:"I go usually to work by bus."},{id:"b",text:"I usually go to work by bus."},{id:"c",text:"Usually I by bus go to work."}],correctOptionId:"b",explanationEn:"Frequency adverbs such as usually commonly come before the main verb: I usually go.",explanationMl:"usually പോലുള്ള ആവൃത്തി സൂചിപ്പിക്കുന്ന വാക്കുകൾ സാധാരണയായി പ്രധാന ക്രിയയ്ക്ക് മുമ്പ് വരും: I usually go."}
];
export function listSentencePracticeExercises():SentencePracticeExercise[]{return exercises.map(item=>({...item,options:item.options.map(option=>({...option}))}));}
export function evaluateSentencePracticeAnswer(exerciseId:string,optionId:string):{correct:boolean;explanationEn:string;explanationMl:string}|null{
 const exercise=exercises.find(item=>item.id===exerciseId);
 if(!exercise||!exercise.options.some(option=>option.id===optionId))return null;
 return {correct:optionId===exercise.correctOptionId,explanationEn:exercise.explanationEn,explanationMl:exercise.explanationMl};
}


export type WordOrderExercise={
 id:string;
 title:string;
 prompt:string;
 instruction:string;
 tiles:string[];
 acceptedAnswers:string[][];
 explanationEn:string;
 explanationMl:string;
};
const wordOrderExercises:WordOrderExercise[]=[
 {id:"tile-order-01",title:"Put the words in order",prompt:"ഞാൻ രാവിലെ ആറുമണിക്ക് എഴുന്നേൽക്കും.",instruction:"Tap each word to build a natural English sentence.",tiles:["at","I","six","wake","up","in","the","morning"],acceptedAnswers:[["I","wake","up","at","six","in","the","morning"],["I","wake","up","at","six","in","the","morning."]],explanationEn:"Start with the subject I, then the verb phrase wake up. Put the time phrase after it.",explanationMl:"ആദ്യം subject ആയ I, തുടർന്ന് wake up എന്ന verb phrase. സമയം സൂചിപ്പിക്കുന്ന ഭാഗം അതിന് ശേഷം ചേർക്കാം."},
 {id:"tile-order-02",title:"Build a question",prompt:"നീ എപ്പോഴാണ് വീട്ടിലെത്തുന്നത്?",instruction:"Tap the words to form the question.",tiles:["do","you","when","get","home","?"],acceptedAnswers:[["When","do","you","get","home","?"],["when","do","you","get","home","?"]],explanationEn:"Begin with When, then do + subject + base verb: When do you get home?",explanationMl:"When ഉപയോഗിച്ച് തുടങ്ങുക. തുടർന്ന് do + subject + ക്രിയയുടെ അടിസ്ഥാനരൂപം: When do you get home?"},
 {id:"tile-order-03",title:"Make a negative",prompt:"അവൾ ഞായറാഴ്ചകളിൽ ജോലി ചെയ്യാറില്ല.",instruction:"Arrange the words into a correct sentence.",tiles:["doesn't","on","work","She","Sundays"],acceptedAnswers:[["She","doesn't","work","on","Sundays"],["She","doesn't","work","on","Sundays."]],explanationEn:"With she, use doesn't + the base verb work. Do not write works after doesn't.",explanationMl:"She-യോടൊപ്പം doesn't + ക്രിയയുടെ അടിസ്ഥാനരൂപം work ഉപയോഗിക്കുക. doesn't-ന് ശേഷം works എഴുതരുത്."}
];
export function listWordOrderExercises():WordOrderExercise[]{return wordOrderExercises.map(item=>({...item,tiles:[...item.tiles],acceptedAnswers:item.acceptedAnswers.map(answer=>[...answer])}));}
function normaliseWordSequence(words:string[]):string{return words.map(word=>word.trim().normalize("NFKC").toLocaleLowerCase().replace(/[.,!?;:]+$/u,"")).join(" ").replace(/\s+/g," ").trim();}
export function evaluateWordOrderAnswer(exerciseId:string,words:string[]):{correct:boolean;explanationEn:string;explanationMl:string}|null{
 const exercise=wordOrderExercises.find(item=>item.id===exerciseId);
 if(!exercise||!Array.isArray(words)||words.length!==exercise.tiles.length||words.some(word=>!exercise.tiles.includes(word)))return null;
 const correct=exercise.acceptedAnswers.some(answer=>normaliseWordSequence(answer)===normaliseWordSequence(words));
 return {correct,explanationEn:exercise.explanationEn,explanationMl:exercise.explanationMl};
}
