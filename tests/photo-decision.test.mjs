import assert from "node:assert/strict";
import test from "node:test";

import {applyPhotoDecision, isWorkflowHardStop, scoreCaps} from "../app/photo-decision.ts";

// A relaxed, seated, smart-casual portrait that a designer can actually use.
const goodSignals={minimumDimension:1600,resolutionScore:100,sharpnessScore:88,focusScore:90,structureScore:86,fidelityScore:82,faceCount:1,faceClearance:.08,faceHeight:.2,faceHeightPixels:320,faceClarity:94,accessoryImpact:0,choppedLimbs:0,photoQuality:88,bodyCrop:92,faceVisibility:91,selfieProbability:.05,lightingScore:86,backgroundQuality:88,designerUsability:92,bodyExtent:"three_quarter",cropScore:95,hands:"complete",handScore:100,isScreenshot:false,letterboxed:false,contentCoverage:.95,backgroundTexture:4,frameAspect:.78,subjectCoverage:.5,torsoVisible:1.1,shoulderTilt:3,handAtFace:false};
const decide=(overrides={},rawScore=92)=>applyPhotoDecision(rawScore,{...goodSignals,...overrides});

test("approves a usable portrait regardless of formality of pose",()=>{
 const result=decide();
 assert.equal(result.status,"APPROVED");
 assert.equal(result.rawScore,92);
 assert.equal(result.score,92,"nothing is applicable, so the raw score is the final score");
 assert.equal(result.appliedCap,null);
});

test("approves a seated casual portrait with hands resting out of frame",()=>{
 const result=decide({hands:"absent",bodyExtent:"half_body"});
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,92,"hands outside the composition must cost nothing");
});

// --- the only arithmetic between raw and final is min(raw, cap) ---

test("no note ever deducts from the score",()=>{
 const noted=decide({letterboxed:true,contentCoverage:.28,lightingScore:52,backgroundQuality:48,designerUsability:52,cropScore:52,sharpnessScore:44,focusScore:46},72);
 assert.ok(noted.penalties.length>=4,"the notes are still reported");
 assert.ok(noted.penalties.every(penalty=>penalty.points===0),"a category score already carries each of these");
 assert.equal(noted.score,72,"the raw score survives untouched — no hidden penalties");
});

test("padding is a note, never a deduction and never a verdict",()=>{
 const result=decide({letterboxed:true,contentCoverage:.28},86);
 assert.equal(result.status,"APPROVED","a designer trims empty canvas in seconds");
 assert.equal(result.score,86);
 const padding=result.penalties.find(penalty=>penalty.id==="padded_export");
 assert.equal(padding.points,0);
 assert.equal(padding.cap,null);
 assert.equal(padding.forces_status,null);
});

test("a cap is a ceiling, not a value — a weak photo keeps its lower raw score",()=>{
 const weak=decide({isScreenshot:true},38);
 assert.equal(weak.score,38,`min(38, ${scoreCaps.screenshot}) is 38`);
 assert.equal(weak.appliedCap,null,"no cap was reached, so none is reported");
});

test("the lowest applicable cap wins when several gates fire",()=>{
 const result=decide({selfieProbability:.86,bodyExtent:"head_shoulders"},60);
 assert.equal(result.appliedCap.cap,scoreCaps.minimal_body);
 assert.equal(result.score,49,"close-up selfie plus insufficient body caps at 49");
});

// --- hard rejects: the photograph genuinely cannot be used ---

test("severe blur caps the score at 39",()=>{
 const result=decide({sharpnessScore:24,focusScore:22,structureScore:24,faceClarity:25},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.rawScore,95);
 assert.equal(result.score,scoreCaps.severe_blur);
 assert.ok(result.hardGates.includes("Severe blur — the subject cannot be edited"));
});

