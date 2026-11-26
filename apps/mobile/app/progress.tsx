import {useCallback,useState} from "react";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,getLatestFreeDiagnosticReport,getPublishedLearningCatalog,type PublishedLearningCatalog,type SavedFreeDiagnosticReport} from "../src/auth-api";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";
import {colors,radius,space} from "../src/theme";

export default function ProgressScreen(){
 const [report,setReport]=useState<SavedFreeDiagnosticReport|null>(null);
 const [catalog,setCatalog]=useState<PublishedLearningCatalog|null>(null);
 const [catalogError,setCatalogError]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [reportResult,catalogResult]=await Promise.allSettled([
   getLatestFreeDiagnosticReport(),
   getPublishedLearningCatalog()
  ]);
  if(reportResult.status==="fulfilled"){setReport(reportResult.value);}
  else{
   setReport(null);
   const reason=reportResult.reason;
   if(!(reason instanceof AuthApiError&&[401,404].includes(reason.status??0)))setError(reason instanceof Error?reason.message:"Could not load your progress snapshot.");
  }
  if(catalogResult.status==="fulfilled"){setCatalog(catalogResult.value);setCatalogError("");}
  else{
   setCatalog(null);
   const reason=catalogResult.reason;
   if(reason instanceof AuthApiError&&[401,403].includes(reason.status??0))setCatalogError("");
   else setCatalogError(reason instanceof Error?reason.message:"Could not load your course progress.");
  }
  setLoading(false);
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
  {catalog?.courses.map(course=><SurfaceCard key={course.id}>
   <Eyebrow>YOUR LEARNING PATH</Eyebrow><Text style={s.cardTitle}>{course.title}</Text>
   <View style={s.courseSummary}><Text style={s.coursePercent}>{Math.round(course.progress.progress_percent)}%</Text><Text style={s.bodyFlex}>{course.progress.completed_lessons} of {course.progress.total_lessons} lessons completed</Text></View>
   <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(course.progress.progress_percent)}} style={s.progressTrack}><View style={[s.progressFill,{width:(Math.max(0,Math.min(100,course.progress.progress_percent))+"%") as `${number}%`}]}/></View>
   {course.modules.map(module=><View key={module.id} style={s.moduleBlock}><Text style={s.moduleTitle}>{module.title}</Text>{module.lessons.map(lesson=><View key={lesson.id} style={s.lessonRow}><Link href={"/lesson/"+lesson.id} style={s.lessonLink}>{lesson.title}</Link><Text style={[s.lessonStatus,lesson.progress?.status==="completed"&&s.lessonCompleted]}>{lesson.progress?.status==="completed"?"Completed":lesson.progress?.status==="in_progress"?lesson.progress.progress_percent+"%":"Not started"}</Text></View>)}</View>)}
   {course.progress.total_lessons===0?<Text style={s.body}>Published lessons will appear here after curriculum review.</Text>:null}
   <Link href="/learn" style={s.action}>Open learning path →</Link>
  </SurfaceCard>)}
  {!!catalogError&&<View style={s.error}><Text style={s.errorText}>{catalogError}</Text><Pressable onPress={()=>setRefreshKey(value=>value+1)}><Text style={s.retry}>Try again</Text></Pressable></View>}
  {!!error&&<View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>setRefreshKey(value=>value+1)}><Text style={s.retry}>Try again</Text></Pressable></View>}
  <View style={s.footerCard}><Text style={s.footerTitle}>Ready for a little practice?</Text><Text style={s.footerBody}>Talk to Gabroo about your goals and ask for a gentle practice conversation.</Text><Link href="/gabroo" style={s.action}>Talk to Gabroo →</Link></View>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},header:{alignItems:"center",gap:7},back:{alignSelf:"flex-start",color:colors.primary,fontSize:13,fontWeight:"900",marginBottom:6},brand:{fontSize:25,fontWeight:"900",color:colors.text},subtitle:{fontSize:12,color:colors.textMuted,textAlign:"center"},loading:{paddingVertical:60,alignItems:"center",gap:12},muted:{fontSize:12,color:colors.textMuted},
 hero:{backgroundColor:colors.primaryStrong,borderRadius:radius.xl,padding:space.xl},heroTitle:{fontSize:22,fontWeight:"900",color:"#FFFFFF",marginTop:8},heroBody:{fontSize:12,lineHeight:18,color:"#F0E8FA",marginTop:7},date:{fontSize:10,color:"#DCCCF1",marginTop:13},stats:{flexDirection:"row",gap:8},stat:{fontSize:23,fontWeight:"900",color:colors.primaryStrong},statLabel:{fontSize:9,lineHeight:13,color:colors.textMuted,marginTop:5},cardTitle:{fontSize:15,fontWeight:"900",color:colors.text},courseSummary:{flexDirection:"row",alignItems:"center",gap:10,marginTop:10},coursePercent:{fontSize:23,fontWeight:"900",color:colors.primaryStrong},progressTrack:{height:8,borderRadius:99,backgroundColor:colors.border,overflow:"hidden",marginTop:10},progressFill:{height:8,borderRadius:99,backgroundColor:colors.success},moduleBlock:{marginTop:12},moduleTitle:{fontSize:11,fontWeight:"900",color:colors.text,marginBottom:4},lessonRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,paddingVertical:5},lessonLink:{fontSize:11,fontWeight:"800",color:colors.primary,flex:1},lessonStatus:{fontSize:9,fontWeight:"800",color:colors.textMuted},lessonCompleted:{color:colors.success},body:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:8},listRow:{flexDirection:"row",alignItems:"flex-start",gap:9,marginTop:10},bullet:{fontSize:16,color:colors.secondary},bodyFlex:{flex:1,fontSize:12,lineHeight:18,color:colors.textMuted},stepNumber:{width:21,height:21,borderRadius:8,backgroundColor:"#E8DDF7",color:colors.primaryStrong,fontSize:11,fontWeight:"900",textAlign:"center",textAlignVertical:"center",overflow:"hidden"},limits:{backgroundColor:"#FFF1D8",borderRadius:radius.lg,padding:15},limitsTitle:{fontSize:12,fontWeight:"900",color:"#80520C"},limitText:{fontSize:11,lineHeight:17,color:"#765B2C",marginTop:6},empty:{backgroundColor:colors.surfaceSoft,borderRadius:radius.xl,padding:20},emptyTitle:{fontSize:18,fontWeight:"900",color:colors.primaryStrong},action:{fontSize:12,fontWeight:"900",color:colors.primary,marginTop:13},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12},errorText:{fontSize:12,color:colors.danger},retry:{fontSize:11,fontWeight:"900",color:colors.primary,marginTop:8},footerCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:16},footerTitle:{fontSize:14,fontWeight:"900",color:colors.text},footerBody:{fontSize:11,lineHeight:17,color:colors.textMuted,marginTop:5}
});
