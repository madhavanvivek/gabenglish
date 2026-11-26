import {useCallback,useState} from "react";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {getVocabularyReviewQueue,getVocabularyRetentionSummary,getVocabularyReviewHistory,submitVocabularyRecallRating,type VocabularyReviewItem,type VocabularyRetentionSummary,type VocabularyReviewHistoryItem} from "../src/auth-api";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";
import {colors,radius,space} from "../src/theme";

const ratings=[
 {value:0,label:"Not at all",hint:"I couldn't recall it"},
 {value:1,label:"Very hard",hint:"I needed the answer"},
 {value:2,label:"Hard",hint:"I almost remembered"},
 {value:3,label:"Okay",hint:"I remembered with effort"},
 {value:4,label:"Easy",hint:"I remembered clearly"},
 {value:5,label:"Effortless",hint:"I knew it instantly"}
] as const;

export default function VocabularyReviewScreen(){
 const [items,setItems]=useState<VocabularyReviewItem[]>([]);
 const [retention,setRetention]=useState<VocabularyRetentionSummary|null>(null);
 const [history,setHistory]=useState<VocabularyReviewHistoryItem[]>([]);
 const [scheduleNotice,setScheduleNotice]=useState("");
 const [index,setIndex]=useState(0);
 const [revealed,setRevealed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [completed,setCompleted]=useState(0);
 const load=useCallback(async()=>{
  setLoading(true);setError("");setNotice("");setScheduleNotice("");
  const queueTask=getVocabularyReviewQueue(30).then(queue=>{setItems(queue.items);setIndex(0);setRevealed(false);}).catch(reason=>{setError(reason instanceof Error?reason.message:"Your vocabulary reviews could not be loaded.");});
  const summaryTask=getVocabularyRetentionSummary().then(setRetention).catch(()=>setRetention(null));
  const historyTask=getVocabularyReviewHistory(8).then(result=>setHistory(result.items)).catch(()=>setHistory([]));
  await Promise.all([queueTask,summaryTask,historyTask]);
  setLoading(false);
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const current=items[index];
 const rate=async(value:number)=>{
  if(!current||saving)return;
  setSaving(true);setError("");
  try{
   const result=await submitVocabularyRecallRating(current.lesson_id,current.vocabulary_item_id,value);
   const dueDate=new Date(result.schedule.due_at);
   setScheduleNotice(Number.isFinite(dueDate.getTime())?`Next review planned for ${dueDate.toLocaleDateString(undefined,{month:"short",day:"numeric"})}.`:"Your next review has been scheduled.");
   setCompleted(count=>count+1);
   if(index+1<items.length){setIndex(index+1);setRevealed(false);}
   else{setItems([]);setNotice("Lovely work. You've finished every word currently due for review.");}
  }catch(reason){setError(reason instanceof Error?reason.message:"We couldn't save that rating. Please try again.");}
  finally{setSaving(false);}
 };
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.header}><Link href="/home" style={s.back}>‹ Home</Link><BrandMark size={42}/><Text style={s.brand}>Word garden</Text><Text style={s.subtitle}>Small reviews. Stronger memories.</Text></View>
  <View style={s.intro}><Eyebrow>YOUR VOCABULARY RETENTION</Eyebrow><Text style={s.introTitle}>Bring the words back to life.</Text><Text style={s.introBody}>Try to remember each word before revealing its meaning. Be honest about how well you recalled it — Gabroo will use your rating to plan the next review.</Text></View>
  {retention?<SurfaceCard><Eyebrow>YOUR WORD GARDEN</Eyebrow><View style={s.statsGrid}><View style={s.stat}><Text style={s.statValue}>{retention.summary.total_words}</Text><Text style={s.statLabel}>WORDS LEARNED</Text></View><View style={s.stat}><Text style={s.statValue}>{retention.summary.reviewed_words}</Text><Text style={s.statLabel}>REVIEWED</Text></View><View style={s.stat}><Text style={s.statValue}>{retention.summary.due_words}</Text><Text style={s.statLabel}>DUE NOW</Text></View><View style={s.stat}><Text style={s.statValue}>{retention.summary.mastered_words}</Text><Text style={s.statLabel}>STEADY REVIEWS</Text></View><View style={s.stat}><Text style={s.statValue}>{retention.summary.developing_words}</Text><Text style={s.statLabel}>IN PROGRESS</Text></View></View><Text style={s.statFootnote}>Steady reviews are a memory-schedule signal, not a fluency score. {retention.summary.last_reviewed_at?`Last reviewed ${new Date(retention.summary.last_reviewed_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}.`:"No vocabulary reviews recorded yet."}</Text></SurfaceCard>:null}
  {history.length>0?<SurfaceCard><Eyebrow>YOUR RECENT RECALL</Eyebrow><Text style={s.historyTitle}>Review history</Text>{history.map(item=><View key={item.lesson_id+":"+item.vocabulary_item_id+":"+item.reviewed_at} style={s.historyItem}><View style={s.historyCopy}><Text style={s.historyTerm}>{item.term}</Text><Text style={s.historyMeta}>{item.lesson_title} · {new Date(item.reviewed_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</Text></View><View style={s.historyRating}><Text style={s.historyScore}>{item.rating}/5</Text><Text style={s.historyMeta}>{item.interval_days}d interval</Text></View></View>)}</SurfaceCard>:null}
  {scheduleNotice?<Text accessibilityLiveRegion="polite" style={s.scheduleNotice}>{scheduleNotice}</Text>:null}
  {loading?<View style={s.loading}><ActivityIndicator size="large" color={colors.primary}/><Text style={s.muted}>Gathering words for you…</Text></View>:error?<SurfaceCard soft><Text style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>void load()} style={s.primaryButton}><Text style={s.primaryText}>Try again</Text></Pressable></SurfaceCard>:current?<>
   <View style={s.progressRow}><Text style={s.progressLabel}>WORD {index+1} OF {items.length}</Text><Text style={s.progressLabel}>{completed} REVIEWED THIS SESSION</Text></View>
   <View style={s.progressTrack}><View style={[s.progressFill,{width:`${((index+1)/items.length)*100}%`} ]}/></View>
   <SurfaceCard soft>
    <Eyebrow>CAN YOU REMEMBER THIS?</Eyebrow>
    <Text style={s.term}>{current.term}</Text>
    {current.pronunciation?<Text style={s.pronunciation}>{current.pronunciation}</Text>:null}
    {current.example?<Text style={s.example}>“{current.example}”</Text>:null}
    {!revealed?<Pressable accessibilityRole="button" onPress={()=>setRevealed(true)} style={s.primaryButton}><Text style={s.primaryText}>Reveal meaning</Text></Pressable>:<>
     <View style={s.answer}><Text style={s.answerLabel}>MEANING</Text><Text style={s.meaning}>{current.meaning}</Text></View>
     <Text style={s.ratingTitle}>How well did you remember?</Text>
     <View style={s.ratingList}>{ratings.map(item=><Pressable key={item.value} accessibilityRole="button" disabled={saving} onPress={()=>void rate(item.value)} style={s.ratingOption}><View style={s.ratingNumber}><Text style={s.ratingNumberText}>{item.value}</Text></View><View style={s.ratingCopy}><Text style={s.ratingLabel}>{item.label}</Text><Text style={s.ratingHint}>{item.hint}</Text></View><Text style={s.ratingArrow}>›</Text></Pressable>)}</View>
     {saving?<View style={s.saving}><ActivityIndicator color={colors.primary}/><Text style={s.muted}>Saving your recall…</Text></View>:null}
    </>}
   </SurfaceCard>
   <Text style={s.privacy}>Your rating is personal learning evidence, not a test score. Missing a review never blocks your lessons.</Text>
  </>:<SurfaceCard soft>
    <View style={s.emptyIcon}><Text style={s.emptyEmoji}>🌱</Text></View>
    <Text style={s.emptyTitle}>{notice?"You're all caught up!":"No words due just now."}</Text>
    <Text style={s.emptyBody}>{notice||"New words and words ready for another look will appear here. Keep learning in your lessons — your review schedule will take care of itself."}</Text>
    <Link href="/learn" asChild><Pressable style={s.primaryButton}><Text style={s.primaryText}>Explore lessons</Text></Pressable></Link>
    <Pressable accessibilityRole="button" onPress={()=>void load()} style={s.secondaryButton}><Text style={s.secondaryText}>Refresh review queue</Text></Pressable>
   </SurfaceCard>}
  <View style={s.footer}><Link href="/gabroo" style={s.footerLink}>Need a word explained? Talk to Gabroo →</Link></View>
 </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{padding:space.xl,paddingBottom:48,gap:space.lg},
 header:{alignItems:"center",gap:space.xs,paddingBottom:space.sm},back:{alignSelf:"flex-start",color:colors.primary,fontSize:15,fontWeight:"700",marginBottom:space.sm},
 brand:{fontSize:25,fontWeight:"800",color:colors.text},subtitle:{fontSize:14,color:colors.textMuted},
 intro:{backgroundColor:colors.surfaceWarm,borderRadius:radius.xl,padding:space.xl,gap:space.sm},
 introTitle:{fontSize:25,lineHeight:32,fontWeight:"800",color:colors.text},introBody:{fontSize:15,lineHeight:23,color:colors.textMuted},
 loading:{alignItems:"center",padding:space.xxl,gap:space.md},
 statsGrid:{flexDirection:"row",flexWrap:"wrap",gap:space.md,marginTop:space.md},stat:{width:"46%",backgroundColor:colors.surfaceWarm,borderRadius:radius.md,padding:space.md,gap:4},statValue:{fontSize:24,fontWeight:"800",color:colors.text},statLabel:{fontSize:10,fontWeight:"800",letterSpacing:0.7,color:colors.textMuted},statFootnote:{fontSize:11,lineHeight:16,color:colors.textMuted,marginTop:space.md},scheduleNotice:{fontSize:13,fontWeight:"700",color:colors.primary,textAlign:"center"},muted:{fontSize:14,color:colors.textMuted},
 progressRow:{flexDirection:"row",justifyContent:"space-between",gap:space.sm},progressLabel:{fontSize:10,fontWeight:"800",letterSpacing:0.8,color:colors.textMuted},
 progressTrack:{height:7,backgroundColor:colors.border,borderRadius:99,overflow:"hidden"},progressFill:{height:7,backgroundColor:colors.primary,borderRadius:99},
 term:{fontSize:36,lineHeight:44,fontWeight:"800",color:colors.text,textAlign:"center",marginTop:space.lg},
 pronunciation:{fontSize:15,color:colors.textMuted,textAlign:"center",marginTop:space.xs},
 example:{fontSize:15,lineHeight:23,color:colors.textMuted,fontStyle:"italic",textAlign:"center",marginTop:space.lg},
 primaryButton:{backgroundColor:colors.primary,borderRadius:radius.lg,padding:space.lg,alignItems:"center",marginTop:space.lg},
 primaryText:{color:"#FFFFFF",fontSize:15,fontWeight:"800"},
 answer:{backgroundColor:colors.surfaceWarm,borderRadius:radius.lg,padding:space.lg,marginTop:space.xl,gap:space.xs},
 answerLabel:{fontSize:10,fontWeight:"800",letterSpacing:1,color:colors.textMuted},meaning:{fontSize:23,fontWeight:"800",color:colors.text,lineHeight:31},
 ratingTitle:{fontSize:17,fontWeight:"800",color:colors.text,marginTop:space.xl,marginBottom:space.sm},
 ratingList:{gap:space.sm},ratingOption:{flexDirection:"row",alignItems:"center",gap:space.md,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:space.md,backgroundColor:colors.surface},
 ratingNumber:{width:34,height:34,borderRadius:17,backgroundColor:colors.surfaceSoft,alignItems:"center",justifyContent:"center"},
 ratingNumberText:{fontSize:15,fontWeight:"800",color:colors.primary},ratingCopy:{flex:1,gap:2},ratingLabel:{fontSize:14,fontWeight:"800",color:colors.text},ratingHint:{fontSize:12,color:colors.textMuted},ratingArrow:{fontSize:24,color:colors.textMuted},
 saving:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:space.sm,marginTop:space.md},
 privacy:{fontSize:12,lineHeight:18,color:colors.textMuted,textAlign:"center"},
 emptyIcon:{alignItems:"center",marginTop:space.md},emptyEmoji:{fontSize:42},emptyTitle:{fontSize:22,fontWeight:"800",color:colors.text,textAlign:"center",marginTop:space.md},
 emptyBody:{fontSize:14,lineHeight:22,color:colors.textMuted,textAlign:"center",marginTop:space.sm},
 secondaryButton:{padding:space.md,alignItems:"center",marginTop:space.sm},secondaryText:{color:colors.primary,fontWeight:"700"},
 error:{fontSize:14,lineHeight:21,color:colors.danger},footer:{alignItems:"center",paddingTop:space.sm},footerLink:{color:colors.primary,fontSize:14,fontWeight:"700"}
});
