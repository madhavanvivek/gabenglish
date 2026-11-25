import {useEffect,useState} from "react";
import {Link,useLocalSearchParams} from "expo-router";
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {createLearningSessionId,getGabrooNextExercise,getLearningLesson,saveLearningLessonProgress,submitLearningExerciseAttempt,type GabrooNextExerciseSelection,type LearningLessonDetail} from "../../src/auth-api";
import {BrandMark,Eyebrow,PrimaryButton,SurfaceCard} from "../../src/ui";
import type {LearnerLessonContent} from "@gabenglish/contracts";
import {colors,radius,space} from "../../src/theme";

const milestones=[25,50,75,100];
function LessonBlocks({content,answers,setAnswers,results,onSubmit,busyExercise}:{content:LearnerLessonContent;answers:Record<string,string>;setAnswers:(id:string,value:string)=>void;results:Record<string,{correct:boolean;feedback:string}>;onSubmit:(id:string)=>void;busyExercise:string|null}){
 return <View style={{gap:12}}>
  {content.blocks.map((block,index)=><View key={"block-"+index} style={s.contentBlock}>
   {block.type==="text"?<>{block.heading?<Text style={s.blockHeading}>{block.heading}</Text>:null}<Text style={s.blockBody}>{block.body}</Text></>:null}
   {block.type==="vocabulary"?<>{block.items.map((item,i)=><View key={i} style={s.vocabRow}><Text style={s.vocabTerm}>{item.term}</Text><Text style={s.blockBody}>{item.meaning}</Text>{item.pronunciation?<Text style={s.detail}>{item.pronunciation}</Text>:null}{item.example?<Text style={s.example}>{item.example}</Text>:null}</View>)}</>:null}
   {block.type==="examples"?<>{block.items.map((item,i)=><View key={i} style={s.exampleRow}><Text style={s.example}>{item.target}</Text>{item.support?<Text style={s.blockBody}>{item.support}</Text>:null}{item.note?<Text style={s.detail}>{item.note}</Text>:null}</View>)}</>:null}
   {block.type==="exercise"?<><Text style={s.blockHeading}>Try it</Text><Text style={s.detail}>{block.instruction}</Text><Text style={s.blockBody}>{block.prompt}</Text>
    {block.response_type==="single_choice"?block.options?.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:answers[block.id]===option.id}} onPress={()=>setAnswers(block.id,option.id)} style={[s.option,answers[block.id]===option.id&&s.optionSelected]}><Text style={s.blockBody}>{option.label}</Text></Pressable>):<TextInput accessibilityLabel="Your answer" value={answers[block.id]??""} onChangeText={value=>setAnswers(block.id,value)} multiline placeholder="Write your answer…" placeholderTextColor={colors.textMuted} style={s.answerInput}/>}
    <PrimaryButton label={busyExercise===block.id?"Checking…":"Check answer"} onPress={()=>onSubmit(block.id)} disabled={busyExercise!==null||!(answers[block.id]??"").trim()}/>
    {results[block.id]?<View style={s.feedback}><Text style={results[block.id]!.correct?s.correct:s.incorrect}>{results[block.id]!.correct?"Correct":"Keep practising"}</Text><Text style={s.blockBody}>{results[block.id]!.feedback}</Text></View>:null}
   </>:null}
  </View>)}
 </View>;
}

