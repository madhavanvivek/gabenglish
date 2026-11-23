import {describe,it,expect} from "vitest";
import {GabrooSpeechQuotaExceededError,reserveGabrooSpeechUsage} from "./gabroo-speech-usage.js";

function quotaPool(){
 const used={day:0,month:0};let snapshot={day:0,month:0};
 const client={
  query:async(sql:string,values?:unknown[])=>{
   if(sql==="BEGIN"){snapshot={...used};return {rowCount:0,rows:[]};}
   if(sql==="COMMIT"||sql.includes("pg_advisory_xact_lock"))return {rowCount:0,rows:[]};
   if(sql==="ROLLBACK"){used.day=snapshot.day;used.month=snapshot.month;return {rowCount:0,rows:[]};}
   if(sql.includes("INSERT INTO gabroo_speech_usage_buckets")){
    const period=sql.includes(",'day',")?"day":"month";
    const amount=Number(values?.[1]);const limit=Number(values?.[2]);
    if(used[period]+amount>limit)return {rowCount:0,rows:[]};
    used[period]+=amount;return {rowCount:1,rows:[{characters_used:used[period]}]};
   }
   throw new Error("Unexpected SQL in quota test: "+sql);
  },release:()=>{}
 };
 return {pool:{connect:async()=>client} as any,used};
}

describe("Gabroo durable speech usage reservations",()=>{
 it("reserves characters in both daily and monthly buckets",async()=>{
  const {pool,used}=quotaPool();
  await reserveGabrooSpeechUsage({pool,userId:"learner-1",characters:120,dailyLimit:500,monthlyLimit:2_000});
  expect(used).toEqual({day:120,month:120});
 });
 it("rejects a daily overage without reserving monthly usage",async()=>{
  const {pool,used}=quotaPool();
  await expect(reserveGabrooSpeechUsage({pool,userId:"learner-1",characters:120,dailyLimit:100,monthlyLimit:2_000})).rejects.toBeInstanceOf(GabrooSpeechQuotaExceededError);
  expect(used).toEqual({day:0,month:0});
 });
 it("rolls back the daily reservation when the monthly limit is reached",async()=>{
  const {pool,used}=quotaPool();
  await expect(reserveGabrooSpeechUsage({pool,userId:"learner-1",characters:120,dailyLimit:500,monthlyLimit:100})).rejects.toMatchObject({period:"month"});
  expect(used).toEqual({day:0,month:0});
 });
 it("rejects invalid or over-request reservations before opening a transaction",async()=>{
  let connections=0;const pool={connect:async()=>{connections++;throw new Error("must not connect");}} as any;
  await expect(reserveGabrooSpeechUsage({pool,userId:"learner-1",characters:4_001,dailyLimit:10_000,monthlyLimit:100_000})).rejects.toThrow(/Invalid Gabroo speech character/);
  await expect(reserveGabrooSpeechUsage({pool,userId:"learner-1",characters:101,dailyLimit:100,monthlyLimit:100_000})).rejects.toMatchObject({period:"day"});
  expect(connections).toBe(0);
 });
});
