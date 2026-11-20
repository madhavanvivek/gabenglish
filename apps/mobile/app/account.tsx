import {useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "../src/theme";
import {BrandMark} from "../src/ui";
import {AuthApiError,getLearnerMe,getLatestFreeDiagnosticReport,logoutLearner,requestLearnerOtp,verifyLearnerOtp,type LearnerMe,type OtpChallenge,type SavedFreeDiagnosticReport,type GabrooMemoryItem,type GabrooMemoryCategory,clearGabrooMemory,createGabrooMemory,deleteGabrooMemory,listGabrooMemory,updateGabrooMemory,updateLearnerPreferences,updateLearnerProfile,getGabrooSpeakingProgress,type GabrooSpeakingProgress} from "../src/auth-api";

export default function AccountScreen(){
 const [channel,setChannel]=useState<"email"|"phone">("email");
 const [destination,setDestination]=useState("");
 const [code,setCode]=useState("");
 const [challenge,setChallenge]=useState<OtpChallenge|null>(null);
 const [account,setAccount]=useState<LearnerMe|null>(null);
 const [profileName,setProfileName]=useState("");
 const [profileBusy,setProfileBusy]=useState(false);
 const [savedReport,setSavedReport]=useState<SavedFreeDiagnosticReport|null>(null);
 const [speakingProgress,setSpeakingProgress]=useState<GabrooSpeakingProgress|null>(null);
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
  getLearnerMe().then(async value=>{if(active){setAccount(value);setProfileName(value.user.display_name??"");}try{const progress=await getGabrooSpeakingProgress();if(active)setSpeakingProgress(progress);}catch{/* Speaking activity requires an active Gabroo subscription. */}try{const report=await getLatestFreeDiagnosticReport();if(active)setSavedReport(report);}catch{/* No free report has been completed yet. */}try{const saved=await listGabrooMemory();if(active)setMemories(saved.memory);}catch(reason){if(active&&(!(reason instanceof AuthApiError)||reason.status!==401))setError(reason instanceof Error?reason.message:"Could not load your saved Gabroo memory.");}}).catch(reason=>{
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
   const refreshedAccount=await getLearnerMe();setAccount(refreshedAccount);setProfileName(refreshedAccount.user.display_name??"");try{setSpeakingProgress(await getGabrooSpeakingProgress());}catch{setSpeakingProgress(null);}try{setSavedReport(await getLatestFreeDiagnosticReport());}catch{setSavedReport(null);}try{setMemories((await listGabrooMemory()).memory);}catch{setMemories([]);}setChallenge(null);setCode("");
   setNotice("Your verified Gabenglish account is ready. Your free analysis can now be saved.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not verify the code.");}
  finally{setBusy(false);}
 };
 const saveProfile=async()=>{
  if(!account||profileBusy||!profileName.trim())return;
  setProfileBusy(true);setError("");setNotice("");
  try{
   await updateLearnerProfile({display_name:profileName.trim()});
   const updated=await getLearnerMe();setAccount(updated);setProfileName(updated.user.display_name??"");
   setNotice("Your profile name has been saved.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not update your profile.");}
  finally{setProfileBusy(false);}
 };
 const changeSupportLanguage=async(value:"ml"|"en")=>{
  if(!account||preferenceBusy||account.preferences?.support_language===value)return;
  setPreferenceBusy(true);setError("");setNotice("");
  try{await updateLearnerPreferences({support_language:value});setAccount(await getLearnerMe());setNotice("Your support language preference has been saved.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not update your support language.");}
  finally{setPreferenceBusy(false);}
 };
 const changeDailyTarget=async(value:number)=>{
  if(!account||preferenceBusy||account.preferences?.daily_target_minutes===value)return;
  setPreferenceBusy(true);setError("");setNotice("");
  try{await updateLearnerPreferences({daily_target_minutes:value});setAccount(await getLearnerMe());setNotice("Your daily learning target has been saved.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not update your daily target.");}
  finally{setPreferenceBusy(false);}
 };
 const toggleReminders=async()=>{
  if(!account||preferenceBusy)return;
  const next=!(account.preferences?.reminders_enabled??false);
  setPreferenceBusy(true);setError("");setNotice("");
  try{await updateLearnerPreferences({reminders_enabled:next});setAccount(await getLearnerMe());setNotice(next?"Learning reminders enabled.":"Learning reminders turned off.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not update reminders.");}
  finally{setPreferenceBusy(false);}
 };
 const changeCorrectionMode=async(value:"gentle"|"balanced"|"detailed")=>{
  if(!account||preferenceBusy||account.preferences?.correction_mode===value)return;
  setPreferenceBusy(true);setError("");setNotice("");
  try{await updateLearnerPreferences({correction_mode:value});setAccount(await getLearnerMe());setNotice("Your correction preference has been saved.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not update your correction preference.");}
  finally{setPreferenceBusy(false);}
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
 const confirmClearMemory=()=>{
  if(memoryBusy||memories.length===0)return;
  Alert.alert("Clear all saved memory?","This deletes every goal, interest, phrase and learning note you saved for Gabroo. Your conversations and free analysis report will remain.",[
   {text:"Keep memory",style:"cancel"},
   {text:"Clear all",style:"destructive",onPress:async()=>{
    setMemoryBusy(true);setError("");setNotice("");
    try{await clearGabrooMemory();setMemories([]);setEditingMemoryId(null);setMemoryKey("");setMemoryContent("");setNotice("All saved Gabroo memory has been cleared.");}
    catch(reason){setError(reason instanceof Error?reason.message:"Could not clear saved memory.");}
    finally{setMemoryBusy(false);}
   }}
  ]);
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
  <View style={s.header}><BrandMark size={50}/><Text style={s.brand}>Your Gabenglish account</Text><Text style={s.subtitle}>Create your free account before your English analysis. No password needed.</Text></View><Link href="/home" style={{color:colors.primary,fontWeight:"900",alignSelf:"flex-start",marginBottom:14}}>‹ Back to learning home</Link>
  {account?<View style={s.card}>
   <Text style={s.eyebrow}>VERIFIED ACCOUNT</Text><Text style={s.name}>{account.user.display_name||"Learner"}</Text>
   {account.user.email?<Text style={s.contact}>{account.user.email} · {account.user.email_verified?"Verified":"Not verified"}</Text>:null}
   {account.user.phone_verified?<Text style={s.contact}>Phone number verified</Text>:null}
   <View style={s.freeBadge}><Text style={s.freeBadgeText}>FREE ANALYSIS SAVES TO THIS ACCOUNT</Text></View>
   <View style={s.profileEditor}>
    <Text style={s.section}>Profile details</Text>
    <Text style={s.profileLabel}>Your preferred name</Text>
    <TextInput value={profileName} onChangeText={setProfileName} placeholder="How should Gabroo address you?" maxLength={80} style={s.profileInput} editable={!profileBusy}/>
    <Pressable disabled={profileBusy||!profileName.trim()||profileName.trim()===(account.user.display_name??"")} onPress={saveProfile} style={[s.profileSave,(profileBusy||!profileName.trim()||profileName.trim()===(account.user.display_name??""))&&s.disabled]}>{profileBusy?<ActivityIndicator color="#fff"/>:<Text style={s.profileSaveText}>Save profile name</Text>}</Pressable>
   </View>
   <Link href="/vocabulary" style={{color:colors.primary,fontWeight:"900",marginTop:12,marginBottom:12}}>Open my vocabulary →</Link>
   {speakingProgress?<View style={s.progressCard}>
    <Text style={s.progressTitle}>Your speaking activity · last 7 days</Text>
    <View style={s.progressGrid}>
     {[{label:"Your turns",value:speakingProgress.current.learner_turns},{label:"Words written",value:speakingProgress.current.learner_words},{label:"Avg. words / turn",value:speakingProgress.current.average_words_per_turn},{label:"Conversations",value:speakingProgress.current.sessions}].map(item=><View key={item.label} style={s.progressMetric}><Text style={s.progressValue}>{item.value}</Text><Text style={s.progressLabel}>{item.label}</Text></View>)}
    </View>
    <Text style={s.progressNote}>Previous 7 days: {speakingProgress.previous.learner_turns} turns · {speakingProgress.previous.learner_words} words · {speakingProgress.previous.sessions} conversations.</Text>
    <Text style={s.progressNote}>{speakingProgress.interpretation}</Text>
   </View>:null}
   <Text style={s.section}>Learning preferences</Text>
   <Text style={s.profileLabel}>Explanation language</Text>
   <View style={s.preferenceChoices}>{([{value:"ml",label:"Malayalam"},{value:"en",label:"English"}] as const).map(item=><Pressable key={item.value} disabled={preferenceBusy} onPress={()=>void changeSupportLanguage(item.value)} style={[s.preferenceChoice,account.preferences?.support_language===item.value&&s.preferenceChoiceActive]}><Text style={[s.preferenceChoiceText,account.preferences?.support_language===item.value&&s.preferenceChoiceTextActive]}>{item.label}</Text></Pressable>)}</View>
   <Text style={s.profileLabel}>How should Gabroo correct your English?</Text>
   <View style={s.preferenceChoices}>{([{value:"gentle",label:"Gentle"},{value:"balanced",label:"Balanced"},{value:"detailed",label:"Detailed"}] as const).map(item=><Pressable key={item.value} disabled={preferenceBusy} onPress={()=>void changeCorrectionMode(item.value)} style={[s.preferenceChoice,account.preferences?.correction_mode===item.value&&s.preferenceChoiceActive]}><Text style={[s.preferenceChoiceText,account.preferences?.correction_mode===item.value&&s.preferenceChoiceTextActive]}>{item.label}</Text></Pressable>)}</View>
   <Text style={s.profileLabel}>Daily learning target</Text>
   <View style={s.preferenceChoices}>{[5,10,15,20].map(value=><Pressable key={value} disabled={preferenceBusy} onPress={()=>void changeDailyTarget(value)} style={[s.preferenceChoice,(account.preferences?.daily_target_minutes??10)===value&&s.preferenceChoiceActive]}><Text style={[s.preferenceChoiceText,(account.preferences?.daily_target_minutes??10)===value&&s.preferenceChoiceTextActive]}>{value} min</Text></Pressable>)}</View>
   <Pressable accessibilityRole="switch" accessibilityState={{checked:account.preferences?.reminders_enabled??false}} disabled={preferenceBusy} onPress={()=>void toggleReminders()} style={s.reminderRow}><View style={{flex:1}}><Text style={s.reminderTitle}>Learning reminders</Text><Text style={s.reminderHint}>A gentle nudge to practise regularly. Notifications will be available after device scheduling is implemented.</Text></View><View style={[s.reminderPill,(account.preferences?.reminders_enabled??false)&&s.reminderPillOn]}><Text style={[s.reminderPillText,(account.preferences?.reminders_enabled??false)&&s.reminderPillTextOn]}>{(account.preferences?.reminders_enabled??false)?"On":"Off"}</Text></View></Pressable>
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
    {memories.length>0?<Pressable disabled={memoryBusy} onPress={confirmClearMemory} style={s.memoryClear}><Text style={s.memoryDelete}>Clear all saved memory</Text></Pressable>:null}
    {memories.length===0?<Text style={s.memoryEmpty}>Nothing saved yet. Add a goal, interest or useful phrase above.</Text>:memories.map(item=><View key={item.id} style={s.memoryItem}>
     <View style={s.memoryItemText}><Text style={s.memoryItemCategory}>{item.category.replace("_"," ")}</Text><Text style={s.memoryItemTitle}>{item.memory_key}</Text><Text style={s.memoryItemContent}>{item.content}</Text></View>
     <View style={s.memoryItemActions}><Pressable disabled={memoryBusy} onPress={()=>startEditMemory(item)}><Text style={s.memoryAction}>Edit</Text></Pressable><Pressable disabled={memoryBusy} onPress={()=>removeMemory(item.id)}><Text style={s.memoryDelete}>Delete</Text></Pressable></View>
    </View>)}
   </View>
   {savedReport?<View style={s.savedReport}><Text style={s.reportTitle}>Your saved free analysis</Text><Text style={s.info}>Status: {savedReport.report.status} · {savedReport.report.response_count} responses</Text><Text style={s.info}>Assessment: {savedReport.assessment_mode.replace("_"," ")}</Text><Text style={s.info}>Sample indicators: {savedReport.report.response_metrics.average_words_per_response} words per answer · {Math.round(savedReport.report.response_metrics.average_unique_word_ratio*100)}% unique words · {savedReport.report.response_metrics.average_words_per_sentence} words per sentence</Text><Text style={s.info}>These describe your submitted text samples only. They are not a grammar, fluency or proficiency score.</Text>{(savedReport.report.grammar_review_items??[]).length>0?<View style={{marginTop:8}}><Text style={s.reportTitle}>Grammar patterns to review</Text>{(savedReport.report.grammar_review_items??[]).map((item,index)=><View key={item.category+"-"+item.example+"-"+index} style={{marginTop:7}}><Text style={s.info}>{item.category.replaceAll("_"," ")} · “{item.example}”</Text><Text style={s.info}>{item.note}</Text><Text style={s.info}>Try: {item.suggestion}</Text></View>)}</View>:<Text style={s.info}>No supported grammar pattern was flagged in these samples. This does not confirm error-free grammar.</Text>}<Text style={s.reportText}>{savedReport.gabroo_explanation}</Text><Text style={s.freeBadgeText}>AVAILABLE WITHOUT A PAID PLAN</Text></View>:null}
   <Pressable disabled={busy} style={[s.button,s.secondary]} onPress={signOut}>{busy?<ActivityIndicator color={colors.primaryStrong}/>:<Text style={s.secondaryText}>Sign out</Text>}</Pressable>
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
 progressCard:{backgroundColor:"#F2F8FF",borderRadius:14,padding:14,marginTop:12,marginBottom:14,borderWidth:1,borderColor:"#DCEBFA"},
 progressTitle:{fontSize:14,fontWeight:"900",color:"#234B72",marginBottom:10},
 progressGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},
 progressMetric:{width:"48%",backgroundColor:"#fff",borderRadius:10,padding:10},
 progressValue:{fontSize:20,fontWeight:"900",color:"#203B58"},
 progressLabel:{fontSize:10,fontWeight:"700",color:"#62768A",marginTop:3},
 progressNote:{fontSize:10,lineHeight:15,color:"#62768A",marginTop:8},
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:22,paddingBottom:36},
 header:{alignItems:"center",marginBottom:24},logo:{width:46,height:46,borderRadius:15,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontSize:29,fontWeight:"900"},brand:{marginTop:10,color:colors.text,fontSize:22,fontWeight:"900"},subtitle:{fontSize:13,lineHeight:20,color:"#6B6278",textAlign:"center",marginTop:7},
 card:{backgroundColor:"#fff",borderRadius:20,padding:18,borderWidth:1,borderColor:"#EAE2F0"},profileEditor:{backgroundColor:"#FAF7FF",borderRadius:14,padding:13,marginTop:15},profileLabel:{fontSize:11,fontWeight:"800",color:"#625A6D",marginTop:12,marginBottom:6},profileInput:{backgroundColor:"#FFFEFC",borderWidth:1,borderColor:colors.border,borderRadius:11,padding:11,fontSize:13,color:colors.text},profileSave:{backgroundColor:colors.primary,borderRadius:10,padding:11,alignItems:"center",marginTop:9},profileSaveText:{fontSize:11,fontWeight:"900",color:"#fff"},preferenceChoices:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:6},preferenceChoice:{borderWidth:1,borderColor:"#DED2EF",borderRadius:18,paddingVertical:8,paddingHorizontal:12},preferenceChoiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},preferenceChoiceText:{fontSize:11,fontWeight:"800",color:"#665B77"},preferenceChoiceTextActive:{color:"#fff"},reminderRow:{flexDirection:"row",alignItems:"center",gap:12,marginTop:15,padding:12,backgroundColor:"#FAF7FF",borderRadius:12},reminderTitle:{fontSize:12,fontWeight:"900",color:colors.text},reminderHint:{fontSize:10,lineHeight:15,color:"#70677B",marginTop:4},reminderPill:{paddingVertical:6,paddingHorizontal:10,borderRadius:15,backgroundColor:"#EDE8F2"},reminderPillOn:{backgroundColor:"#E4F4E8"},reminderPillText:{fontSize:10,fontWeight:"900",color:"#766D80"},reminderPillTextOn:{color:"#28643A"},sectionTop:{fontSize:17,fontWeight:"900",color:colors.text},helper:{fontSize:12,lineHeight:18,color:"#70677B",marginTop:7,marginBottom:15},switchRow:{flexDirection:"row",backgroundColor:"#F3EFF8",padding:4,borderRadius:12},switch:{flex:1,padding:11,alignItems:"center",borderRadius:9},switchActive:{backgroundColor:"#fff"},switchText:{fontSize:13,fontWeight:"800",color:"#81788C"},switchTextActive:{color:colors.primaryStrong},
 label:{fontSize:13,fontWeight:"800",color:"#403A50",marginTop:17,marginBottom:7},input:{backgroundColor:"#FFFEFC",borderWidth:1,borderColor:colors.border,borderRadius:13,padding:13,fontSize:15,color:colors.text},
 button:{backgroundColor:colors.primary,borderRadius:14,padding:15,alignItems:"center",marginTop:20},buttonText:{color:"#fff",fontSize:14,fontWeight:"900"},disabled:{opacity:.45},secondary:{backgroundColor:colors.surfaceSoft},secondaryText:{color:colors.primaryStrong,fontWeight:"900"},
 eyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.4,color:"#8A6AB6"},name:{fontSize:22,fontWeight:"900",color:colors.text,marginTop:8},contact:{fontSize:12,color:"#70677B",marginTop:7},freeBadge:{alignSelf:"flex-start",backgroundColor:"#E5F5E9",borderRadius:20,paddingVertical:7,paddingHorizontal:10,marginTop:14},freeBadgeText:{fontSize:10,fontWeight:"900",color:"#365B3A"},
 speedCard:{backgroundColor:"#F7F2FF",borderRadius:14,padding:14,marginTop:16},speedTitle:{fontSize:14,fontWeight:"900",color:colors.primaryStrong},speedHint:{fontSize:11,lineHeight:17,color:"#70677B",marginTop:5},speedControls:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:12},speedButton:{width:42,height:42,borderRadius:13,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center"},speedButtonText:{fontSize:25,fontWeight:"700",color:"#fff",lineHeight:29},speedValue:{alignItems:"center"},speedNumber:{fontSize:22,fontWeight:"900",color:colors.text},speedNormal:{fontSize:10,color:"#81788C",marginTop:2},speedRange:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:12},speedRangeText:{fontSize:9,color:"#81788C"},speedReset:{fontSize:10,fontWeight:"900",color:colors.primaryStrong},speedSaving:{fontSize:10,color:"#70677B",marginTop:8},memoryCard:{backgroundColor:"#F7F2FF",borderRadius:14,padding:14,marginTop:18},memoryTitle:{fontSize:14,fontWeight:"900",color:colors.primaryStrong},memoryHint:{fontSize:11,lineHeight:17,color:"#70677B",marginTop:6},memoryLabel:{fontSize:12,fontWeight:"900",color:"#403A50",marginTop:14,marginBottom:7},memoryCategories:{flexDirection:"row",flexWrap:"wrap",gap:6},memoryCategory:{borderWidth:1,borderColor:"#DED2EF",borderRadius:18,paddingVertical:7,paddingHorizontal:10},memoryCategoryActive:{backgroundColor:colors.primary,borderColor:colors.primary},memoryCategoryText:{fontSize:10,fontWeight:"800",color:"#665B77"},memoryCategoryTextActive:{color:"#fff"},memoryInput:{backgroundColor:"#FFFEFC",borderWidth:1,borderColor:colors.border,borderRadius:11,padding:11,fontSize:12,color:colors.text,marginTop:8},memoryTextArea:{minHeight:72,textAlignVertical:"top"},memorySave:{backgroundColor:colors.primary,borderRadius:11,padding:12,alignItems:"center",marginTop:10},memorySaveText:{fontSize:12,fontWeight:"900",color:"#fff"},memoryCancel:{alignSelf:"center",padding:8},memoryCancelText:{fontSize:11,fontWeight:"800",color:colors.primaryStrong},memoryEmpty:{fontSize:11,color:"#81788C",lineHeight:17},memoryItem:{backgroundColor:"#fff",borderRadius:11,padding:11,marginTop:8},memoryItemText:{},memoryItemCategory:{fontSize:9,fontWeight:"900",textTransform:"uppercase",color:"#8A6AB6"},memoryItemTitle:{fontSize:12,fontWeight:"900",color:colors.text,marginTop:3},memoryItemContent:{fontSize:11,lineHeight:16,color:"#625A6D",marginTop:3},memoryItemActions:{flexDirection:"row",gap:18,marginTop:8},memoryAction:{fontSize:11,fontWeight:"900",color:colors.primaryStrong},memoryDelete:{fontSize:11,fontWeight:"900",color:"#B33D35"},memoryClear:{alignSelf:"flex-start",paddingVertical:9,paddingHorizontal:2},savedReport:{backgroundColor:"#F7F2FF",borderRadius:14,padding:13,marginTop:18},reportTitle:{fontSize:14,fontWeight:"900",color:colors.primaryStrong,marginBottom:5},reportText:{fontSize:12,lineHeight:18,color:"#51476A",marginVertical:10},section:{fontSize:14,fontWeight:"900",color:"#403A50",marginTop:22,marginBottom:8},info:{fontSize:13,color:"#625A6D",marginTop:6},disclaimer:{fontSize:11,lineHeight:17,color:"#8A8293",marginTop:14},notice:{backgroundColor:"#E8F5EA",padding:13,borderRadius:12,marginTop:14},noticeText:{fontSize:12,lineHeight:18,color:"#365B3A"},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12,marginTop:14},errorText:{fontSize:12,lineHeight:18,color:"#8D302A"},back:{alignSelf:"center",padding:14,marginTop:12},backText:{color:colors.primaryStrong,fontSize:13,fontWeight:"800"},change:{alignSelf:"center",padding:12,marginTop:5},changeText:{fontSize:12,fontWeight:"800",color:colors.primaryStrong},footer:{textAlign:"center",color:"#938A9D",fontSize:11,marginTop:12}
});
