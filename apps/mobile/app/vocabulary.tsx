import {useCallback,useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "../src/theme";
import {type GabrooMemoryItem,type GabrooVocabularyItem,type GabrooVocabularyStatus,type GabrooVocabularyProgress,listGabrooMemory,listGabrooVocabulary,getGabrooVocabularyDue,getGabrooVocabularyProgress,reviewGabrooVocabulary,createGabrooVocabulary,updateGabrooVocabulary,deleteGabrooVocabulary} from "../src/auth-api";

const statuses:GabrooVocabularyStatus[]=["learning","familiar","mastered"];
const statusLabels:Record<GabrooVocabularyStatus,string>={learning:"Learning",familiar:"Familiar",mastered:"Mastered"};

export default function VocabularyScreen(){
 const [phrases,setPhrases]=useState<GabrooMemoryItem[]>([]);
 const [items,setItems]=useState<GabrooVocabularyItem[]>([]);
 const [dueItems,setDueItems]=useState<GabrooVocabularyItem[]>([]);
 const [progress,setProgress]=useState<GabrooVocabularyProgress|null>(null);
 const [revealedIds,setRevealedIds]=useState<string[]>([]);
 const [sourceId,setSourceId]=useState("");
 const [term,setTerm]=useState("");
 const [meaning,setMeaning]=useState("");
 const [example,setExample]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const [memory,vocabulary,due,summary]=await Promise.all([listGabrooMemory(),listGabrooVocabulary(),getGabrooVocabularyDue(),getGabrooVocabularyProgress()]);
  setPhrases(memory.memory.filter(item=>item.category==="saved_phrase"));
  setItems(vocabulary.vocabulary);
  setDueItems(due.items);
  setProgress(summary.progress);
 },[]);
 useEffect(()=>{let active=true;Promise.all([listGabrooMemory(),listGabrooVocabulary(),getGabrooVocabularyDue(),getGabrooVocabularyProgress()]).then(([memory,vocabulary,due,summary])=>{if(active){setPhrases(memory.memory.filter(item=>item.category==="saved_phrase"));setItems(vocabulary.vocabulary);setDueItems(due.items);setProgress(summary.progress);}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Could not load your vocabulary.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const add=async()=>{
  if(busy||!sourceId||!term.trim()||!meaning.trim())return;
  setBusy(true);setError("");setNotice("");
  try{await createGabrooVocabulary({source_saved_phrase_id:sourceId,term:term.trim(),malayalam_meaning:meaning.trim(),example_sentence:example.trim(),learning_direction:"ml_to_en"});await refresh();setTerm("");setMeaning("");setExample("");setNotice("Added to your vocabulary. You can update its learning status as you practise.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not add this vocabulary item.");}
  finally{setBusy(false);}
 };
 const review=async(item:GabrooVocabularyItem,rating:"again"|"hard"|"good"|"easy")=>{
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const result=await reviewGabrooVocabulary(item.id,rating);
   await refresh();
   setRevealedIds(ids=>ids.filter(id=>id!==item.id));
   setNotice(rating==="again"?"Let's practise this one again shortly.":`Next review scheduled in ${result.schedule.interval_days} day(s).`);
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not save your review.");}
  finally{setBusy(false);}
 };
 const changeStatus=async(item:GabrooVocabularyItem,status:GabrooVocabularyStatus)=>{
  if(busy||item.status===status)return;
  setBusy(true);setError("");setNotice("");
  try{await updateGabrooVocabulary(item.id,{status});await refresh();}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not update this item.");}
  finally{setBusy(false);}
 };
 const remove=(item:GabrooVocabularyItem)=>{
  Alert.alert("Delete vocabulary item?","This removes the item from your personal vocabulary list. The saved Gabroo phrase will remain.",[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:async()=>{setBusy(true);setError("");try{await deleteGabrooVocabulary(item.id);await refresh();setNotice("Vocabulary item deleted.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete this item.");}finally{setBusy(false);}}}]);
 };
 const selected=phrases.find(item=>item.id===sourceId);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <Text style={s.eyebrow}>GABROO LEARNING</Text><Text style={s.title}>My vocabulary</Text><Text style={s.subtitle}>Build a personal word list from phrases you deliberately saved from Gabroo. You choose the meaning and track what you have mastered.</Text>
  <Link href="/account" style={s.back}>‹ Account</Link>
  {error?<Text  style={s.error}>{error}</Text>:null}
  {notice?<Text  style={s.notice}>{notice}</Text>:null}
  <View style={s.card}>
   <Text style={s.section}>Add from a saved Gabroo phrase</Text>
   <Text style={s.hint}>First choose the phrase where you found the word or expression.</Text>
   {phrases.length===0?<Text style={s.empty}>No saved phrases yet. In a conversation, tap “Save useful phrase” on a Gabroo reply first.</Text>:phrases.map(phrase=><Pressable key={phrase.id} onPress={()=>setSourceId(phrase.id)} style={[s.phrase,sourceId===phrase.id&&s.selected]}><Text style={s.phraseTitle}>{phrase.memory_key}</Text><Text style={s.phraseBody}>{phrase.content}</Text><Text style={s.choose}>{sourceId===phrase.id?"Selected":"Use this phrase"}</Text></Pressable>)}
   {selected?<View style={s.form}>
    <Text style={s.label}>English word or phrase</Text><TextInput value={term} onChangeText={setTerm} placeholder="e.g. make up your mind" maxLength={120} style={s.input}/>
    <Text style={s.label}>Meaning in Malayalam</Text><TextInput value={meaning} onChangeText={setMeaning} placeholder="Write the meaning you understand" maxLength={300} style={s.input}/>
    <Text style={s.label}>Example sentence (optional)</Text><TextInput value={example} onChangeText={setExample} placeholder="Use it in a sentence" maxLength={500} multiline style={[s.input,s.multiline]}/>
    <Pressable disabled={busy||!term.trim()||!meaning.trim()} onPress={()=>void add()} style={[s.primary,(busy||!term.trim()||!meaning.trim())&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.primaryText}>Add to my vocabulary</Text>}</Pressable>
   </View>:null}
  </View>
  <View style={s.card}>
   <Text style={s.section}>Your learning progress</Text>
   {progress===null?<ActivityIndicator color={colors.primary}/>:<>
    <View style={s.progressGrid}>
     <View style={s.progressMetric}><Text style={s.progressValue}>{progress.total}</Text><Text style={s.progressLabel}>Saved words</Text></View>
     <View style={s.progressMetric}><Text style={s.progressValue}>{progress.learning}</Text><Text style={s.progressLabel}>Learning</Text></View>
     <View style={s.progressMetric}><Text style={s.progressValue}>{progress.familiar}</Text><Text style={s.progressLabel}>Familiar</Text></View>
     <View style={s.progressMetric}><Text style={s.progressValue}>{progress.mastered}</Text><Text style={s.progressLabel}>Mastered</Text></View>
    </View>
    <Text style={s.progressSummary}>{progress.total_reviews} review attempts · {progress.recently_reviewed} words practised in the last 7 days</Text>
    {progress.due_now>0?<Text style={s.progressHint}>{progress.due_now} words are ready for revision.</Text>:null}
    {progress.needs_attention>0?<Text style={s.progressHint}>{progress.needs_attention} active word(s) were last rated “Again”. Give them another try when ready.</Text>:null}
   </>}
  </View>
  <View style={s.card}>
   <Text style={s.section}>Review due now ({dueItems.length})</Text>
   <Text style={s.hint}>Try to remember the Malayalam meaning before revealing it. Your answer sets the next revision date.</Text>
   {dueItems.length===0?<Text style={s.empty}>You are all caught up. New vocabulary appears here when it is ready for revision.</Text>:dueItems.map(item=><View key={item.id} style={s.reviewItem}>
    <Text style={s.term}>{item.term}</Text>
    {revealedIds.includes(item.id)?<Text style={s.meaning}>{item.malayalam_meaning}</Text>:<Pressable onPress={()=>setRevealedIds(ids=>[...ids,item.id])} style={s.reveal}><Text style={s.revealText}>Reveal meaning</Text></Pressable>}
    {revealedIds.includes(item.id)?<View style={s.statusRow}>{([{value:"again",label:"Again"},{value:"hard",label:"Hard"},{value:"good",label:"Good"},{value:"easy",label:"Easy"}] as const).map(option=><Pressable key={option.value} disabled={busy} onPress={()=>void review(item,option.value)} style={[s.statusButton,option.value==="good"&&s.statusActive]}><Text style={[s.statusText,option.value==="good"&&s.statusTextActive]}>{option.label}</Text></Pressable>)}</View>:null}
   </View>)}
  </View>
  <View style={s.card}>
   <Text style={s.section}>Your word list ({items.length})</Text>
   {loading?<ActivityIndicator color={colors.primary}/>:items.length===0?<Text style={s.empty}>Your vocabulary list is empty. Save a useful Gabroo phrase and add your first word above.</Text>:items.map(item=><View key={item.id} style={s.item}>
    <View style={s.itemHead}><View style={{flex:1}}><Text style={s.term}>{item.term}</Text><Text style={s.meaning}>{item.malayalam_meaning}</Text></View><Pressable onPress={()=>remove(item)} disabled={busy} style={s.delete}><Text style={s.deleteText}>Delete</Text></Pressable></View>
    {item.example_sentence?<Text style={s.example}>“{item.example_sentence}”</Text>:null}
    <Text style={s.reviewMeta}>{item.review_count>0?`Reviewed ${item.review_count} time(s) · Next review ${new Date(item.review_due_at).toLocaleDateString()}`:"Ready for your first review"}</Text>
    <Link href={{pathname:"/gabroo",params:{practiceTerm:item.term,practiceMeaning:item.malayalam_meaning,practiceExample:item.example_sentence??""}}} style={s.practiceLink}>Practise with Gabroo →</Link>
    <Text style={s.statusLabel}>Learning status</Text>
    <View style={s.statusRow}>{statuses.map(status=><Pressable key={status} disabled={busy} onPress={()=>void changeStatus(item,status)} style={[s.statusButton,item.status===status&&s.statusActive]}><Text style={[s.statusText,item.status===status&&s.statusTextActive]}>{statusLabels[status]}</Text></Pressable>)}</View>
   </View>)}
  </View>
  <Text style={s.privacy}>Only vocabulary you add from a saved phrase appears here. Meanings are learner-entered, not unverified dictionary claims. Your list is private to your account and can be edited or deleted.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{padding:22,paddingBottom:48,gap:14},eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:1.5,color:colors.primary},title:{fontSize:30,fontWeight:"900",color:colors.text},subtitle:{fontSize:14,lineHeight:21,color:colors.textMuted},back:{color:colors.primary,fontWeight:"800",marginBottom:4},card:{backgroundColor:colors.surface,borderRadius:20,padding:17,gap:12,borderWidth:1,borderColor:colors.border},section:{fontSize:18,fontWeight:"900",color:colors.text},hint:{fontSize:13,lineHeight:19,color:colors.textMuted},empty:{fontSize:13,lineHeight:20,color:colors.textMuted,paddingVertical:8},phrase:{borderWidth:1,borderColor:colors.border,borderRadius:13,padding:12,gap:5},selected:{borderColor:colors.primary,backgroundColor:colors.surfaceSoft},phraseTitle:{fontWeight:"800",color:colors.text},phraseBody:{fontSize:13,lineHeight:19,color:colors.textMuted},choose:{fontSize:12,fontWeight:"800",color:colors.primary},form:{gap:9,marginTop:5},label:{fontSize:12,fontWeight:"800",color:colors.text},input:{borderWidth:1,borderColor:colors.border,borderRadius:11,padding:12,color:colors.text,backgroundColor:colors.background,fontSize:14},multiline:{minHeight:76,textAlignVertical:"top"},primary:{backgroundColor:colors.primary,borderRadius:12,padding:14,alignItems:"center",marginTop:4},primaryText:{color:"#fff",fontWeight:"900"},disabled:{opacity:0.45},reviewItem:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:12,gap:9},reveal:{alignSelf:"flex-start",paddingVertical:7,paddingHorizontal:10,borderRadius:10,backgroundColor:colors.surfaceSoft},revealText:{fontSize:12,fontWeight:"800",color:colors.primary},item:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:13,gap:9},itemHead:{flexDirection:"row",alignItems:"flex-start",gap:10},term:{fontSize:17,fontWeight:"900",color:colors.text},meaning:{fontSize:14,color:colors.textMuted,marginTop:3},delete:{padding:7},deleteText:{fontSize:12,fontWeight:"800",color:colors.danger},example:{fontSize:13,lineHeight:19,color:colors.textMuted,fontStyle:"italic"},progressGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},progressMetric:{flexGrow:1,minWidth:"21%",backgroundColor:colors.surfaceSoft,borderRadius:12,padding:10},progressValue:{fontSize:21,fontWeight:"900",color:colors.primaryStrong},progressLabel:{fontSize:10,fontWeight:"700",color:colors.textMuted,marginTop:2},progressSummary:{fontSize:11,color:colors.textMuted},progressHint:{fontSize:11,lineHeight:16,color:colors.primaryStrong},reviewMeta:{fontSize:11,color:colors.textMuted},practiceLink:{alignSelf:"flex-start",fontSize:12,fontWeight:"900",color:colors.primary,paddingVertical:5},statusLabel:{fontSize:11,fontWeight:"800",color:colors.textMuted},statusRow:{flexDirection:"row",gap:7,flexWrap:"wrap"},statusButton:{borderWidth:1,borderColor:colors.border,borderRadius:20,paddingVertical:7,paddingHorizontal:10},statusActive:{backgroundColor:colors.primary,borderColor:colors.primary},statusText:{fontSize:11,fontWeight:"800",color:colors.textMuted},statusTextActive:{color:"#fff"},privacy:{fontSize:11,lineHeight:17,color:colors.textMuted,paddingHorizontal:3},error:{color:colors.danger,fontSize:13},notice:{color:colors.success,fontSize:13}
});
