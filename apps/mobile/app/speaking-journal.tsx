import {useCallback,useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link,useFocusEffect} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "../src/theme";
import {AuthApiError,createGabrooMemory,deleteGabrooMemory,getGabrooPhrasePracticeHistory,listGabrooMemory,recordGabrooPhrasePractice,updateGabrooMemory,type GabrooMemoryItem,type GabrooPhrasePractice} from "../src/auth-api";

function practiceDate(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?null:date.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}

function practicePhrase(item:GabrooMemoryItem){
 const practice=item.content.split("\n").find(line=>line.startsWith("Practice version: "))?.slice(18).trim();
 if(practice&&practice!=="not added yet")return practice;
 return item.content.split("\n").find(line=>line.startsWith("Learner phrase: "))?.slice(16).trim()||item.memory_key;
}

export default function SpeakingJournalScreen(){
 const [items,setItems]=useState<GabrooMemoryItem[]>([]);
 const [practiceHistory,setPracticeHistory]=useState<Record<string,GabrooPhrasePractice[]>>({});
 const [phrase,setPhrase]=useState("");
 const [improved,setImproved]=useState("");
 const [note,setNote]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const [reviewFilter,setReviewFilter]=useState<"all"|"needs_practice"|"practised">("all");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const result=await listGabrooMemory();const phrases=result.memory.filter(item=>item.category==="saved_phrase");setItems(phrases);const histories=await Promise.all(phrases.map(async item=>{try{return [item.id,(await getGabrooPhrasePracticeHistory(item.id)).history] as const;}catch{return [item.id,[]] as const;}}));setPracticeHistory(Object.fromEntries(histories));}catch(reason){setError(reason instanceof AuthApiError&&reason.status===401?"Please sign in to use your private Speaking Journal.":reason instanceof Error?reason.message:"Could not load your journal.");}finally{setLoading(false);}},[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const reset=()=>{setPhrase("");setImproved("");setNote("");setEditing(null);};
 const save=async()=>{
  if(busy||!phrase.trim())return;
  setBusy(true);setError("");setNotice("");
  const content=["Learner phrase: "+phrase.trim(),improved.trim()?"Practice version: "+improved.trim():"Practice version: not added yet",note.trim()?"Learner note: "+note.trim():""].filter(Boolean).join("\n");
  try{
   if(editing)await updateGabrooMemory(editing,{category:"saved_phrase",memory_key:phrase.trim().slice(0,80),content});
   else await createGabrooMemory({category:"saved_phrase",memory_key:phrase.trim().slice(0,80),content});
   await load();reset();setNotice("Saved to your private Speaking Journal.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not save this phrase.");}
  finally{setBusy(false);}
 };
 const edit=(item:GabrooMemoryItem)=>{
  const lines=item.content.split("\n");
  setPhrase(lines.find(line=>line.startsWith("Learner phrase: "))?.slice(16)??item.memory_key);
  setImproved(lines.find(line=>line.startsWith("Practice version: "))?.slice(18).replace("not added yet","")??"");
  setNote(lines.find(line=>line.startsWith("Learner note: "))?.slice(14)??"");
  setEditing(item.id);setNotice("");
 };
 const logPractice=(id:string)=>{
  Alert.alert("How did that practice feel?","This is your own reflection, not an AI score or formal assessment.",[
   {text:"Easy",onPress:()=>void savePractice(id,"easy")},
   {text:"Some effort",onPress:()=>void savePractice(id,"some_effort")},
   {text:"Need more practice",onPress:()=>void savePractice(id,"need_more_practice")},
   {text:"Cancel",style:"cancel"}
  ]);
 };
 const savePractice=async(id:string,self_rating:GabrooPhrasePractice["self_rating"])=>{
  setError("");setNotice("");
  try{await recordGabrooPhrasePractice(id,{self_rating});const history=await getGabrooPhrasePracticeHistory(id);setPracticeHistory(current=>({...current,[id]:history.history}));setNotice("Your practice reflection was recorded.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not record this practice reflection.");}
 };
 const needsPracticeCount=items.filter(item=>practiceHistory[item.id]?.[0]?.self_rating==="need_more_practice").length;
 const practisedCount=items.filter(item=>(practiceHistory[item.id]?.length??0)>0).length;
 const filteredItems=items.filter(item=>{
  const matchesSearch=`${item.memory_key} ${item.content}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const history=practiceHistory[item.id]??[];
  const matchesFilter=reviewFilter==="all"||(reviewFilter==="practised"&&history.length>0)||(reviewFilter==="needs_practice"&&history[0]?.self_rating==="need_more_practice");
  return matchesSearch&&matchesFilter;
 });
 const remove=(id:string)=>{
  Alert.alert("Delete practice phrase?","This removes the phrase from your private journal.",[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:async()=>{setBusy(true);try{await deleteGabrooMemory(id);await load();if(editing===id)reset();setNotice("Phrase deleted.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete this phrase.");}finally{setBusy(false);}}}]);
 };
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <Link href="/gabroo" style={s.back}>‹ Back to Gabroo</Link>
  <Text style={s.brand}>Speaking Journal</Text>
  <Text style={s.subtitle}>Keep useful phrases, your own improved versions and personal practice notes in one private place.</Text>
  <View style={s.card}>
   <Text style={s.section}>{editing?"Edit practice entry":"Add a phrase to practise"}</Text>
   <Text style={s.label}>Your original phrase</Text>
   <TextInput value={phrase} onChangeText={setPhrase} placeholder="What did you say or want to say?" style={s.input}/>
   <Text style={s.label}>Improved version (optional)</Text>
   <TextInput value={improved} onChangeText={setImproved} placeholder="Write a version you want to practise" style={s.input}/>
   <Text style={s.label}>Your note (optional)</Text>
   <TextInput value={note} onChangeText={setNote} placeholder="Why is this useful? When will you use it?" multiline style={[s.input,s.multiline]}/>
   <Pressable disabled={busy||!phrase.trim()} onPress={()=>void save()} style={[s.button,(busy||!phrase.trim())&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>{editing?"Update entry":"Save phrase"}</Text>}</Pressable>
   {editing?<Pressable onPress={reset} style={s.cancel}><Text style={s.cancelText}>Cancel editing</Text></Pressable>:null}
  </View>
  <Text style={s.section}>Your saved phrases ({items.length})</Text>
  <TextInput value={search} onChangeText={setSearch} placeholder="Search original phrases, improved versions or notes" accessibilityLabel="Search saved phrases" style={s.searchInput}/>
  <View style={s.filterRow}>
   <Pressable accessibilityRole="button" accessibilityState={{selected:reviewFilter==="all"}} onPress={()=>setReviewFilter("all")} style={[s.filterChip,reviewFilter==="all"&&s.filterChipActive]}><Text style={[s.filterText,reviewFilter==="all"&&s.filterTextActive]}>All ({items.length})</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityState={{selected:reviewFilter==="needs_practice"}} onPress={()=>setReviewFilter("needs_practice")} style={[s.filterChip,reviewFilter==="needs_practice"&&s.filterChipActive]}><Text style={[s.filterText,reviewFilter==="needs_practice"&&s.filterTextActive]}>Needs practice ({needsPracticeCount})</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityState={{selected:reviewFilter==="practised"}} onPress={()=>setReviewFilter("practised")} style={[s.filterChip,reviewFilter==="practised"&&s.filterChipActive]}><Text style={[s.filterText,reviewFilter==="practised"&&s.filterTextActive]}>Practised ({practisedCount})</Text></Pressable>
  </View>
  {loading?<ActivityIndicator color={colors.primary}/>:items.length===0?<View style={s.card}><Text style={s.empty}>Your journal is empty. Add a phrase above to build a personal practice list.</Text></View>:filteredItems.length===0?<View style={s.card}><Text style={s.empty}>No saved phrases match the current search and review filter. Adjust them to see more entries.</Text><Pressable onPress={()=>{setSearch("");setReviewFilter("all");}}><Text style={s.action}>Clear search and filters</Text></Pressable></View>:filteredItems.map(item=><View key={item.id} style={s.entry}>
   <Text style={s.entryTitle}>{item.memory_key}</Text><Text style={s.entryBody}>{item.content}</Text>
   <Link href={{pathname:"/gabroo",params:{challenge:practicePhrase(item),challengeTitle:"Speaking Journal practice"}}} style={s.practiceLink}>Practise with Gabroo →</Link>
   <Pressable onPress={()=>logPractice(item.id)} style={s.logPractice}><Text style={s.logPracticeText}>Record practice reflection</Text></Pressable>
   {practiceHistory[item.id]?.length?<Text style={s.historyText}>{practiceHistory[item.id].length} learner-recorded practice {practiceHistory[item.id].length===1?"session":"sessions"} · Latest: {practiceHistory[item.id][0]!.self_rating.replaceAll("_"," ")} · Last practised: {practiceDate(practiceHistory[item.id][0]!.practiced_at)??"date unavailable"}</Text>:<Text style={s.historyText}>No practice reflections recorded yet</Text>}
   <View style={s.actions}><Pressable onPress={()=>edit(item)}><Text style={s.action}>Edit</Text></Pressable><Pressable onPress={()=>remove(item.id)}><Text style={s.delete}>Delete</Text></Pressable></View>
  </View>)}
  <Text style={s.privacy}>Private to your account. Entries are learner-written and learner-edited; Gabroo does not automatically diagnose or rewrite your speech in this journal.</Text>
  {notice?<Text style={s.notice}>{notice}</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{padding:20,paddingBottom:40},back:{color:colors.primary,fontWeight:"900",marginBottom:18},brand:{fontSize:28,fontWeight:"900",color:colors.text},subtitle:{fontSize:14,lineHeight:21,color:"#777084",marginTop:6,marginBottom:20},card:{backgroundColor:colors.surface,borderRadius:20,padding:18,marginBottom:22,borderWidth:1,borderColor:colors.border},section:{fontSize:17,fontWeight:"900",color:colors.text,marginBottom:12},label:{fontSize:12,fontWeight:"800",color:"#51476A",marginTop:12,marginBottom:6},input:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.border,borderRadius:12,padding:13,fontSize:14,color:colors.text},multiline:{minHeight:76,textAlignVertical:"top"},button:{backgroundColor:colors.primary,borderRadius:13,padding:15,alignItems:"center",marginTop:16},buttonText:{color:"#fff",fontWeight:"900"},disabled:{opacity:.5},cancel:{alignItems:"center",padding:12},cancelText:{color:colors.primary,fontWeight:"800"},searchInput:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,fontSize:13,color:colors.text,marginBottom:10},filterRow:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:14},filterChip:{borderWidth:1,borderColor:colors.border,borderRadius:18,paddingVertical:8,paddingHorizontal:11,backgroundColor:colors.surface},filterChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},filterText:{fontSize:11,fontWeight:"800",color:colors.text},filterTextActive:{color:"#fff"},entry:{backgroundColor:colors.surface,borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:colors.border},entryTitle:{fontSize:15,fontWeight:"900",color:colors.text},entryBody:{fontSize:13,lineHeight:20,color:"#51476A",marginTop:8},practiceLink:{color:colors.primary,fontWeight:"900",fontSize:12,marginTop:13},logPractice:{alignSelf:"flex-start",borderWidth:1,borderColor:colors.border,borderRadius:10,paddingVertical:8,paddingHorizontal:11,marginTop:10},logPracticeText:{fontSize:11,fontWeight:"800",color:colors.text},historyText:{fontSize:10,color:"#777084",marginTop:8},actions:{flexDirection:"row",gap:20,marginTop:14},action:{color:colors.primary,fontWeight:"900"},delete:{color:"#B42318",fontWeight:"900"},empty:{fontSize:13,lineHeight:20,color:"#777084"},privacy:{fontSize:11,lineHeight:17,color:"#777084",marginTop:10},notice:{color:"#167447",marginTop:14,fontWeight:"700"},error:{color:"#B42318",marginTop:14}
});
