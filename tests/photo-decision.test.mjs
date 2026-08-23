import assert from "node:assert/strict";
import test from "node:test";

import {applyPhotoDecision} from "../app/photo-decision.ts";

// A relaxed, seated, smart-casual portrait that a designer can actually use.
const goodSignals={minimumDimension:1600,resolutionScore:100,sharpnessScore:88,focusScore:90,faceCount:1,faceClearance:.08,faceHeight:.2,selfieProbability:.05,lightingScore:86,backgroundQuality:88,designerUsability:92,bodyExtent:"three_quarter",cropScore:95,hands:"complete",isScreenshot:false,letterboxed:false,contentCoverage:.95};
const decide=(overrides={},baseScore=92)=>applyPhotoDecision(baseScore,{...goodSignals,...overrides});

test("approves a usable portrait regardless of formality of pose",()=>{
 const result=decide();
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,92);
 assert.equal(result.penalties.length,0);
 assert.ok(result.requirements.every(requirement=>requirement.status==="PASS"));
});

test("approves a seated casual portrait with hands resting out of frame",()=>{
 const result=decide({hands:"absent",bodyExtent:"half_body"});
 assert.equal(result.status,"APPROVED");
 assert.equal(result.penalties.length,0,"hands outside the composition must cost nothing");
});

// --- hard rejects: the photograph genuinely cannot be used ---

test("rejects severe blur",()=>{
 const result=decide({sharpnessScore:24,focusScore:22},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,40);
});

test("rejects a head-and-shoulders crop as insufficient body",()=>{
 const result=decide({bodyExtent:"head_shoulders"},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,45);
 assert.ok(result.penalties.some(penalty=>penalty.id==="insufficient_body"));
});

test("rejects a phone screenshot",()=>{
 const result=decide({isScreenshot:true},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,35);
});

test("rejects a letterboxed export padded with empty bars",()=>{
 const result=decide({letterboxed:true,contentCoverage:.28},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,40);
});

test("rejects an awkward crop that cuts the agent",()=>{
 const result=decide({cropScore:30},95);
 assert.equal(result.status,"REJECT");
});

test("rejects an obvious selfie",()=>{
 const result=decide({selfieProbability:.86},96);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,45);
});

// --- review tier ---

test("one cut-off hand is a review, not a reject",()=>{
 const result=decide({hands:"partial"},92);
 assert.equal(result.status,"REVIEW");
 assert.ok(result.penalties.some(penalty=>penalty.id==="cut_hands"));
});

test("slight blur is a review",()=>{
 const result=decide({sharpnessScore:50,focusScore:52},92);
 assert.equal(result.status,"REVIEW");
});

// --- resolution is advisory, never a photo-quality verdict ---

test("a visually excellent photo keeps its score and approval when the file is small",()=>{
 const result=decide({minimumDimension:354,resolutionScore:41},95);
 assert.equal(result.score,95,"low resolution must not reduce the photo-quality score");
 assert.equal(result.status,"APPROVED","a good photograph in a small file is still a good photograph");
 assert.equal(result.fileStatus,"TOO_SMALL");
 assert.ok(!result.penalties.some(penalty=>penalty.id.includes("resolution")));
});

test("only a file too small to use anywhere becomes a re-upload request",()=>{
 const result=decide({minimumDimension:180,resolutionScore:21},95);
 assert.equal(result.score,95);
 assert.equal(result.status,"REUPLOAD");
 assert.equal(result.fileStatus,"UNUSABLE");
});

test("file suitability is reported on its own axis",()=>{
 assert.equal(decide({minimumDimension:1600,resolutionScore:100}).fileStatus,"OK");
 assert.equal(decide({minimumDimension:750,resolutionScore:81}).fileStatus,"LOW");
 assert.equal(decide({minimumDimension:400,resolutionScore:47}).fileStatus,"TOO_SMALL");
 assert.equal(decide({minimumDimension:180,resolutionScore:21}).fileStatus,"UNUSABLE");
});

test("a genuinely bad photo in a small file is a retake, not a re-upload",()=>{
 const result=decide({minimumDimension:354,resolutionScore:41,sharpnessScore:20,focusScore:18},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,40);
});
