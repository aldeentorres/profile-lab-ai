import assert from "node:assert/strict";
import test from "node:test";

import {checkGeneratedPortrait, identitySimilarity, portraitCheckThresholds} from "../app/portrait-checks.ts";
import {photoApprovalThresholds} from "../app/photo-decision.ts";

const original={faceCount:1,faceHeightPixels:300,hands:"complete",structureScore:84,fidelityScore:80,bodyProportion:2.4,qualityDefects:[]};
// What the non-generative local pipeline produces: same face, relit and resampled, slightly softer.
const enhanced={...original,faceHeightPixels:360,structureScore:79,fidelityScore:78,bodyProportion:2.4};
const approved=photoApprovalThresholds.approved;
const verdict=(enhancedOverrides={},score=88,similarity=.96)=>checkGeneratedPortrait(original,{...enhanced,...enhancedOverrides},score,similarity,approved);

test("identity similarity ignores exposure and contrast, and rejects a different face",()=>{
 const face=[10,40,90,200,120,60,30,15,80,160,220,140];
 const relit=face.map(value=>value*.7+40);
 assert.ok(identitySimilarity(face,relit)>.99,"a relit copy of the same face is the same face");
 const other=[200,10,150,20,90,240,30,130,5,180,60,110];
 assert.ok(identitySimilarity(face,other)<portraitCheckThresholds.identitySimilarity,"unrelated pixels must not pass as the same person");
 assert.equal(identitySimilarity([],[]),0);
});

test("a faithful enhancement that reaches the approval bar passes",()=>{
 const result=verdict();
 assert.ok(result.identityPreserved);
 assert.ok(result.passed,"identity kept, no artefacts, score at 88");
 assert.deepEqual(result.concerns,[]);
 assert.ok(result.checks.every(item=>item.status==="PASS"||item.status==="UNVERIFIED"));
});

test("the enhanced portrait is held to the same approval threshold as an original",()=>{
 const result=verdict({},photoApprovalThresholds.approved-1);
 assert.equal(result.passed,false,"79 is designer review, exactly as it would be for an upload");
 assert.ok(result.concerns.some(item=>item.includes(`${photoApprovalThresholds.approved}`)));
 assert.ok(verdict({},photoApprovalThresholds.approved).passed,"80 passes");
});

test("identity drift fails regardless of how good the render scores",()=>{
 const result=verdict({},97,.62);
 assert.equal(result.identityPreserved,false);
 assert.equal(result.passed,false,"a beautiful render of somebody else is worse than the original");
 assert.equal(result.checks.find(item=>item.id==="identity").status,"FAIL");
});

test("an unverifiable identity is a designer's call, never an automatic pass",()=>{
 const result=verdict({},92,null);
 assert.equal(result.passed,false);
 assert.equal(result.checks.find(item=>item.id==="identity").status,"UNVERIFIED");
 assert.ok(result.concerns.some(item=>item.startsWith("Identity preservation")));
});

test("a face that vanished or degraded in the enhanced image fails face integrity",()=>{
 assert.equal(verdict({faceCount:0}).checks.find(item=>item.id==="face_integrity").status,"FAIL");
 const degraded=verdict({qualityDefects:[{id:"severe_degradation",label:"Pixelation or compression has destroyed the subject detail",evidence:"Structural detail 18/100."}]});
 assert.equal(degraded.passed,false);
});

test("smeared edges or new noise read as a generation artefact; a plain backdrop does not",()=>{
 const t=portraitCheckThresholds;
 assert.equal(verdict({structureScore:t.structureFloor-1}).checks.find(item=>item.id==="artifacts").status,"FAIL","a large drop that lands in the soft band is smearing");
 assert.equal(verdict({fidelityScore:original.fidelityScore-t.fidelityDrop-1}).checks.find(item=>item.id==="artifacts").status,"FAIL","new noise or blockiness");
 // A studio backdrop replacing a textured room removes background edges from the frame-wide read.
 const backdrop=verdict({structureScore:original.structureScore-t.structureDrop-1});
 assert.equal(backdrop.checks.find(item=>item.id==="artifacts").status,"PASS","fewer background edges are not repainted features");
 assert.ok(backdrop.passed);
 assert.equal(verdict({structureScore:original.structureScore-t.structureDrop}).checks.find(item=>item.id==="artifacts").status,"PASS","a slight softening is not an artefact");
});

test("hands the original had intact must still be intact",()=>{
 const result=verdict({hands:"partial"});
 assert.equal(result.checks.find(item=>item.id==="hands").status,"FAIL");
 assert.equal(result.passed,false);
 // A hand already cut in the original is inherited, not generated.
 const inherited=checkGeneratedPortrait({...original,hands:"partial"},{...enhanced,hands:"partial"},88,.96,approved);
 assert.equal(inherited.checks.find(item=>item.id==="hands").status,"PASS");
});

test("body proportion drift beyond tolerance fails, and an unknown proportion does not block",()=>{
 assert.equal(verdict({bodyProportion:2.4*1.3}).checks.find(item=>item.id==="body_proportion").status,"FAIL");
 assert.equal(verdict({bodyProportion:2.4*1.1}).checks.find(item=>item.id==="body_proportion").status,"PASS");
 const unknown=verdict({bodyProportion:null});
 assert.equal(unknown.checks.find(item=>item.id==="body_proportion").status,"UNVERIFIED");
 assert.ok(unknown.passed,"a missing skeleton read is not evidence of a distorted body");
});