test("smooth studio processing is softness, not severe blur",()=>{
 // A low focus read with usable detail still on the face: soft studio processing, not an unusable image.
 const processed=decide({sharpnessScore:32,focusScore:30,structureScore:78,faceClarity:72},84);
 assert.ok(!processed.hardGates.some(gate=>gate.toLowerCase().includes("blur")),"retouched skin must not read as unusable");
 assert.equal(processed.status,"APPROVED");
 assert.equal(processed.score,84,"the softness already sits in the category scores");
 // Slight softness is a note only, and a strong portrait carrying it still clears 80.
 const slight=decide({sharpnessScore:48,focusScore:50,structureScore:55,faceClarity:62},85);
 assert.ok(slight.penalties.some(penalty=>penalty.id==="soft_image"));
 assert.equal(slight.status,"APPROVED");
 assert.equal(slight.score,85);
});

test("rejects a head-and-shoulders crop, and a chest-up crop caps higher",()=>{
 const minimal=decide({bodyExtent:"head_shoulders"},95);
 assert.equal(minimal.status,"REJECT");
 assert.equal(minimal.score,scoreCaps.minimal_body,"head and shoulders only caps at 49");
 // Half body means head to waist. A frame that stops at the chest is its own, less severe failure.
 const chest=decide({bodyExtent:"chest_up"},95);
 assert.equal(chest.status,"REJECT");
 assert.equal(chest.score,scoreCaps.insufficient_body,"chest-up caps at 59");
});

test("a phone screenshot caps at 55",()=>{
 const result=decide({isScreenshot:true},82);
 assert.equal(result.status,"REJECT");
 assert.equal(result.rawScore,82,"the underlying portrait may be fine — the file is the problem");
 assert.equal(result.score,55);
});

test("rejects an awkward crop that cuts the agent",()=>{
 const result=decide({cropScore:30},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,scoreCaps.awkward_crop);
});

test("an obvious selfie caps at 59",()=>{
 const result=decide({selfieProbability:.86},73);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,59);
});

// --- the snapshot gate: several agreeing cues, never one on its own ---

test("a lived-in room on its own is an acceptable portrait setting",()=>{
 const result=decide({backgroundTexture:14},86);
 assert.equal(result.status,"APPROVED","office, home and indoor backgrounds are allowed");
 assert.equal(result.hardGates.length,0);
 assert.equal(result.score,86);
});

test("a phone aspect ratio on its own changes nothing",()=>{
 assert.equal(decide({frameAspect:.56},86).status,"APPROVED");
});

test("a lived-in room plus phone framing plus a raised hand is a snapshot",()=>{
 const result=decide({backgroundTexture:18,frameAspect:.56,handAtFace:true},85);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,scoreCaps.casual_snapshot);
 assert.ok(result.hardGates.some(gate=>gate.toLowerCase().includes("snapshot")));
 assert.ok(result.snapshotSignals.length>=3);
});

test("a close-camera selfie in a room is a snapshot",()=>{
 assert.equal(decide({backgroundTexture:16,faceHeight:.34,frameAspect:.56},86).status,"REJECT");
});

test("an agent lost in a wide room shot is a snapshot",()=>{
 assert.equal(decide({backgroundTexture:21,subjectCoverage:.28},83).status,"REJECT");
});

test("a single snapshot cue changes nothing at all",()=>{
 const result=decide({backgroundTexture:14,frameAspect:.72},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,88);
});

test("cues that add up but fall short of the gate ask for human judgement",()=>{
 const result=decide({backgroundTexture:14,frameAspect:.56},88);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,79,"capped to review level so the number reads borderline, not ready");
 assert.equal(result.hardGates.length,0);
});

test("a studio cut-out never trips the snapshot gate",()=>{
 const result=decide({backgroundTexture:3,frameAspect:.78,subjectCoverage:.47,torsoVisible:1.1},93);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.snapshotSignals.length,0);
});

// --- review tier ---

