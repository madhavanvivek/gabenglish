import {Link} from "expo-router";
import {StyleSheet,Text,View} from "react-native";
import {BrandMark} from "../src/ui";
import {colors} from "../src/theme";
export default function NotFound(){return <View style={s.wrap}><BrandMark size={52}/><Text style={s.title}>Page not found</Text><Text style={s.copy}>This page may have moved. Your learning journey is still here.</Text><Link href="/" style={s.link}>Go to Gabenglish home</Link></View>}
const s=StyleSheet.create({wrap:{flex:1,alignItems:"center",justifyContent:"center",padding:28,backgroundColor:colors.background},title:{fontSize:22,fontWeight:"800",color:colors.text,marginTop:18},copy:{fontSize:14,lineHeight:21,color:colors.textMuted,textAlign:"center",marginTop:8},link:{marginTop:20,color:colors.primary,fontWeight:"800"}});
