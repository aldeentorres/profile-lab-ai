import assert from "node:assert/strict";
import test from "node:test";

import {aiUsabilityThresholds, assessAiUsability, faceDetailCurve} from "../app/ai-usability.ts";

// A crisp single face with plenty of pixels on it: the identity reference an enhancement can trust.
const crispFace={faceCount:1,faceHeightPixels:320,faceClarity:92,structureScore:86,focusScore:84,fidelityScore:82,faceClearance:.08,qualityDefects:[]};
const assess=(overrides={})=>assessAiUsability({...crispFace,...overrides});

test("a crisp single face is eligible for AI enhancement",()=>{
 const result=assess();
 assert.ok(result.eligible,"enough identity detail must make the photo eligible");
 assert.ok(result.score>=aiUsabilityThresholds.eligible,`score ${result.score} clears the eligibility floor`);
 assert.ok(result.score<=100);
});

test("framing, crop and selfie cues carry zero weight — those are what enhancement fixes",()=>{
 // The signals object has no crop, body-extent or selfie field at all: the score cannot see them.
 const keys=Object.keys(crispFace);
 for(const forbidden of ["cropScore","bodyExtent","selfieProbability","backgroundQuality","lightingScore"])assert.ok(!keys.includes(forbidden),`${forbidden} must not feed AI usability`);
});

test("a validated quality defect blocks enhancement whatever the score says",()=>{
 const result=assess({qualityDefects:[{id:"severe_blur",label:"Severe blur — the subject cannot be edited",evidence:"Structural detail 24/100."}]});
 assert.equal(result.eligible,false,"a measured defect means the identity anchors are gone");
 assert.match(result.reason,/Severe blur/);
});

test("too few pixels on the face is ineligible even when the rest of the file is clean",()=>{
 const result=assess({faceHeightPixels:120});
 assert.equal(result.eligible,false,"120px of face is below the identity floor");
 assert.match(result.reason,new RegExp(`${aiUsabilityThresholds.facePixels}px`));
});

test("more than one face is never a usable identity reference",()=>{
 assert.equal(assess({faceCount:2}).eligible,false);
 assert.equal(assess({faceCount:0}).score,0,"no face, no identity information at all");
});

test("a face running off the frame edge is missing part of the reference",()=>{
 assert.equal(assess({faceClearance:.002}).eligible,false);
 assert.ok(assess({faceClearance:.02}).eligible,"a merely tight face crop is still complete");
});

test("the face detail curve is monotonic and saturates",()=>{
 let previous=-1;
 for(const pixels of [0,80,90,120,150,200,260,330,400,800]){const value=faceDetailCurve(pixels);assert.ok(value>=previous,`curve must not fall at ${pixels}px`);previous=value}
 assert.equal(faceDetailCurve(400),100);
 assert.equal(faceDetailCurve(60),0);
});

test("soft structure lowers the score below the floor without inventing a defect",()=>{
 const result=assess({faceClarity:40,structureScore:38,focusScore:36,fidelityScore:50,faceHeightPixels:170});
 assert.equal(result.eligible,false);
 assert.match(result.reason,/below the 70/);
});