test("one cut-off hand is a note, both chopped hands is a capped reject",()=>{
 const single=decide({hands:"partial",handScore:62},92);
 assert.ok(single.penalties.some(penalty=>penalty.id==="cut_hands"));
 assert.equal(single.status,"APPROVED","one hand at the edge is an edit, not a blocker");
 assert.equal(single.score,92);
 const both=decide({hands:"partial",handScore:34},92);
 assert.equal(both.status,"REJECT");
 assert.equal(both.score,scoreCaps.chopped_hands);
});

test("likely selfie framing caps at review level rather than retake",()=>{
 const result=decide({selfieProbability:.6},90);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,79);
 assert.equal(result.hardGates.length,0);
});

test("a busy background is a note; the editability score already carries it",()=>{
 const result=decide({backgroundQuality:48,designerUsability:58},72);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,72);
 assert.ok(result.penalties.every(penalty=>penalty.points===0));
});

// --- the bands ---

test("the score bands are 80 approved, 65 review, below 65 retake",()=>{
 assert.equal(decide({},80).status,"APPROVED");
 assert.equal(decide({},79).status,"REVIEW");
 assert.equal(decide({},65).status,"REVIEW");
 assert.equal(decide({},64).status,"REJECT");
});

test("a hard failure overrides a high raw score",()=>{
 const result=decide({faceCount:0},89);
 assert.equal(result.status,"REJECT","a face nobody can see cannot be designed with");
 assert.equal(result.score,scoreCaps.face_missing);
});

test("the number and the verdict can never contradict each other",()=>{
 const gated=[decide({isScreenshot:true},98),decide({selfieProbability:.9},98),decide({choppedLimbs:1,hands:"partial",handScore:62},98),decide({photoQuality:60,faceVisibility:61,structureScore:19},98),decide({bodyExtent:"head_only"},98),decide({sharpnessScore:20,focusScore:20,structureScore:16,faceClarity:20},98),decide({cropScore:22},98),decide({faceCount:3},98),decide({lightingScore:20},98),decide({backgroundQuality:12},98)];
 for(const result of gated){
  assert.equal(result.status,"REJECT");
  assert.ok(result.score<65,`a retake must read below 65, got ${result.score}`);
 }
 for(const result of [decide({},95),decide({},81)])assert.ok(result.score>=80&&result.status==="APPROVED");
});

test("every gap between the raw score and the final score is attributable",()=>{
 const result=decide({isScreenshot:true},82);
 assert.ok(result.scoreTrace.some(step=>step.includes("Raw score 82")));
 assert.ok(result.scoreTrace.some(step=>step.includes("min(82, 55)")));
 const clean=decide({},88);
 assert.ok(clean.scoreTrace.some(step=>step.includes("no cap applied")));
});

// --- resolution is advisory at the file level; it reaches the score through the categories ---

test("a visually excellent photo keeps its score and approval when the file is small",()=>{
 const result=decide({minimumDimension:354,resolutionScore:41},95);
 assert.equal(result.score,95,"the decision layer never re-reads resolution; the categories already did");
 assert.equal(result.status,"APPROVED");
 assert.equal(result.fileStatus,"TOO_SMALL");
 assert.ok(!result.penalties.some(penalty=>penalty.id.includes("resolution")));
});

test("only a file too small to use anywhere becomes a re-upload request",()=>{
 const result=decide({minimumDimension:180,resolutionScore:21},95);
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
 const result=decide({minimumDimension:354,resolutionScore:41,sharpnessScore:20,focusScore:18,structureScore:19,faceHeightPixels:118,faceClarity:21},95);
 assert.equal(result.status,"REJECT");
 assert.ok(result.hardGates.length>0);
});

// --- critical category floors: strong crop and background cannot rescue poor subject detail ---

test("a clean crop and background cannot carry a photo with poor facial detail",()=>{
 // Spec worked example: photo quality 60, body 84, face 61, background 82 — raw 73, floors fail.
 const result=decide({photoQuality:60,bodyCrop:84,faceVisibility:61,designerUsability:82,minimumDimension:354,resolutionScore:41,structureScore:26,faceHeightPixels:120},73);
 assert.equal(result.status,"REJECT");
 assert.ok(result.score>=55&&result.score<=64,`expected the 55-64 band, got ${result.score}`);
 assert.ok(result.hardGates.some(gate=>gate.toLowerCase().includes("subject detail")));
});

