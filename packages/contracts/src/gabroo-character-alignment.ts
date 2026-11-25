import {z} from "zod";

/**
 * Character/substring timing is a caption-highlighting contract only.
 * It must never be passed to the phoneme-to-viseme adapter.
 *
 * Offsets are Unicode code-point indices into the exact source text, not
 * UTF-16 code units or UTF-8 byte offsets. Timestamps must be provider supplied.
 */
export const gabrooCharacterTimingEventSchema=z.object({
 start_index:z.number().int().nonnegative(),
 end_index:z.number().int().positive(),
 start_ms:z.number().finite().nonnegative(),
 end_ms:z.number().finite().positive()
}).strict().refine(event=>event.end_index>event.start_index,{message:"Character end_index must be after start_index."})
 .refine(event=>event.end_ms>event.start_ms,{message:"Character end_ms must be after start_ms."});

export const gabrooCharacterAlignmentSchema=z.object({
 audio_id:z.string().trim().min(1).max(160),
 /** SHA-256 of the exact audio bytes used to measure these timestamps. */
 audio_sha256:z.string().regex(/^[a-f0-9]{64}$/i),
 /** SHA-256 of the exact UTF-8 source text that was synthesized. */
 text_sha256:z.string().regex(/^[a-f0-9]{64}$/i),
 /** Unicode code-point count of the exact source text. */
 text_length:z.number().int().nonnegative().max(4000),
 duration_ms:z.number().finite().positive().max(10*60*1000),
 characters:z.array(gabrooCharacterTimingEventSchema).max(8192)
}).strict().superRefine((alignment,ctx)=>{
 alignment.characters.forEach((event,index)=>{
  if(event.end_index>alignment.text_length){
   ctx.addIssue({code:"custom",path:["characters",index,"end_index"],message:"Character offsets must remain within the source text."});
  }
  if(event.end_ms>alignment.duration_ms){
   ctx.addIssue({code:"custom",path:["characters",index,"end_ms"],message:"Character events must end within the audio timeline."});
  }
  if(index>0){
   const previous=alignment.characters[index-1];
   if(event.start_index<previous.start_index){
    ctx.addIssue({code:"custom",path:["characters",index,"start_index"],message:"Character events must be ordered by source-text position."});
   }
   if(event.start_ms<previous.start_ms){
    ctx.addIssue({code:"custom",path:["characters",index,"start_ms"],message:"Character events must be ordered by audio time."});
   }
  }
 });
});

export type GabrooCharacterAlignment=z.infer<typeof gabrooCharacterAlignmentSchema>;

export interface GabrooCharacterAlignmentIdentity {
 audioId:string;
 audioSha256:string;
 textSha256:string;
 durationMs:number;
}

export interface GabrooCaptionCue {
 text:string;
 start_index:number;
 end_index:number;
 start_ms:number;
 end_ms:number;
}

/** Match the exact audio asset and exact source text before exposing captions. */
export function isGabrooCharacterAlignmentForContent(
 alignment:GabrooCharacterAlignment,
 identity:GabrooCharacterAlignmentIdentity,
 text:string
):boolean{
 const parsed=gabrooCharacterAlignmentSchema.safeParse(alignment);
 if(!parsed.success)return false;
 const codePoints=Array.from(text);
 return parsed.data.audio_id===identity.audioId
  &&parsed.data.audio_sha256.toLowerCase()===identity.audioSha256.toLowerCase()
  &&parsed.data.text_sha256.toLowerCase()===identity.textSha256.toLowerCase()
  &&parsed.data.text_length===codePoints.length
  &&Math.abs(parsed.data.duration_ms-identity.durationMs)<=1;
}

/**
 * Build text-highlight cues from genuine character timestamps. No visemes or
 * mouth poses are emitted: character alignment is not phoneme alignment.
 */
export function gabrooCharacterAlignmentToCaptionCues(
 input:GabrooCharacterAlignment,
 identity:GabrooCharacterAlignmentIdentity,
 text:string
):GabrooCaptionCue[]{
 if(!isGabrooCharacterAlignmentForContent(input,identity,text)){
  throw new Error("Gabroo character alignment does not match the active audio and source text.");
 }
 const codePoints=Array.from(text);
 return input.characters.map(event=>({
  text:codePoints.slice(event.start_index,event.end_index).join(""),
  start_index:event.start_index,
  end_index:event.end_index,
  start_ms:event.start_ms,
  end_ms:event.end_ms
 }));
}
