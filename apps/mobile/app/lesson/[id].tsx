import {useEffect,useState} from "react";
import {Link,useLocalSearchParams} from "expo-router";
import {Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {getLearningLesson,saveLearningLessonProgress,type LearningLessonDetail} from "../../src/auth-api";
import {BrandMark,Eyebrow,PrimaryButton,SurfaceCard} from "../../src/ui";
import type {LearnerLessonContent} from "@gabenglish/contracts";
import {colors,radius,space} from "../../src/theme";

const milestones=[25,50,75,100];
function LessonBlocks({content}:{content:LearnerLessonContent}){
 return <View style={{gap:12}}>
  {content.blocks.map((block,index)=><View key={"block-"+index} style={s.contentBlock}>
   {block.type==="text"?<>{block.heading?<Text style={s.blockHeading}>{block.heading}</Text>:null}<Text style={s.blockBody}>{block.body}</Text></>:null}
   {block.type==="vocabulary"?<>{block.items.map((item,i)=><View key={i} style={s.vocabRow}><Text style={s.vocabTerm}>{item.term}</Text><Text style={s.blockBody}>{item.meaning}</Text>{item.pronunciation?<Text style={s.detail}>{item.pronunciation}</Text>:null}{item.example?<Text style={s.example}>{item.example}</Text>:null}</View>)}</>:null}
   {block.type==="examples"?<>{block.items.map((item,i)=><View key={i} style={s.exampleRow}><Text style={s.example}>{item.target}</Text>{item.support?<Text style={s.blockBody}>{item.support}</Text>:null}{item.note?<Text style={s.detail}>{item.note}</Text>:null}</View>)}</>:null}
   {block.type==="exercise"?<><Text style={s.blockHeading}>Try it</Text><Text style={s.detail}>{block.instruction}</Text><Text style={s.blockBody}>{block.prompt}</Text>{block.options?.map(option=><View key={option.id} style={s.option}><Text style={s.blockBody}>{option.label}</Text></View>)}</>:null}
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
 useEffect(()=>{let active=true;if(id)void getLearningLesson(id).then(value=>{if(!active)return;setData(value);setProgress(value.progress?.progress_percent??0);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load this lesson.");});return()=>{active=false;};},[id]);
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
   <SurfaceCard><Eyebrow>YOUR PROGRESS</Eyebrow><Text style={s.progress}>{progress}%</Text><View style={s.track}><View style={[s.fill,{width:progress+"%"}]}/></View><Text style={s.detail}>{data.progress?.status==="completed"?"Completed":data.progress?.status==="in_progress"?"In progress":"Not started"}</Text><Text style={s.body}>Save your place as you work through this lesson. Completion is recorded only when you mark it complete.</Text>
    <View style={s.actions}>{milestones.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:progress===value,disabled:busy}} disabled={busy} onPress={()=>void save(value)} style={[s.milestone,progress===value&&s.selected]}><Text style={[s.milestoneText,progress===value&&s.selectedText]}>{value===100?"Complete":value+"%"}</Text></Pressable>)}</View>
    {busy?<Text style={s.detail}>Saving progress…</Text>:null}{message?<Text style={s.success}>{message}</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
    <PrimaryButton label={busy?"Saving…":"Save progress"} onPress={()=>void save(progress)} disabled={busy}/>
   </SurfaceCard>
   <SurfaceCard><Eyebrow>LEARN</Eyebrow><LessonBlocks content={data.lesson.content}/></SurfaceCard>
  </>:!error?<Text style={s.detail}>Loading lesson…</Text>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},back:{color:colors.primary,fontSize:13,fontWeight:"900"},header:{alignItems:"center",gap:8},title:{fontSize:23,fontWeight:"900",color:colors.primaryStrong,marginTop:8},meta:{fontSize:11,color:colors.textMuted,marginTop:8},detail:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:7},body:{fontSize:13,lineHeight:20,color:colors.textMuted,marginTop:10},contentBlock:{gap:8,paddingVertical:8},blockHeading:{fontSize:15,fontWeight:"900",color:colors.primaryStrong},blockBody:{fontSize:13,lineHeight:21,color:colors.text},vocabRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border,gap:4},vocabTerm:{fontSize:15,fontWeight:"900",color:colors.primary},exampleRow:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,gap:5},example:{fontSize:14,fontWeight:"800",lineHeight:21,color:colors.primaryStrong},option:{padding:10,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},progress:{fontSize:30,fontWeight:"900",color:colors.primaryStrong,marginTop:8},track:{height:9,borderRadius:9,backgroundColor:colors.border,overflow:"hidden",marginTop:12},fill:{height:9,backgroundColor:colors.primary,borderRadius:9},actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:16},milestone:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingVertical:10,paddingHorizontal:13},selected:{backgroundColor:colors.primary,borderColor:colors.primary},milestoneText:{fontSize:12,fontWeight:"800",color:colors.text},selectedText:{color:"#FFFFFF"},success:{fontSize:12,color:"#19734B",marginBottom:10},error:{fontSize:12,color:"#B42318"},});