test("a category score is never a rejection trigger on its own",()=>{
 // Every one of these used to be an automatic retake. A sub-score is an estimate, and an estimate that
 // is a few points out must not be able to turn down an otherwise good portrait by itself.
 assert.notEqual(decide({photoQuality:62,faceVisibility:88},80).status,"REJECT","photo quality 62 with nothing visibly wrong");
 assert.notEqual(decide({photoQuality:88,faceVisibility:62},80).status,"REJECT","face visibility 62 with nothing visibly wrong");
 assert.notEqual(decide({photoQuality:68,faceVisibility:68},80).status,"REJECT","both in the 60s, still no confirmed defect");
 assert.notEqual(decide({photoQuality:63,faceVisibility:64},80).status,"REJECT","63/64 alone is not a defect");
 const borderline=decide({photoQuality:63,faceVisibility:64},80);
 assert.equal(borderline.status,"REVIEW","weak scores with no confirmed defect go to a designer, never to a retake");
 assert.equal(borderline.hardGates.length,0);
 assert.equal(borderline.qualityDefects.length,0);
});

test("weak subject scores reject only once a defect is visually confirmed",()=>{
 const weakOnly=decide({photoQuality:58,faceVisibility:59},72);
 assert.equal(weakOnly.status,"REVIEW","no defect found in the image, so the scores cannot reject alone");
 const confirmed=decide({photoQuality:58,faceVisibility:59,sharpnessScore:22,focusScore:20,structureScore:18},72);
 assert.equal(confirmed.status,"REJECT");
 assert.ok(confirmed.qualityDefects.some(item=>item.id==="severe_blur"));
 assert.ok(confirmed.scoreTrace.some(step=>step.startsWith("Validated quality defects:")&&!step.includes("none")));
});

test("the ready-for-design floor holds a photo at review rather than retake",()=>{
 const result=decide({photoQuality:80,faceVisibility:71,bodyCrop:88},84);
 assert.equal(result.status,"REVIEW","face visibility 71 is usable but below the ready minimum of 75");
 assert.equal(result.score,79);
 assert.equal(result.hardGates.length,0,"a floor is not a hard failure");
});

test("a photo clearing every floor is not touched by them",()=>{
 const result=decide({photoQuality:87,faceVisibility:88,bodyCrop:89},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,88);
 assert.ok(result.scoreTrace.some(step=>step.includes("Critical floors: PASS")));
});

// --- visible limbs ---

test("a visible arm running off the frame edge is a crop failure, hands or not",()=>{
 const result=decide({choppedLimbs:1,hands:"partial",handScore:62},88);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,scoreCaps.chopped_limbs);
 assert.ok(result.hardGates.some(gate=>gate.toLowerCase().includes("arm")));
 const hands=result.requirements.find(requirement=>requirement.id==="hands");
 assert.ok(!hands.detail.includes("nothing to crop badly"),"an arm the designer can see is never 'nothing to crop badly'");
});

test("hands and arms genuinely out of the composition still cost nothing",()=>{
 const result=decide({hands:"absent",handScore:100,choppedLimbs:0},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,88);
});

// --- accessories: judged on design impact, never on style ---

test("an ordinary accessory changes nothing",()=>{
 const result=decide({accessoryImpact:0},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.penalties.length,0);
});

test("an oversized accessory is a note about layout flexibility, not about taste",()=>{
 const result=decide({accessoryImpact:.7},84);
 assert.equal(result.status,"APPROVED","the accessory itself never forces a verdict");
 const noted=result.penalties.find(penalty=>penalty.id==="oversized_accessory");
 assert.ok(noted&&noted.points===0,"the body & crop score already carries the cost");
 const requirement=result.requirements.find(item=>item.id==="accessory_fit");
 assert.equal(requirement.status,"FAIL");
 assert.ok(/widens the silhouette|cropping and layout/.test(requirement.detail));
 assert.ok(!/inappropriate|unprofessional|beach/i.test(requirement.detail),"never a comment on style");
});

