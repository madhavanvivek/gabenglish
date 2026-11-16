import {useEffect,useState} from "react";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {Link} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {AuthApiError,getLearnerMe,logoutLearner,requestLearnerOtp,verifyLearnerOtp,type LearnerMe,type OtpChallenge} from "../src/auth-api";

export default function AccountScreen(){
 const [channel,setChannel]=useState<"email"|"phone">("email");
 const [destination,setDestination]=useState("");
 const [code,setCode]=useState("");
 const [challenge,setChallenge]=useState<OtpChallenge|null>(null);
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
  if(busy||!challenge||!/^\\d{6}$/.test(code.trim()))return;
  setBusy(true);setError("");setNotice("");
  try{
   await verifyLearnerOtp({challenge_id:challenge.challenge_id,code:code.trim()});
   setAccount(await getLearnerMe());setChallenge(null);setCode("");
   setNotice("Your verified Gabenglish account is ready. Your free analysis can now be saved.");
  }catch(reason){setError(reason instanceof Error?reason.message:"Could not verify the code.");}
  finally{setBusy(false);}
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
   {challenge?<><Text style={s.label}>6-digit verification code</Text><TextInput value={code} onChangeText={value=>setCode(value.replace(/\\D/g,"").slice(0,6))} placeholder="Enter the code" keyboardType="number-pad" maxLength={6} style={s.input} editable={!busy}/><Pressable disabled={busy||code.trim().length!==6} style={[s.button,(busy||code.trim().length!==6)&&s.disabled]} onPress={verifyCode}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Verify and continue</Text>}</Pressable><Pressable disabled={busy} onPress={()=>{setChallenge(null);setCode("");setNotice("");}} style={s.change}><Text style={s.changeText}>Change contact or request a new code</Text></Pressable></>:<Pressable disabled={busy||!destination.trim()} style={[s.button,(busy||!destination.trim())&&s.disabled]} onPress={requestCode}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Send verification code</Text>}</Pressable>}
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
 section:{fontSize:14,fontWeight:"900",color:"#403A50",marginTop:22,marginBottom:8},info:{fontSize:13,color:"#625A6D",marginTop:6},disclaimer:{fontSize:11,lineHeight:17,color:"#8A8293",marginTop:14},notice:{backgroundColor:"#E8F5EA",padding:13,borderRadius:12,marginTop:14},noticeText:{fontSize:12,lineHeight:18,color:"#365B3A"},error:{backgroundColor:"#FCE8E6",padding:13,borderRadius:12,marginTop:14},errorText:{fontSize:12,lineHeight:18,color:"#8D302A"},back:{alignSelf:"center",padding:14,marginTop:12},backText:{color:"#54239A",fontSize:13,fontWeight:"800"},change:{alignSelf:"center",padding:12,marginTop:5},changeText:{fontSize:12,fontWeight:"800",color:"#54239A"},footer:{textAlign:"center",color:"#938A9D",fontSize:11,marginTop:12}
});
