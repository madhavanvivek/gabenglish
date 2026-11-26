import {useCallback,useState} from "react";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,getDueLearnerVocabulary,reviewLearnerVocabulary,type LearnerVocabularyItem} from "../src/auth-api";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";
import {colors,radius,space} from "../src/theme";

const ratings=[{id:"again",label:"Again"},{id:"hard",label:"Hard"},{id:"good",label:"Good"},{id:"easy",label:"Easy"}] as const;
export default function VocabularyScreen(){
 const [items,setItems]=useState<LearnerVocabularyItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const result=await getDueLearnerVocabulary(50);setItems(result.items);}
  catch(reason){setItems([]);if(!(reason instanceof AuthApiError&&[401,403].includes(reason.status??0)))setError(reason instanceof Error?reason.message:"Could not load vocabulary for review.");}
  finally{setLoading(false);}
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 async function review(item:LearnerVocabularyItem,rating:"again"|"hard"|"good"|"easy"){
  if(busy)return;setBusy(item.id);setError("");setNotice("");
  try{
   const result=await reviewLearnerVocabulary(item.id,rating);
   setItems(current=>current.filter(value=>value.id!==item.id));
   setNotice(`Saved. You'll see “${item.source_term}” again in ${result.review.next_interval_days} day(s).`);
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not save your review.");}
  finally{setBusy(null);}
 }
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.header}><Link href="/progress" style={s.back}>‹ Your progress</Link><BrandMark size={42}/><Text style={s.title}>Vocabulary review</Text><Text style={s.subtitle}>A little practice today makes words easier to remember.</Text></View>
  <SurfaceCard soft><Eyebrow>SPACED REPETITION</Eyebrow><Text style={s.summary}>{items.length} {items.length===1?"word":"words"} due now</Text><Text style={s.body}>Choose how well you remembered each word. Gabenglish schedules the next review based on your answer.</Text></SurfaceCard>
  {loading?<View style={s.loading}><ActivityIndicator color={colors.primary}/><Text style={s.body}>Loading your review list…</Text></View>:items.length?items.map(item=><SurfaceCard key={item.id}>
   <Text style={s.term}>{item.source_term}</Text><Text style={s.meaning}>{item.target_term}</Text>{item.example?<Text style={s.example}>{item.example}</Text>:null}
   <Text style={s.meta}>{item.repetitions} successful review(s) · {item.lapses} lapse(s)</Text>
   <View style={s.ratings}>{ratings.map(rating=><Pressable key={rating.id} accessibilityRole="button" disabled={busy!==null} onPress={()=>void review(item,rating.id)} style={[s.rating,busy===item.id&&s.ratingBusy]}><Text style={s.ratingText}>{busy===item.id?"…":rating.label}</Text></Pressable>)}</View>
  </SurfaceCard>):<SurfaceCard soft><Text style={s.emptyTitle}>You're all caught up!</Text><Text style={s.body}>Saved words will appear here when their next review is due. Add words from your lessons to build your vocabulary collection.</Text><Link href="/learn" style={s.action}>Explore lessons →</Link></SurfaceCard>}
  {notice?<Text style={s.notice}>{notice}</Text>:null}{error?<View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>void load()}><Text style={s.action}>Try again</Text></Pressable></View>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},header:{alignItems:"center",gap:7},back:{alignSelf:"flex-start",color:colors.primary,fontSize:13,fontWeight:"900",marginBottom:6},title:{fontSize:25,fontWeight:"900",color:colors.text},subtitle:{fontSize:12,color:colors.textMuted,textAlign:"center"},summary:{fontSize:22,fontWeight:"900",color:colors.primaryStrong,marginTop:7},body:{fontSize:12,lineHeight:19,color:colors.textMuted,marginTop:7},loading:{padding:32,alignItems:"center",gap:10},term:{fontSize:21,fontWeight:"900",color:colors.primaryStrong},meaning:{fontSize:16,fontWeight:"800",color:colors.text,marginTop:5},example:{fontSize:12,lineHeight:18,color:colors.textMuted,marginTop:9},meta:{fontSize:10,color:colors.textMuted,marginTop:10},ratings:{flexDirection:"row",gap:6,marginTop:14},rating:{flex:1,alignItems:"center",paddingVertical:10,borderRadius:radius.md,backgroundColor:colors.surfaceSoft},ratingBusy:{opacity:0.5},ratingText:{fontSize:11,fontWeight:"900",color:colors.primaryStrong},emptyTitle:{fontSize:18,fontWeight:"900",color:colors.primaryStrong},action:{fontSize:12,fontWeight:"900",color:colors.primary,marginTop:12},notice:{fontSize:12,color:colors.secondary,fontWeight:"800"},error:{padding:13,borderRadius:radius.md,backgroundColor:"#FCE8E6"},errorText:{fontSize:12,color:colors.danger}
});
