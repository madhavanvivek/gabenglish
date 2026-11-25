export type DailyPracticeSkill={
 skill_key:string;
 attempt_count:number;
 accuracy:number;
 evidence_status:"building_evidence"|"strong_exercise_performance"|"practice_opportunity"|"developing_exercise_performance";
};
export type DailySpeakingChallenge={date:string;title:string;focus:string;prompt:string;skillKey:string|null};
const challengeBank:Record<string,Array<{title:string;focus:string;prompt:string}>>={
 sentence_formation:[
  {title:"Make it clearer",focus:"Build a complete sentence",prompt:"Tell Gabroo about something you did yesterday. Use three complete sentences. Try connecting them with “because”, “then” or “so”."},
  {title:"Explain your choice",focus:"Give a reason",prompt:"Describe one decision you made recently and explain why you made it. Try using “I decided to…” and “because…”."}
 ],
 grammar:[
  {title:"Past and present",focus:"Use time clearly",prompt:"Talk about your usual morning routine, then explain one thing that was different yesterday. Pay attention to present and past tense."},
  {title:"Describe a plan",focus:"Talk about the future",prompt:"Tell Gabroo about one plan for this week. Explain what you will do, when you will do it and why."}
 ],
 vocabulary:[
  {title:"Describe a place",focus:"Use precise words",prompt:"Describe a place you enjoy visiting. Explain what it looks like, what you do there and how it makes you feel. Try not to repeat the same describing words."},
  {title:"Tell a small story",focus:"Choose useful words",prompt:"Tell Gabroo about a small problem you solved recently. Explain what happened, what you tried and how it ended."}
 ],
 fluency:[
  {title:"Keep the story moving",focus:"Speak in connected ideas",prompt:"Speak for about 45 seconds about a memorable day. Keep going naturally; if you need a moment, use phrases like “Let me think” or “What happened next was…”."},
  {title:"Give your opinion",focus:"Build a longer response",prompt:"Do you prefer learning something by watching videos or by practising it yourself? Explain your choice and give an example."}
 ],
 pronunciation:[
  {title:"Speak in short chunks",focus:"Clear, comfortable speech",prompt:"Describe how you make your favourite food. Speak in short meaningful phrases and pause naturally between each step. Focus on being clear, not fast."},
  {title:"Explain a process",focus:"Pace and clarity",prompt:"Explain how someone new to your town can reach a place you know well. Give the directions one step at a time, at a comfortable pace."}
 ],
 listening:[
  {title:"Listen and respond",focus:"Understand and answer",prompt:"Ask Gabroo to tell you a short story in simple English. Listen carefully, then retell the main events in your own words and ask one follow-up question."}
 ],
 speaking:[
  {title:"Start a conversation",focus:"Confident everyday speaking",prompt:"Imagine you are meeting a new colleague. Introduce yourself, ask two friendly questions and tell them one interesting thing about your day."}
 ],
 comprehension:[
  {title:"Summarise an idea",focus:"Explain what you understood",prompt:"Ask Gabroo to explain a useful everyday topic in three short points. Then summarise those points in your own words and say which one matters most to you."}
 ],
 conversation:[
  {title:"Keep a conversation going",focus:"Ask natural follow-up questions",prompt:"Imagine you are chatting with a friend about a weekend trip. Share one idea, ask a follow-up question and respond naturally to Gabroo's replies."}
 ],
 writing:[
  {title:"Say it another way",focus:"Rephrase your ideas",prompt:"Tell Gabroo about a goal you have. First explain it simply, then try saying the same idea in a different way using “My aim is…” or “I’m hoping to…”."}
 ]
};
const general=[
 {title:"A moment from today",focus:"Everyday communication",prompt:"Tell Gabroo about one thing that happened today. Explain what happened, how you felt and what you might do next."},
 {title:"Your recommendation",focus:"Explain and support an idea",prompt:"Recommend a film, book, app or place to a friend. Explain why they might enjoy it and give one specific example."},
 {title:"Solve a small problem",focus:"Practical communication",prompt:"Imagine you need to reschedule an appointment. Explain the situation politely, suggest another time and ask whether it works."}
];
export function buildDailySpeakingChallenge(date:string,skills:DailyPracticeSkill[]=[]):DailySpeakingChallenge{
 const day=Date.parse(date+"T00:00:00.000Z");
 const index=Number.isFinite(day)?Math.floor(day/86_400_000):0;
 const focusSkill=skills
  .filter(item=>item.evidence_status==="practice_opportunity"||item.evidence_status==="developing_exercise_performance")
  .sort((a,b)=>a.accuracy-b.accuracy||b.attempt_count-a.attempt_count)[0];
 const bank=focusSkill?challengeBank[focusSkill.skill_key]??general:general;
 const selected=bank[((index%bank.length)+bank.length)%bank.length]!;
 return {date,title:selected.title,focus:selected.focus,prompt:selected.prompt,skillKey:focusSkill?.skill_key??null};
}