function RecommendedExercise({selection,answer,setAnswer,result,onSubmit,onNext,busy}:{selection:GabrooNextExerciseSelection;answer:string;setAnswer:(value:string)=>void;result:{correct:boolean;feedback:string}|null;onSubmit:()=>void;onNext:()=>void;busy:boolean}){
 const exercise=selection.exercise;
 if(!exercise)return <View style={s.contentBlock}><Text style={s.blockHeading}>Practice complete</Text><Text style={s.detail}>There are no exercises available in this lesson yet.</Text></View>;
 return <View style={s.contentBlock}>
  <Eyebrow>GABROO'S NEXT EXERCISE</Eyebrow>
  <Text style={s.blockHeading}>{selection.focus_skill?selection.focus_skill.toUpperCase()+" · ":""}{selection.reason==="targeted_skill"?"Focused practice":selection.reason==="review_available"?"Review practice":"Next in your lesson"}</Text>
  {selection.target_difficulty!==null?<Text style={s.detail}>Challenge level {selection.target_difficulty} of 5</Text>:null}
  <Text style={s.detail}>{exercise.instruction}</Text><Text style={s.blockBody}>{exercise.prompt}</Text>
  {exercise.response_type==="single_choice"?exercise.options?.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:answer===option.id}} onPress={()=>setAnswer(option.id)} style={[s.option,answer===option.id&&s.optionSelected]}><Text style={s.blockBody}>{option.label}</Text></Pressable>):<TextInput accessibilityLabel="Your answer" value={answer} onChangeText={setAnswer} multiline placeholder="Write your answer…" placeholderTextColor={colors.textMuted} style={s.answerInput}/>}
  <PrimaryButton label={busy?"Checking…":"Check this answer"} onPress={onSubmit} disabled={busy||!answer.trim()}/>
  {result?<View style={s.feedback}><Text style={result.correct?s.correct:s.incorrect}>{result.correct?"Correct":"Keep practising"}</Text><Text style={s.blockBody}>{result.feedback}</Text><PrimaryButton label="Next exercise" onPress={onNext} disabled={busy}/></View>:null}
 </View>;
}

