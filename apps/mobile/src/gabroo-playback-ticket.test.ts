import {describe,expect,it} from "vitest";
import {parseGabrooPlaybackTicket} from "./gabroo-playback-ticket";

const now=Date.parse("2026-11-25T12:00:00.000Z");
const valid={playback_url:"/api/v1/gabroo/speech/playback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",method:"GET",expires_at:"2026-11-25T12:01:00.000Z"};

describe("Gabroo playback ticket parser",()=>{
 it("extracts a stable per-asset ID from a valid short-lived relative ticket",()=>{
  expect(parseGabrooPlaybackTicket(valid,now)).toEqual({
   url:valid.playback_url,audioId:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",expiresAt:"2026-11-25T12:01:00.000Z"
  });
 });
 it.each([
  null,
  {},
  {...valid,method:"POST"},
  {...valid,playback_url:"https://attacker.example/api/v1/gabroo/speech/playback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
  {...valid,playback_url:"//attacker.example/api/v1/gabroo/speech/playback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
  {...valid,playback_url:"/api/v1/gabroo/speech/playback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?next=https://attacker.example"},
  {...valid,playback_url:"/api/v1/gabroo/speech/playback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#fragment"},
  {...valid,playback_url:"/api/v1/gabroo/speech/playback/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},
  {...valid,playback_url:"/api/v1/gabroo/speech/playback/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
  {...valid,expires_at:"not-a-date"},
  {...valid,expires_at:"2026-11-25T12:00:00.000Z"},
  {...valid,expires_at:42},
 ])("rejects malformed, unsafe or expired ticket: %j",(payload)=>{
  expect(()=>parseGabrooPlaybackTicket(payload,now)).toThrow();
 });
 it("rejects a ticket that expires exactly at the validation instant",()=>{
  expect(()=>parseGabrooPlaybackTicket({...valid,expires_at:new Date(now).toISOString()},now)).toThrow("expired playback ticket");
 });
});
