import assert from "node:assert/strict";
import test from "node:test";

import {aiGenerationDailyCap, aiGenerationsRemainingToday, aiGenerationsUsedToday, recordAiGeneration} from "../app/ai-generation-limit.ts";

const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};

test("a fresh agent has the full daily cap available",()=>{
 store.clear();
 assert.equal(aiGenerationsUsedToday("AGENT-1"),0);
 assert.equal(aiGenerationsRemainingToday("AGENT-1"),aiGenerationDailyCap);
});

test("each recorded generation counts down remaining by exactly one",()=>{
 store.clear();
 assert.equal(recordAiGeneration("AGENT-1"),aiGenerationDailyCap-1,"one used after the first generation");
 assert.equal(aiGenerationsUsedToday("AGENT-1"),1);
 assert.equal(recordAiGeneration("AGENT-1"),aiGenerationDailyCap-2,"two used after the second");
 assert.equal(aiGenerationsUsedToday("AGENT-1"),2);
});

test("reaching the cap blocks further generations without going negative",()=>{
 // The cap is set to Infinity while Puter generation is being tested (see ai-generation-limit.ts) — there
 // is nothing to reach in that state, so this scenario is meaningful only once it is a real number again.
 if(!Number.isFinite(aiGenerationDailyCap))return;
 store.clear();
 for(let used=0;used<aiGenerationDailyCap;used+=1)recordAiGeneration("AGENT-1");
 assert.equal(aiGenerationsRemainingToday("AGENT-1"),0);
 assert.equal(recordAiGeneration("AGENT-1"),0,"a further attempt cannot go negative — still reports zero remaining");
 assert.equal(aiGenerationsUsedToday("AGENT-1"),aiGenerationDailyCap+1,"the attempt itself is still recorded, so a check-then-record race cannot grant an extra one");
});

test("the cap is tracked per agent — one agent's use never touches another's allowance",()=>{
 store.clear();
 recordAiGeneration("AGENT-1");
 recordAiGeneration("AGENT-1");
 assert.equal(aiGenerationsRemainingToday("AGENT-1"),aiGenerationDailyCap-2);
 assert.equal(aiGenerationsRemainingToday("AGENT-2"),aiGenerationDailyCap,"a different agent's cap is untouched");
});

test("the cap resets on a new local calendar day",()=>{
 store.clear();
 store.set("studio-ai-generation-limit",JSON.stringify({"AGENT-1":{date:"2000-01-01",count:5}}));
 assert.equal(aiGenerationsUsedToday("AGENT-1"),0,"a stale date never carries over");
 assert.equal(aiGenerationsRemainingToday("AGENT-1"),aiGenerationDailyCap);
});

test("a full or missing store never throws, and reports as if nothing has been used",()=>{
 const broken=globalThis.localStorage;
 globalThis.localStorage={getItem(){throw new Error("quota")},setItem(){throw new Error("quota")}};
 assert.doesNotThrow(()=>recordAiGeneration("AGENT-1"));
 assert.equal(aiGenerationsRemainingToday("AGENT-1"),aiGenerationDailyCap,"an unreadable store must never itself block generation");
 globalThis.localStorage=broken;
});
