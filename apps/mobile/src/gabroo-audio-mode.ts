export type GabrooAudioModeQueue = {
 enqueue<T>(operation:()=>Promise<T>):Promise<T>;
};

/**
 * Expo AV audio mode is process-wide. Keep transitions FIFO so a delayed
 * playback/recording request cannot overtake a later mode change. A rejected
 * transition is returned to its caller but does not poison the remaining queue.
 */
export function createGabrooAudioModeQueue():GabrooAudioModeQueue{
 let tail:Promise<void>=Promise.resolve();
 return {
  enqueue<T>(operation:()=>Promise<T>):Promise<T>{
   const result=tail.then(operation,operation);
   tail=result.then(()=>undefined,()=>undefined);
   return result;
  }
 };
}
