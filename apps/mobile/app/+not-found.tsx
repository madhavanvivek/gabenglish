import {Link} from "expo-router";
import {StyleSheet,Text,View} from "react-native";
export default function NotFound(){return <View style={s.wrap}><Text style={s.title}>Page not found</Text><Link href="/" style={s.link}>Go to Gabenglish home</Link></View>}
const s=StyleSheet.create({wrap:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#FFF7EC"},title:{fontSize:22,fontWeight:"700",color:"#1F1B4D"},link:{marginTop:16,color:"#6A2BBF"}});
