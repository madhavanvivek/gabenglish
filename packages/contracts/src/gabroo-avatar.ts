import {z} from "zod";

/**
 * Provider-neutral animation contract for the one approved Concept C Gabroo
 * rig. These are rig controls, not character variants or generated avatars.
 */
export const gabrooVisemeShapeSchema=z.enum([
 "neutral","closed_lips","lip_teeth","tongue_teeth","open_wide",
 "open_mid","open_round","narrow_round","spread"
]);
export type GabrooVisemeShape=z.infer<typeof gabrooVisemeShapeSchema>;

export const gabrooExpressionSchema=z.enum([
 "neutral","warm_smile","encouraging","playful","thinking",
 "surprised","concerned","laughing"
]);
export type GabrooExpression=z.infer<typeof gabrooExpressionSchema>;

export const gabrooGestureSchema=z.enum([
 "small_wave","gentle_nod","head_tilt","open_palm","thumbs_up","subtle_shrug"
]);
export type GabrooGesture=z.infer<typeof gabrooGestureSchema>;

export const gabrooAvatarStateSchema=z.enum([
 "idle","greeting","listening","thinking","speaking","interrupted","recovering"
]);
export type GabrooAvatarState=z.infer<typeof gabrooAvatarStateSchema>;

const timedEventBase=z.object({
 start_ms:z.number().finite().nonnegative(),
 end_ms:z.number().finite().positive(),
 weight:z.number().min(0).max(1).default(1)
});
const timedEvent=(event: z.infer<typeof timedEventBase>)=>event.end_ms>event.start_ms;

export const gabrooVisemeEventSchema=timedEventBase.extend({
 shape:gabrooVisemeShapeSchema
}).refine(timedEvent,{message:"Animation event end_ms must be after start_ms."});
export const gabrooExpressionEventSchema=timedEventBase.extend({
 expression:gabrooExpressionSchema
}).refine(timedEvent,{message:"Animation event end_ms must be after start_ms."});
export const gabrooGestureEventSchema=timedEventBase.extend({
 gesture:gabrooGestureSchema
}).refine(timedEvent,{message:"Animation event end_ms must be after start_ms."});

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
 }
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

/** Select the strongest active cue in one pass; called on every render tick. */
function strongestEvent<T extends {start_ms:number;end_ms:number;weight:number}>(
 events:readonly T[],
 at:number,
 fadeMs:number
):{event:T;weight:number}|undefined{
 let selected:T|undefined;
 let selectedWeight=0;
 for(const event of events){
  const weight=eventWeight(event.start_ms,event.end_ms,event.weight,at,fadeMs);
  // Strict comparison preserves the earlier authored cue on exact ties.
  if(weight>selectedWeight){selected=event;selectedWeight=weight;}
 }
 return selected?{event:selected,weight:selectedWeight}:undefined;
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
 const viseme=strongestEvent(timeline.visemes,at,fadeMs);
 const expression=strongestEvent(timeline.expressions,at,fadeMs);
 const gesture=strongestEvent(timeline.gestures,at,fadeMs);
 return {
  viseme:viseme?{shape:viseme.event.shape,weight:viseme.weight}:{shape:"neutral",weight:0},
  expression:expression?.event.expression??"neutral",
  expressionWeight:expression?.weight??0,
  gesture:gesture?.event.gesture??null,
  gestureWeight:gesture?.weight??0
 };
}


/**
 * Adapter boundary for native player status (for example Expo AV's
 * positionMillis/isPlaying). Avatar motion follows the player's real clock;
 * paused, stopped, buffering, or completed audio never gets a synthetic
 * talking pose.
 */
export function sampleGabrooAvatarFrameFromPlaybackStatus(
 timeline:GabrooSpeechTimeline,
 status:{positionMillis:number;isPlaying:boolean},
 fadeMs=45
):GabrooAvatarFrame{
 if(!Number.isFinite(status.positionMillis)||status.positionMillis<0){
  throw new Error("Audio playback position must be a finite, non-negative value.");
 }
 if(typeof status.isPlaying!=="boolean"){
  throw new Error("Audio playback status must include a playing state.");
 }
 if(!status.isPlaying){
  return {
   viseme:{shape:"neutral",weight:0},
   expression:"neutral",
   expressionWeight:0,
   gesture:null,
   gestureWeight:0
  };
 }
 return sampleGabrooAvatarFrame(timeline,status.positionMillis,fadeMs);
}
