import {useCallback,useEffect,useState} from "react";
import * as Speech from "expo-speech";
import {Link,useFocusEffect} from "expo-router";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,createGabrooConversation,deleteGabrooConversation,getGabrooConversation,getLearnerMe,getSubscriptionStatus,listGabrooConversations,sendGabrooMessage,type GabrooConversation,type GabrooConversationMessage,type GabrooConversationMode,type SubscriptionStatus,updateGabrooConversation,updateLearnerPreferences} from "../src/auth-api";

const conversationModes:{value:GabrooConversationMode;label:string}[]=[{value:"free_flow",label:"Free flow"},{value:"gentle_correction",label:"Gentle correction"},{value:"detailed_correction",label:"Detailed correction"},{value:"topic_practice",label:"Topic practice"},{value:"role_play",label:"Role-play"},{value:"vocabulary_building",label:"Vocabulary"},{value:"confidence_practice",label:"Confidence"}];

export default function GabrooScreen(){
 const [subscription,setSubscription]=useState<SubscriptionStatus|null>(null);
 const [conversations,setConversations]=useState<GabrooConversation[]>([]);
 const [active,setActive]=useState<GabrooConversation|null>(null);
 const [messages,setMessages]=useState<GabrooConversationMessage[]>([]);
 const [draft,setDraft]=useState("");
 const [mode,setMode]=useState<GabrooConversationMode>("gentle_correction");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [speechRate,setSpeechRate]=useState(1);
 const [speakingMessageId,setSpeakingMessageId]=useState<string|null>(null);
 const [speechNotice,setSpeechNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const status=await getSubscriptionStatus();setSubscription(status);
   const learner=await getLearnerMe();setSpeechRate(learner.preferences?.gabroo_speech_rate??1);
   if(status.active){const result=await listGabrooConversations();setConversations(result.conversations);}
   else{setConversations([]);setActive(null);setMessages([]);}
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not load Gabroo.");}
  finally{setLoading(false);}
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const openConversation=async(item:GabrooConversation)=>{
  setBusy(true);setError("");
  try{const result=await getGabrooConversation(item.id);setActive(result.conversation);setMode(result.conversation.mode);setMessages(result.messages);}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not open this conversation.");}
  finally{setBusy(false);}
 };
 const start=async()=>{
  setBusy(true);setError("");
  try{
   const result=await createGabrooConversation({mode,support_language:"ml"});
   setActive(result.conversation);setMode(result.conversation.mode);setMessages([]);setConversations(current=>[result.conversation,...current]);
  }catch(reason){setError(reason instanceof AuthApiError&&reason.status===503? "Gabroo's conversation service is not connected yet. Your subscription and account are unchanged.":reason instanceof Error?reason.message:"Could not start a conversation.");}
  finally{setBusy(false);}
 };
 const changeMode=async(next:GabrooConversationMode)=>{
  setMode(next);
  if(!active)return;
  setBusy(true);setError("");
  try{const result=await updateGabrooConversation(active.id,{mode:next});setActive(result.conversation);}
  catch(reason){setMode(active.mode);setError(reason instanceof Error?reason.message:"Could not update the conversation mode.");}
  finally{setBusy(false);}
 };
 const send=async()=>{
  const text=draft.trim();if(!text||!active||busy)return;
  setBusy(true);setError("");
  try{const result=await sendGabrooMessage(active.id,text);setMessages(current=>[...current,...result.messages]);setDraft("");}
  catch(reason){setError(reason instanceof AuthApiError&&reason.status===503?"Gabroo could not reply just now. Your message was not saved. Please try again.":reason instanceof Error?reason.message:"Could not send your message.");}
  finally{setBusy(false);}
 };
 const stopSpeech=async()=>{await Speech.stop();setSpeakingMessageId(null);};
 const speakMessage=async(message:GabrooConversationMessage)=>{
  if(speakingMessageId===message.id){await stopSpeech();return;}
  await Speech.stop();setSpeakingMessageId(null);setSpeechNotice("");
  try{
   const voices=await Speech.getAvailableVoicesAsync();
   const hasMalayalam=/[\\u0D00-\\u0D7F]/.test(message.content);
   const preferred=voices.find(voice=>voice.language.toLowerCase().startsWith(hasMalayalam?"ml-in":"en-in"));
   if(hasMalayalam&&!preferred){setSpeechNotice("A Malayalam device voice is not installed. Install a Malayalam text-to-speech voice in your device settings to listen to this reply.");return;}
   setSpeakingMessageId(message.id);
   Speech.speak(message.content,{rate:speechRate,language:preferred?.language??"en-IN",...(preferred?{voice:preferred.identifier}:{}),onDone:()=>setSpeakingMessageId(null),onStopped:()=>setSpeakingMessageId(null),onError:()=>{setSpeakingMessageId(null);setSpeechNotice("Your device could not play this reply. Check its text-to-speech voice settings.");}});
  }catch{setSpeakingMessageId(null);setSpeechNotice("Device speech is unavailable right now.");}
 };
 const changeSpeechRate=async(delta:number)=>{
  const next=Math.min(1.5,Math.max(0.75,Math.round((speechRate+delta)*100)/100));
  if(next===speechRate)return;
  setSpeechRate(next);setSpeechNotice("");
  try{await updateLearnerPreferences({gabroo_speech_rate:next});}
  catch(reason){setSpeechRate(speechRate);setSpeechNotice(reason instanceof Error?reason.message:"Could not save your speaking speed.");}
 };
 useEffect(()=>()=>{void Speech.stop();},[]);
 const remove=async()=>{
  if(!active||busy)return;
  setBusy(true);setError("");
  try{await deleteGabrooConversation(active.id);setConversations(current=>current.filter(item=>item.id!==active.id));setActive(null);setMessages([]);}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not delete this conversation.");}
  finally{setBusy(false);}
 };
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <View style={s.top}><Link href="/" style={s.back}>‹ Home</Link><Text style={s.brand}>Gabroo</Text><Text style={s.subtitle}>Your everyday English companion</Text></View>
  {loading?<ActivityIndicator size="large" color="#6A2BBF" style={{marginTop:40}}/>:!subscription?.active?<View style={s.panel}><Text style={s.title}>Your English companion awaits</Text><Text style={s.copy}>Open conversations with Gabroo are included with an active Gabenglish subscription. Your free English analysis remains available in your account.</Text><Link href="/account" style={s.action}>Go to your account</Link></View>:<>
   {!active?<><View style={s.panel}><Text style={s.title}>Talk about anything suitable for practice.</Text><Text style={s.copy}>Work, travel, daily life, hobbies or a topic you are curious about. Choose how much correction you want as we build out the conversation experience.</Text><Text style={s.modeLabel}>Choose your conversation style</Text><View style={s.modeGrid}>{conversationModes.map(item=><Pressable key={item.value} disabled={busy} onPress={()=>setMode(item.value)} style={[s.modeChip,mode===item.value&&s.modeSelected]}><Text style={[s.modeText,mode===item.value&&s.modeTextSelected]}>{item.label}</Text></Pressable>)}</View><Pressable disabled={busy} onPress={start} style={[s.button,busy&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Start a conversation</Text>}</Pressable></View><Text style={s.section}>Your conversations</Text>{conversations.length===0?<Text style={s.empty}>Your saved conversations will appear here.</Text>:conversations.map(item=><Pressable key={item.id} onPress={()=>openConversation(item)} style={s.listItem}><Text style={s.listTitle}>{item.title??"Conversation"}</Text><Text style={s.listMeta}>{item.turn_count} exchanges · {new Date(item.updated_at).toLocaleDateString()}</Text></Pressable>)}</>:<>
    <View style={s.conversationHeader}><Pressable onPress={()=>{setActive(null);setMessages([]);}}><Text style={s.back}>‹ All conversations</Text></Pressable><Pressable onPress={remove} disabled={busy}><Text style={s.delete}>Delete</Text></Pressable></View>
    <View style={s.voiceControls}><Text style={s.voiceTitle}>Listening speed · {speechRate.toFixed(2).replace(/0$/,"")}×</Text><View style={s.voiceSpeedRow}><Pressable accessibilityRole="button" accessibilityLabel="Slow Gabroo speech" disabled={speechRate<=0.75||busy} onPress={()=>void changeSpeechRate(-0.05)} style={s.voiceSpeedButton}><Text style={s.voiceSpeedButtonText}>−</Text></Pressable><Text style={s.voiceSpeedHint}>Adjust how quickly replies are spoken</Text><Pressable accessibilityRole="button" accessibilityLabel="Speed up Gabroo speech" disabled={speechRate>=1.5||busy} onPress={()=>void changeSpeechRate(0.05)} style={s.voiceSpeedButton}><Text style={s.voiceSpeedButtonText}>+</Text></Pressable></View></View><Text style={s.modeLabel}>Conversation style</Text><View style={s.modeGrid}>{conversationModes.map(item=><Pressable key={item.value} disabled={busy} onPress={()=>void changeMode(item.value)} style={[s.modeChip,mode===item.value&&s.modeSelected]}><Text style={[s.modeText,mode===item.value&&s.modeTextSelected]}>{item.label}</Text></Pressable>)}</View>{messages.length===0?<View style={s.emptyPanel}><Text style={s.title}>Hi! I'm Gabroo.</Text><Text style={s.copy}>Let's have a natural conversation. What's on your mind today?</Text></View>:messages.map(message=><View key={message.id} style={[s.bubble,message.role==="user"?s.userBubble:s.gabrooBubble]}><Text style={s.speaker}>{message.role==="user"?"YOU":"GABROO"}</Text><Text style={s.message}>{message.content}</Text>{message.role==="assistant"?<Pressable accessibilityRole="button" onPress={()=>void speakMessage(message)} style={s.listenButton}><Text style={s.listenButtonText}>{speakingMessageId===message.id?"Stop speaking":"Listen · device voice"}</Text></Pressable>:null}</View>)}
    <TextInput value={draft} onChangeText={setDraft} placeholder="Write your message…" multiline style={s.input} editable={!busy}/>
    <Pressable disabled={!draft.trim()||busy} onPress={send} style={[s.button,(!draft.trim()||busy)&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Send message</Text>}</Pressable>
    <Text style={s.hint}>You can ask for gentle corrections, detailed explanations or just a natural chat. Listen uses the voice installed on your device; Gabroo’s final character voice and live voice conversations are still being developed.</Text>{speechNotice?<Text style={s.speechNotice}>{speechNotice}</Text>:null}
   </>}
  </>}
  {!!error&&<View style={s.error}><Text style={s.errorText}>{error}</Text></View>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#FFF7EC"},page:{flexGrow:1,padding:20,paddingBottom:36},top:{alignItems:"center",marginBottom:26},back:{color:"#6A2BBF",fontWeight:"800",fontSize:14,alignSelf:"flex-start"},brand:{fontSize:30,fontWeight:"900",color:"#1F1B4D",marginTop:12},subtitle:{color:"#777084",fontSize:13,marginTop:4},panel:{backgroundColor:"#EEE4FF",borderRadius:22,padding:22},title:{fontSize:21,fontWeight:"900",color:"#54239A"},copy:{fontSize:14,lineHeight:22,color:"#51476A",marginTop:10},action:{color:"#54239A",fontWeight:"900",marginTop:20},button:{backgroundColor:"#6A2BBF",borderRadius:14,padding:16,alignItems:"center",marginTop:18},buttonText:{color:"#fff",fontWeight:"900",fontSize:15},disabled:{opacity:.5},section:{fontSize:17,fontWeight:"900",color:"#30254A",marginTop:28,marginBottom:12},modeLabel:{fontSize:12,fontWeight:"900",color:"#51476A",marginTop:18,marginBottom:8},modeGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:4},modeChip:{paddingVertical:9,paddingHorizontal:11,borderRadius:18,borderWidth:1,borderColor:"#D9CBEA",backgroundColor:"#fff"},modeSelected:{backgroundColor:"#6A2BBF",borderColor:"#6A2BBF"},modeText:{fontSize:11,fontWeight:"700",color:"#51476A"},modeTextSelected:{color:"#fff"},empty:{color:"#777084",fontSize:13,paddingVertical:16},listItem:{backgroundColor:"#fff",borderColor:"#E8DFEF",borderWidth:1,borderRadius:14,padding:15,marginBottom:9},listTitle:{color:"#30254A",fontWeight:"800"},listMeta:{color:"#82798E",fontSize:12,marginTop:5},conversationHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},delete:{color:"#B42318",fontWeight:"800"},bubble:{padding:15,borderRadius:17,marginBottom:12,maxWidth:"92%"},userBubble:{backgroundColor:"#E7DDF8",alignSelf:"flex-end"},gabrooBubble:{backgroundColor:"#fff",alignSelf:"flex-start",borderWidth:1,borderColor:"#EEE7F4"},speaker:{fontSize:9,fontWeight:"900",letterSpacing:1,color:"#7C55A6",marginBottom:6},message:{fontSize:15,lineHeight:22,color:"#30254A"},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#E3DCEA",borderRadius:14,padding:14,fontSize:15,color:"#1F1B4D",minHeight:88,textAlignVertical:"top",marginTop:16},hint:{fontSize:11,lineHeight:17,color:"#777084",marginTop:12},emptyPanel:{backgroundColor:"#EEE4FF",padding:22,borderRadius:18},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12,marginTop:18},errorText:{color:"#9F2D24",fontSize:13,lineHeight:19}
});
