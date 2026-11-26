import {useCallback,useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link,useFocusEffect} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "../src/theme";
import {AuthApiError,createGabrooMemory,deleteGabrooMemory,listGabrooMemory,updateGabrooMemory,type GabrooMemoryItem} from "../src/auth-api";

export default function SpeakingJournalScreen(){
 const [items,setItems]=useState<GabrooMemoryItem[]>([]);
 const [phrase,setPhrase]=useState("");
 const [improved,setImproved]=useState("");
 const [note,setNote]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const result=await listGabrooMemory();setItems(result.memory.filter(item=>item.category==="saved_phrase"));}catch(reason){setError(reason instanceof AuthApiError&&reason.status===401?"Please sign in to use your private Speaking Journal.":reason instanceof Error?reason.message:"Could not load your journal.");}finally{setLoading(false);}},[]);
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
  <Text style={s.section}>Your saved phrases</Text>
  {loading?<ActivityIndicator color={colors.primary}/>:items.length===0?<View style={s.card}><Text style={s.empty}>Your journal is empty. Add a phrase above to build a personal practice list.</Text></View>:items.map(item=><View key={item.id} style={s.entry}>
   <Text style={s.entryTitle}>{item.memory_key}</Text><Text style={s.entryBody}>{item.content}</Text>
   <View style={s.actions}><Pressable onPress={()=>edit(item)}><Text style={s.action}>Edit</Text></Pressable><Pressable onPress={()=>remove(item.id)}><Text style={s.delete}>Delete</Text></Pressable></View>
  </View>)}
  <Text style={s.privacy}>Private to your account. Entries are learner-written and learner-edited; Gabroo does not automatically diagnose or rewrite your speech in this journal.</Text>
  {notice?<Text style={s.notice}>{notice}</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{padding:20,paddingBottom:40},back:{color:colors.primary,fontWeight:"900",marginBottom:18},brand:{fontSize:28,fontWeight:"900",color:colors.text},subtitle:{fontSize:14,lineHeight:21,color:"#777084",marginTop:6,marginBottom:20},card:{backgroundColor:colors.surface,borderRadius:20,padding:18,marginBottom:22,borderWidth:1,borderColor:colors.border},section:{fontSize:17,fontWeight:"900",color:colors.text,marginBottom:12},label:{fontSize:12,fontWeight:"800",color:"#51476A",marginTop:12,marginBottom:6},input:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.border,borderRadius:12,padding:13,fontSize:14,color:colors.text},multiline:{minHeight:76,textAlignVertical:"top"},button:{backgroundColor:colors.primary,borderRadius:13,padding:15,alignItems:"center",marginTop:16},buttonText:{color:"#fff",fontWeight:"900"},disabled:{opacity:.5},cancel:{alignItems:"center",padding:12},cancelText:{color:colors.primary,fontWeight:"800"},entry:{backgroundColor:colors.surface,borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:colors.border},entryTitle:{fontSize:15,fontWeight:"900",color:colors.text},entryBody:{fontSize:13,lineHeight:20,color:"#51476A",marginTop:8},actions:{flexDirection:"row",gap:20,marginTop:14},action:{color:colors.primary,fontWeight:"900"},delete:{color:"#B42318",fontWeight:"900"},empty:{fontSize:13,lineHeight:20,color:"#777084"},privacy:{fontSize:11,lineHeight:17,color:"#777084",marginTop:10},notice:{color:"#167447",marginTop:14,fontWeight:"700"},error:{color:"#B42318",marginTop:14}
});
