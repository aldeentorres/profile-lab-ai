import assert from "node:assert/strict";
import test from "node:test";

import {applyPhotoDecision} from "../app/photo-decision.ts";

const goodSignals={minimumDimension:1600,resolutionScore:100,sharpnessScore:88,faceCount:1,faceClearance:.08,faceHeight:.2,selfieProbability:.05,lightingScore:86,backgroundQuality:88,designerUsability:92};
const decide=(overrides={},baseScore=92)=>applyPhotoDecision(baseScore,{...goodSignals,...overrides});

test("approves a high-quality portrait regardless of formal or casual pose",()=>{
 const result=decide();
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,92);
 assert.equal(result.penalties.length,0);
 assert.ok(result.requirements.every(requirement=>requirement.status==="PASS"));
});

test("caps an otherwise excellent obvious selfie at 45",()=>{
 const result=decide({selfieProbability:.86},96);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,45);
 assert.equal(result.penalties.find(penalty=>penalty.id==="obvious_selfie")?.cap,45);
});

test("caps severe blur at 40",()=>{
 const result=decide({sharpnessScore:24},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,40);
});

test("caps a severely cropped face at 50",()=>{
 const result=decide({faceClearance:0},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,50);
});

test("caps very low resolution at 50",()=>{
 const result=decide({minimumDimension:480,resolutionScore:40},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,50);
});

test("caps severe exposure at 55",()=>{
 const result=decide({lightingScore:20},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,55);
});

test("deducts likely selfie points and forces review",()=>{
 const result=decide({selfieProbability:.62},90);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,65);
});

test("moderate face crop cannot be approved",()=>{
 const result=decide({faceClearance:.015},95);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,60);
});
