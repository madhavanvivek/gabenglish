import {useEffect,useState} from "react";
import {Link,useLocalSearchParams} from "expo-router";
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {getLearningLesson,getLearningExerciseAttemptHistory,saveLearningLessonProgress,submitLearningExerciseAttempt,type LearningExerciseAttemptHistory,type LearningLessonDetail} from "../../src/auth-api";
import {BrandMark,Eyebrow,PrimaryButton,SurfaceCard} from "../../src/ui";
import type {LearnerLessonContent} from "@gabenglish/contracts";
import {colors,radius,space} from "../../src/theme";

const milestones=[25,50,75,100];
function LessonBlocks({content,answers,setAnswers,results,history,attemptsForExercise,onSubmit,busyExercise}:{content:LearnerLessonContent;answers:Record<string,string>;setAnswers:(id:string,value:string)=>void;results:Record<string,{correct:boolean;feedback:string}>;history:Record<string,LearningExerciseAttemptHistory["attempts"]>;attemptsForExercise:(id:string)=>LearningExerciseAttemptHistory["attempts"];onSubmit:(id:string)=>void;busyExercise:string|null}){
 return <View style={{gap:12}}>
  {content.blocks.map((block,index)=><View key={"block-"+index} style={s.contentBlock}>
   {block.type==="text"?<>{block.heading?<Text style={s.blockHeading}>{block.heading}</Text>:null}<Text style={s.blockBody}>{block.body}</Text></>:null}
   {block.type==="vocabulary"?<>{block.items.map((item,i)=><View key={i} style={s.vocabRow}><Text style={s.vocabTerm}>{item.term}</Text><Text style={s.blockBody}>{item.meaning}</Text>{item.pronunciation?<Text style={s.detail}>{item.pronunciation}</Text>:null}{item.example?<Text style={s.example}>{item.example}</Text>:null}</View>)}</>:null}
   {block.type==="examples"?<>{block.items.map((item,i)=><View key={i} style={s.exampleRow}><Text style={s.example}>{item.target}</Text>{item.support?<Text style={s.blockBody}>{item.support}</Text>:null}{item.note?<Text style={s.detail}>{item.note}</Text>:null}</View>)}</>:null}
   {block.type==="exercise"?<><Text style={s.blockHeading}>{attemptsForExercise(block.id)[0]&&!attemptsForExercise(block.id)[0].correct?"Try this again":"Try it"}</Text>{attemptsForExercise(block.id)[0]&&!attemptsForExercise(block.id)[0].correct?<Text style={s.reviewPrompt}>Review focus · Your latest answer needs another try</Text>:null}<Text style={s.detail}>{block.instruction}</Text><Text style={s.blockBody}>{block.prompt}</Text>
    {block.response_type==="single_choice"?block.options?.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:answers[block.id]===option.id}} onPress={()=>setAnswers(block.id,option.id)} style={[s.option,answers[block.id]===option.id&&s.optionSelected]}><Text style={s.blockBody}>{option.label}</Text></Pressable>):<TextInput accessibilityLabel="Your answer" value={answers[block.id]??""} onChangeText={value=>setAnswers(block.id,value)} multiline placeholder="Write your answer…" placeholderTextColor={colors.textMuted} style={s.answerInput}/>}
    <PrimaryButton label={busyExercise===block.id?"Checking…":"Check answer"} onPress={()=>onSubmit(block.id)} disabled={busyExercise!==null||!(answers[block.id]??"").trim()}/>
    {results[block.id]?<View style={s.feedback}><Text style={results[block.id]!.correct?s.correct:s.incorrect}>{results[block.id]!.correct?"Correct":"Keep practising"}</Text><Text style={s.blockBody}>{results[block.id]!.feedback}</Text></View>:null}\n    {history[block.id]?.length?<View style={s.history}><Text style={s.historyTitle}>Recent attempts</Text>{history[block.id].slice(0,5).map(attempt=><View key={attempt.id} style={s.historyAttempt}><View style={s.historyHeading}><Text style={attempt.correct?s.correct:s.incorrect}>{attempt.correct?"Correct":"Needs practice"}</Text><Text style={s.historyDate}>{new Date(attempt.attempted_at).toLocaleDateString()}</Text></View><Text style={s.historyResponse}>{attempt.response}</Text>{attempt.feedback?<Text style={s.blockBody}>{attempt.feedback}</Text>:null}</View>)}</View>:null}
   </>:null}
  </View>)}
 </View>;
}

