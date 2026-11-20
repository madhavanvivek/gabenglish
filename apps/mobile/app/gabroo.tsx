import {useCallback,useEffect,useRef,useState} from "react";
import * as Speech from "expo-speech";
import {Audio} from "expo-av";
import * as FileSystem from "expo-file-system";
import {chunkGabrooSpeechSegments,confirmGabrooTranscript,GABROO_LOCAL_CAPTURE_MAX_MS,initialGabrooPlaybackState,initialGabrooTurnState,playGabrooSpeechSegments,reduceGabrooPlayback,reduceGabrooTurn,splitGabrooSpeechText,transitionGabrooVoiceSession,type GabrooPlaybackState,type GabrooTurnState,type GabrooVoiceSessionState,type GabrooTranscript,type GabrooRecognitionLanguage} from "@gabenglish/contracts";
import {Link,useFocusEffect,useLocalSearchParams} from "expo-router";
import {ActivityIndicator,AppState,Pressable,ScrollView,StatusBar,StyleSheet,Text,TextInput,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "../src/theme";
import {adjustGabrooSpeechRate} from "../src/learner-settings";
import {cacheGabrooSpeechRate} from "../src/learner-preference-cache";
import {BrandMark} from "../src/ui";
import {AuthApiError,createGabrooConversation,deleteGabrooConversation,getGabrooConversation,getGabrooRecognitionStatus,getGabrooSpeechStatus,recognizeGabrooAudio,getLearnerMe,getSubscriptionStatus,listGabrooConversations,sendGabrooMessage,type GabrooConversation,type GabrooConversationMessage,type GabrooConversationMode,type GabrooRecognitionStatus,type SubscriptionStatus,type GabrooSpeechStatus,deleteGabrooMemory,updateGabrooConversation,updateLearnerPreferences,synthesizeGabrooSpeech,createGabrooMemory} from "../src/auth-api";

const conversationModes:{value:GabrooConversationMode;label:string}[]=[{value:"free_flow",label:"Free flow"},{value:"gentle_correction",label:"Gentle correction"},{value:"detailed_correction",label:"Detailed correction"},{value:"topic_practice",label:"Topic practice"},{value:"role_play",label:"Role-play"},{value:"vocabulary_building",label:"Vocabulary"},{value:"confidence_practice",label:"Confidence"}];

export default function GabrooScreen(){
 const params=useLocalSearchParams<{practiceTerm?:string;practiceMeaning?:string;practiceExample?:string;practiceOriginal?:string;practiceSuggestion?:string;practiceNote?:string;practiceTitle?:string;practicePrompt?:string;practiceInstruction?:string;practiceDraft?:string}>();
 const practiceTerm=typeof params.practiceTerm==="string"?params.practiceTerm.trim().slice(0,120):"";
 const practiceMeaning=typeof params.practiceMeaning==="string"?params.practiceMeaning.trim().slice(0,300):"";
 const practiceExample=typeof params.practiceExample==="string"?params.practiceExample.trim().slice(0,500):"";
 const practiceOriginal=typeof params.practiceOriginal==="string"?params.practiceOriginal.trim().slice(0,240):"";
 const practiceSuggestion=typeof params.practiceSuggestion==="string"?params.practiceSuggestion.trim().slice(0,240):"";
 const practiceNote=typeof params.practiceNote==="string"?params.practiceNote.trim().slice(0,400):"";
 const hasSentencePractice=Boolean(practiceOriginal&&practiceSuggestion);
 const practiceTitle=typeof params.practiceTitle==="string"?params.practiceTitle.trim().slice(0,120):"";
 const practicePrompt=typeof params.practicePrompt==="string"?params.practicePrompt.trim().slice(0,300):"";
 const practiceInstruction=typeof params.practiceInstruction==="string"?params.practiceInstruction.trim().slice(0,300):"";
 const hasStructuredSentencePractice=Boolean(practiceTitle&&practicePrompt);
 const practiceDraft=typeof params.practiceDraft==="string"?params.practiceDraft.trim().slice(0,1200):"";
 const [subscription,setSubscription]=useState<SubscriptionStatus|null>(null);
 const [recognitionStatus,setRecognitionStatus]=useState<GabrooRecognitionStatus|null>(null);
 const [speechStatus,setSpeechStatus]=useState<GabrooSpeechStatus|null>(null);
 const [speechStatusRefreshing,setSpeechStatusRefreshing]=useState(false);
 const [conversations,setConversations]=useState<GabrooConversation[]>([]);
 const [active,setActive]=useState<GabrooConversation|null>(null);
 const activeConversationIdRef=useRef<string|null>(null);
 const conversationOpenSequenceRef=useRef(0);
 const loadSequenceRef=useRef(0);
 const conversationMutationSequenceRef=useRef(0);
 const [messages,setMessages]=useState<GabrooConversationMessage[]>([]);
 const [draft,setDraft]=useState("");
 const [mode,setMode]=useState<GabrooConversationMode>(practiceTerm?"vocabulary_building":"gentle_correction");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [speechRate,setSpeechRate]=useState(1);
 const speechRateRef=useRef(1);
 const [speakingMessageId,setSpeakingMessageId]=useState<string|null>(null);
 const [darkScreenMode,setDarkScreenMode]=useState(false);
 const [darkScreenAudioEnabled,setDarkScreenAudioEnabled]=useState(true);
 const speechSoundRef=useRef<Audio.Sound|null>(null);
 const speechRequestAbortRef=useRef<AbortController|null>(null);
 const speechAudioUriRef=useRef<string|null>(null);
 const speechSegmentResolveRef=useRef<(()=>void)|null>(null);
 const [turnState,setTurnState]=useState<GabrooTurnState>(initialGabrooTurnState);
 const [speechNotice,setSpeechNotice]=useState("");
 const [savingPhraseId,setSavingPhraseId]=useState<string|null>(null);
 const [savedPhraseIds,setSavedPhraseIds]=useState<string[]>([]);
 const [savingRevisionId,setSavingRevisionId]=useState<string|null>(null);
 const [savedRevisionIds,setSavedRevisionIds]=useState<string[]>([]);
 const [speechSaving,setSpeechSaving]=useState(false);
 const [voiceConsent,setVoiceConsent]=useState(false);
 const [voicePermissionStatus,setVoicePermissionStatus]=useState<"not_requested"|"granted"|"denied">("not_requested");
 const [voicePermissionBusy,setVoicePermissionBusy]=useState(false);
 const [voiceSessionState,setVoiceSessionState]=useState<GabrooVoiceSessionState>("idle");
 const [voiceCaptureConsent,setVoiceCaptureConsent]=useState(false);
 const [recordingActive,setRecordingActive]=useState(false);
 const [recordingBusy,setRecordingBusy]=useState(false);
 const [transcriptionConsent,setTranscriptionConsent]=useState(false);
 const [recognitionLanguage,setRecognitionLanguage]=useState<GabrooRecognitionLanguage>("ml-en");
 const [transcriptionRecording,setTranscriptionRecording]=useState(false);
 const [transcriptionBusy,setTranscriptionBusy]=useState(false);
 const [transcript,setTranscript]=useState<GabrooTranscript|null>(null);
 const [reviewedTranscript,setReviewedTranscript]=useState("");
 const transcriptionRecordingRef=useRef<Audio.Recording|null>(null);
 const transcriptionUriRef=useRef<string|null>(null);
 const transcriptionOperationRef=useRef(false);
 const transcriptionSequenceRef=useRef(0);
 const recordingRef=useRef<Audio.Recording|null>(null);
 const recordingOperationRef=useRef(false);
 const appIsActiveRef=useRef(true);
 const tutorScreenFocusedRef=useRef(false);
 const speechRunRef=useRef(0);
 const turnSequenceRef=useRef(0);
 const turnAbortRef=useRef<AbortController|null>(null);
 const sendInFlightRef=useRef(false);
 const speechPreferenceSequenceRef=useRef(0);
 const playbackStateRef=useRef<GabrooPlaybackState>(initialGabrooPlaybackState);
 const saveReplyAsPhrase=useCallback(async(message:GabrooConversationMessage)=>{
  if(savingPhraseId||savedPhraseIds.includes(message.id))return;
  const phrase=message.content.trim().replace(/\s+/g," ").slice(0,500);
  if(!phrase)return;
  setSavingPhraseId(message.id);setSpeechNotice("");
  try{
   await createGabrooMemory({category:"saved_phrase",memory_key:phrase.slice(0,80),content:phrase});
   setSavedPhraseIds(current=>[...current,message.id]);
   setSpeechNotice("Saved to your private Gabroo learning memory. You can edit or delete it in Account.");
  }catch(reason){
   setSpeechNotice(reason instanceof AuthApiError&&reason.status===409?"This phrase is already in your saved memory.":"Could not save this phrase. Please try again.");
  }finally{setSavingPhraseId(null);}
 },[savingPhraseId,savedPhraseIds]);
 const saveImprovedSentence=useCallback(async(message:GabrooConversationMessage)=>{
  if(!practiceDraft||savingRevisionId||savedRevisionIds.includes(message.id))return;
  const improved=message.content.trim().replace(/\s+/g," ").slice(0,420);
  if(!improved)return;
  setSavingRevisionId(message.id);setSpeechNotice("");
  let originalId:string|null=null;
  try{
   const revisionKey="sentence_revision_"+message.id.slice(0,44);
   const original=await createGabrooMemory({category:"learning_note",memory_key:revisionKey+"_original",content:practiceDraft.slice(0,500)});
   originalId=original.memory.id;
   await createGabrooMemory({category:"learning_note",memory_key:revisionKey+"_improved",content:improved.slice(0,500)});
   setSavedRevisionIds(current=>[...current,message.id]);
   setSpeechNotice("Saved both sentence versions to your private Sentence Notebook.");
  }catch(reason){
   if(originalId)await deleteGabrooMemory(originalId).catch(()=>undefined);
   setSpeechNotice(reason instanceof AuthApiError&&reason.status===409?"This revision is already saved in your Sentence Notebook.":"Could not save this revision. Please try again.");
  }finally{setSavingRevisionId(null);}
 },[practiceDraft,savingRevisionId,savedRevisionIds]);
 const refreshSpeechStatus=useCallback(async()=>{
  setSpeechStatusRefreshing(true);
  try{
   const status=await getGabrooSpeechStatus();
   setSpeechStatus(status);
   setSpeechNotice("");
  }catch(reason){
   setSpeechStatus(null);
   setSpeechNotice(reason instanceof Error?reason.message:"Could not refresh Gabroo voice availability.");
  }finally{
   setSpeechStatusRefreshing(false);
  }
 },[]);
 const load=useCallback(async(sequence:number)=>{
  setLoading(true);setError("");
  try{
   const status=await getSubscriptionStatus();
   if(sequence!==loadSequenceRef.current)return;
   setSubscription(status);
   const learner=await getLearnerMe();
   if(sequence!==loadSequenceRef.current)return;
   const savedSpeechRate=learner.preferences?.gabroo_speech_rate??1;
   speechRateRef.current=savedSpeechRate;setSpeechRate(savedSpeechRate);
   void cacheGabrooSpeechRate(learner.user.id,savedSpeechRate).catch(()=>{});
   if(status.active){
    const result=await listGabrooConversations();
    if(sequence!==loadSequenceRef.current)return;
    setConversations(result.conversations);
    try{
     const recognition=await getGabrooRecognitionStatus();
     if(sequence!==loadSequenceRef.current)return;
     setRecognitionStatus(recognition);
    }catch{
     if(sequence===loadSequenceRef.current)setRecognitionStatus(null);
    }
    try{
     const speech=await getGabrooSpeechStatus();
     if(sequence!==loadSequenceRef.current)return;
     setSpeechStatus(speech);
    }catch{
     if(sequence===loadSequenceRef.current)setSpeechStatus(null);
    }
   }else{
    if(sequence!==loadSequenceRef.current)return;
    setRecognitionStatus(null);setSpeechStatus(null);
    setConversations([]);activeConversationIdRef.current=null;setTurnState(initialGabrooTurnState);setActive(null);setMessages([]);
   }
  }catch(reason){
   if(sequence===loadSequenceRef.current)setError(reason instanceof Error?reason.message:"Could not load Gabroo.");
  }finally{
   if(sequence===loadSequenceRef.current)setLoading(false);
  }
 },[]);
 useFocusEffect(useCallback(()=>{
  tutorScreenFocusedRef.current=true;
  const sequence=++loadSequenceRef.current;
  void load(sequence);
  return ()=>{
   tutorScreenFocusedRef.current=false;
   loadSequenceRef.current+=1;
   conversationOpenSequenceRef.current+=1;
   conversationMutationSequenceRef.current+=1;
   transcriptionSequenceRef.current+=1;
   void discardTranscriptionAudio();
   activeConversationIdRef.current=null;
   turnAbortRef.current?.abort();turnAbortRef.current=null;
   setTurnState(initialGabrooTurnState);
   speechRunRef.current+=1;speechRequestAbortRef.current?.abort();speechRequestAbortRef.current=null;speechSegmentResolveRef.current?.();speechSegmentResolveRef.current=null;
   const playback=playbackStateRef.current;
   if(playback.phase==="speaking"&&playback.playback_id){
    playbackStateRef.current=reduceGabrooPlayback(playback,{type:"interrupted",playback_id:playback.playback_id});
   }
   void Speech.stop();
   void releaseSpeechAudio();
   const recording=recordingRef.current;
   recordingRef.current=null;
   if(recording){
    recording.setOnRecordingStatusUpdate(null);
    const uri=recording.getURI();
    void recording.stopAndUnloadAsync().catch(()=>undefined).then(async()=>{
     if(uri?.startsWith("file://"))if(uri.startsWith("file://"))await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
    }).finally(()=>Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true}).catch(()=>undefined));
   }
  };
 },[load]));
 const cancelActiveTurn=()=>{
  const controller=turnAbortRef.current;
  turnAbortRef.current=null;
  controller?.abort();
  setTurnState(initialGabrooTurnState);
  setBusy(false);
 };
 const openConversation=async(item:GabrooConversation)=>{
  cancelActiveTurn();
  conversationMutationSequenceRef.current+=1;
  const requestId=++conversationOpenSequenceRef.current;
  setBusy(true);setError("");
  try{
   await stopSpeech();
   if(requestId!==conversationOpenSequenceRef.current)return;
   const result=await getGabrooConversation(item.id);
   if(requestId!==conversationOpenSequenceRef.current)return;
   activeConversationIdRef.current=result.conversation.id;setTurnState(initialGabrooTurnState);setActive(result.conversation);setMode(result.conversation.mode);setMessages(result.messages);setDraft("");setSpeechNotice("");
  }catch(reason){
   if(requestId===conversationOpenSequenceRef.current)setError(reason instanceof Error?reason.message:"Could not open this conversation.");
  }finally{
   if(requestId===conversationOpenSequenceRef.current)setBusy(false);
  }
 };
 const start=async()=>{
  cancelActiveTurn();
  conversationMutationSequenceRef.current+=1;
  const requestId=++conversationOpenSequenceRef.current;
  setBusy(true);setError("");
  try{
   await stopSpeech();
   if(requestId!==conversationOpenSequenceRef.current)return;
   const result=await createGabrooConversation({mode,support_language:"ml"});
   if(requestId!==conversationOpenSequenceRef.current)return;
   activeConversationIdRef.current=result.conversation.id;setTurnState(initialGabrooTurnState);setActive(result.conversation);setMode(result.conversation.mode);setMessages([]);setDraft(hasStructuredSentencePractice?`I want to practise the “${practiceTitle}” pattern. Here is the prompt: “${practicePrompt}”. ${practiceInstruction?`The exercise instruction is: ${practiceInstruction}. `:""}${practiceDraft?`Here is my attempt: “${practiceDraft}”. Please give me kind, specific feedback, preserve my intended meaning, show one improved version and explain the changes in Malayalam and English. `:""}Please explain the pattern simply in Malayalam and English, give me one fresh example, then ask me to make my own sentence.`:hasSentencePractice?`I want to practise this sentence pattern. My original example was: “${practiceOriginal}”. A suggested form is: “${practiceSuggestion}”. ${practiceNote?`The grammar note says: ${practiceNote} `:""}Please explain the difference simply, give me one new example, and let me try making my own sentence.`:practiceTerm?`I would like to practise the English word “${practiceTerm}”. ${practiceMeaning?`Its Malayalam meaning is “${practiceMeaning}”. `:""}${practiceExample?`Here is my example: “${practiceExample}”. `:""}Please help me use it naturally in a conversation.`:"");setSpeechNotice(hasStructuredSentencePractice?`Sentence builder: ${practiceTitle}. Review the suggested message and send it when you are ready.`:hasSentencePractice?`Sentence practice: ${practiceOriginal} → ${practiceSuggestion}. Review the message and send it when you are ready.`:practiceTerm?`Vocabulary practice: ${practiceTerm}. Review the suggested message and send it when you are ready.`:"");setConversations(current=>[result.conversation,...current]);
  }catch(reason){
   if(requestId===conversationOpenSequenceRef.current)setError(reason instanceof AuthApiError&&reason.status===503? "Gabroo's conversation service is not connected yet. Your subscription and account are unchanged.":reason instanceof Error?reason.message:"Could not start a conversation.");
  }finally{
   if(requestId===conversationOpenSequenceRef.current)setBusy(false);
  }
 };
 const changeMode=async(next:GabrooConversationMode)=>{
  if(busy)return;
  setMode(next);
  if(!active)return;
  const conversationId=active.id;
  const previousMode=active.mode;
  const requestId=++conversationMutationSequenceRef.current;
  setBusy(true);setError("");
  try{
   const result=await updateGabrooConversation(conversationId,{mode:next});
   if(requestId!==conversationMutationSequenceRef.current||activeConversationIdRef.current!==conversationId)return;
   setActive(result.conversation);
  }catch(reason){
   if(requestId!==conversationMutationSequenceRef.current||activeConversationIdRef.current!==conversationId)return;
   setMode(previousMode);setError(reason instanceof Error?reason.message:"Could not update the conversation mode.");
  }finally{
   if(requestId===conversationMutationSequenceRef.current)setBusy(false);
  }
 };
 const send=async()=>{
  const text=draft.trim();if(!text||!active||busy||sendInFlightRef.current)return;
  sendInFlightRef.current=true;
  setBusy(true);setError("");
  const conversationId=active.id;
  const turnId=`${conversationId}:${++turnSequenceRef.current}`;
  const controller=new AbortController();turnAbortRef.current=controller;
  setTurnState(current=>reduceGabrooTurn(current,{type:"submitted",turn_id:turnId}));
  try{
   await stopSpeech();
   if(controller.signal.aborted||activeConversationIdRef.current!==conversationId)return;
   const result=await sendGabrooMessage(conversationId,text,controller.signal);
   if(activeConversationIdRef.current!==conversationId)return;
   setMessages(current=>[...current,...result.messages]);
   setTurnState(current=>reduceGabrooTurn(current,{type:"response_received",turn_id:turnId}));
   setDraft("");
  }catch(reason){
   if(activeConversationIdRef.current!==conversationId)return;
   setTurnState(current=>reduceGabrooTurn(current,{type:"failed",turn_id:turnId,reason:reason instanceof Error?reason.message:"Could not send your message."}));
   setError(reason instanceof AuthApiError&&reason.status===503?"Gabroo could not reply just now. Your message was not saved. Please try again.":reason instanceof Error?reason.message:"Could not send your message.");
  }finally{sendInFlightRef.current=false;if(turnAbortRef.current===controller){turnAbortRef.current=null;setBusy(false);}}
 };
 const stopSpeech=async()=>{
  speechRunRef.current+=1;
  speechRequestAbortRef.current?.abort();speechRequestAbortRef.current=null;
  const finishPendingSegment=speechSegmentResolveRef.current;
  speechSegmentResolveRef.current=null;
  finishPendingSegment?.();
  const activePlayback=playbackStateRef.current;
  if(activePlayback.phase==="speaking"&&activePlayback.playback_id){
   playbackStateRef.current=reduceGabrooPlayback(activePlayback,{type:"interrupted",playback_id:activePlayback.playback_id});
  }
  // Native speech shutdown can reject on device/audio-route transitions. Still release
  // the cached sound and file so a failed native stop cannot block the next learner turn.
  await Speech.stop().catch(()=>undefined);
  await releaseSpeechAudio();
  setSpeakingMessageId(null);
 };
 const releaseSpeechAudio=async()=>{
  const sound=speechSoundRef.current;speechSoundRef.current=null;
  const uri=speechAudioUriRef.current;speechAudioUriRef.current=null;
  if(sound){
   sound.setOnPlaybackStatusUpdate(null);
   await sound.stopAsync().catch(()=>undefined);
   await sound.unloadAsync().catch(()=>undefined);
  }
  if(uri?.startsWith("file://"))await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
 };
 const speakMessage=async(message:GabrooConversationMessage)=>{
  if(darkScreenMode&&!darkScreenAudioEnabled)return;
  if(speakingMessageId===message.id){await stopSpeech();return;}
  speechRequestAbortRef.current?.abort();
  speechSegmentResolveRef.current?.();speechSegmentResolveRef.current=null;
  const requestController=new AbortController();speechRequestAbortRef.current=requestController;
  const run=++speechRunRef.current;
  const playbackId=`${message.id}:${run}`;
  const previousPlayback=playbackStateRef.current;
  if(previousPlayback.phase==="speaking"&&previousPlayback.playback_id){
   playbackStateRef.current=reduceGabrooPlayback(previousPlayback,{type:"interrupted",playback_id:previousPlayback.playback_id});
  }
  try{
   await Speech.stop();
   await releaseSpeechAudio();
   // A newer tap may start while native stop/unload is still pending.
   // Never let this older request update UI or begin synthesis afterwards.
   if(run!==speechRunRef.current||requestController.signal.aborted)return;
   setSpeakingMessageId(null);setSpeechNotice("");
   const text=message.content.trim();
   if(!text)return;
   const segments=chunkGabrooSpeechSegments(splitGabrooSpeechText(text),600);
   if(!segments.length)return;
   let playbackStarted=false;
   setSpeechNotice("Preparing Gabroo's voice…");
   const completed=await playGabrooSpeechSegments(segments,{
    speak:async(segment)=>{
     if(run!==speechRunRef.current||requestController.signal.aborted)return;
     const synthesisRate=speechRateRef.current;
     const uri=await synthesizeGabrooSpeech({text:segment.text,speed:synthesisRate,signal:requestController.signal});
     if(run!==speechRunRef.current||requestController.signal.aborted){
      await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
      return;
     }
     speechAudioUriRef.current=uri;
     let sound:Audio.Sound|null=null;
     try{
      const created=await Audio.Sound.createAsync({uri},{shouldPlay:false,rate:speechRateRef.current,shouldCorrectPitch:true});
      sound=created.sound;
      if(run!==speechRunRef.current||requestController.signal.aborted)return;
      speechSoundRef.current=sound;
      await sound.setRateAsync(speechRateRef.current,true);
      if(run!==speechRunRef.current||requestController.signal.aborted)return;
      if(!playbackStarted){
       playbackStateRef.current=reduceGabrooPlayback(playbackStateRef.current,{type:"started",playback_id:playbackId});
       setSpeakingMessageId(message.id);setSpeechNotice("");
       playbackStarted=true;
      }
      await new Promise<void>((resolve,reject)=>{
       let settled=false;
       const finish=()=>{
        if(settled)return;
        settled=true;
        if(speechSegmentResolveRef.current===finish)speechSegmentResolveRef.current=null;
        resolve();
       };
       speechSegmentResolveRef.current=finish;
       const fail=(reason:unknown)=>{
        if(settled)return;
        settled=true;
        if(speechSegmentResolveRef.current===finish)speechSegmentResolveRef.current=null;
        reject(reason instanceof Error?reason:new Error("Gabroo audio playback failed."));
       };
       sound!.setOnPlaybackStatusUpdate(status=>{
        if(status.isLoaded){
         if(status.didJustFinish)finish();
        }else if(status.error){
         fail(new Error(status.error));
        }
       });
       void sound!.playAsync().catch(fail);
      });
     }finally{
      if(sound){
       sound.setOnPlaybackStatusUpdate(null);
       if(speechSoundRef.current===sound)speechSoundRef.current=null;
       await sound.stopAsync().catch(()=>undefined);
       await sound.unloadAsync().catch(()=>undefined);
      }
      if(speechAudioUriRef.current===uri)speechAudioUriRef.current=null;
      await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
     }
    }
   },speechRate,()=>run!==speechRunRef.current||requestController.signal.aborted);
   if(run===speechRunRef.current){
    // Count only segments whose playback promise completed without a stop.
    // The queue returns this count after its final cancellation check.
    const current=playbackStateRef.current;
    if(playbackStarted&&current.phase==="speaking"&&current.playback_id===playbackId){
     for(let index=0;index<completed;index+=1){
      playbackStateRef.current=reduceGabrooPlayback(playbackStateRef.current,{type:"segment_completed",playback_id:playbackId});
     }
     playbackStateRef.current=reduceGabrooPlayback(playbackStateRef.current,{type:"finished",playback_id:playbackId});
    }
    setSpeakingMessageId(null);
    if(completed===0&&segments.length>0)setSpeechNotice("Gabroo's speech was interrupted.");
   }
  }catch(reason){
   if(run===speechRunRef.current){
    const current=playbackStateRef.current;
    if(current.phase==="speaking"&&current.playback_id===playbackId){
     playbackStateRef.current=reduceGabrooPlayback(current,{type:"failed",playback_id:playbackId,reason:reason instanceof Error?reason.message:"Speech playback failed."});
    }
    setSpeakingMessageId(null);
    setSpeechNotice(reason instanceof AuthApiError&&reason.status===503?
     "Gabroo's approved voice is not configured on the server yet. Device text-to-speech has not been substituted.":
     reason instanceof Error?reason.message:"Gabroo could not play this reply. Please try again.");
   }
  }finally{
   if(speechRequestAbortRef.current===requestController)speechRequestAbortRef.current=null;
   if(run===speechRunRef.current)await releaseSpeechAudio();
  }
 };
 const discardTranscriptionAudio=async()=>{
  transcriptionSequenceRef.current+=1;
  const recording=transcriptionRecordingRef.current;
  transcriptionRecordingRef.current=null;
  const uri=transcriptionUriRef.current??recording?.getURI()??null;
  transcriptionUriRef.current=null;
  if(recording){
   recording.setOnRecordingStatusUpdate(null);
   await recording.stopAndUnloadAsync().catch(()=>undefined);
  }
  if(uri)await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
  await Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true}).catch(()=>undefined);
  setTranscriptionRecording(false);
  setTranscriptionBusy(false);
  setTranscript(null);setReviewedTranscript("");
 };
 const startTranscriptionCapture=async()=>{
  if(!transcriptionConsent||!recognitionStatus?.available||voicePermissionStatus!=="granted"||transcriptionOperationRef.current||transcriptionRecordingRef.current||recordingRef.current)return;
  const operation=++transcriptionSequenceRef.current;
  let recordingStarted=false;
  transcriptionOperationRef.current=true;setTranscriptionBusy(true);setSpeechNotice("");
  try{
   await Audio.setAudioModeAsync({allowsRecordingIOS:true,playsInSilentModeIOS:true,shouldDuckAndroid:true});
   const created=await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
   if(operation!==transcriptionSequenceRef.current||!appIsActiveRef.current||!tutorScreenFocusedRef.current){
    created.recording.setOnRecordingStatusUpdate(null);
    const abandonedUri=created.recording.getURI();
    await created.recording.stopAndUnloadAsync().catch(()=>undefined);
    if(abandonedUri)await FileSystem.deleteAsync(abandonedUri,{idempotent:true}).catch(()=>undefined);
    return;
   }
   transcriptionRecordingRef.current=created.recording;
   recordingStarted=true;
   created.recording.setProgressUpdateInterval(250);
   created.recording.setOnRecordingStatusUpdate(status=>{
    if(status.isRecording&&status.durationMillis>=GABROO_LOCAL_CAPTURE_MAX_MS){
     created.recording.setOnRecordingStatusUpdate(null);
     void stopTranscriptionCapture();
    }
   });
   setTranscriptionRecording(true);
  }catch(reason){
   if(operation===transcriptionSequenceRef.current&&appIsActiveRef.current&&tutorScreenFocusedRef.current){
    await discardTranscriptionAudio();
    setSpeechNotice(reason instanceof Error?reason.message:"Could not start voice recording.");
   }
  }finally{
   transcriptionOperationRef.current=false;
   if(operation===transcriptionSequenceRef.current)setTranscriptionBusy(false);
   if(!recordingStarted)await Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true}).catch(()=>undefined);
   // Keep the recording audio session active until stopTranscriptionCapture/discardTranscriptionAudio.
   // If the app backgrounded while native recording creation was pending,
   // discard the capture as soon as the native handle becomes available.
   if((!appIsActiveRef.current||!tutorScreenFocusedRef.current)&&(transcriptionRecordingRef.current||transcriptionUriRef.current)){
    await discardTranscriptionAudio();
   }
  }
 };
 const stopTranscriptionCapture=async()=>{
  const recording=transcriptionRecordingRef.current;
  if(!recording||transcriptionOperationRef.current)return;
  const operation=++transcriptionSequenceRef.current;
  transcriptionOperationRef.current=true;setTranscriptionBusy(true);
  const uri=recording.getURI();
  recording.setOnRecordingStatusUpdate(null);
  try{
   await recording.stopAndUnloadAsync();
   const savedUri=recording.getURI()??uri;
   if(operation!==transcriptionSequenceRef.current||transcriptionRecordingRef.current!==recording){
    if(savedUri)await FileSystem.deleteAsync(savedUri,{idempotent:true}).catch(()=>undefined);
    return;
   }
   transcriptionRecordingRef.current=null;
   if(!savedUri)throw new Error("The recording file was not created.");
   transcriptionUriRef.current=savedUri;
   setTranscriptionRecording(false);
   setSpeechNotice("Recording ready. It has not been uploaded. Choose Review & transcribe when you are ready.");
  }catch(reason){
   if(operation===transcriptionSequenceRef.current&&transcriptionRecordingRef.current===recording){
    transcriptionRecordingRef.current=null;
    const failedUri=recording.getURI()??uri;
    if(failedUri)await FileSystem.deleteAsync(failedUri,{idempotent:true}).catch(()=>undefined);
    setTranscriptionRecording(false);
    setSpeechNotice(reason instanceof Error?reason.message:"Could not finish the recording.");
   }
  }finally{
   await Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true}).catch(()=>undefined);
   if(operation===transcriptionSequenceRef.current){
    transcriptionOperationRef.current=false;setTranscriptionBusy(false);
    // A recording stopped while backgrounded or after navigation is unreviewed local audio.
    if((!appIsActiveRef.current||!tutorScreenFocusedRef.current)&&(transcriptionRecordingRef.current||transcriptionUriRef.current)){
     await discardTranscriptionAudio();
    }
   }
  }
 };
 const reviewAndTranscribe=async()=>{
  const uri=transcriptionUriRef.current;
  if(!uri||!transcriptionConsent||!recognitionStatus?.available||transcriptionBusy||!appIsActiveRef.current||!tutorScreenFocusedRef.current)return;
  const operation=++transcriptionSequenceRef.current;
  transcriptionOperationRef.current=true;
  setTranscriptionBusy(true);setSpeechNotice("");
  try{
   const result=await recognizeGabrooAudio({uri,mimeType:"audio/mp4",language:recognitionLanguage,consentGranted:true});
   if(operation!==transcriptionSequenceRef.current)return;
   if(!appIsActiveRef.current||!tutorScreenFocusedRef.current){
    await discardTranscriptionAudio();
    return;
   }
   setTranscript(result.transcript);setReviewedTranscript(result.transcript.text);
   if(transcriptionUriRef.current===uri){
    transcriptionUriRef.current=null;
    await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
   }
   if(operation===transcriptionSequenceRef.current)setSpeechNotice("Transcript ready. Review or edit it below. Nothing has been sent to Gabroo yet.");
  }catch(reason){
   if(operation!==transcriptionSequenceRef.current)return;
   setSpeechNotice(reason instanceof Error?reason.message:"Could not transcribe this recording. Your audio will be discarded.");
   await discardTranscriptionAudio();
  }finally{
   transcriptionOperationRef.current=false;
   if(operation===transcriptionSequenceRef.current)setTranscriptionBusy(false);
  }
 };
 const sendReviewedTranscript=async()=>{
  if(!active||!transcript||!reviewedTranscript.trim()||busy||sendInFlightRef.current)return;
  sendInFlightRef.current=true;
  setBusy(true);setError("");
  const conversationId=active.id;
  const turnId=`${conversationId}:${++turnSequenceRef.current}`;
  const controller=new AbortController();turnAbortRef.current=controller;
  setTurnState(current=>reduceGabrooTurn(current,{type:"submitted",turn_id:turnId}));
  try{
   await stopSpeech();
   if(controller.signal.aborted||activeConversationIdRef.current!==conversationId)return;
   const confirmed=confirmGabrooTranscript({providerTranscript:transcript,reviewedText:reviewedTranscript,confirmed:true});
   const result=await sendGabrooMessage(conversationId,confirmed.text,controller.signal);
   if(activeConversationIdRef.current!==conversationId)return;
   setMessages(current=>[...current,...result.messages]);
   setTurnState(current=>reduceGabrooTurn(current,{type:"response_received",turn_id:turnId}));
   setTranscript(null);setReviewedTranscript("");setTranscriptionConsent(false);
  }catch(reason){
   if(activeConversationIdRef.current!==conversationId)return;
   setTurnState(current=>reduceGabrooTurn(current,{type:"failed",turn_id:turnId,reason:reason instanceof Error?reason.message:"Could not send the reviewed transcript."}));
   setError(reason instanceof Error?reason.message:"Could not send the reviewed transcript.");
  }finally{
   sendInFlightRef.current=false;
   if(turnAbortRef.current===controller){turnAbortRef.current=null;setBusy(false);}
  }
 };
 const requestVoicePermission=async()=>{
  if(!voiceConsent||voicePermissionBusy)return;
  setVoicePermissionBusy(true);setSpeechNotice("");
  try{
   const baseState=voiceSessionState==="error"||voiceSessionState==="ready"
    ?transitionGabrooVoiceSession(voiceSessionState,{type:"reset"})
    :voiceSessionState;
   const requesting=transitionGabrooVoiceSession(baseState,{type:"start",consentGranted:true});
   setVoiceSessionState(requesting);
   const permission=await Audio.requestPermissionsAsync();
   if(permission.granted){
    setVoiceSessionState(transitionGabrooVoiceSession(requesting,{type:"permission_granted"}));
    setVoicePermissionStatus("granted");
   }else{
    setVoiceSessionState(transitionGabrooVoiceSession(requesting,{type:"permission_denied"}));
    setVoicePermissionStatus("denied");
   }
  }catch(reason){
   setVoiceSessionState("error");
   setSpeechNotice(reason instanceof Error?reason.message:"Could not request microphone permission.");
  }finally{setVoicePermissionBusy(false);}
 };
 const startLocalCapture=async()=>{
  if(!voiceCaptureConsent||voiceSessionState!=="ready"||recordingOperationRef.current||recordingRef.current||transcriptionRecordingRef.current||transcriptionUriRef.current)return;
  recordingOperationRef.current=true;
  setRecordingBusy(true);setSpeechNotice("");
  try{
   await Audio.setAudioModeAsync({allowsRecordingIOS:true,playsInSilentModeIOS:true,shouldDuckAndroid:true});
   const created=await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
   recordingRef.current=created.recording;
   created.recording.setProgressUpdateInterval(250);
   created.recording.setOnRecordingStatusUpdate(status=>{
    if(status.isRecording&&status.durationMillis>=GABROO_LOCAL_CAPTURE_MAX_MS){
     created.recording.setOnRecordingStatusUpdate(null);
     void stopAndDiscardLocalCapture();
    }
   });
   setVoiceSessionState(current=>transitionGabrooVoiceSession(current,{type:"begin_capture"}));
   setRecordingActive(true);
  }catch(reason){
   const recording=recordingRef.current;recordingRef.current=null;
   if(recording){
    try{await recording.stopAndUnloadAsync();const uri=recording.getURI();if(uri)await FileSystem.deleteAsync(uri,{idempotent:true});}catch{}
   }
   setVoiceSessionState("error");
   setSpeechNotice(reason instanceof Error?reason.message:"Could not start the microphone test.");
   await Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true}).catch(()=>undefined);
  }finally{
   recordingOperationRef.current=false;
   setRecordingBusy(false);
   if(!appIsActiveRef.current&&recordingRef.current)void stopAndDiscardLocalCapture();
  }
 };
 const stopAndDiscardLocalCapture=async()=>{
  const recording=recordingRef.current;
  if(!recording||recordingOperationRef.current)return;
  recordingOperationRef.current=true;
  setRecordingBusy(true);setSpeechNotice("");
  const uri=recording.getURI();
  recording.setOnRecordingStatusUpdate(null);
  let deleted=false;
  try{
   await recording.stopAndUnloadAsync();
   recordingRef.current=null;
   setVoiceSessionState(current=>transitionGabrooVoiceSession(current,{type:"capture_stopped"}));
   if(uri){await FileSystem.deleteAsync(uri,{idempotent:true});deleted=true;}
   setVoiceSessionState(current=>transitionGabrooVoiceSession(current,{type:"capture_discarded"}));
   setRecordingActive(false);
   setSpeechNotice("Microphone test completed. The temporary recording was deleted from this device. No audio was uploaded or transcribed.");
  }catch(reason){
   recordingRef.current=null;
   setRecordingActive(false);
   setVoiceSessionState("error");
   setSpeechNotice(reason instanceof Error?reason.message:"Could not safely finish and discard the recording. Please check device storage.");
  }finally{
   if(uri&&!deleted)await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
   await Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true}).catch(()=>undefined);
   recordingOperationRef.current=false;
   setRecordingBusy(false);
  }
 };
 useEffect(()=>{
  const subscription=AppState.addEventListener("change",state=>{
   appIsActiveRef.current=state==="active";
   if(state!=="active"){
    // Do not let device TTS continue after Gabroo leaves the foreground.
    speechRunRef.current+=1;speechRequestAbortRef.current?.abort();speechRequestAbortRef.current=null;speechSegmentResolveRef.current?.();speechSegmentResolveRef.current=null;
    const playback=playbackStateRef.current;
    if(playback.phase==="speaking"&&playback.playback_id){
     playbackStateRef.current=reduceGabrooPlayback(playback,{type:"interrupted",playback_id:playback.playback_id});
    }
    void Speech.stop();
    void releaseSpeechAudio();
    setSpeakingMessageId(null);
    if(recordingRef.current&&!recordingOperationRef.current){
     void stopAndDiscardLocalCapture();
    }
    // Voice-input captures are also temporary: leaving the app must not
    // leave an unreviewed microphone recording on disk.
    if((transcriptionRecordingRef.current||transcriptionUriRef.current)&&!transcriptionOperationRef.current){
     // Also remove a stopped-but-not-yet-uploaded recording, not only an
     // actively recording microphone session.
     void discardTranscriptionAudio();
    }
   }
  });
  return ()=>subscription.remove();
 },[]);
 const resetVoiceConsent=()=>{
  void discardTranscriptionAudio();
  setTranscriptionConsent(false);
  setVoiceConsent(false);
  setVoiceCaptureConsent(false);
  setVoicePermissionStatus("not_requested");
  setVoiceSessionState(current=>current==="ready"||current==="error"||current==="interrupted"
   ?transitionGabrooVoiceSession(current,{type:"reset"})
   :"idle");
  setSpeechNotice("In-app consent cleared. If microphone access was already granted by your device, revoke it in Gabenglish's device permission settings.");
 };
 const toggleVoiceConsent=()=>{
  if(voiceConsent){resetVoiceConsent();return;}
  setVoiceConsent(true);
  setSpeechNotice("");
 };
 const changeSpeechRate=async(delta:number)=>{
  const next=adjustGabrooSpeechRate(speechRate,delta);
  if(next===speechRate||speechSaving)return;
  const previous=speechRate;
  const requestId=++speechPreferenceSequenceRef.current;
  speechRateRef.current=next;setSpeechRate(next);setSpeechNotice("");setSpeechSaving(true);
  // Apply the learner's new rate to speech already in progress, not only the next reply.
  void speechSoundRef.current?.setRateAsync(next,true).catch(()=>undefined);
  try{
   await updateLearnerPreferences({gabroo_speech_rate:next});
   const learner=await getLearnerMe();
   await cacheGabrooSpeechRate(learner.user.id,next);
  }catch(reason){
   if(requestId===speechPreferenceSequenceRef.current){
    speechRateRef.current=previous;setSpeechRate(previous);
    void speechSoundRef.current?.setRateAsync(previous,true).catch(()=>undefined);
    setSpeechNotice(reason instanceof Error?reason.message:"Could not save your speaking speed.");
   }
  }finally{
   if(requestId===speechPreferenceSequenceRef.current)setSpeechSaving(false);
  }
 };
 const remove=async()=>{
  if(!active||busy)return;
  await stopSpeech();
  const conversationId=active.id;
  const requestId=++conversationMutationSequenceRef.current;
  setBusy(true);setError("");
  try{
   await deleteGabrooConversation(conversationId);
   if(requestId!==conversationMutationSequenceRef.current||activeConversationIdRef.current!==conversationId)return;
   activeConversationIdRef.current=null;
   setConversations(current=>current.filter(item=>item.id!==conversationId));setActive(null);setMessages([]);
  }catch(reason){
   if(requestId===conversationMutationSequenceRef.current&&activeConversationIdRef.current===conversationId)setError(reason instanceof Error?reason.message:"Could not delete this conversation.");
  }finally{
   if(requestId===conversationMutationSequenceRef.current)setBusy(false);
  }
 };
 return <SafeAreaView style={s.safe}><StatusBar hidden={darkScreenMode} backgroundColor="#000" barStyle="light-content"/><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <View style={s.top}><Link href="/home" style={s.back}>‹ Learning home</Link><BrandMark size={46}/><Text style={s.brand}>Gabroo</Text><Text style={s.subtitle}>Your everyday English companion</Text></View>
  {loading?<ActivityIndicator size="large" color={colors.primary} style={{marginTop:40}}/>:!subscription?.active?<View style={s.panel}><Text style={s.title}>Your English companion awaits</Text><Text style={s.copy}>Open conversations with Gabroo are included with an active Gabenglish subscription. Your free English analysis remains available in your account.</Text><Link href="/account" style={s.action}>Go to your account</Link></View>:<>
   {!active?<><View style={s.panel}><Text style={s.title}>Talk about anything suitable for practice.</Text><Text style={s.copy}>Work, travel, daily life, hobbies or a topic you are curious about. Choose how much correction you want as we build out the conversation experience.</Text><Text style={s.modeLabel}>Choose your conversation style</Text><View style={s.modeGrid}>{conversationModes.map(item=><Pressable key={item.value} disabled={busy} onPress={()=>setMode(item.value)} style={[s.modeChip,mode===item.value&&s.modeSelected]}><Text style={[s.modeText,mode===item.value&&s.modeTextSelected]}>{item.label}</Text></Pressable>)}</View><Pressable disabled={busy} onPress={start} style={[s.button,busy&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Start a conversation</Text>}</Pressable></View><Text style={s.section}>Your conversations</Text>{conversations.length===0?<Text style={s.empty}>Your saved conversations will appear here.</Text>:conversations.map(item=><Pressable key={item.id} disabled={busy} onPress={()=>openConversation(item)} style={s.listItem}><Text style={s.listTitle}>{item.title??"Conversation"}</Text><Text style={s.listMeta}>{item.turn_count} exchanges · {new Date(item.updated_at).toLocaleDateString()}</Text></Pressable>)}</>:<>
    <View style={s.conversationHeader}><Pressable onPress={()=>{cancelActiveTurn();speechRunRef.current+=1;speechRequestAbortRef.current?.abort();speechRequestAbortRef.current=null;speechSegmentResolveRef.current?.();speechSegmentResolveRef.current=null;void Speech.stop();void releaseSpeechAudio();setSpeakingMessageId(null);setDarkScreenMode(false);conversationOpenSequenceRef.current+=1;conversationMutationSequenceRef.current+=1;activeConversationIdRef.current=null;setActive(null);setMessages([]);setDraft("");setSpeechNotice("");setTurnState(initialGabrooTurnState);}}><Text style={s.back}>‹ All conversations</Text></Pressable><View style={s.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Enable dark screen mode" onPress={()=>{setDarkScreenAudioEnabled(true);setDarkScreenMode(true);}} style={s.darkScreenEntry}><Text style={s.darkScreenEntryText}>Dark screen</Text></Pressable><Pressable onPress={remove} disabled={busy}><Text style={s.delete}>Delete</Text></Pressable></View></View>
    <View style={s.voiceControls}><Text style={s.voiceTitle}>Playback speed · {speechRate.toFixed(2).replace(/0$/,"")}×</Text><Text style={s.captureConsentCopy}>Listen uses the server-configured Gabroo speech provider. The final male Kerala Malayalam voice remains unapproved until the voice audition is completed and you explicitly approve a candidate.</Text><View style={s.voiceSpeedRow}><Pressable accessibilityRole="button" accessibilityLabel="Slow Gabroo speech" disabled={speechRate<=0.75||busy||speechSaving} onPress={()=>void changeSpeechRate(-0.05)} style={s.voiceSpeedButton}><Text style={s.voiceSpeedButtonText}>−</Text></Pressable><Text style={s.voiceSpeedHint}>Applies to the next listen or replay</Text><Pressable accessibilityRole="button" accessibilityLabel="Speed up Gabroo speech" disabled={speechRate>=1.5||busy||speechSaving} onPress={()=>void changeSpeechRate(0.05)} style={s.voiceSpeedButton}><Text style={s.voiceSpeedButtonText}>+</Text></Pressable></View></View><View style={s.recognitionStatusPanel}>
     <Text style={s.captureConsentTitle}>Gabroo voice availability</Text>
     <Text style={s.captureConsentCopy}>{speechStatus===null?"Could not verify Gabroo voice availability. Playback will report an error if the server voice is not configured.":speechStatus.available?"The server speech provider is configured. This does not mean the final Gabroo voice has been approved.":"The server speech provider is not configured yet. No device voice will be substituted."}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Refresh Gabroo voice availability" disabled={speechStatusRefreshing} onPress={()=>void refreshSpeechStatus()} style={s.permissionReset}><Text style={s.permissionResetText}>{speechStatusRefreshing?"Checking voice service…":"Check again"}</Text></Pressable>
    </View><View style={s.voicePermissionPanel}>
     <Text style={s.voiceTitle}>Prepare voice conversations</Text>
     <Text style={s.voicePermissionCopy}>Microphone access is requested only after you agree below. Recording and transcription are separate permissions. Your speech is never uploaded without a separate action.</Text>
     <View style={s.recognitionStatusPanel}><Text style={s.captureConsentTitle}>Voice recognition availability</Text><Text style={s.captureConsentCopy}>{recognitionStatus===null?"Could not verify voice recognition availability. The local microphone test remains available; uploads stay disabled.":recognitionStatus.available?"Speech recognition is available. The learner review step is required before any transcript can be sent to Gabroo.":"Speech recognition provider is not connected yet. Your recordings will remain on this device and cannot be uploaded for transcription."}</Text></View>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:voiceConsent}} onPress={toggleVoiceConsent} style={s.consentRow}>
      <View style={[s.consentBox,voiceConsent&&s.consentBoxChecked]}>{voiceConsent?<Text style={s.consentCheck}>✓</Text>:null}</View>
      <Text style={s.consentText}>I agree to let Gabenglish request microphone permission for a future voice conversation with Gabroo.</Text>
     </Pressable>
     {voicePermissionStatus==="granted"?<Text style={s.permissionGranted}>Microphone permission granted. No recording has started.</Text>:voicePermissionStatus==="denied"?<Text style={s.permissionDenied}>Microphone permission was not granted. You can review it in your device settings.</Text>:null}
     {voicePermissionStatus==="granted"&&recognitionStatus?.available?<View style={s.captureConsentPanel}>
      <Text style={s.captureConsentTitle}>Speak to Gabroo · voice input</Text>
      <Text style={s.captureConsentCopy}>This is separate from the local microphone test. If you agree, a recording of up to 15 seconds is temporarily kept on this device. It is uploaded to the configured speech-recognition provider only when you press Review & transcribe. The returned text is shown for your review and is never sent to Gabroo until you confirm. Provider-side retention is subject to that provider's policy.</Text>
      <Text style={s.captureConsentTitle}>What language will you speak?</Text>
      <View style={s.modeGrid}>
       {[{value:"ml-en" as const,label:"Malayalam + English"},{value:"ml-IN" as const,label:"Malayalam"},{value:"en-IN" as const,label:"English"}].map(item=><Pressable key={item.value} accessibilityRole="radio" accessibilityState={{selected:recognitionLanguage===item.value}} disabled={transcriptionRecording||transcriptionBusy||!!transcript} onPress={()=>setRecognitionLanguage(item.value)} style={[s.modeChip,recognitionLanguage===item.value&&s.modeSelected]}><Text style={[s.modeText,recognitionLanguage===item.value&&s.modeTextSelected]}>{item.label}</Text></Pressable>)}
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:transcriptionConsent}} disabled={transcriptionRecording||transcriptionBusy||!!transcript} onPress={()=>setTranscriptionConsent(value=>!value)} style={s.consentRow}>
       <View style={[s.consentBox,transcriptionConsent&&s.consentBoxChecked]}>{transcriptionConsent?<Text style={s.consentCheck}>✓</Text>:null}</View>
       <Text style={s.consentText}>I consent to send this recording to the speech-recognition provider for transcription, with the transcript shown to me before it is shared with Gabroo.</Text>
      </Pressable>
      {transcriptionRecording?<Text style={s.permissionGranted}>Recording… it will stop automatically after 15 seconds.</Text>:null}
      {transcriptionRecording?<Pressable disabled={transcriptionBusy} onPress={()=>void stopTranscriptionCapture()} style={s.captureButton}><Text style={s.buttonText}>Stop recording</Text></Pressable>:null}
      {!transcriptionRecording&&!transcriptionUriRef.current&&!transcript?<Pressable disabled={!transcriptionConsent||transcriptionBusy} onPress={()=>void startTranscriptionCapture()} style={[s.permissionButton,(!transcriptionConsent||transcriptionBusy)&&s.disabled]}><Text style={s.buttonText}>Start voice recording</Text></Pressable>:null}
      {transcriptionUriRef.current?<><Pressable disabled={transcriptionBusy} onPress={()=>void reviewAndTranscribe()} style={[s.permissionButton,transcriptionBusy&&s.disabled]}><Text style={s.buttonText}>Review & transcribe</Text></Pressable><Pressable disabled={transcriptionBusy} onPress={()=>void discardTranscriptionAudio()} style={s.permissionReset}><Text style={s.permissionResetText}>Discard recording</Text></Pressable></>:null}
      {transcript?<View style={s.captureConsentPanel}>
       <Text style={s.captureConsentTitle}>Review your words</Text>
       <Text style={s.captureConsentCopy}>Recognition language: {transcript.languageDetected==="ml"?"Malayalam":transcript.languageDetected==="en"?"English":transcript.languageDetected==="mixed"?"Malayalam + English":"Not identified"}. Edit anything that was not recognised correctly. Gabroo will receive only the text you confirm below.</Text>
       <TextInput value={reviewedTranscript} onChangeText={setReviewedTranscript} multiline editable={!busy} style={s.input} placeholder="Your recognised words…"/>
       <Pressable disabled={!reviewedTranscript.trim()||busy} onPress={()=>void sendReviewedTranscript()} style={[s.permissionButton,(!reviewedTranscript.trim()||busy)&&s.disabled]}><Text style={s.buttonText}>Confirm & send to Gabroo</Text></Pressable>
       <Pressable disabled={busy} onPress={()=>{setTranscript(null);setReviewedTranscript("");setTranscriptionConsent(false);}} style={s.permissionReset}><Text style={s.permissionResetText}>Discard transcript</Text></Pressable>
      </View>:null}
     </View>:null}
     {voicePermissionStatus==="granted"?<View style={s.captureConsentPanel}>
      <Text style={s.captureConsentTitle}>Optional local microphone test</Text>
      <Text style={s.captureConsentCopy}>This is a separate recording consent. A short temporary recording stays on this device only and is deleted when you stop. It is not uploaded, saved to your account or sent for transcription. This test is not a voice conversation.</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:voiceCaptureConsent}} disabled={recordingActive||recordingBusy} onPress={()=>setVoiceCaptureConsent(value=>!value)} style={s.consentRow}>
       <View style={[s.consentBox,voiceCaptureConsent&&s.consentBoxChecked]}>{voiceCaptureConsent?<Text style={s.consentCheck}>✓</Text>:null}</View>
       <Text style={s.consentText}>I agree to make a temporary local microphone test recording and have it deleted when I stop.</Text>
      </Pressable>
      {recordingActive?<Text style={s.permissionGranted}>Microphone is recording. Select Stop & delete recording when finished.</Text>:null}
      <Pressable disabled={recordingBusy||(!recordingActive&&(!voiceCaptureConsent||voiceSessionState!=="ready"))} onPress={()=>void(recordingActive?stopAndDiscardLocalCapture():startLocalCapture())} style={[s.captureButton,recordingBusy&&s.disabled,recordingActive&&s.captureStopButton]}>
       {recordingBusy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>{recordingActive?"Stop & delete recording":"Start local microphone test"}</Text>}
      </Pressable>
     </View>:null}
     <View style={s.permissionActions}>
      <Pressable disabled={!voiceConsent||voicePermissionBusy||voicePermissionStatus==="granted"} onPress={()=>void requestVoicePermission()} style={[s.permissionButton,(!voiceConsent||voicePermissionBusy||voicePermissionStatus==="granted")&&s.disabled]}>
       {voicePermissionBusy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>{voicePermissionStatus==="denied"?"Try permission again":"Continue to microphone permission"}</Text>}
      </Pressable>
      {voicePermissionStatus!=="not_requested"?<Pressable disabled={recordingActive||recordingBusy} onPress={resetVoiceConsent} style={s.permissionReset}><Text style={s.permissionResetText}>Clear in-app consent</Text></Pressable>:null}
     </View>
    </View>
    <Text style={s.modeLabel}>Conversation style</Text><View style={s.modeGrid}>{conversationModes.map(item=><Pressable key={item.value} disabled={busy} onPress={()=>void changeMode(item.value)} style={[s.modeChip,mode===item.value&&s.modeSelected]}><Text style={[s.modeText,mode===item.value&&s.modeTextSelected]}>{item.label}</Text></Pressable>)}</View>{messages.length===0?<View style={s.emptyPanel}><Text style={s.title}>Hi! I'm Gabroo.</Text><Text style={s.copy}>Let's have a natural conversation. What's on your mind today?</Text></View>:messages.map(message=><View key={message.id} style={[s.bubble,message.role==="user"?s.userBubble:s.gabrooBubble]}><Text style={s.speaker}>{message.role==="user"?"YOU":"GABROO"}</Text><Text style={s.message}>{message.content}</Text>{message.role==="assistant"?<View style={s.replyActions}><Pressable accessibilityRole="button" onPress={()=>void speakMessage(message)} style={s.listenButton}><Text style={s.listenButtonText}>{speakingMessageId===message.id?"Stop speaking":"Listen to Gabroo"}</Text></Pressable><Pressable accessibilityRole="button" disabled={savingPhraseId!==null||savedPhraseIds.includes(message.id)} onPress={()=>void saveReplyAsPhrase(message)} style={[s.savePhraseButton,(savingPhraseId!==null||savedPhraseIds.includes(message.id))&&s.disabled]}><Text style={s.savePhraseText}>{savingPhraseId===message.id?"Saving…":savedPhraseIds.includes(message.id)?"Saved to memory":"Save useful phrase"}</Text></Pressable>{practiceDraft?<Pressable accessibilityRole="button" disabled={savingRevisionId!==null||savedRevisionIds.includes(message.id)} onPress={()=>void saveImprovedSentence(message)} style={[s.savePhraseButton,(savingRevisionId!==null||savedRevisionIds.includes(message.id))&&s.disabled]}><Text style={s.savePhraseText}>{savingRevisionId===message.id?"Saving revision…":savedRevisionIds.includes(message.id)?"Revision saved":"Save improved sentence"}</Text></Pressable>:null}</View>:null}</View>)}
    {turnState.phase==="thinking"?<Text accessibilityLiveRegion="polite" style={s.turnStatus}>Gabroo is thinking…</Text>:null}
    <TextInput value={draft} onChangeText={setDraft} placeholder="Write your message…" multiline style={s.input} editable={!busy}/>
    <Pressable disabled={!draft.trim()||busy} onPress={send} style={[s.button,(!draft.trim()||busy)&&s.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Send message</Text>}</Pressable>
    <Text style={s.hint}>You can ask for gentle corrections, detailed explanations or just a natural chat. Listen uses Gabroo’s configured server voice. The final approved character voice and live voice conversations are still being developed.</Text>{speechNotice?<Text style={s.speechNotice}>{speechNotice}</Text>:null}
   </>}
  </>}
  {!!error&&<View style={s.error}><Text style={s.errorText}>{error}</Text></View>}
 </ScrollView>{darkScreenMode?<View style={s.darkScreenOverlay} accessibilityViewIsModal><Pressable accessibilityRole="button" accessibilityLabel={darkScreenAudioEnabled?"Turn Gabroo audio off":"Turn Gabroo audio on"} accessibilityState={{checked:darkScreenAudioEnabled}} onPress={()=>{if(darkScreenAudioEnabled){setDarkScreenAudioEnabled(false);void stopSpeech();}else{setDarkScreenAudioEnabled(true);}}} style={s.darkScreenAudioButton}><Text style={s.darkScreenAudioIcon}>{darkScreenAudioEnabled?"◖))":"◖×"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Return to normal mode" onPress={()=>{setDarkScreenMode(false);setDarkScreenAudioEnabled(true);}} style={s.darkScreenReturn}><Text style={s.darkScreenReturnText}>Return to normal mode</Text></Pressable></View>:null}</SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:20,paddingBottom:36},top:{alignItems:"center",marginBottom:26},back:{color:colors.primary,fontWeight:"800",fontSize:14,alignSelf:"flex-start"},brand:{fontSize:30,fontWeight:"900",color:colors.text,marginTop:12},subtitle:{color:"#777084",fontSize:13,marginTop:4},panel:{backgroundColor:colors.surfaceSoft,borderRadius:22,padding:22},title:{fontSize:21,fontWeight:"900",color:colors.primaryStrong},copy:{fontSize:14,lineHeight:22,color:"#51476A",marginTop:10},action:{color:colors.primaryStrong,fontWeight:"900",marginTop:20},button:{backgroundColor:colors.primary,borderRadius:14,padding:16,alignItems:"center",marginTop:18},buttonText:{color:"#fff",fontWeight:"900",fontSize:15},disabled:{opacity:.5},section:{fontSize:17,fontWeight:"900",color:"#30254A",marginTop:28,marginBottom:12},modeLabel:{fontSize:12,fontWeight:"900",color:"#51476A",marginTop:18,marginBottom:8},modeGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:4},modeChip:{paddingVertical:9,paddingHorizontal:11,borderRadius:18,borderWidth:1,borderColor:"#D9CBEA",backgroundColor:"#fff"},modeSelected:{backgroundColor:colors.primary,borderColor:colors.primary},modeText:{fontSize:11,fontWeight:"700",color:"#51476A"},modeTextSelected:{color:"#fff"},empty:{color:"#777084",fontSize:13,paddingVertical:16},listItem:{backgroundColor:"#fff",borderColor:"#E8DFEF",borderWidth:1,borderRadius:14,padding:15,marginBottom:9},listTitle:{color:"#30254A",fontWeight:"800"},listMeta:{color:"#82798E",fontSize:12,marginTop:5},conversationHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},headerActions:{flexDirection:"row",alignItems:"center",gap:16},darkScreenEntry:{backgroundColor:"#171327",paddingVertical:8,paddingHorizontal:12,borderRadius:10},darkScreenEntryText:{color:"#fff",fontSize:12,fontWeight:"800"},darkScreenOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:"#000",zIndex:1000,alignItems:"center",justifyContent:"center"},darkScreenAudioButton:{width:76,height:76,borderRadius:38,borderWidth:1,borderColor:"#303030",backgroundColor:"#101010",alignItems:"center",justifyContent:"center"},darkScreenAudioIcon:{color:"#fff",fontSize:27,fontWeight:"700"},darkScreenReturn:{position:"absolute",bottom:34,left:24,right:24,minHeight:54,borderRadius:14,borderWidth:1,borderColor:"#343434",backgroundColor:"#111",alignItems:"center",justifyContent:"center"},darkScreenReturnText:{color:"#fff",fontSize:15,fontWeight:"700"},voiceControls:{backgroundColor:"#F7F2FF",borderRadius:14,padding:12,marginBottom:14},voicePermissionPanel:{backgroundColor:"#F1F8F5",borderWidth:1,borderColor:"#D7E9DE",borderRadius:16,padding:14,marginBottom:16},voicePermissionCopy:{fontSize:12,lineHeight:18,color:"#52665A",marginTop:7},consentRow:{flexDirection:"row",alignItems:"flex-start",gap:10,marginTop:12},consentBox:{width:22,height:22,borderWidth:1.5,borderColor:"#81988A",borderRadius:6,alignItems:"center",justifyContent:"center",backgroundColor:"#fff"},consentBoxChecked:{backgroundColor:"#28734A",borderColor:"#28734A"},consentCheck:{color:"#fff",fontWeight:"900"},consentText:{flex:1,fontSize:12,lineHeight:18,color:"#334B3B"},permissionActions:{marginTop:12},permissionButton:{backgroundColor:"#28734A",borderRadius:11,padding:12,alignItems:"center"},permissionGranted:{color:"#246B43",fontSize:12,fontWeight:"800",marginTop:10},permissionDenied:{color:"#9A4B1B",fontSize:12,fontWeight:"800",marginTop:10},permissionReset:{alignSelf:"flex-start",paddingVertical:10},permissionResetText:{color:"#5D6D63",fontWeight:"800",fontSize:12},recognitionStatusPanel:{backgroundColor:"#FFF",borderRadius:12,padding:12,marginTop:12,borderWidth:1,borderColor:"#D7E9DE"},captureConsentPanel:{backgroundColor:"#FFF",borderRadius:12,padding:12,marginTop:14,borderWidth:1,borderColor:"#D7E9DE"},captureConsentTitle:{fontSize:12,fontWeight:"900",color:"#246B43"},captureConsentCopy:{fontSize:11,lineHeight:17,color:"#52665A",marginTop:6},captureButton:{backgroundColor:"#28734A",borderRadius:11,padding:12,alignItems:"center",marginTop:12},captureStopButton:{backgroundColor:"#B42318"},voiceTitle:{fontSize:12,fontWeight:"900",color:colors.primaryStrong},turnStatus:{fontSize:12,fontWeight:"800",color:colors.primaryStrong,marginTop:14},voiceSpeedRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:8},voiceSpeedButton:{width:34,height:34,borderRadius:10,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center"},voiceSpeedButtonText:{fontSize:22,color:"#fff",fontWeight:"800"},voiceSpeedHint:{fontSize:10,color:"#70677B",flex:1,textAlign:"center"},replyActions:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:8,marginTop:8},savePhraseButton:{backgroundColor:"#E9E1F5",borderRadius:10,paddingVertical:8,paddingHorizontal:10},savePhraseText:{fontSize:10,fontWeight:"900",color:colors.primaryStrong},listenButton:{alignSelf:"flex-start",marginTop:10,backgroundColor:"#F0E8FA",paddingVertical:7,paddingHorizontal:10,borderRadius:10},listenButtonText:{fontSize:11,fontWeight:"800",color:colors.primaryStrong},speechNotice:{fontSize:11,color:"#8A3B12",marginTop:10,lineHeight:17},delete:{color:"#B42318",fontWeight:"800"},bubble:{padding:15,borderRadius:17,marginBottom:12,maxWidth:"92%"},userBubble:{backgroundColor:"#E7DDF8",alignSelf:"flex-end"},gabrooBubble:{backgroundColor:"#fff",alignSelf:"flex-start",borderWidth:1,borderColor:"#EEE7F4"},speaker:{fontSize:9,fontWeight:"900",letterSpacing:1,color:"#7C55A6",marginBottom:6},message:{fontSize:15,lineHeight:22,color:"#30254A"},input:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,fontSize:15,color:colors.text,minHeight:88,textAlignVertical:"top",marginTop:16},hint:{fontSize:11,lineHeight:17,color:"#777084",marginTop:12},emptyPanel:{backgroundColor:colors.surfaceSoft,padding:22,borderRadius:18},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12,marginTop:18},errorText:{color:"#9F2D24",fontSize:13,lineHeight:19}
});
