const MPEG1_LAYER3_BITRATES=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0];
const MPEG2_LAYER3_BITRATES=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0];
const BASE_SAMPLE_RATES=[44_100,48_000,32_000];

/** Read the declared ID3v2 tag length, rejecting malformed synchsafe sizes. */
function audioFrameStart(audio:Uint8Array):number{
 if(audio.length<3||audio[0]!==0x49||audio[1]!==0x44||audio[2]!==0x33)return 0;
 if(audio.length<10)throw new Error("Gabroo MP3 contains a truncated ID3v2 header.");
 const sizeBytes=audio.subarray(6,10);
 if(sizeBytes.some(value=>(value&0x80)!==0))throw new Error("Gabroo MP3 contains an invalid ID3v2 size.");
 const size=(sizeBytes[0]!<<21)|(sizeBytes[1]!<<14)|(sizeBytes[2]!<<7)|sizeBytes[3]!;
 const footer=(audio[3]!>=4&&(audio[5]!&0x10)!==0)?10:0;
 const start=10+size+footer;
 if(start>audio.length)throw new Error("Gabroo MP3 contains a truncated ID3v2 tag.");
 return start;
}

type FrameHeader={frameLength:number;samples:number;sampleRate:number};
function readFrameHeader(audio:Uint8Array,offset:number):FrameHeader|undefined{
 if(offset+4>audio.length)return undefined;
 const b0=audio[offset]!,b1=audio[offset+1]!,b2=audio[offset+2]!;
 if(b0!==0xff||(b1&0xe0)!==0xe0)return undefined;
 const version=(b1>>3)&0x03,layer=(b1>>1)&0x03;
 if(version===1||layer!==1)return undefined; // MPEG audio Layer III only.
 const bitrateIndex=(b2>>4)&0x0f,sampleIndex=(b2>>2)&0x03;
 if(bitrateIndex===0||bitrateIndex===15||sampleIndex===3)return undefined;
 const baseRate=BASE_SAMPLE_RATES[sampleIndex]!;
 const sampleRate=version===3?baseRate:version===2?baseRate/2:baseRate/4;
 const bitrate=(version===3?MPEG1_LAYER3_BITRATES:MPEG2_LAYER3_BITRATES)[bitrateIndex]!*1000;
 const samples=version===3?1152:576;
 const padding=(b2>>1)&1;
 const frameLength=Math.floor((version===3?144:72)*bitrate/sampleRate)+padding;
 if(frameLength<4||offset+frameLength>audio.length)return undefined;
 return {frameLength,samples,sampleRate};
}

/**
 * Measure MP3 duration by walking MPEG Layer III frame headers. Supports
 * variable bit-rate frames and MPEG-1/2/2.5; does not estimate from file size.
 * Rejects truncated, mixed-sample-rate and non-MP3 payloads.
 */
export function measureGabrooMp3DurationMs(audio:Uint8Array):number{
 if(!(audio instanceof Uint8Array)||audio.length===0)throw new Error("Gabroo MP3 duration requires non-empty audio bytes.");
 const start=audioFrameStart(audio);
 let offset=start,frames=0,totalSamples=0,sampleRate:number|undefined;
 while(offset+4<=audio.length){
  if(audio.length-offset>=128&&audio[offset]===0x54&&audio[offset+1]===0x41&&audio[offset+2]===0x47)break; // ID3v1 footer
  const header=readFrameHeader(audio,offset);
  if(!header)break;
  if(sampleRate!==undefined&&header.sampleRate!==sampleRate)throw new Error("Gabroo MP3 changes sample rate between frames.");
  sampleRate=header.sampleRate;
  totalSamples+=header.samples;
  frames+=1;
  offset+=header.frameLength;
 }
 const trailing=audio.length-offset;
 const hasId3v1=trailing===128&&audio[offset]===0x54&&audio[offset+1]===0x41&&audio[offset+2]===0x47;
 if(frames===0||(!hasId3v1&&trailing!==0))throw new Error("Gabroo audio is not a complete, valid MP3 frame stream.");
 const durationMs=Math.round(totalSamples/sampleRate!*1000);
 if(!Number.isSafeInteger(durationMs)||durationMs<=0||durationMs>10*60*1000)throw new Error("Gabroo MP3 duration must be positive and no longer than ten minutes.");
 return durationMs;
}