// --- mirror selfie caps below an ordinary close selfie ---

test("a mirror or arm's-length selfie caps lower than a merely close one",()=>{
 const mirror=decide({selfieProbability:.9,handAtFace:true},80);
 assert.equal(mirror.score,scoreCaps.mirror_selfie);
 const close=decide({selfieProbability:.8},80);
 assert.equal(close.score,scoreCaps.obvious_selfie);
 assert.ok(mirror.score<close.score);
});

// --- quality: softness, moderate blur and severe blur are three different findings ---

test("mild softness is not a defect and does not touch the verdict",()=>{
 // Beauty retouching, JPEG compression and soft studio lighting: the frame-wide average drops, the
 // structural edges — eyes, hairline, collar, silhouette — do not.
 const retouched=decide({sharpnessScore:46,focusScore:44,structureScore:82,photoQuality:81,faceVisibility:87,bodyCrop:89},85);
 assert.equal(retouched.qualityDefects.length,0,"smooth skin is not evidence of blur");
 assert.equal(retouched.status,"APPROVED");
 assert.equal(retouched.score,85);
 assert.ok(!retouched.penalties.some(penalty=>penalty.id==="soft_image"),"structural detail is intact, so it is not even noted as soft");
 const focus=retouched.requirements.find(item=>item.id==="focus");
 assert.equal(focus.status,"PASS");
 assert.ok(!/cannot be cleanly used/.test(focus.detail),"'slightly soft' and 'cannot be cleanly used' are different statements");
});

test("moderate blur reaches designer review, never a retake",()=>{
 const moderate=decide({sharpnessScore:40,focusScore:38,structureScore:44,photoQuality:66,faceVisibility:70,bodyCrop:84},74);
 assert.equal(moderate.qualityDefects.length,0,"detail is reduced, not gone");
 assert.equal(moderate.status,"REVIEW");
 assert.equal(moderate.hardGates.length,0);
});

test("severe blur needs the structural detail and the focus read to agree",()=>{
 const severe=decide({sharpnessScore:26,focusScore:24,structureScore:21,photoQuality:52,faceVisibility:54},70);
 assert.equal(severe.status,"REJECT");
 assert.ok(severe.qualityDefects.some(item=>item.id==="severe_blur"));
 // A low focus average on its own — the classic retouched portrait — is not enough.
 const softOnly=decide({sharpnessScore:26,focusScore:24,structureScore:72},84);
 assert.ok(!softOnly.qualityDefects.some(item=>item.id==="severe_blur"));
 assert.equal(softOnly.status,"APPROVED");
});

// --- resolution: small dimensions alone are never the defect ---

test("a large mildly soft portrait stays ready for design",()=>{
 // 1280 x 1600: face, eyes and edges are clear, the processing is soft. Spec expectation: 82-90+.
 const result=decide({minimumDimension:1280,resolutionScore:100,sharpnessScore:52,focusScore:54,structureScore:80,faceHeightPixels:340,photoQuality:82,faceVisibility:88,bodyCrop:90,designerUsability:92},86);
 assert.equal(result.qualityDefects.length,0);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,86);
});

test("a small file only rejects when the facial detail is visibly gone",()=>{
 // 354 x 453 with detail still holding up: small, but not a defect.
 const intact=decide({minimumDimension:354,resolutionScore:41,faceHeightPixels:160,structureScore:74},88);
 assert.equal(intact.qualityDefects.length,0,"small dimensions are a file fact, not a visual defect");
 assert.equal(intact.status,"APPROVED");
 assert.equal(intact.fileStatus,"TOO_SMALL");
 // 354 x 453 where the face is pixelated away: low resolution confirmed by actual detail loss.
 const pixelated=decide({minimumDimension:354,resolutionScore:41,faceHeightPixels:112,structureScore:34,photoQuality:57,faceVisibility:55},68);
 assert.equal(pixelated.status,"REJECT");
 assert.ok(pixelated.qualityDefects.some(item=>item.id==="low_resolution_detail_loss"));
 assert.ok(pixelated.retakeAdvice.length>0);
});

