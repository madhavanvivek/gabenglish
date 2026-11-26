import {useCallback,useState} from "react";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,archiveLearnerVocabulary,getDueLearnerVocabulary,listLearnerVocabulary,reviewLearnerVocabulary,type LearnerVocabularyItem} from "../src/auth-api";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";
import {colors,radius,space} from "../src/theme";

const ratings=[{id:"again",label:"Again"},{id:"hard",label:"Hard"},{id:"good",label:"Good"},{id:"easy",label:"Easy"}] as const;
type VocabularyView="due"|"saved";
export default function VocabularyScreen(){
 const [items,setItems]=useState<LearnerVocabularyItem[]>([]);
 const [savedItems,setSavedItems]=useState<LearnerVocabularyItem[]>([]);
 const [view,setView]=useState<VocabularyView>("due");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [due,collection]=await Promise.all([getDueLearnerVocabulary(50),listLearnerVocabulary()]);
   setItems(due.items);
   setSavedItems(collection.items.filter(item=>item.status==="active"));
  }catch(reason){
   if(!(reason instanceof AuthApiError&&[401,403].includes(reason.status??0)))setError(reason instanceof Error?reason.message:"Could not load your vocabulary.");
  }finally{setLoading(false);}
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 async function review(item:LearnerVocabularyItem,rating:"again"|"hard"|"good"|"easy"){
  if(busy)return;setBusy(item.id);setError("");setNotice("");
  try{
   const result=await reviewLearnerVocabulary(item.id,rating);
   setItems(current=>current.filter(value=>value.id!==item.id));
   setSavedItems(current=>current.map(value=>value.id===item.id?{...value,...result.item}:value));
   setNotice(`Saved. You'll see “${item.source_term}” again in ${result.review.next_interval_days} day(s).`);
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not save your review.");}
  finally{setBusy(null);}
 }
 async function archive(item:LearnerVocabularyItem){
  if(busy)return;setBusy(item.id);setError("");setNotice("");
  try{
   await archiveLearnerVocabulary(item.id);
   setSavedItems(current=>current.filter(value=>value.id!==item.id));
   setItems(current=>current.filter(value=>value.id!==item.id));
   setNotice(`“${item.source_term}” was removed from your active vocabulary.`);
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not archive this word.");}
  finally{setBusy(null);}
 }
 const visible=view==="due"?items:savedItems;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.header}><Link href="/progress" style={s.back}>‹ Your progress</Link><BrandMark size={42}/><Text style={s.title}>My vocabulary</Text><Text style={s.subtitle}>Keep useful words close and make them part of everyday speech.</Text></View>
  <View style={s.tabs}>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:view==="due"}} onPress={()=>setView("due")} style={[s.tab,view==="due"&&s.tabActive]}><Text style={[s.tabText,view==="due"&&s.tabTextActive]}>Due now · {items.length}</Text></Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:view==="saved"}} onPress={()=>setView("saved")} style={[s.tab,view==="saved"&&s.tabActive]}><Text style={[s.tabText,view==="saved"&&s.tabTextActive]}>Saved · {savedItems.length}</Text></Pressable>
  </View>
  <SurfaceCard soft><Eyebrow>{view==="due"?"SPACED REPETITION":"YOUR WORD COLLECTION"}</Eyebrow><Text style={s.summary}>{view==="due"?items.length:savedItems.length} {view==="due"?(items.length===1?"word":"words"):(savedItems.length===1?"saved word":"saved words")}</Text><Text style={s.body}>{view==="due"?"Choose how well you remembered each word. Gabenglish schedules the next review based on your answer.":"Words saved from lessons stay here. Review a due word or archive words you no longer need."}</Text></SurfaceCard>
  {loading?<View style={s.loading}><ActivityIndicator color={colors.primary}/><Text style={s.body}>Loading your vocabulary…</Text></View>:visible.length?visible.map(item=><SurfaceCard key={item.id}>
   <Text style={s.term}>{item.source_term}</Text><Text style={s.meaning}>{item.target_term}</Text>{item.example?<Text style={s.example}>{item.example}</Text>:null}
   <Text style={s.meta}>{item.repetitions} successful review(s) · {item.lapses} lapse(s) · {item.interval_days}-day interval</Text>
   {view==="due"?<View style={s.ratings}>{ratings.map(rating=><Pressable key={rating.id} accessibilityRole="button" disabled={busy!==null} onPress={()=>void review(item,rating.id)} style={[s.rating,busy===item.id&&s.ratingBusy]}><Text style={s.ratingText}>{busy===item.id?"…":rating.label}</Text></Pressable>)}</View>:<Pressable accessibilityRole="button" disabled={busy!==null} onPress={()=>void archive(item)} style={s.archive}><Text style={s.archiveText}>{busy===item.id?"Archiving…":"Archive word"}</Text></Pressable>}
  </SurfaceCard>):<SurfaceCard soft><Text style={s.emptyTitle}>{view==="due"?"You're all caught up!":"Your collection is empty"}</Text><Text style={s.body}>{view==="due"?"Saved words will appear here when their next review is due. You can add words from your lessons.":"Save useful words while learning a lesson and they will appear here for later practice."}</Text><Link href="/learn" style={s.action}>Explore lessons →</Link></SurfaceCard>}
  {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}{error?<View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>void load()}><Text style={s.action}>Try again</Text></Pressable></View>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},header:{alignItems:"center",gap:7},back:{alignSelf:"flex-start",color:colors.primary,fontSize:13,fontWeight:"900",marginBottom:6},title:{fontSize:25,fontWeight:"900",color:colors.text},subtitle:{fontSize:12,color:colors.textMuted,textAlign:"center"},tabs:{flexDirection:"row",gap:8},tab:{flex:1,alignItems:"center",paddingVertical:12,borderRadius:radius.md,backgroundColor:colors.surfaceSoft},tabActive:{backgroundColor:colors.primary},tabText:{fontSize:12,fontWeight:"800",color:colors.textMuted},tabTextActive:{color:"#FFFFFF"},summary:{fontSize:22,fontWeight:"900",color:colors.primaryStrong,marginTop:7},body:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:7},loading:{padding:32,alignItems:"center",gap:10},term:{fontSize:21,fontWeight:"900",color:colors.primaryStrong},meaning:{fontSize:16,fontWeight:"800",color:colors.text,marginTop:5},example:{fontSize:12,lineHeight:18,color:colors.textMuted,marginTop:9},meta:{fontSize:10,color:colors.textMuted,marginTop:10},ratings:{flexDirection:"row",gap:6,marginTop:14},rating:{flex:1,alignItems:"center",paddingVertical:10,borderRadius:radius.md,backgroundColor:colors.surfaceSoft},ratingBusy:{opacity:0.5},ratingText:{fontSize:11,fontWeight:"900",color:colors.primaryStrong},archive:{alignSelf:"flex-start",paddingVertical:9,paddingHorizontal:13,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,marginTop:12},archiveText:{fontSize:11,fontWeight:"900",color:colors.danger},emptyTitle:{fontSize:18,fontWeight:"900",color:colors.primaryStrong},action:{fontSize:12,fontWeight:"900",color:colors.primary,marginTop:12},notice:{fontSize:12,color:colors.secondary,fontWeight:"800"},error:{padding:13,borderRadius:radius.md,backgroundColor:"#FCE8E6"},errorText:{fontSize:12,color:colors.danger}
});
