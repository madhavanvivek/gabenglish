import {z} from "zod";

/**
 * Provider-neutral animation contract for the one approved Concept C Gabroo
 * rig. These are rig controls, not character variants or generated avatars.
 */
export const gabrooVisemeShapeSchema=z.enum([
 "neutral",
 "closed_lips",
 "lip_teeth",
 "tongue_teeth",
 "open_wide",
 "open_mid",
 "open_round",
 "narrow_round",
 "spread"
]);
export type GabrooVisemeShape=z.infer<typeof gabrooVisemeShapeSchema>;

export const gabrooExpressionSchema=z.enum([
 "neutral",
 "warm_smile",
 "encouraging",
 "playful",
 "thinking",
 "surprised",
 "concerned",
 "laughing"
]);
export type GabrooExpression=z.infer<typeof gabrooExpressionSchema>;

export const gabrooGestureSchema=z.enum([
 "small_wave",
 "gentle_nod",
 "head_tilt",
 "open_palm",
 "thumbs_up",
 "subtle_shrug"
]);
export type GabrooGesture=z.infer<typeof gabrooGestureSchema>;

export const gabrooAvatarStateSchema=z.enum([
 "idle",
 "greeting",
 "listening",
 "thinking",
 "speaking",
 "interrupted",
 "recovering"
]);
export type GabrooAvatarState=z.infer<typeof gabrooAvatarStateSchema>;

const timedEvent=z.object({
 start_ms:z.number().finite().nonnegative(),
 end_ms:z.number().finite().positive(),
 weight:z.number().min(0).max(1).default(1)
}).refine(event=>event.end_ms>event.start_ms,{message:"Animation event end_ms must be after start_ms."});

export const gabrooVisemeEventSchema=timedEvent.extend({
 shape:gabrooVisemeShapeSchema
});
export const gabrooExpressionEventSchema=timedEvent.extend({
 expression:gabrooExpressionSchema
});
export const gabrooGestureEventSchema=timedEvent.extend({
 gesture:gabrooGestureSchema
});

export const gabrooSpeechTimelineSchema=z.object({
 audio_id:z.string().trim().min(1).max(160),
 duration_ms:z.number().finite().positive(),
 visemes:z.array(gabrooVisemeEventSchema).default([]),
 expressions:z.array(gabrooExpressionEventSchema).default([]),
 gestures:z.array(gabrooGestureEventSchema).default([])
}).superRefine((timeline,ctx)=>{
 for(const [collection,events] of [
  ["visemes",timeline.visemes],
  ["expressions",timeline.expressions],
  ["gestures",timeline.gestures]
 ] as const){
  events.forEach((event,index)=>{
   if(event.end_ms>timeline.duration_ms){
    ctx.addIssue({
     code:z.ZodIssueCode.custom,
     path:[collection,index,"end_ms"],
     message:"Animation events must end within the audio timeline."
    });
   }
  });
});
export type GabrooSpeechTimeline=z.infer<typeof gabrooSpeechTimelineSchema>;

export interface GabrooAvatarFrame {
 viseme:{shape:GabrooVisemeShape;weight:number};
 expression:GabrooExpression;
 expressionWeight:number;
 gesture:GabrooGesture|null;
 gestureWeight:number;
}

/** Smooth event envelope used to avoid snapping mouth/expression controls. */
function eventWeight(start:number,end:number,weight:number,at:number,fadeMs:number):number{
 if(at<start||at>=end)return 0;
 const fade=Math.min(fadeMs,(end-start)/2);
 if(fade<=0)return weight;
 const fadeIn=Math.min(1,(at-start)/fade);
 const fadeOut=Math.min(1,(end-at)/fade);
 return weight*Math.min(fadeIn,fadeOut);
}

/**
 * Sample the canonical Gabroo rig controls at the current audio playback time.
 * Silence resolves to a neutral mouth; no synthetic open/close talking loop.
 */
export function sampleGabrooAvatarFrame(
 timeline:GabrooSpeechTimeline,
 playbackMs:number,
 fadeMs=45
):GabrooAvatarFrame{
 if(!Number.isFinite(playbackMs)||!Number.isFinite(fadeMs)||fadeMs<0){
  throw new Error("Playback time and fade duration must be finite; fade duration cannot be negative.");
 }
 const at=Math.max(0,Math.min(playbackMs,timeline.duration_ms));
 const viseme=timeline.visemes
  .map(event=>({shape:event.shape,weight:eventWeight(event.start_ms,event.end_ms,event.weight,at,fadeMs)}))
  .filter(event=>event.weight>0)
  .sort((a,b)=>b.weight-a.weight)[0];
 const expression=timeline.expressions
  .map(event=>({expression:event.expression,weight:eventWeight(event.start_ms,event.end_ms,event.weight,at,fadeMs)}))
  .filter(event=>event.weight>0)
  .sort((a,b)=>b.weight-a.weight)[0];
 const gesture=timeline.gestures
  .map(event=>({gesture:event.gesture,weight:eventWeight(event.start_ms,event.end_ms,event.weight,at,fadeMs)}))
  .filter(event=>event.weight>0)
  .sort((a,b)=>b.weight-a.weight)[0];
 return {
  viseme:viseme?{shape:viseme.shape,weight:viseme.weight}:{shape:"neutral",weight:0},
  expression:expression?.expression??"neutral",
  expressionWeight:expression?.weight??0,
  gesture:gesture?.gesture??null,
  gestureWeight:gesture?.weight??0
 };
}