test("severe compression is its own confirmed defect",()=>{
 const crushed=decide({fidelityScore:18,structureScore:31,photoQuality:54,faceVisibility:56},66);
 assert.equal(crushed.status,"REJECT");
 assert.ok(crushed.qualityDefects.some(item=>item.id==="severe_degradation"));
 // Ordinary JPEG compression on an otherwise good portrait is not.
 assert.equal(decide({fidelityScore:58,structureScore:80},87).qualityDefects.length,0);
});

test("a clean background and a good crop never rescue a genuinely degraded subject",()=>{
 const result=decide({photoQuality:55,faceVisibility:57,bodyCrop:92,designerUsability:94,backgroundQuality:95,sharpnessScore:24,focusScore:22,structureScore:17},76);
 assert.equal(result.status,"REJECT");
 assert.ok(result.score<65);
});

// --- Designer review eligibility ------------------------------------------------------------------
//
// Designer review exists inside an open workflow. A retake or a re-upload verdict closes the workflow on
// that photograph, so there is nothing about *this* file left for a designer to decide — allowing the
// appeal there would turn a judgement call into a way around a hard stop. Within the statuses that stay
// open, eligibility is blocked only by defects measured on the pixels, plus a photo-quality floor and a
// file large enough to use at all.

test("a retake verdict closes designer review even when nothing is measurably wrong",()=>{
 // The reference case: a professional studio shoot mis-read as a snapshot. The gate is still named, so
 // the agent can see what the AI concluded — but the answer is a new photo, not an appeal.
 const result=decide({selfieProbability:.8},88);
 assert.equal(result.status,"REJECT","the AI rejects it on a judgement call");
 assert.equal(result.designerReviewEligible,false,"a retake recommendation is a hard stop, not an appeal");
 assert.ok(result.disputableGates.length>0,"the user is still told what the AI concluded");
 assert.match(result.reviewBlockReason,/retaken/i,"the block reason says a new photo is required");
});

test("a re-upload verdict closes designer review",()=>{
 const result=decide({minimumDimension:220,resolutionScore:20},88);
 assert.equal(result.status,"REUPLOAD");
 assert.equal(result.designerReviewEligible,false,"the file has to be replaced before a designer sees it");
 assert.match(result.reviewBlockReason,/re-upload/i);
});

test("designer review is open only where the workflow is",()=>{
 // The single rule the screens read: eligibility can never be true on a hard stop, whatever the scores.
 for(const overrides of [{},{selfieProbability:.8},{photoQuality:74,faceVisibility:74,bodyCrop:68},{minimumDimension:220,resolutionScore:20}]){
  const result=decide(overrides,74);
  if(isWorkflowHardStop(result.status))assert.equal(result.designerReviewEligible,false,`${result.status} must never offer designer review`);
 }
});

test("an approved photo has nothing to dispute",()=>{
 const result=decide();
 assert.equal(result.status,"APPROVED");
 assert.equal(result.disputableGates.length,0);
});

test("a designer-review photo keeps every recovery path open",()=>{
 // 65-79 with no gate fired: this is the one status where a human decision on this file still exists.
 const result=decide({photoQuality:74,faceVisibility:74,bodyCrop:68},74);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.designerReviewEligible,true,"designer review is exactly what this status is for");
 assert.equal(result.reviewBlockReason,"","nothing blocks review");
});

test("photo quality below the floor blocks designer review",()=>{
 const result=decide({photoQuality:69},69);
 assert.equal(result.designerReviewEligible,false);
 assert.ok(result.reviewBlockReason,"the user is told why review is unavailable");
});

