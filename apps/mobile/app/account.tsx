import {useEffect,useState} from "react";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,getLearnerMe,loginLearner,logoutLearner,registerLearner,type LearnerMe} from "../src/auth-api";

export default function AccountScreen(){
 const [mode,setMode]=useState<"login"|"register">("login");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [displayName,setDisplayName]=useState("");
 const [account,setAccount]=useState<LearnerMe|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  getLearnerMe().then(value=>{if(active)setAccount(value);}).catch(reason=>{
   if(active&&(!(reason instanceof AuthApiError)||reason.status!==401))setError(reason instanceof Error?reason.message:"Could not load your account.");
  });
  return()=>{active=false;};
 },[]);
 const submit=async()=>{
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   if(mode==="register"){
    const result=await registerLearner({email:email.trim(),password,...(displayName.trim()?{display_name:displayName.trim()}:{})});
    setNotice(result.email_verified?"Your account is ready.":"Your account is created, but email verification is not available yet. Do not use this unverified email for recovery.");
   }else{
    const result=await loginLearner({email:email.trim(),password});
    setNotice(result.email_verified?"Welcome back!":"Signed in. Email verification is not yet enabled for Gabenglish.");
   }
   setAccount(await getLearnerMe());setPassword("");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not complete account request.");}
  finally{setBusy(false);}
 };
 const signOut=async()=>{
  setBusy(true);setError("");setNotice("");
  try{await logoutLearner();setAccount(null);setNotice("You have been signed out.");}
  catch(reason){setError(reason instanceof Error?reason.message:"Could not sign out.");}
  finally{setBusy(false);}
 };
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <View style={s.header}><View style={s.logo}><Text style={s.logoText}>G</Text></View><Text style={s.brand}>Your Gabenglish account</Text><Text style={s.subtitle}>Save your learning preferences and keep your account secure.</Text></View>
  {account?<View style={s.card}>
   <Text style={s.eyebrow}>SIGNED IN</Text><Text style={s.name}>{account.user.display_name||"Learner"}</Text><Text style={s.email}>{account.user.email}</Text>
   <View style={[s.status,account.user.email_verified?s.verified:s.unverified]}><Text style={s.statusText}>{account.user.email_verified?"Email verified":"Email not verified"}</Text></View>
   <Text style={s.section}>Learning preferences</Text>
   <Text style={s.info}>Support language: {account.preferences?.support_language==="ml"?"Malayalam":"English"}</Text>
   <Text style={s.info}>Daily target: {account.preferences?.daily_target_minutes??10} minutes</Text>
   <Text style={s.info}>Correction style: {account.preferences?.correction_mode??"balanced"}</Text>
   <Pressable disabled={busy} style={[s.button,s.secondary]} onPress={signOut}>{busy?<ActivityIndicator color="#54239A"/>:<Text style={s.secondaryText}>Sign out</Text>}</Pressable>
  </View>:<View style={s.card}>
   <View style={s.switchRow}>
    <Pressable onPress={()=>{setMode("login");setError("");setNotice("");}} style={[s.switch,mode==="login"&&s.switchActive]}><Text style={[s.switchText,mode==="login"&&s.switchTextActive]}>Sign in</Text></Pressable>
    <Pressable onPress={()=>{setMode("register");setError("");setNotice("");}} style={[s.switch,mode==="register"&&s.switchActive]}><Text style={[s.switchText,mode==="register"&&s.switchTextActive]}>Create account</Text></Pressable>
   </View>
   {mode==="register"&&<><Text style={s.label}>Your name (optional)</Text><TextInput value={displayName} onChangeText={setDisplayName} placeholder="How should Gabroo address you?" style={s.input} editable={!busy}/></>}
   <Text style={s.label}>Email</Text><TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={s.input} editable={!busy}/>
   <Text style={s.label}>Password</Text><TextInput value={password} onChangeText={setPassword} placeholder={mode==="register"?"At least 10 characters":"Your password"} secureTextEntry autoCapitalize="none" style={s.input} editable={!busy}/>
   <Pressable disabled={busy||!email.trim()||!password} style={[s.button,(busy||!email.trim()||!password)&&s.disabled]} onPress={submit}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>{mode==="register"?"Create my account":"Sign in"}</Text>}</Pressable>
   {mode==="register"&&<Text style={s.disclaimer}>Use an email you control. Email verification and password recovery are not available yet; this account foundation is still under development.</Text>}
  </View>}
  {notice? <View style={s.notice}><Text style={s.noticeText}>{notice}</Text></View>:null}
  {error?<View style={s.error}><Text style={s.errorText}>{error}</Text></View>:null}
  <Link href="/" asChild><Pressable style={s.back}><Text style={s.backText}>← Back to Gabroo</Text></Pressable></Link>
  <Text style={s.footer}>Your learning journey, at your pace.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#FFF7EC"},page:{flexGrow:1,padding:22,paddingBottom:36},
 header:{alignItems:"center",marginBottom:24},logo:{width:46,height:46,borderRadius:15,backgroundColor:"#6A2BBF",alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontSize:29,fontWeight:"900"},brand:{marginTop:10,color:"#1F1B4D",fontSize:22,fontWeight:"900"},subtitle:{fontSize:13,lineHeight:20,color:"#6B6278",textAlign:"center",marginTop:7},
 card:{backgroundColor:"#fff",borderRadius:20,padding:18,borderWidth:1,borderColor:"#EAE2F0"},switchRow:{flexDirection:"row",backgroundColor:"#F3EFF8",padding:4,borderRadius:12},switch:{flex:1,padding:11,alignItems:"center",borderRadius:9},switchActive:{backgroundColor:"#fff"},switchText:{fontSize:13,fontWeight:"800",color:"#81788C"},switchTextActive:{color:"#54239A"},
 label:{fontSize:13,fontWeight:"800",color:"#403A50",marginTop:17,marginBottom:7},input:{backgroundColor:"#FFFEFC",borderWidth:1,borderColor:"#E3DCEA",borderRadius:13,padding:13,fontSize:15,color:"#1F1B4D"},
 button:{backgroundColor:"#6A2BBF",borderRadius:14,padding:15,alignItems:"center",marginTop:20},buttonText:{color:"#fff",fontSize:14,fontWeight:"900"},disabled:{opacity:.45},secondary:{backgroundColor:"#EEE4FF"},secondaryText:{color:"#54239A",fontWeight:"900"},
 eyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.4,color:"#8A6AB6"},name:{fontSize:22,fontWeight:"900",color:"#1F1B4D",marginTop:8},email:{fontSize:13,color:"#70677B",marginTop:4},status:{alignSelf:"flex-start",borderRadius:20,paddingVertical:6,paddingHorizontal:10,marginTop:14},verified:{backgroundColor:"#E5F5E9"},unverified:{backgroundColor:"#FFF1D8"},statusText:{fontSize:11,fontWeight:"800",color:"#594C38"},
 section:{fontSize:14,fontWeight:"900",color:"#403A50",marginTop:22,marginBottom:8},info:{fontSize:13,color:"#625A6D",marginTop:6},disclaimer:{fontSize:11,lineHeight:17,color:"#8A8293",marginTop:14},notice:{backgroundColor:"#E8F5EA",padding:13,borderRadius:12,marginTop:14},noticeText:{fontSize:12,lineHeight:18,color:"#365B3A"},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12,marginTop:14},errorText:{fontSize:12,lineHeight:18,color:"#8D302A"},back:{alignSelf:"center",padding:14,marginTop:12},backText:{color:"#54239A",fontSize:13,fontWeight:"800"},footer:{textAlign:"center",color:"#938A9D",fontSize:11,marginTop:12}
});
