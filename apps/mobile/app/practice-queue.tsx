import {useCallback,useState} from "react";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {getDailyChallengeHistory,getGabrooLearningInsights,getVocabularyReviewQueue,listGabrooMemory,type DailyChallengeHistory,type GabrooLearningInsights,type VocabularyReviewQueue,type GabrooMemoryItem,type LearningLessonRecommendation,getLearningRecommendation} from "../src/auth-api";
import {buildDailySpeakingChallenge,localPracticeDateKey,parseSavedPracticePhrase} from "../src/daily-practice";
import {colors,radius,space} from "../src/theme";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";

function phraseFrom(item:GabrooMemoryItem){
 const parsed=parseSavedPracticePhrase(item);
 return {id:item.id,original:parsed.original??parsed.fallback,practiceVersion:parsed.practiceVersion};
}
export default function PracticeQueueScreen(){
 const [vocabulary,setVocabulary]=useState<VocabularyReviewQueue|null>(null);
 const [insights,setInsights]=useState<GabrooLearningInsights|null>(null);
 const [history,setHistory]=useState<DailyChallengeHistory|null>(null);
 const [phrases,setPhrases]=useState<GabrooMemoryItem[]>([]);
 const [lessonRecommendation,setLessonRecommendation]=useState<LearningLessonRecommendation["recommendation"]>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [partial,setPartial]=useState<string[]>([]);
 const load=useCallback(async()=>{
  setLoading(true);setError("");setPartial([]);
  const results=await Promise.allSettled([getVocabularyReviewQueue(30),getGabrooLearningInsights(),getDailyChallengeHistory(14),listGabrooMemory()]);
  const labels=["Vocabulary reviews","Skill evidence","Practice history","Speaking Journal"];
  const failed=results.flatMap((result,index)=>result.status==="rejected"?[labels[index]]:[]);
  setPartial(failed);
  setVocabulary(results[0].status==="fulfilled"?results[0].value:null);
  setInsights(results[1].status==="fulfilled"?results[1].value:null);
  setHistory(results[2].status==="fulfilled"?results[2].value:null);
  setPhrases(results[3].status==="fulfilled"?results[3].value.memory.filter(item=>item.category==="saved_phrase"):[]);
  try{setLessonRecommendation((await getLearningRecommendation()).recommendation);}
  catch{setLessonRecommendation(null);}
  if(failed.length===4){
   const first=results.find(result=>result.status==="rejected");
   setError(first?.status==="rejected"?(first.reason instanceof Error?first.reason.message:"Your practice queue could not be loaded."):"Your practice queue could not be loaded.");
  }
  setLoading(false);
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const phraseList=phrases.map(phraseFrom).filter(Boolean);
 const focus=insights?.skill_areas.filter(item=>item.evidence_status==="practice_opportunity"||item.evidence_status==="developing_exercise_performance").sort((a,b)=>a.accuracy-b.accuracy||b.attempt_count-a.attempt_count)[0];
 const challenge=buildDailySpeakingChallenge(localPracticeDateKey(),insights?.skill_areas??[],phrases);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Link href="/home" style={s.back}>‹ Home</Link>
  <View style={s.header}><BrandMark size={42}/><Text style={s.title}>Your practice queue</Text><Text style={s.subtitle}>A simple next step, built from what you chose to save and what you have practised.</Text></View>
  {loading?<View style={s.loading}><ActivityIndicator color={colors.primary} size="large"/><Text style={s.muted}>Gathering your next practice steps…</Text></View>:<>
   {error?<SurfaceCard soft><Text style={s.error}>{error}</Text><Pressable onPress={()=>void load()} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable></SurfaceCard>:null}
   {partial.length>0&&!error?<Text style={s.partial}>Some sections could not load: {partial.join(", ")}. Available practice items are still shown.</Text>:null}
   {lessonRecommendation?<SurfaceCard><Eyebrow>YOUR LEARNING PATH · STAGE {lessonRecommendation.stage}</Eyebrow><Text style={s.cardTitle}>{lessonRecommendation.reason==="continue_learning"?"Pick up where you left off":"Your next lesson"}</Text><Text style={s.focusName}>{lessonRecommendation.title}</Text><Text style={s.body}>{lessonRecommendation.moduleTitle} · {lessonRecommendation.reason==="continue_learning"?"You have already started this lesson.":"Selected from published lessons for your learning stage and language direction."}</Text>{lessonRecommendation.reason==="continue_learning"?<Text style={s.vocabFoot}>{lessonRecommendation.progressPercent}% completed</Text>:null}<Link href={{pathname:"/lesson/[id]",params:{id:lessonRecommendation.lessonId}}} asChild><Pressable style={s.secondary}><Text style={s.secondaryText}>{lessonRecommendation.reason==="continue_learning"?"Continue lesson →":"Start this lesson →"}</Text></Pressable></Link></SurfaceCard>:null}
   <SurfaceCard soft><Eyebrow>START HERE · TODAY</Eyebrow><Text style={s.cardTitle}>{challenge.title}</Text><Text style={s.body}>{challenge.focus}</Text><Text style={s.prompt}>{challenge.prompt}</Text><Link href={{pathname:"/gabroo",params:{challenge:challenge.prompt,challengeTitle:challenge.title,challengeDate:challenge.date,challengeSkillKey:challenge.skillKey??""}}} asChild><Pressable style={s.primary}><Text style={s.primaryText}>Practise with Gabroo →</Text></Pressable></Link></SurfaceCard>
   <SurfaceCard><View style={s.row}><View style={s.flex}><Eyebrow>WORD GARDEN</Eyebrow><Text style={s.cardTitle}>Vocabulary ready to review</Text><Text style={s.body}>{vocabulary?(`${vocabulary.items.length} words currently due or ready for a first review.`):"Your vocabulary review list is unavailable right now."}</Text></View><Text style={s.count}>{vocabulary?.items.length??"—"}</Text></View><Link href="/vocabulary" style={s.link}>Open Word Garden →</Link></SurfaceCard>
   <SurfaceCard><Eyebrow>YOUR OWN WORDS</Eyebrow><Text style={s.cardTitle}>Phrases you chose to keep</Text>{phraseList.length?phraseList.slice(0,5).map(phrase=><View key={phrase.id} style={s.phrase}>{phrase.practiceVersion?<><Text style={s.phraseLabel}>YOUR PRACTICE VERSION</Text><Text style={s.phrasePractice}>“{phrase.practiceVersion}”</Text><Text style={s.phraseLabel}>ORIGINAL PHRASE</Text><Text style={s.phraseOriginal}>“{phrase.original}”</Text></>:<><Text style={s.phraseLabel}>SAVED PHRASE</Text><Text style={s.phraseText}>“{phrase.original}”</Text></>}</View>):<Text style={s.body}>No saved phrases yet. Keep useful expressions in your Speaking Journal and they can become future practice prompts.</Text>}<Link href="/speaking-journal" style={s.link}>Open Speaking Journal →</Link></SurfaceCard>
   <SurfaceCard><Eyebrow>EXERCISE EVIDENCE</Eyebrow><Text style={s.cardTitle}>A skill worth revisiting</Text>{focus?<><Text style={s.focusName}>{focus.skill_key.replace(/_/g," ")}</Text><Text style={s.body}>{focus.correct_count} of {focus.attempt_count} latest exercise attempts were correct. This is an exercise practice signal, not a speaking or proficiency score.</Text><Link href={{pathname:"/gabroo",params:{challenge:"Let's practise "+focus.skill_key.replace(/_/g," ")+". Please guide me through a friendly, level-appropriate activity and give me time to respond.",challengeTitle:"Skill practice"}}} asChild><Pressable style={s.secondary}><Text style={s.secondaryText}>Practise this skill with Gabroo →</Text></Pressable></Link></>:<Text style={s.body}>{insights?"There is not yet enough evidence to select a specific skill. Keep working through tagged exercises.":"Skill evidence is not available right now."}</Text>}<Link href="/progress" style={s.link}>See learning patterns →</Link></SurfaceCard>
   <SurfaceCard soft><Eyebrow>YOUR RECENT EFFORT</Eyebrow><Text style={s.cardTitle}>Practice history</Text><Text style={s.historyCount}>{history?.total_completed_days??"—"} challenges completed</Text><Text style={s.body}>These are challenges you explicitly marked complete. They record practice, not proof of improvement.</Text>{history?.completions.slice(0,3).map(item=><View key={item.challenge_date} style={s.historyRow}><Text style={s.historyDate}>{new Date(item.challenge_date+"T12:00:00").toLocaleDateString()}</Text><Text style={s.historyTitle}>{item.challenge_title}</Text></View>)}<Link href="/progress" style={s.link}>View full progress →</Link></SurfaceCard>
  </>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:40,gap:space.md},back:{color:colors.primary,fontSize:13,fontWeight:"900"},header:{alignItems:"center",gap:7,marginBottom:space.sm},title:{fontSize:25,fontWeight:"900",color:colors.text},subtitle:{fontSize:12,lineHeight:18,color:colors.textMuted,textAlign:"center"},loading:{padding:40,alignItems:"center",gap:12},muted:{fontSize:12,color:colors.textMuted},cardTitle:{fontSize:16,fontWeight:"900",color:colors.text,marginTop:5},body:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:7},prompt:{fontSize:13,lineHeight:20,color:colors.text,backgroundColor:colors.surface,borderRadius:radius.md,padding:space.md,marginTop:10},primary:{backgroundColor:colors.primary,borderRadius:radius.md,padding:14,alignItems:"center",marginTop:13},primaryText:{fontSize:13,fontWeight:"900",color:"#fff"},link:{fontSize:12,fontWeight:"900",color:colors.primary,marginTop:13},row:{flexDirection:"row",alignItems:"center",gap:10},flex:{flex:1},count:{fontSize:27,fontWeight:"900",color:colors.primaryStrong},phrase:{backgroundColor:colors.surfaceSoft,borderRadius:radius.md,padding:10,marginTop:9},phraseLabel:{fontSize:9,fontWeight:"900",letterSpacing:0.6,color:colors.textMuted,marginTop:4},phraseText:{fontSize:12,lineHeight:18,color:colors.text,marginTop:4},phrasePractice:{fontSize:13,lineHeight:19,fontWeight:"800",color:colors.primaryStrong,marginTop:4},phraseOriginal:{fontSize:11,lineHeight:17,color:colors.textMuted,marginTop:3},focusName:{fontSize:17,fontWeight:"900",color:colors.primaryStrong,marginTop:9,textTransform:"capitalize"},secondary:{borderWidth:1,borderColor:colors.primary,borderRadius:radius.md,padding:12,alignItems:"center",marginTop:12},secondaryText:{fontSize:12,fontWeight:"900",color:colors.primary},historyCount:{fontSize:22,fontWeight:"900",color:colors.primaryStrong,marginTop:9},historyRow:{flexDirection:"row",justifyContent:"space-between",gap:10,borderTopWidth:1,borderColor:colors.border,paddingTop:9,marginTop:9},historyDate:{fontSize:10,color:colors.textMuted},historyTitle:{fontSize:11,fontWeight:"800",color:colors.text,flex:1,textAlign:"right"},partial:{fontSize:11,lineHeight:16,color:colors.textMuted},error:{fontSize:12,color:colors.danger},retry:{marginTop:10},retryText:{color:colors.primary,fontWeight:"900"}
});
