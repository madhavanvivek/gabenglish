import type {GabrooNativeAudioCaptureOptions,GabrooNativeAudioStream} from "./gabroo-native-audio-capture";

/** Structural subset of expo-audio's AudioStream class, kept dependency-free for SDK 53 CI. */
export type ExpoAudioStreamPort={
 start:()=>Promise<void>;
 stop:()=>void|Promise<void>;
 isStreaming?:boolean;
};

export type ExpoAudioPcmBuffer={
 data:ArrayBuffer;
 encoding:"float32"|"int16";
 sampleRate:number;
 channels:number;
 timestamp?:number;
};

export type GabrooCaptureControllerPort={
 attachStream:(stream:GabrooNativeAudioStream)=>void;
 onBuffer:(buffer:ExpoAudioPcmBuffer)=>void;
};

/**
 * Bind Expo AudioStream's native stream object and onBuffer callback to the
 * tested foreground capture controller. The caller supplies the result of
 * useAudioStream({channels:1, encoding:"float32", sampleRate:48000, onBuffer}).
 *
 * The actual sample rate/channels from every native callback are preserved;
 * the PCM normalizer, not the requested stream configuration, decides the
 * exact wire format.
 */
export function attachGabrooExpoAudioStream(input:{
 stream:ExpoAudioStreamPort;
 controller:GabrooCaptureControllerPort;
 requestedSampleRate?:number;
 requestedChannels?:number;
}){
 const nativeStream:GabrooNativeAudioStream={
  start:()=>input.stream.start(),
  stop:()=>input.stream.stop(),
  sampleRate:input.requestedSampleRate??48_000,
  channels:input.requestedChannels??1,
  get isStreaming(){return input.stream.isStreaming??false;}
 };
 input.controller.attachStream(nativeStream);
 return {
  onBuffer:(buffer:ExpoAudioPcmBuffer)=>input.controller.onBuffer({
   data:buffer.data,
   encoding:buffer.encoding,
   sampleRate:buffer.sampleRate,
   channels:buffer.channels
  })
 };
}