export default function LessonScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [data,setData]=useState<LearningLessonDetail|null>(null);
 const [progress,setProgress]=useState(0);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [answers,setAnswersState]=useState<Record<string,string>>({});
 const [exerciseResults,setExerciseResults]=useState<Record<string,{correct:boolean;feedback:string}>>({});
 const [exerciseHistory,setExerciseHistory]=useState<Record<string,LearningExerciseAttemptHistory["attempts"]>>({});
 const [busyExercise,setBusyExercise]=useState<string|null>(null);
 const setAnswer=(exerciseId:string,value:string)=>setAnswersState(current=>({...current,[exerciseId]:value}));
 const exerciseBlocks=data?.lesson.content.blocks.filter(block=>block.type==="exercise")??[];
 const currentVersionAttempts=(exerciseId:string)=>exerciseHistory[exerciseId]?.filter(attempt=>attempt.lesson_version_id===data?.lesson.version_id)??[];
 const attemptedExercises=exerciseBlocks.filter(block=>currentVersionAttempts(block.id).length>0||!!exerciseResults[block.id]);
 const latestCorrectCount=attemptedExercises.filter(block=>currentVersionAttempts(block.id)[0]?.correct??exerciseResults[block.id]?.correct??false).length;
 const needsReviewExercises=exerciseBlocks.filter(block=>{
  const latest=currentVersionAttempts(block.id)[0];
  return latest?!latest.correct:exerciseResults[block.id]?.correct===false;
 });
 async function submitExercise(exerciseId:string){if(!id||busyExercise)return;setBusyExercise(exerciseId);setError("");try{const result=await submitLearningExerciseAttempt(id,exerciseId,answers[exerciseId]??"");setExerciseResults(current=>({...current,[exerciseId]:result.result}));try{const history=await getLearningExerciseAttemptHistory(id,exerciseId);setExerciseHistory(current=>({...current,[exerciseId]:history.attempts}));}catch{/* Keep the just-returned result visible if history is temporarily unavailable. */}}catch(e){setError(e instanceof Error?e.message:"Could not check this answer.");}finally{setBusyExercise(null);}}
 useEffect(()=>{let active=true;if(id)void getLearningLesson(id).then(async value=>{if(!active)return;setData(value);setProgress(value.progress?.progress_percent??0);const exerciseIds=value.lesson.content.blocks.flatMap(block=>block.type==="exercise"?[block.id]:[]);const histories=await Promise.all(exerciseIds.map(async exerciseId=>{try{return [exerciseId,(await getLearningExerciseAttemptHistory(id,exerciseId)).attempts] as const;}catch{return [exerciseId,[]] as const;}}));if(active)setExerciseHistory(Object.fromEntries(histories));}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load this lesson.");});return()=>{active=false;};},[id]);
 async function save(value:number){
  if(!id||busy)return;
  setBusy(true);setMessage("");setError("");
  try{const result=await saveLearningLessonProgress(id,value);setProgress(result.progress.progress_percent);setMessage(value===100?"Lesson marked complete. Your progress is saved.":"Your lesson progress is saved.");}
  catch(e){setError(e instanceof Error?e.message:"Could not save your progress.");}
  finally{setBusy(false);}
 }
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Link href="/learn" style={s.back}>‹ Your learning path</Link>
  <View style={s.header}><BrandMark size={42}/><Eyebrow>GABENGLISH LESSON</Eyebrow></View>
  {error&&!data?<SurfaceCard><Text style={s.error}>{error}</Text></SurfaceCard>:null}
  {data?<>
   <SurfaceCard soft><Eyebrow>{data.lesson.learning_direction==="ml_to_en"?"ENGLISH THROUGH MALAYALAM":"MALAYALAM THROUGH ENGLISH"}</Eyebrow><Text style={s.title}>{data.lesson.title}</Text><Text style={s.meta}>Lesson version {data.lesson.version} · Target language: {data.lesson.target_language.toUpperCase()}</Text>
   {data.lesson.register?<Text style={s.detail}>Register: {data.lesson.register}</Text>:null}
   {data.lesson.dialect_scope?<Text style={s.detail}>Language context: {data.lesson.dialect_scope}</Text>:null}
   {data.lesson.script_mode==="native_with_optional_romanisation"?<Text style={s.detail}>Malayalam script is primary. Romanisation is an optional support.</Text>:null}
   </SurfaceCard>
   {exerciseBlocks.length>0?<SurfaceCard soft><Eyebrow>PRACTICE SUMMARY</Eyebrow><Text style={s.practiceCount}>{attemptedExercises.length} of {exerciseBlocks.length} exercises attempted</Text><Text style={s.detail}>{latestCorrectCount} latest answers correct · {exerciseBlocks.length-attemptedExercises.length} still to try · {needsReviewExercises.length} to revisit</Text>{needsReviewExercises.length>0?<View style={s.reviewFocus}><Text style={s.reviewFocusTitle}>FOCUS YOUR NEXT PRACTICE</Text>{needsReviewExercises.map(block=><Text key={block.id} style={s.reviewFocusItem}>• {block.prompt}</Text>)}</View>:null}<Text style={s.practiceNote}>A revisit suggestion means the latest answer was incorrect. It is not a proficiency score. Only attempts for this published lesson version count here.</Text></SurfaceCard>:null}
   <SurfaceCard><Eyebrow>YOUR PROGRESS</Eyebrow><Text style={s.progress}>{progress}%</Text><View style={s.track}><View style={[s.fill,{width:`${progress}%` as `${number}%`}]}/></View><Text style={s.detail}>{data.progress?.status==="completed"?"Completed":data.progress?.status==="in_progress"?"In progress":"Not started"}</Text><Text style={s.body}>Save your place as you work through this lesson. Completion is recorded only when you mark it complete.</Text>
    <View style={s.actions}>{milestones.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:progress===value,disabled:busy}} disabled={busy} onPress={()=>void save(value)} style={[s.milestone,progress===value&&s.selected]}><Text style={[s.milestoneText,progress===value&&s.selectedText]}>{value===100?"Complete":value+"%"}</Text></Pressable>)}</View>
    {busy?<Text style={s.detail}>Saving progress…</Text>:null}{message?<Text style={s.success}>{message}</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
    <PrimaryButton label={busy?"Saving…":"Save progress"} onPress={()=>void save(progress)} disabled={busy}/>
   </SurfaceCard>
   <SurfaceCard><Eyebrow>LEARN</Eyebrow><LessonBlocks content={data.lesson.content} answers={answers} setAnswers={setAnswer} results={exerciseResults} history={exerciseHistory} attemptsForExercise={currentVersionAttempts} onSubmit={submitExercise} busyExercise={busyExercise}/></SurfaceCard>
  </>:!error?<Text style={s.detail}>Loading lesson…</Text>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},back:{color:colors.primary,fontSize:13,fontWeight:"900"},header:{alignItems:"center",gap:8},title:{fontSize:23,fontWeight:"900",color:colors.primaryStrong,marginTop:8},practiceCount:{fontSize:17,fontWeight:"900",color:colors.primaryStrong,marginTop:8},practiceNote:{fontSize:11,lineHeight:17,color:colors.textMuted,marginTop:7},reviewFocus:{marginTop:10,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,gap:7},reviewFocusTitle:{fontSize:10,fontWeight:"900",letterSpacing:0.6,color:colors.primary},reviewFocusItem:{fontSize:12,lineHeight:18,color:colors.text},reviewPrompt:{fontSize:11,fontWeight:"800",color:colors.primary,marginTop:-2},meta:{fontSize:11,color:colors.textMuted,marginTop:8},detail:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:7},body:{fontSize:13,lineHeight:20,color:colors.textMuted,marginTop:10},contentBlock:{gap:8,paddingVertical:8},blockHeading:{fontSize:15,fontWeight:"900",color:colors.primaryStrong},blockBody:{fontSize:13,lineHeight:21,color:colors.text},vocabRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border,gap:4},vocabTerm:{fontSize:15,fontWeight:"900",color:colors.primary},exampleRow:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,gap:5},example:{fontSize:14,fontWeight:"800",lineHeight:21,color:colors.primaryStrong},option:{padding:10,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},optionSelected:{borderColor:colors.primary,backgroundColor:colors.surfaceSoft},answerInput:{minHeight:88,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:12,color:colors.text,textAlignVertical:"top"},feedback:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,gap:5},history:{padding:12,borderRadius:radius.md,backgroundColor:"#F8F5FC",gap:8},historyTitle:{fontSize:12,fontWeight:"900",color:colors.primaryStrong},historyAttempt:{paddingTop:8,borderTopWidth:1,borderTopColor:colors.border,gap:4},historyHeading:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},historyDate:{fontSize:10,color:colors.textMuted},historyResponse:{fontSize:12,lineHeight:18,color:colors.text},correct:{fontSize:13,fontWeight:"900",color:"#19734B"},incorrect:{fontSize:13,fontWeight:"900",color:colors.primaryStrong},progress:{fontSize:30,fontWeight:"900",color:colors.primaryStrong,marginTop:8},track:{height:9,borderRadius:9,backgroundColor:colors.border,overflow:"hidden",marginTop:12},fill:{height:9,backgroundColor:colors.primary,borderRadius:9},actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:16},milestone:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingVertical:10,paddingHorizontal:13},selected:{backgroundColor:colors.primary,borderColor:colors.primary},milestoneText:{fontSize:12,fontWeight:"800",color:colors.text},selectedText:{color:"#FFFFFF"},success:{fontSize:12,color:"#19734B",marginBottom:10},error:{fontSize:12,color:"#B42318"},});
