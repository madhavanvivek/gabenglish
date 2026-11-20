export type GabrooSpeechStatus={available:boolean;formats:string[];speed:{minimum:number;maximum:number}};

/** Validate the provider contract before the mobile UI trusts readiness or playback limits. */
export function parseGabrooSpeechStatus(payload:unknown):GabrooSpeechStatus{
 if(typeof payload!=="object"||payload===null||!("available" in payload)||typeof payload.available!=="boolean"||!("formats" in payload)||!Array.isArray(payload.formats)||!payload.formats.every((format)=>typeof format==="string"&&format.trim().length>0)||!("speed" in payload)||typeof payload.speed!=="object"||payload.speed===null||!("minimum" in payload.speed)||!("maximum" in payload.speed)||typeof payload.speed.minimum!=="number"||!Number.isFinite(payload.speed.minimum)||typeof payload.speed.maximum!=="number"||!Number.isFinite(payload.speed.maximum)||payload.speed.minimum<0.75||payload.speed.maximum>1.5||payload.speed.minimum>payload.speed.maximum||(payload.available&&payload.formats.length===0)||(!payload.available&&payload.formats.length>0)){
  throw new Error("Gabroo speech availability returned an invalid response.");
 }
 return {available:payload.available,formats:[...payload.formats],speed:{minimum:payload.speed.minimum,maximum:payload.speed.maximum}};
}
