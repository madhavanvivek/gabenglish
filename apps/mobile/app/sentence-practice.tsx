import {useMemo,useState} from "react";
import {Link} from "expo-router";
import {Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {BrandMark,Eyebrow,SurfaceCard} from "../src/ui";
import {colors,radius,space} from "../src/theme";
import {evaluateSentencePracticeAnswer,listSentencePracticeExercises} from "../src/sentence-practice";

export default function SentencePracticeScreen(){
 const exercises=useMemo(()=>listSentencePracticeExercises(),[]);
 const [index,setIndex]=useState(0);
 const [selected,setSelected]=useState<string|null>(null);
 const [answers,setAnswers]=useState<Record<string,boolean>>({});
 const [complete,setComplete]=useState(false);
 const current=exercises[index];
 const result=selected&&current?evaluateSentencePracticeAnswer(current.id,selected):null;
 const score=Object.values(answers).filter(Boolean).length;
 function choose(optionId:string){if(selected||!current)return;const evaluation=evaluateSentencePracticeAnswer(current.id,optionId);if(!evaluation)return;setSelected(optionId);setAnswers(value=>({...value,[current.id]:evaluation.correct}));}
 function next(){if(index===exercises.length-1){setComplete(true);return;}setIndex(value=>value+1);setSelected(null);}
 function restart(){setIndex(0);setSelected(null);setAnswers({});setComplete(false);}
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Link href="/learn" style={s.back}>‹ Learning path</Link>
  <View style={s.header}><BrandMark size={42}/><Eyebrow>BUILD YOUR ENGLISH</Eyebrow><Text style={s.title}>Sentence builder</Text><Text style={s.subtitle}>One small pattern at a time, with Malayalam support.</Text></View>
  {complete?<SurfaceCard soft><Eyebrow>PRACTICE COMPLETE</Eyebrow><Text style={s.completeTitle}>You finished this round.</Text><Text style={s.score}>{score} / {exercises.length}</Text><Text style={s.body}>This is only your result for this practice set—not an English level or proficiency score. Review the explanations and try again whenever you like.</Text><Pressable accessibilityRole="button" onPress={restart} style={s.primary}><Text style={s.primaryText}>Practise again</Text></Pressable><Link href="/gabroo" style={s.talkLink}>Try these patterns in a conversation with Gabroo →</Link></SurfaceCard>:current?<>
   <View style={s.progressRow}><Text style={s.progressText}>Exercise {index+1} of {exercises.length}</Text><Text style={s.progressText}>{score} correct so far</Text></View><View style={s.track}><View style={[s.fill,{width:`${((index+1)/exercises.length)*100}%`}]} /></View>
   <SurfaceCard><Eyebrow>{current.category.replaceAll("_"," ").toUpperCase()}</Eyebrow><Text style={s.cardTitle}>{current.title}</Text><Text style={s.instruction}>{current.instruction}</Text><Text style={s.prompt}>{current.prompt}</Text>
    <View style={s.options}>{current.options.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:selected===option.id,disabled:Boolean(selected)}} disabled={Boolean(selected)} onPress={()=>choose(option.id)} style={[s.option,selected===option.id&&s.optionSelected,result?.correct&&selected===option.id&&s.optionCorrect,result&&!result.correct&&selected===option.id&&s.optionWrong]}><Text style={s.optionText}>{option.text}</Text>{selected===option.id?<Text style={s.optionMark}>{result?.correct?"✓":"↻"}</Text>:null}</Pressable>)}</View>
    {result?<View style={s.feedback}><Text style={result.correct?s.correct:s.tryAgain}>{result.correct?"Good choice!":"Not quite — review the pattern."}</Text><Text style={s.explanation}>{result.explanationEn}</Text><Text style={s.malayalam}>മലയാളത്തിൽ: {result.explanationMl}</Text><Text style={s.body}>Your original choice is kept as a practice attempt on this screen only. It is not saved to your account.</Text><Pressable accessibilityRole="button" onPress={next} style={s.primary}><Text style={s.primaryText}>{index===exercises.length-1?"See my practice summary":"Next exercise →"}</Text></Pressable></View>:null}
   </SurfaceCard>
  </>:null}
  <View style={s.bottom}><Text style={s.bottomText}>Want to use these patterns in a real conversation?</Text><Link href="/gabroo" style={s.talkLink}>Talk to Gabroo →</Link></View>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,padding:space.xl,paddingBottom:36,gap:space.lg},back:{color:colors.primary,fontSize:13,fontWeight:"900"},header:{alignItems:"center",gap:6},title:{fontSize:26,fontWeight:"900",color:colors.primaryStrong},subtitle:{fontSize:12,color:colors.textMuted,textAlign:"center"},progressRow:{flexDirection:"row",justifyContent:"space-between"},progressText:{fontSize:11,fontWeight:"800",color:colors.textMuted},track:{height:8,borderRadius:8,backgroundColor:colors.border,overflow:"hidden"},fill:{height:8,backgroundColor:colors.primary},cardTitle:{fontSize:19,fontWeight:"900",color:colors.text,marginTop:8},instruction:{fontSize:12,lineHeight:18,color:colors.textMuted,marginTop:8},prompt:{fontSize:20,fontWeight:"900",lineHeight:29,color:colors.primaryStrong,marginTop:18,marginBottom:8},options:{gap:9,marginTop:12},option:{flexDirection:"row",alignItems:"center",padding:14,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,gap:10},optionSelected:{borderColor:colors.primary,backgroundColor:"#F5EFFF"},optionCorrect:{borderColor:colors.success,backgroundColor:"#EAF7F0"},optionWrong:{borderColor:colors.warning,backgroundColor:"#FFF5E5"},optionText:{flex:1,fontSize:14,lineHeight:21,fontWeight:"700",color:colors.text},optionMark:{fontSize:17,fontWeight:"900",color:colors.primary},feedback:{marginTop:17,paddingTop:14,borderTopWidth:1,borderTopColor:colors.border,gap:9},correct:{fontSize:15,fontWeight:"900",color:colors.success},tryAgain:{fontSize:15,fontWeight:"900",color:colors.warning},explanation:{fontSize:13,lineHeight:20,color:colors.text},malayalam:{fontSize:13,lineHeight:22,color:colors.primaryStrong},body:{fontSize:11,lineHeight:17,color:colors.textMuted},primary:{marginTop:7,backgroundColor:colors.primary,borderRadius:radius.md,padding:14,alignItems:"center"},primaryText:{fontSize:13,fontWeight:"900",color:"#FFFFFF"},completeTitle:{fontSize:20,fontWeight:"900",color:colors.primaryStrong,marginTop:10},score:{fontSize:38,fontWeight:"900",color:colors.primary,marginTop:12},bottom:{alignItems:"center",gap:7,paddingVertical:8},bottomText:{fontSize:11,color:colors.textMuted},talkLink:{fontSize:12,fontWeight:"900",color:colors.primary,marginTop:8}
});
