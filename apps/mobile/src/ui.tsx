import {ActivityIndicator,Pressable,StyleSheet,Text,View} from "react-native";
import type {ReactNode} from "react";
import {colors,radius,space,typeScale} from "./theme";

export function BrandMark({size=48}:{size?:number}){
 return <View style={[s.mark,{width:size,height:size,borderRadius:size*.32}]}>
  <Text style={[s.markText,{fontSize:size*.58}]}>G</Text>
 </View>;
}
export function PrimaryButton({label,onPress,loading=false,disabled=false}:{label:string;onPress:()=>void;loading?:boolean;disabled?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:disabled||loading,busy:loading}} disabled={disabled||loading} onPress={onPress} style={({pressed})=>[s.button,(disabled||loading)&&s.disabled,pressed&&s.pressed]}>
  {loading?<ActivityIndicator color="#FFFFFF"/>:<Text style={s.buttonText}>{label}</Text>}
 </Pressable>;
}
export function SurfaceCard({children,soft=false}:{children:ReactNode;soft?:boolean}){
 return <View style={[s.card,soft&&s.cardSoft]}>{children}</View>;
}
export function Eyebrow({children}:{children:string}){
 return <Text style={s.eyebrow}>{children.toUpperCase()}</Text>;
}
const s=StyleSheet.create({
 mark:{alignItems:"center",justifyContent:"center",backgroundColor:colors.primary,elevation:5,shadowColor:colors.primary,shadowOpacity:.2,shadowRadius:12,shadowOffset:{width:0,height:5}},
 markText:{color:"#fff",fontWeight:"900",includeFontPadding:false},
 button:{minHeight:52,alignItems:"center",justifyContent:"center",paddingHorizontal:space.xl,borderRadius:radius.md,backgroundColor:colors.primary},
 buttonText:{color:"#fff",fontSize:typeScale.body,fontWeight:"800"},
 disabled:{opacity:.48},pressed:{transform:[{scale:.99}]},
 card:{backgroundColor:colors.surface,borderRadius:radius.lg,padding:space.xl,borderWidth:1,borderColor:colors.border},
 cardSoft:{backgroundColor:colors.surfaceSoft,borderColor:"#E5D6FA"},
 eyebrow:{fontSize:typeScale.caption,fontWeight:"900",letterSpacing:1.4,color:colors.secondary},
});
