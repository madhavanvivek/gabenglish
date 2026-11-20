import {describe,expect,it,vi} from "vitest";
import {createGabrooRealtimeTurnCoordinator} from "./gabroo-realtime-turn";

const audio={codec:"pcm_s16le" as const,sample_rate_hz:16000 as const,channels:1 as const};

function setup(drained=true){
 const calls:string[]=[];
 const sender={enqueue:vi.fn(async()=>{}),close:vi.fn((reason?:string)=>calls.push("sender.close:"+reason)),finish:vi.fn(async()=>{})};
 const capture={start:vi.fn(async()=>({sampleRate:48_000,channels:1})),stop:vi.fn(async()=>{calls.push("capture.stop");return {drained};})};
 const connection={
  startTurn:vi.fn(()=>calls.push("turn.start")),
  endTurn:vi.fn(()=>calls.push("turn.end")),
  interrupt:vi.fn(()=>calls.push("turn.interrupt")),
  createAudioSender:vi.fn(()=>sender)
 };
 const coordinator=createGabrooRealtimeTurnCoordinator({connection,createCapture:()=>capture});
 return {coordinator,calls,sender,capture,connection};
}

describe("Gabroo realtime turn coordinator",()=>{
 it("starts a consented capture and ends the server turn only after a successful drain",async()=>{
  const x=setup();
  await x.coordinator.start("turn-1",audio);
  expect(x.coordinator.state).toBe("capturing");
  expect(x.calls).toEqual(["turn.start"]);
  await expect(x.coordinator.stop()).resolves.toEqual({completed:true,reason:"audio_drained"});
  expect(x.calls).toEqual(["turn.start","capture.stop","turn.end"]);
  expect(x.coordinator.state).toBe("idle");
 });

 it("never sends turn.end when native capture reports a failed audio drain",async()=>{
  const x=setup(false);
  await x.coordinator.start("turn-2",audio);
  await expect(x.coordinator.stop()).resolves.toEqual({completed:false,reason:"audio_drain_failed"});
  expect(x.connection.endTurn).not.toHaveBeenCalled();
  expect(x.connection.interrupt).toHaveBeenCalledWith("turn-2");
  expect(x.coordinator.state).toBe("idle");
 });

 it("interrupts and closes the sender when capture startup fails",async()=>{
  const x=setup();
  x.capture.start.mockRejectedValueOnce(new Error("permission denied"));
  await expect(x.coordinator.start("turn-3",audio)).rejects.toThrow("permission denied");
  expect(x.sender.close).toHaveBeenCalledWith("capture_start_failed");
  expect(x.connection.interrupt).toHaveBeenCalledWith("turn-3");
  expect(x.coordinator.state).toBe("idle");
 });

 it("prevents overlapping turns",async()=>{
  const x=setup();
  await x.coordinator.start("turn-4",audio);
  await expect(x.coordinator.start("turn-5",audio)).rejects.toThrow(/current Gabroo voice turn/);
  await x.coordinator.stop();
 });

 it("interrupts an active turn without sending turn.end",async()=>{
  const x=setup();
  await x.coordinator.start("turn-6",audio);
  x.coordinator.interrupt();
  expect(x.connection.interrupt).toHaveBeenCalledWith("turn-6");
  expect(x.connection.endTurn).not.toHaveBeenCalled();
  expect(x.sender.close).toHaveBeenCalledWith("learner_interrupt");
  expect(x.coordinator.state).toBe("idle");
 });
});
