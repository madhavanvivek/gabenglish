export type GabrooAudioResponseMetadata={
 audioId:string;
 audioSha256:string;
 textSha256:string;
 durationMs:number;
};

/** Parse metadata emitted only by a provider that measured the exact buffered MP3. */
export function parseGabrooAudioResponseMetadata(headers:Pick<Headers,"get">):GabrooAudioResponseMetadata|null{
 const audioId=headers.get("x-gabroo-audio-id");
 const audioSha256=headers.get("x-gabroo-audio-sha256");
 const textSha256=headers.get("x-gabroo-text-sha256");
 const durationValue=headers.get("x-gabroo-audio-duration-ms");
 const values=[audioId,audioSha256,textSha256,durationValue];
 if(values.every(value=>value===null))return null;
 if(values.some(value=>value===null))throw new Error("Gabroo returned incomplete audio alignment metadata.");
 if(!/^[a-f0-9]{64}$/.test(audioId!)||audioId!==audioSha256)throw new Error("Gabroo returned an invalid audio content identity.");
 if(!/^[a-f0-9]{64}$/.test(textSha256!))throw new Error("Gabroo returned an invalid source text fingerprint.");
 if(!/^\\d+$/.test(durationValue!))throw new Error("Gabroo returned an invalid measured audio duration.");
 const durationMs=Number(durationValue);
 if(!Number.isSafeInteger(durationMs)||durationMs<=0||durationMs>10*60*1000)throw new Error("Gabroo returned an out-of-range measured audio duration.");
 return {audioId:audioId!,audioSha256:audioSha256!,textSha256:textSha256!,durationMs};
}