test("photo quality exactly at the floor is eligible",()=>{
 assert.equal(decide({photoQuality:70},70).designerReviewEligible,true,"70 is the floor, not the exclusive bound");
});

// Each measured defect independently blocks review. These are the objectively technical failures:
// no amount of designer judgement recovers detail the file does not carry.
for(const [name,overrides] of [
 ["severe blur",{structureScore:20,focusScore:30,sharpnessScore:30}],
 ["too little face detail",{faceHeightPixels:60}],
 ["pixelation or corruption",{structureScore:18,fidelityScore:25}],
 ["low resolution with visible detail loss",{minimumDimension:480,faceHeightPixels:120,structureScore:40}],
]) test(`${name} blocks designer review`,()=>{
 const result=decide(overrides,88);
 assert.ok(result.qualityDefects.length>0,"the defect is validated against the image");
 assert.equal(result.designerReviewEligible,false);
 assert.ok(result.reviewBlockReason,"the message names the defect rather than being generic");
});

test("a file too small to use anywhere blocks designer review",()=>{
 assert.equal(decide({minimumDimension:220,resolutionScore:20},88).designerReviewEligible,false);
});

test("a face the detector could not find is still reported as a judgement call",()=>{
 // face_missing is a detector result, not a measurement of the pixels. Turned heads, hijabs, sunglasses
 // and hard lighting all defeat detection on photos a designer can see a face in perfectly well — so it
 // is named rather than presented as a measured defect. It still recommends a retake, and a retake is a
 // hard stop: the agent supplies a photo the detector can read instead of arguing about this one.
 const result=decide({faceCount:0},88);
 assert.equal(result.status,"REJECT");
 assert.ok(result.disputableGates.some(gate=>/face/i.test(gate)),"the judgement is named, not hidden");
 assert.equal(result.qualityDefects.length,0,"a detector miss is never recorded as a measured defect");
 assert.equal(result.designerReviewEligible,false,"but a retake still has to be a new photo");
});

// Every judgement gate is still *named* — the agent is told what the AI concluded rather than being sent
// away with a score — but naming it is not the same as offering an appeal. A gate caps at or below 59,
// so any gate that fires produces a retake, and a retake closes the workflow on that file.
for(const [name,overrides] of [
 ["an awkward crop",{cropScore:32}],
 ["not enough body",{bodyExtent:"head_shoulders"}],
 ["an oversized accessory",{accessoryImpact:.7}],
 ["a suspected selfie",{selfieProbability:.8}],
 ["an unusable-for-design score",{designerUsability:30}],
 ["a difficult background",{backgroundQuality:25}],
]) test(`${name} is named as a judgement call, never as a measured defect`,()=>{
 const result=decide(overrides,88);
 assert.equal(result.qualityDefects.length,0,"nothing measured on the pixels is wrong with the file");
 assert.equal(result.designerReviewEligible,!isWorkflowHardStop(result.status),"review follows the workflow status, nothing else");
});

// --- Snapshot cues must not fire on deliberate wide framing ---------------------------------------

test("a full-body studio portrait is not a lost subject",()=>{
 // bodyExtentScores.full_body is 100: the system rewards this framing. A standing figure in a 2:3 frame
 // occupies about a quarter of it, so penalising the same photo for low coverage contradicts that.
 const result=decide({bodyExtent:"full_body",subjectCoverage:.26,backgroundTexture:9},88);
 assert.ok(!result.snapshotSignals.some(cue=>cue.id==="subject_lost_in_scene"),"deliberate wide framing is not a snapshot cue");
 assert.equal(result.status,"APPROVED","a professional full-body shoot must not be called a selfie");
 assert.equal(result.score,88);
});

test("a genuinely tiny subject in a cluttered scene still reads as a snapshot",()=>{
 const result=decide({bodyExtent:"half_body",subjectCoverage:.15,backgroundTexture:14},88);
 assert.ok(result.snapshotSignals.some(cue=>cue.id==="subject_lost_in_scene"),"the cue must still work where it was meant to");
});
