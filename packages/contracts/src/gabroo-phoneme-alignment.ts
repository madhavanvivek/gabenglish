import {z} from "zod";
import {gabrooSpeechTimelineSchema,type GabrooSpeechTimeline,type GabrooVisemeShape} from "./gabroo-avatar.js";

/**
 * Provider-supplied phoneme alignment. Times must come from the audio
 * provider/aligner; this contract deliberately does not estimate them from text.
 */
export const gabrooPhonemeEventSchema=z.object({
 phoneme:z.string().trim().min(1).max(16),
 start_ms:z.number().finite().nonnegative(),
 end_ms:z.number().finite().positive()
}).strict().refine(event=>event.end_ms>event.start_ms,{message:"Phoneme end_ms must be after start_ms."});

export const gabrooPhonemeAlignmentSchema=z.object({
 audio_id:z.string().trim().min(1).max(160),
 /** SHA-256 of the exact audio bytes this alignment was measured against. */
 audio_sha256:z.string().regex(/^[a-f0-9]{64}$/i),
 duration_ms:z.number().finite().positive().max(10*60*1000),
 phonemes:z.array(gabrooPhonemeEventSchema).max(4096)
}).strict().superRefine((alignment,ctx)=>{
 alignment.phonemes.forEach((event,index)=>{
  if(event.end_ms>alignment.duration_ms){
   ctx.addIssue({code:"custom",path:["phonemes",index,"end_ms"],message:"Phoneme events must end within the audio timeline."});
  }
  if(index>0&&event.start_ms<alignment.phonemes[index-1].start_ms){
   ctx.addIssue({code:"custom",path:["phonemes",index,"start_ms"],message:"Phoneme events must be ordered by start time."});
  }
 });
});
export type GabrooPhonemeAlignment=z.infer<typeof gabrooPhonemeAlignmentSchema>;

export interface GabrooAudioAlignmentIdentity {
 audioId:string;
 audioSha256:string;
 durationMs:number;
}

/** Fail closed when an alignment belongs to different audio bytes or duration. */
export function isGabrooPhonemeAlignmentForAudio(
 alignment:GabrooPhonemeAlignment,
 audio:GabrooAudioAlignmentIdentity
):boolean{
 const parsed=gabrooPhonemeAlignmentSchema.safeParse(alignment);
 if(!parsed.success)return false;
 return parsed.data.audio_id===audio.audioId
  &&parsed.data.audio_sha256.toLowerCase()===audio.audioSha256.toLowerCase()
  &&Math.abs(parsed.data.duration_ms-audio.durationMs)<=1;
}

const visemeByPhoneme:Readonly<Record<string,GabrooVisemeShape>>={
 // Bilabial closure
 p:"closed_lips",b:"closed_lips",m:"closed_lips",pʰ:"closed_lips",bʱ:"closed_lips",
 // Labiodental contact
 f:"lip_teeth",v:"lip_teeth",
 // Dental fricatives and common dental stops
 "θ":"tongue_teeth","ð":"tongue_teeth","t̪":"tongue_teeth","d̪":"tongue_teeth",
 // Open vowels
 a:"open_wide","ɑ":"open_wide","æ":"open_wide","ɐ":"open_wide",
 // Mid vowels
 e:"open_mid","ɛ":"open_mid","ə":"open_mid","ɜ":"open_mid","ʌ":"open_mid",
 // Rounded vowels
 o:"open_round","ɔ":"open_round","u":"open_round","ʊ":"open_round","ɒ":"open_round",
 // Close/front vowels and palatal glide
 i:"spread","ɪ":"spread","j":"spread",
 // Close rounded vowels and labial-velar glide
 y:"narrow_round","ʉ":"narrow_round","ʊ̈":"narrow_round","w":"narrow_round"
};

/** Map a single IPA phoneme to the closest available canonical rig viseme. */
export function gabrooPhonemeToViseme(phoneme:string):GabrooVisemeShape{
 const normalized=phoneme.normalize("NFC").trim().toLocaleLowerCase();
 return visemeByPhoneme[normalized]??"neutral";
}

/**
 * Convert real phoneme timestamps into the renderer-neutral viseme timeline.
 * No audio timing is fabricated; unknown phonemes remain neutral rather than
 * being guessed. Expression and gesture tracks are intentionally left empty.
 */
export function gabrooPhonemeAlignmentToTimeline(input:GabrooPhonemeAlignment):GabrooSpeechTimeline{
 const alignment=gabrooPhonemeAlignmentSchema.parse(input);
 return gabrooSpeechTimelineSchema.parse({
  audio_id:alignment.audio_id,
  duration_ms:alignment.duration_ms,
  visemes:alignment.phonemes.map(event=>({
   shape:gabrooPhonemeToViseme(event.phoneme),
   start_ms:event.start_ms,
   end_ms:event.end_ms,
   weight:1
  })),
  expressions:[],
  gestures:[]
 });
}

/** Convert only after proving the alignment belongs to the exact playback asset. */
export function gabrooPhonemeAlignmentToTimelineForAudio(
 input:GabrooPhonemeAlignment,
 audio:GabrooAudioAlignmentIdentity
):GabrooSpeechTimeline{
 if(!isGabrooPhonemeAlignmentForAudio(input,audio)){
  throw new Error("Gabroo phoneme alignment does not match the active audio asset.");
 }
 return gabrooPhonemeAlignmentToTimeline(input);
}