export default function LessonScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [data,setData]=useState<LearningLessonDetail|null>(null);
 const [learningSessionId,setLearningSessionId]=useState(createLearningSessionId);
 const [nextExercise,setNextExercise]=useState<GabrooNextExerciseSelection|null>(null);
 const [recommendedAnswer,setRecommendedAnswer]=useState("");
 const [recommendedResult,setRecommendedResult]=useState<{correct:boolean;feedback:string}|null>(null);
 const [loadingNext,setLoadingNext]=useState(false);
 const [progress,setProgress]=useState(0);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [answers,setAnswersState]=useState<Record<string,string>>({});
 const [exerciseResults,setExerciseResults]=useState<Record<string,{correct:boolean;feedback:string}>>({});
 const [busyExercise,setBusyExercise]=useState<string|null>(null);
 const setAnswer=(exerciseId:string,value:string)=>setAnswersState(current=>({...current,[exerciseId]:value}));
 async function loadNextExercise(lessonId:string){setLoadingNext(true);try{const result=await getGabrooNextExercise(lessonId);setNextExercise(result.selection);setRecommendedAnswer("");setRecommendedResult(null);}catch(e){setError(e instanceof Error?e.message:"Could not load Gabroo’s next exercise.");}finally{setLoadingNext(false);}}
 async function submitRecommendedExercise(){const exercise=nextExercise?.exercise;if(!id||!exercise||busyExercise)return;setBusyExercise(exercise.id);setError("");try{const result=await submitLearningExerciseAttempt(id,exercise.id,recommendedAnswer,learningSessionId);setRecommendedResult(result.result);}catch(e){setError(e instanceof Error?e.message:"Could not check this answer.");}finally{setBusyExercise(null);}}
 async function submitExercise(exerciseId:string){if(!id||busyExercise)return;setBusyExercise(exerciseId);setError("");try{const result=await submitLearningExerciseAttempt(id,exerciseId,answers[exerciseId]??"",learningSessionId);setExerciseResults(current=>({...current,[exerciseId]:result.result}));}catch(e){setError(e instanceof Error?e.message:"Could not check this answer.");}finally{setBusyExercise(null);}}
 useEffect(()=>{let active=true;setLearningSessionId(createLearningSessionId());setNextExercise(null);if(id){void getLearningLesson(id).then(value=>{if(!active)return;setData(value);setProgress(value.progress?.progress_percent??0);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load this lesson.");});void getGabrooNextExercise(id).then(value=>{if(active)setNextExercise(value.selection);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load Gabroo’s next exercise.");});}return()=>{active=false;};},[id]);
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
   <SurfaceCard><Eyebrow>YOUR PROGRESS</Eyebrow><Text style={s.progress}>{progress}%</Text><View style={s.track}><View style={[s.fill,{width:`${progress}%` as `${number}%`}]}/></View><Text style={s.detail}>{data.progress?.status==="completed"?"Completed":data.progress?.status==="in_progress"?"In progress":"Not started"}</Text><Text style={s.body}>Save your place as you work through this lesson. Completion is recorded only when you mark it complete.</Text>
    <View style={s.actions}>{milestones.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:progress===value,disabled:busy}} disabled={busy} onPress={()=>void save(value)} style={[s.milestone,progress===value&&s.selected]}><Text style={[s.milestoneText,progress===value&&s.selectedText]}>{value===100?"Complete":value+"%"}</Text></Pressable>)}</View>
    {busy?<Text style={s.detail}>Saving progress…</Text>:null}{message?<Text style={s.success}>{message}</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
    <PrimaryButton label={busy?"Saving…":"Save progress"} onPress={()=>void save(progress)} disabled={busy}/>
   </SurfaceCard>
   <SurfaceCard><Eyebrow>LEARN</Eyebrow>{loadingNext?<Text style={s.detail}>Gabroo is choosing your next exercise…</Text>:nextExercise?<RecommendedExercise selection={nextExercise} answer={recommendedAnswer} setAnswer={setRecommendedAnswer} result={recommendedResult} onSubmit={()=>void submitRecommendedExercise()} onNext={()=>void loadNextExercise(id)} busy={busyExercise!==null}/>:null}<LessonBlocks content={data.lesson.content} answers={answers} setAnswers={setAnswer} results={exerciseResults} onSubmit={submitExercise} busyExercise={busyExercise}/></SurfaceCard>
  </>:!error?<Text style={s.detail}>Loading lesson…</Text>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},back:{color:colors.primary,fontSize:13,fontWeight:"900"},header:{alignItems:"center",gap:8},title:{fontSize:23,fontWeight:"900",color:colors.primaryStrong,marginTop:8},meta:{fontSize:11,color:colors.textMuted,marginTop:8},detail:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:7},body:{fontSize:13,lineHeight:20,color:colors.textMuted,marginTop:10},contentBlock:{gap:8,paddingVertical:8},blockHeading:{fontSize:15,fontWeight:"900",color:colors.primaryStrong},blockBody:{fontSize:13,lineHeight:21,color:colors.text},vocabRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border,gap:4},vocabTerm:{fontSize:15,fontWeight:"900",color:colors.primary},exampleRow:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,gap:5},example:{fontSize:14,fontWeight:"800",lineHeight:21,color:colors.primaryStrong},option:{padding:10,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},optionSelected:{borderColor:colors.primary,backgroundColor:colors.surfaceSoft},answerInput:{minHeight:88,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:12,color:colors.text,textAlignVertical:"top"},feedback:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,gap:5},correct:{fontSize:13,fontWeight:"900",color:"#19734B"},incorrect:{fontSize:13,fontWeight:"900",color:colors.primaryStrong},progress:{fontSize:30,fontWeight:"900",color:colors.primaryStrong,marginTop:8},track:{height:9,borderRadius:9,backgroundColor:colors.border,overflow:"hidden",marginTop:12},fill:{height:9,backgroundColor:colors.primary,borderRadius:9},actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:16},milestone:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingVertical:10,paddingHorizontal:13},selected:{backgroundColor:colors.primary,borderColor:colors.primary},milestoneText:{fontSize:12,fontWeight:"800",color:colors.text},selectedText:{color:"#FFFFFF"},success:{fontSize:12,color:"#19734B",marginBottom:10},error:{fontSize:12,color:"#B42318"},});
