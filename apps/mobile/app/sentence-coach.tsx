import {useState} from "react";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "../src/theme";
import {createGabrooMemory,requestGabrooSentenceFeedback,type GabrooSentenceFeedback} from "../src/auth-api";

export default function SentenceCoachScreen(){
 const [draft,setDraft]=useState("");
 const [result,setResult]=useState<GabrooSentenceFeedback|null>(null);
 const [disclaimer,setDisclaimer]=useState("");
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState<number|null>(null);
 const [saved,setSaved]=useState<number[]>([]);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const review=async()=>{
  if(busy||draft.trim().length<2)return;
  setBusy(true);setError("");setNotice("");setSaved([]);setResult(null);
  try{const response=await requestGabrooSentenceFeedback(draft.trim());setResult(response.feedback);setDisclaimer(response.disclaimer);}
  catch(reason){setError(reason instanceof Error?reason.message:"Gabroo could not review this sentence.");}
  finally{setBusy(false);}
 };
 const saveSuggestion=async(index:number)=>{
  if(!result||saving!==null||saved.includes(index))return;
  const item=result.feedback[index];if(!item)return;
  setSaving(index);setError("");setNotice("");
  try{
   const content=["Learner phrase: "+item.original,"Practice version: "+item.suggested,"Gabroo explanation: "+item.explanation,item.alternative?"Alternative: "+item.alternative:""].filter(Boolean).join("\n").slice(0,500);
   await createGabrooMemory({category:"saved_phrase",memory_key:item.suggested.slice(0,80),content});
   setSaved(current=>[...current,index]);setNotice("Approved suggestion saved to your Speaking Journal.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not save this suggestion.");}
  finally{setSaving(null);}
 };
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <Link href="/gabroo" style={s.back}>‹ Back to Gabroo</Link>
  <Text style={s.brand}>Sentence Coach</Text>
  <Text style={s.subtitle}>Write something you would say. Gabroo will suggest a few focused improvements while preserving your meaning.</Text>
  <View style={s.panel}>
   <Text style={s.label}>Your sentence or short response</Text>
   <TextInput value={draft} onChangeText={setDraft} multiline placeholder="For example: Yesterday I go to office and meet my manager." style={s.input}/>
   <Pressable disabled={busy||draft.trim().length<2} onPress={()=>void review()} style={[s.button,(busy||draft.trim().length<2)&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Review with Gabroo</Text>}</Pressable>
  </View>
  {result?<View style={s.results}>
   <Text style={s.section}>Gabroo's feedback</Text>
   <Text style={s.encouragement}>{result.encouragement}</Text>
   {result.feedback.length===0?<View style={s.panel}><Text style={s.body}>No clear correction is needed. Your sentence communicates its meaning.</Text></View>:result.feedback.map((item,index)=><View key={index} style={s.card}>
    <Text style={s.category}>{item.category.replace("_"," ").toUpperCase()}</Text>
    <Text style={s.smallLabel}>YOUR WORDS</Text><Text style={s.original}>{item.original}</Text>
    <Text style={s.smallLabel}>TRY THIS</Text><Text style={s.suggested}>{item.suggested}</Text>
    <Text style={s.body}>{item.explanation}</Text>
    {item.alternative?<Text style={s.alternative}>Another option: {item.alternative}</Text>:null}
    <Pressable disabled={saving!==null||saved.includes(index)} onPress={()=>void saveSuggestion(index)} style={[s.save,saved.includes(index)&&s.saved]}>{saving===index?<ActivityIndicator color="#fff"/>:<Text style={s.saveText}>{saved.includes(index)?"Saved to Speaking Journal":"Save this suggestion"}</Text>}</Pressable>
   </View>)}
   <Text style={s.disclaimer}>{disclaimer}</Text>
  </View>:null}
  {notice?<Text style={s.notice}>{notice}</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
  <Text style={s.privacy}>Only the text you submit is sent for review. This feature does not evaluate your voice, accent, pronunciation or overall English level.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{padding:20,paddingBottom:40},back:{color:colors.primary,fontWeight:"900",marginBottom:18},brand:{fontSize:28,fontWeight:"900",color:colors.text},subtitle:{fontSize:14,lineHeight:21,color:"#777084",marginTop:6,marginBottom:20},panel:{backgroundColor:colors.surface,borderRadius:18,padding:17,borderWidth:1,borderColor:colors.border},label:{fontSize:12,fontWeight:"900",color:"#51476A",marginBottom:8},input:{minHeight:120,textAlignVertical:"top",backgroundColor:"#fff",borderWidth:1,borderColor:colors.border,borderRadius:12,padding:13,fontSize:15,color:colors.text},button:{backgroundColor:colors.primary,borderRadius:13,padding:15,alignItems:"center",marginTop:14},buttonText:{color:"#fff",fontWeight:"900"},disabled:{opacity:.5},results:{marginTop:24},section:{fontSize:19,fontWeight:"900",color:colors.text,marginBottom:10},encouragement:{fontSize:14,lineHeight:21,color:"#51476A",marginBottom:14},card:{backgroundColor:colors.surface,borderRadius:17,padding:16,marginBottom:13,borderWidth:1,borderColor:colors.border},category:{fontSize:10,fontWeight:"900",letterSpacing:1,color:colors.primary,marginBottom:12},smallLabel:{fontSize:10,fontWeight:"900",color:"#777084",marginTop:8},original:{fontSize:14,color:colors.text,textDecorationLine:"line-through",marginTop:4},suggested:{fontSize:16,fontWeight:"900",color:colors.primaryStrong,marginTop:4},body:{fontSize:13,lineHeight:20,color:"#51476A",marginTop:10},alternative:{fontSize:12,lineHeight:18,color:"#51476A",marginTop:8},save:{backgroundColor:colors.primary,borderRadius:12,padding:12,alignItems:"center",marginTop:14},saved:{backgroundColor:"#247A50"},saveText:{color:"#fff",fontWeight:"900",fontSize:12},disclaimer:{fontSize:11,lineHeight:17,color:"#777084",marginTop:6},privacy:{fontSize:11,lineHeight:17,color:"#777084",marginTop:20},notice:{fontSize:12,color:"#167447",fontWeight:"800",marginTop:14},error:{fontSize:12,color:"#B42318",marginTop:14}
});
