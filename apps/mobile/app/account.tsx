import {useEffect,useState} from "react";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,getLearnerMe,getLatestFreeDiagnosticReport,logoutLearner,requestLearnerOtp,verifyLearnerOtp,type LearnerMe,type OtpChallenge,type SavedFreeDiagnosticReport,type GabrooMemoryItem,type GabrooMemoryCategory,createGabrooMemory,deleteGabrooMemory,listGabrooMemory,updateGabrooMemory,updateLearnerPreferences} from "../src/auth-api";

export default function AccountScreen(){
 const [channel,setChannel]=useState<"email"|"phone">("email");
 const [destination,setDestination]=useState("");
 const [code,setCode]=useState("");
 const [challenge,setChallenge]=useState<OtpChallenge|null>(null);
 const [account,setAccount]=useState<LearnerMe|null>(null);
 const [savedReport,setSavedReport]=useState<SavedFreeDiagnosticReport|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [preferenceBusy,setPreferenceBusy]=useState(false);
 const [memories,setMemories]=useState<GabrooMemoryItem[]>([]);
 const [memoryCategory,setMemoryCategory]=useState<GabrooMemoryCategory>("interest");
 const [memoryKey,setMemoryKey]=useState("");
 const [memoryContent,setMemoryContent]=useState("");
 const [editingMemoryId,setEditingMemoryId]=useState<string|null>(null);
 const [memoryBusy,setMemoryBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  getLearnerMe().then(async value=>{if(active)setAccount(value);try{const report=await getLatestFreeDiagnosticReport();if(active)setSavedReport(report);}catch{/* No free report has been completed yet. */}try{const saved=await listGabrooMemory();if(active)setMemories(saved.memory);}catch(reason){if(active&&(!(reason instanceof AuthApiError)||reason.status!==401))setError(reason instanceof Error?reason.message:"Could not load your saved Gabroo memory.");}}).catch(reason=>{
   if(active&&(!(reason instanceof AuthApiError)||reason.status!==401))setError(reason instanceof Error?reason.message:"Could not load your account.");
  });
  return()=>{active=false;};
 },[]);
 const requestCode=async()=>{
  if(busy||!destination.trim())return;
  setBusy(true);setError("");setNotice("");
  try{
   const result=await requestLearnerOtp({channel,destination:destination.trim()});
   setChallenge(result);setCode("");
   setNotice("Verification code sent to "+result.masked_destination+". It expires in five minutes.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not send a verification code.");}
  finally{setBusy(false);}
 };
 const verifyCode=async()=>{
  if(busy||!challenge||!/^\d{6}$/.test(code.trim()))return;
  setBusy(true);setError("");setNotice("");
  try{
   await verifyLearnerOtp({challenge_id:challenge.challenge_id,code:code.trim()});
   setAccount(await getLearnerMe());try{setSavedReport(await getLatestFreeDiagnosticReport());}catch{setSavedReport(null);}try{setMemories((await listGabrooMemory()).memory);}catch{setMemories([]);}setChallenge(null);setCode("");
   setNotice("Your verified Gabenglish account is ready. Your free analysis can now be saved.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not verify the code.");}
  finally{setBusy(false);}
 };
 const changeSpeechRate=async(delta:number)=>{
  if(!account||preferenceBusy)return;
  const current=account.preferences?.gabroo_speech_rate??1;
  const next=Math.min(1.5,Math.max(0.75,Math.round((current+delta)*100)/100));
  if(next===current)return;
  setPreferenceBusy(true);setError("");setNotice("");
  try{await updateLearnerPreferences({gabroo_speech_rate:next});setAccount(await getLearnerMe());setNotice("Gabroo speaking-speed preference saved.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not save your speaking-speed preference.");}
  finally{setPreferenceBusy(false);}
 };
 const saveMemory=async()=>{
  if(memoryBusy||!memoryKey.trim()||!memoryContent.trim())return;
  setMemoryBusy(true);setError("");setNotice("");
  try{
   if(editingMemoryId)await updateGabrooMemory(editingMemoryId,{category:memoryCategory,memory_key:memoryKey.trim(),content:memoryContent.trim()});
   else await createGabrooMemory({category:memoryCategory,memory_key:memoryKey.trim(),content:memoryContent.trim()});
   setMemories((await listGabrooMemory()).memory);setMemoryKey("");setMemoryContent("");setEditingMemoryId(null);setNotice("Your private Gabroo memory has been saved.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not save this memory.");}
  finally{setMemoryBusy(false);}
 };
 const startEditMemory=(item:GabrooMemoryItem)=>{
  setEditingMemoryId(item.id);setMemoryCategory(item.category);setMemoryKey(item.memory_key);setMemoryContent(item.content);
 };
 const removeMemory=async(id:string)=>{
  if(memoryBusy)return;
  setMemoryBusy(true);setError("");setNotice("");
  try{await deleteGabrooMemory(id);setMemories((await listGabrooMemory()).memory);if(editingMemoryId===id){setEditingMemoryId(null);setMemoryKey("");setMemoryContent("");}setNotice("Saved memory deleted.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not delete this memory.");}
  finally{setMemoryBusy(false);}
 };
 const signOut=async()=>{
  setBusy(true);setError("");setNotice("");
  try{await logoutLearner();setAccount(null);setChallenge(null);setNotice("You have been signed out.");}
  catch(reason){setAccount(null);setError("Your device session was cleared, but server-side revocation could not be confirmed. "+(reason instanceof Error?reason.message:"Please try again."));}
  finally{setBusy(false);}
 };
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <View style={s.header}><View style={s.logo}><Text style={s.logoText}>G</Text></View><Text style={s.brand}>Your Gabenglish account</Text><Text style={s.subtitle}>Create your free account before your English analysis. No password needed.</Text></View>
  {account?<View style={s.card}>
   <Text style={s.eyebrow}>VERIFIED ACCOUNT</Text><Text style={s.name}>{account.user.display_name||"Learner"}</Text>
   {account.user.email?<Text style={s.contact}>{account.user.email} · {account.user.email_verified?"Verified":"Not verified"}</Text>:null}
   {account.user.phone_verified?<Text style={s.contact}>Phone number verified</Text>:null}
   <View style={s.freeBadge}><Text style={s.freeBadgeText}>FREE ANALYSIS SAVES TO THIS ACCOUNT</Text></View>
   <Text style={s.section}>Learning preferences</Text>
   <Text style={s.info}>Support language: {account.preferences?.support_language==="ml"?"Malayalam":"English"}</Text>
   <Text style={s.info}>Daily target: {account.preferences?.daily_target_minutes??10} minutes</Text>
   <Text style={s.info}>Correction style: {account.preferences?.correction_mode??"balanced"}</Text>
   <View style={s.speedCard}>
    <Text style={s.speedTitle}>Gabroo speaking speed</Text>
    <Text style={s.speedHint}>Choose how quickly Gabroo should speak. This preference will apply when voice conversations are available.</Text>
    <View style={s.speedControls}>
     <Pressable accessibilityRole="button" accessibilityLabel="Slow Gabroo down" disabled={preferenceBusy||(account.preferences?.gabroo_speech_rate??1)<=0.75} onPress={()=>changeSpeechRate(-0.05)} style={[s.speedButton,preferenceBusy&&s.disabled]}><Text style={s.speedButtonText}>−</Text></Pressable>
     <View style={s.speedValue}><Text style={s.speedNumber}>{(account.preferences?.gabroo_speech_rate??1).toFixed(2).replace(/0$/,"")}×</Text><Text style={s.speedNormal}>Normal is 1.0×</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel="Speed Gabroo up" disabled={preferenceBusy||(account.preferences?.gabroo_speech_rate??1)>=1.5} onPress={()=>changeSpeechRate(0.05)} style={[s.speedButton,preferenceBusy&&s.disabled]}><Text style={s.speedButtonText}>+</Text></Pressable>
    </View>
    <View style={s.speedRange}><Text style={s.speedRangeText}>0.75× Slower</Text><Pressable disabled={preferenceBusy||(account.preferences?.gabroo_speech_rate??1)===1} onPress={()=>changeSpeechRate(1-(account.preferences?.gabroo_speech_rate??1))}><Text style={s.speedReset}>Reset to 1.0×</Text></Pressable><Text style={s.speedRangeText}>1.50× Faster</Text></View>
    {preferenceBusy?<Text style={s.speedSaving}>Saving preference…</Text>:null}
   </View>
   <View style={s.memoryCard}>
    <Text style={s.memoryTitle}>Gabroo remembers what you choose</Text>
    <Text style={s.memoryHint}>Save useful learning goals, interests and phrases. Only items you add here are used as personal memory. You can edit or delete them at any time, even if your subscription ends.</Text>
    <Text style={s.memoryLabel}>{editingMemoryId?"Edit saved memory":"Add a memory"}</Text>
    <View style={s.memoryCategories}>
     {([{value:"goal",label:"Goal"},{value:"interest",label:"Interest"},{value:"saved_phrase",label:"Phrase"},{value:"learning_note",label:"Learning note"}] as const).map(item=><Pressable key={item.value} disabled={memoryBusy} onPress={()=>setMemoryCategory(item.value)} style={[s.memoryCategory,memoryCategory===item.value&&s.memoryCategoryActive]}><Text style={[s.memoryCategoryText,memoryCategory===item.value&&s.memoryCategoryTextActive]}>{item.label}</Text></Pressable>)}
    </View>
    <TextInput value={memoryKey} onChangeText={setMemoryKey} placeholder="Short title (e.g. Job interview)" maxLength={80} style={s.memoryInput} editable={!memoryBusy}/>
    <TextInput value={memoryContent} onChangeText={setMemoryContent} placeholder="What would you like Gabroo to remember?" maxLength={500} multiline style={[s.memoryInput,s.memoryTextArea]} editable={!memoryBusy}/>
    <Pressable disabled={memoryBusy||!memoryKey.trim()||!memoryContent.trim()} onPress={saveMemory} style={[s.memorySave,(memoryBusy||!memoryKey.trim()||!memoryContent.trim())&&s.disabled]}>{memoryBusy?<ActivityIndicator color="#fff"/>:<Text style={s.memorySaveText}>{editingMemoryId?"Save changes":"Save to my memory"}</Text>}</Pressable>
    {editingMemoryId?<Pressable disabled={memoryBusy} onPress={()=>{setEditingMemoryId(null);setMemoryKey("");setMemoryContent("");}} style={s.memoryCancel}><Text style={s.memoryCancelText}>Cancel editing</Text></Pressable>:null}
    <Text style={s.memoryLabel}>Your saved memory ({memories.length})</Text>
    {memories.length===0?<Text style={s.memoryEmpty}>Nothing saved yet. Add a goal, interest or useful phrase above.</Text>:memories.map(item=><View key={item.id} style={s.memoryItem}>
     <View style={s.memoryItemText}><Text style={s.memoryItemCategory}>{item.category.replace("_"," ")}</Text><Text style={s.memoryItemTitle}>{item.memory_key}</Text><Text style={s.memoryItemContent}>{item.content}</Text></View>
     <View style={s.memoryItemActions}><Pressable disabled={memoryBusy} onPress={()=>startEditMemory(item)}><Text style={s.memoryAction}>Edit</Text></Pressable><Pressable disabled={memoryBusy} onPress={()=>removeMemory(item.id)}><Text style={s.memoryDelete}>Delete</Text></Pressable></View>
    </View>)}
   </View>
   {savedReport?<View style={s.savedReport}><Text style={s.reportTitle}>Your saved free analysis</Text><Text style={s.info}>Status: {savedReport.report.status} · {savedReport.report.response_count} responses</Text><Text style={s.info}>Assessment: {savedReport.assessment_mode.replace("_"," ")}</Text><Text style={s.reportText}>{savedReport.gabroo_explanation}</Text><Text style={s.freeBadgeText}>AVAILABLE WITHOUT A PAID PLAN</Text></View>:null}
   <Pressable disabled={busy} style={[s.button,s.secondary]} onPress={signOut}>{busy?<ActivityIndicator color="#54239A"/>:<Text style={s.secondaryText}>Sign out</Text>}</Pressable>
  </View>:<View style={s.card}>
   <Text style={s.sectionTop}>Register or sign in</Text>
   <Text style={s.helper}>Use an email address or mobile number you control. If it is new, we'll create your account after verification.</Text>
   <View style={s.switchRow}>
    <Pressable onPress={()=>{setChannel("email");setChallenge(null);setCode("");setError("");setNotice("");}} style={[s.switch,channel==="email"&&s.switchActive]}><Text style={[s.switchText,channel==="email"&&s.switchTextActive]}>Email OTP</Text></Pressable>
    <Pressable onPress={()=>{setChannel("phone");setChallenge(null);setCode("");setError("");setNotice("");}} style={[s.switch,channel==="phone"&&s.switchActive]}><Text style={[s.switchText,channel==="phone"&&s.switchTextActive]}>Mobile OTP</Text></Pressable>
   </View>
   <Text style={s.label}>{channel==="email"?"Email address":"Mobile number"}</Text>
   <TextInput value={destination} onChangeText={setDestination} placeholder={channel==="email"?"you@example.com":"+919876543210"} keyboardType={channel==="email"?"email-address":"phone-pad"} autoCapitalize="none" autoCorrect={false} style={s.input} editable={!busy&&!challenge}/>
   {challenge?<><Text style={s.label}>6-digit verification code</Text><TextInput value={code} onChangeText={value=>setCode(value.replace(/\D/g,"").slice(0,6))} placeholder="Enter the code" keyboardType="number-pad" maxLength={6} style={s.input} editable={!busy}/><Pressable disabled={busy||code.trim().length!==6} style={[s.button,(busy||code.trim().length!==6)&&s.disabled]} onPress={verifyCode}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Verify and continue</Text>}</Pressable><Pressable disabled={busy} onPress={()=>{setChallenge(null);setCode("");setNotice("");}} style={s.change}><Text style={s.changeText}>Change contact or request a new code</Text></Pressable></>:<Pressable disabled={busy||!destination.trim()} style={[s.button,(busy||!destination.trim())&&s.disabled]} onPress={requestCode}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Send verification code</Text>}</Pressable>}
   <Text style={s.disclaimer}>Your free analysis starts only after your email or phone is verified. We never merge accounts just because contact details look similar.</Text>
  </View>}
  {notice?<View style={s.notice}><Text style={s.noticeText}>{notice}</Text></View>:null}
  {error?<View style={s.error}><Text style={s.errorText}>{error}</Text></View>:null}
  <Link href="/" asChild><Pressable style={s.back}><Text style={s.backText}>← Back to Gabroo</Text></Pressable></Link>
  <Text style={s.footer}>Your learning journey, at your pace.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#FFF7EC"},page:{flexGrow:1,padding:22,paddingBottom:36},
 header:{alignItems:"center",marginBottom:24},logo:{width:46,height:46,borderRadius:15,backgroundColor:"#6A2BBF",alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontSize:29,fontWeight:"900"},brand:{marginTop:10,color:"#1F1B4D",fontSize:22,fontWeight:"900"},subtitle:{fontSize:13,lineHeight:20,color:"#6B6278",textAlign:"center",marginTop:7},
 card:{backgroundColor:"#fff",borderRadius:20,padding:18,borderWidth:1,borderColor:"#EAE2F0"},sectionTop:{fontSize:17,fontWeight:"900",color:"#1F1B4D"},helper:{fontSize:12,lineHeight:18,color:"#70677B",marginTop:7,marginBottom:15},switchRow:{flexDirection:"row",backgroundColor:"#F3EFF8",padding:4,borderRadius:12},switch:{flex:1,padding:11,alignItems:"center",borderRadius:9},switchActive:{backgroundColor:"#fff"},switchText:{fontSize:13,fontWeight:"800",color:"#81788C"},switchTextActive:{color:"#54239A"},
 label:{fontSize:13,fontWeight:"800",color:"#403A50",marginTop:17,marginBottom:7},input:{backgroundColor:"#FFFEFC",borderWidth:1,borderColor:"#E3DCEA",borderRadius:13,padding:13,fontSize:15,color:"#1F1B4D"},
 button:{backgroundColor:"#6A2BBF",borderRadius:14,padding:15,alignItems:"center",marginTop:20},buttonText:{color:"#fff",fontSize:14,fontWeight:"900"},disabled:{opacity:.45},secondary:{backgroundColor:"#EEE4FF"},secondaryText:{color:"#54239A",fontWeight:"900"},
 eyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.4,color:"#8A6AB6"},name:{fontSize:22,fontWeight:"900",color:"#1F1B4D",marginTop:8},contact:{fontSize:12,color:"#70677B",marginTop:7},freeBadge:{alignSelf:"flex-start",backgroundColor:"#E5F5E9",borderRadius:20,paddingVertical:7,paddingHorizontal:10,marginTop:14},freeBadgeText:{fontSize:10,fontWeight:"900",color:"#365B3A"},
 speedCard:{backgroundColor:"#F7F2FF",borderRadius:14,padding:14,marginTop:16},speedTitle:{fontSize:14,fontWeight:"900",color:"#54239A"},speedHint:{fontSize:11,lineHeight:17,color:"#70677B",marginTop:5},speedControls:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:12},speedButton:{width:42,height:42,borderRadius:13,backgroundColor:"#6A2BBF",alignItems:"center",justifyContent:"center"},speedButtonText:{fontSize:25,fontWeight:"700",color:"#fff",lineHeight:29},speedValue:{alignItems:"center"},speedNumber:{fontSize:22,fontWeight:"900",color:"#1F1B4D"},speedNormal:{fontSize:10,color:"#81788C",marginTop:2},speedRange:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:12},speedRangeText:{fontSize:9,color:"#81788C"},speedReset:{fontSize:10,fontWeight:"900",color:"#54239A"},speedSaving:{fontSize:10,color:"#70677B",marginTop:8},memoryCard:{backgroundColor:"#F7F2FF",borderRadius:14,padding:14,marginTop:18},memoryTitle:{fontSize:14,fontWeight:"900",color:"#54239A"},memoryHint:{fontSize:11,lineHeight:17,color:"#70677B",marginTop:6},memoryLabel:{fontSize:12,fontWeight:"900",color:"#403A50",marginTop:14,marginBottom:7},memoryCategories:{flexDirection:"row",flexWrap:"wrap",gap:6},memoryCategory:{borderWidth:1,borderColor:"#DED2EF",borderRadius:18,paddingVertical:7,paddingHorizontal:10},memoryCategoryActive:{backgroundColor:"#6A2BBF",borderColor:"#6A2BBF"},memoryCategoryText:{fontSize:10,fontWeight:"800",color:"#665B77"},memoryCategoryTextActive:{color:"#fff"},memoryInput:{backgroundColor:"#FFFEFC",borderWidth:1,borderColor:"#E3DCEA",borderRadius:11,padding:11,fontSize:12,color:"#1F1B4D",marginTop:8},memoryTextArea:{minHeight:72,textAlignVertical:"top"},memorySave:{backgroundColor:"#6A2BBF",borderRadius:11,padding:12,alignItems:"center",marginTop:10},memorySaveText:{fontSize:12,fontWeight:"900",color:"#fff"},memoryCancel:{alignSelf:"center",padding:8},memoryCancelText:{fontSize:11,fontWeight:"800",color:"#54239A"},memoryEmpty:{fontSize:11,color:"#81788C",lineHeight:17},memoryItem:{backgroundColor:"#fff",borderRadius:11,padding:11,marginTop:8},memoryItemText:{},memoryItemCategory:{fontSize:9,fontWeight:"900",textTransform:"uppercase",color:"#8A6AB6"},memoryItemTitle:{fontSize:12,fontWeight:"900",color:"#1F1B4D",marginTop:3},memoryItemContent:{fontSize:11,lineHeight:16,color:"#625A6D",marginTop:3},memoryItemActions:{flexDirection:"row",gap:18,marginTop:8},memoryAction:{fontSize:11,fontWeight:"900",color:"#54239A"},memoryDelete:{fontSize:11,fontWeight:"900",color:"#B33D35"},savedReport:{backgroundColor:"#F7F2FF",borderRadius:14,padding:13,marginTop:18},reportTitle:{fontSize:14,fontWeight:"900",color:"#54239A",marginBottom:5},reportText:{fontSize:12,lineHeight:18,color:"#51476A",marginVertical:10},section:{fontSize:14,fontWeight:"900",color:"#403A50",marginTop:22,marginBottom:8},info:{fontSize:13,color:"#625A6D",marginTop:6},disclaimer:{fontSize:11,lineHeight:17,color:"#8A8293",marginTop:14},notice:{backgroundColor:"#E8F5EA",padding:13,borderRadius:12,marginTop:14},noticeText:{fontSize:12,lineHeight:18,color:"#365B3A"},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12,marginTop:14},errorText:{fontSize:12,lineHeight:18,color:"#8D302A"},back:{alignSelf:"center",padding:14,marginTop:12},backText:{color:"#54239A",fontSize:13,fontWeight:"800"},change:{alignSelf:"center",padding:12,marginTop:5},changeText:{fontSize:12,fontWeight:"800",color:"#54239A"},footer:{textAlign:"center",color:"#938A9D",fontSize:11,marginTop:12}
});
