import {useCallback,useState} from "react";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,getLatestFreeDiagnosticReport,getLearnerVocabularyStats,getLearningProgressOverview,getSubscriptionStatus,type LearnerVocabularyStats,type LearningProgressOverview,type SavedFreeDiagnosticReport} from "../src/auth-api";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";
import {colors,radius,space} from "../src/theme";

export default function ProgressScreen(){
 const [report,setReport]=useState<SavedFreeDiagnosticReport|null>(null);
 const [learningProgress,setLearningProgress]=useState<LearningProgressOverview|null>(null);
 const [vocabularyStats,setVocabularyStats]=useState<LearnerVocabularyStats|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{setReport(await getLatestFreeDiagnosticReport());}
  catch(reason){
   setReport(null);
   if(!(reason instanceof AuthApiError&&[401,404].includes(reason.status??0)))setError(reason instanceof Error?reason.message:"Could not load your progress snapshot.");
  }finally{
   try{
    const subscription=await getSubscriptionStatus();
    if(subscription.active){
     const [progress,vocabulary]=await Promise.all([getLearningProgressOverview(),getLearnerVocabularyStats().catch(()=>null)]);
     setLearningProgress(progress);setVocabularyStats(vocabulary?.stats??null);
    }else{setLearningProgress(null);setVocabularyStats(null);}
   }catch{setLearningProgress(null);setVocabularyStats(null);}
   setLoading(false);
  }
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load,refreshKey]));
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.header}><Link href="/home" style={s.back}>‹ Home</Link><BrandMark size={42}/><Text style={s.brand}>Your progress</Text><Text style={s.subtitle}>A clear picture of what we have learned so far.</Text></View>
  {loading?<View style={s.loading}><ActivityIndicator color={colors.primary} size="large"/><Text style={s.muted}>Loading your latest report…</Text></View>:report?<>
   <View style={s.hero}><Eyebrow>YOUR LATEST FREE ANALYSIS</Eyebrow><Text style={s.heroTitle}>Your learning snapshot</Text><Text style={s.heroBody}>This is an evidence summary from your latest conversation-based analysis, not a final proficiency score or a verified stage placement.</Text><Text style={s.date}>Saved {new Date(report.created_at).toLocaleDateString()}</Text></View>
   <View style={s.stats}><SurfaceCard soft><Text style={s.stat}>{report.report.response_count}</Text><Text style={s.statLabel}>Responses analysed</Text></SurfaceCard><SurfaceCard><Text style={s.stat}>{report.report.extended_samples}</Text><Text style={s.statLabel}>Extended samples</Text></SurfaceCard><SurfaceCard><Text style={s.stat}>{report.report.brief_samples}</Text><Text style={s.statLabel}>Brief samples</Text></SurfaceCard></View>
   <SurfaceCard><Text style={s.cardTitle}>Gabroo's explanation</Text><Text style={s.body}>{report.gabroo_explanation}</Text></SurfaceCard>
   <SurfaceCard><Text style={s.cardTitle}>Patterns observed</Text>{report.report.observed_patterns.length?report.report.observed_patterns.map((item,index)=><View key={index} style={s.listRow}><Text style={s.bullet}>•</Text><Text style={s.bodyFlex}>{item}</Text></View>):<Text style={s.body}>There is not enough evidence to describe reliable patterns yet.</Text>}</SurfaceCard>
   <SurfaceCard soft><Text style={s.cardTitle}>Suggested next steps</Text>{report.report.next_steps.length?report.report.next_steps.map((item,index)=><View key={index} style={s.listRow}><Text style={s.stepNumber}>{index+1}</Text><Text style={s.bodyFlex}>{item}</Text></View>):<Text style={s.body}>Gabroo will suggest next steps after more learning evidence is available.</Text>}</SurfaceCard>
   {report.report.limitations.length>0?<View style={s.limits}><Text style={s.limitsTitle}>What this report cannot tell you yet</Text>{report.report.limitations.map((item,index)=><Text key={index} style={s.limitText}>• {item}</Text>)}</View>:null}
  </>:<View style={s.empty}><Text style={s.emptyTitle}>Your first learning snapshot is waiting.</Text><Text style={s.body}>Complete the free conversation-based English analysis to save an initial snapshot here. It remains available without a paid subscription.</Text><Link href="/" style={s.action}>Start free English analysis →</Link></View>}

  {learningProgress?<SurfaceCard>
   <Eyebrow>COURSE PROGRESS</Eyebrow>
   <Text style={s.cardTitle}>Your learning journey</Text>
   <Text style={s.courseOverall}>{learningProgress.summary.progress_percent}%</Text>
   <View style={s.courseTrack}><View style={[s.courseFill,{width:`${learningProgress.summary.progress_percent}%` as `${number}%`}]}/></View>
   <Text style={s.body}>{learningProgress.summary.completed_lessons} of {learningProgress.summary.total_lessons} lessons completed · {learningProgress.summary.started_lessons} started</Text>
   {learningProgress.courses.length?learningProgress.courses.map(course=><View key={course.id} style={s.courseRow}>
    <View style={s.courseHeader}><Text style={s.courseTitle}>{course.title}</Text><Text style={s.coursePercent}>{course.progress_percent}%</Text></View>
    <View style={s.courseTrack}><View style={[s.courseFill,{width:`${course.progress_percent}%` as `${number}%`}]}/></View>
    <Text style={s.courseMeta}>{course.completed_lessons}/{course.total_lessons} lessons completed · {course.started_lessons} started</Text>
    {course.description?<Text style={s.courseDescription}>{course.description}</Text>:null}
   </View>):<Text style={s.body}>Published lessons for this learning direction will appear here as they become available.</Text>}
  </SurfaceCard>:null}
  {vocabularyStats?<SurfaceCard>
   <Eyebrow>VOCABULARY PRACTICE</Eyebrow>
   <Text style={s.cardTitle}>Words you're building</Text>
   <View style={s.vocabularyStats}>
    <View style={s.vocabularyStat}><Text style={s.vocabularyValue}>{vocabularyStats.active_items}</Text><Text style={s.vocabularyLabel}>Saved words</Text></View>
    <View style={s.vocabularyStat}><Text style={s.vocabularyValue}>{vocabularyStats.due_items}</Text><Text style={s.vocabularyLabel}>Due for review</Text></View>
    <View style={s.vocabularyStat}><Text style={s.vocabularyValue}>{vocabularyStats.reviewed_last_7_days}</Text><Text style={s.vocabularyLabel}>Reviews · 7 days</Text></View>
    <View style={s.vocabularyStat}><Text style={s.vocabularyValue}>{vocabularyStats.practice_days_last_7_days}/7</Text><Text style={s.vocabularyLabel}>Practice days</Text></View>
   </View>
   <Text style={s.body}>{vocabularyStats.reviewed_last_7_days?Math.round(vocabularyStats.positive_ratings_last_7_days/vocabularyStats.reviewed_last_7_days*100)+"% of recent reviews were rated Hard, Good or Easy. These are self-reported recall signals, not a measure of overall English proficiency.":"Your vocabulary review activity will appear here after your first review."}</Text>
   <Link href="/vocabulary" style={s.action}>Open vocabulary review →</Link>
  </SurfaceCard>:null}
  {!!error&&<View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>setRefreshKey(value=>value+1)}><Text style={s.retry}>Try again</Text></Pressable></View>}
  <View style={s.footerCard}><Text style={s.footerTitle}>Build your vocabulary</Text><Text style={s.footerBody}>Review saved words with a spaced repetition schedule that adapts to your answers.</Text><Link href="/vocabulary" style={s.action}>Review vocabulary →</Link></View>
  <View style={s.footerCard}><Text style={s.footerTitle}>Ready for a little practice?</Text><Text style={s.footerBody}>Talk to Gabroo about your goals and ask for a gentle practice conversation.</Text><Link href="/gabroo" style={s.action}>Talk to Gabroo →</Link></View>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},header:{alignItems:"center",gap:7},back:{alignSelf:"flex-start",color:colors.primary,fontSize:13,fontWeight:"900",marginBottom:6},brand:{fontSize:25,fontWeight:"900",color:colors.text},subtitle:{fontSize:12,color:colors.textMuted,textAlign:"center"},loading:{paddingVertical:60,alignItems:"center",gap:12},muted:{fontSize:12,color:colors.textMuted},
 courseOverall:{fontSize:28,fontWeight:"900",color:colors.primaryStrong,marginTop:8},courseTrack:{height:8,borderRadius:8,backgroundColor:colors.border,overflow:"hidden",marginTop:10},courseFill:{height:8,borderRadius:8,backgroundColor:colors.primary},courseRow:{paddingTop:14,marginTop:12,borderTopWidth:1,borderTopColor:colors.border},courseHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},courseTitle:{fontSize:13,fontWeight:"900",color:colors.text,flex:1},coursePercent:{fontSize:12,fontWeight:"900",color:colors.primary},courseMeta:{fontSize:10,color:colors.textMuted,marginTop:7},courseDescription:{fontSize:11,lineHeight:16,color:colors.textMuted,marginTop:4},vocabularyStats:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:12},vocabularyStat:{width:"47%",padding:10,borderRadius:radius.md,backgroundColor:colors.surfaceSoft},vocabularyValue:{fontSize:20,fontWeight:"900",color:colors.primaryStrong},vocabularyLabel:{fontSize:10,fontWeight:"800",color:colors.textMuted,marginTop:3},hero:{backgroundColor:colors.primaryStrong,borderRadius:radius.xl,padding:space.xl},heroTitle:{fontSize:22,fontWeight:"900",color:"#FFFFFF",marginTop:8},heroBody:{fontSize:12,lineHeight:18,color:"#F0E8FA",marginTop:7},date:{fontSize:10,color:"#DCCCF1",marginTop:13},stats:{flexDirection:"row",gap:8},stat:{fontSize:23,fontWeight:"900",color:colors.primaryStrong},statLabel:{fontSize:9,lineHeight:13,color:colors.textMuted,marginTop:5},cardTitle:{fontSize:15,fontWeight:"900",color:colors.text},body:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:8},listRow:{flexDirection:"row",alignItems:"flex-start",gap:9,marginTop:10},bullet:{fontSize:16,color:colors.secondary},bodyFlex:{flex:1,fontSize:12,lineHeight:18,color:colors.textMuted},stepNumber:{width:21,height:21,borderRadius:8,backgroundColor:"#E8DDF7",color:colors.primaryStrong,fontSize:11,fontWeight:"900",textAlign:"center",textAlignVertical:"center",overflow:"hidden"},limits:{backgroundColor:"#FFF1D8",borderRadius:radius.lg,padding:15},limitsTitle:{fontSize:12,fontWeight:"900",color:"#80520C"},limitText:{fontSize:11,lineHeight:17,color:"#765B2C",marginTop:6},empty:{backgroundColor:colors.surfaceSoft,borderRadius:radius.xl,padding:20},emptyTitle:{fontSize:18,fontWeight:"900",color:colors.primaryStrong},action:{fontSize:12,fontWeight:"900",color:colors.primary,marginTop:13},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12},errorText:{fontSize:12,color:colors.danger},retry:{fontSize:11,fontWeight:"900",color:colors.primary,marginTop:8},footerCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:16},footerTitle:{fontSize:14,fontWeight:"900",color:colors.text},footerBody:{fontSize:11,lineHeight:17,color:colors.textMuted,marginTop:5}
});
