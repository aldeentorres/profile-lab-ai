import assert from "node:assert/strict";
import test from "node:test";

import {scoreCategories} from "../app/photo-score.ts";

// An intentional portrait: clear face, half body or more, good crop, clean background, usable edges.
const goodPortrait={
 sharpnessScore:84,structureScore:88,lightingScore:86,contrastScore:78,fidelityScore:80,resolutionScore:100,
 faceCount:1,faceHeightPixels:340,faceScaleScore:100,faceEdgeScore:100,
 bodyExtentScore:100,cropScore:92,handScore:100,usableArea:100,backgroundQuality:90,accessoryImpact:0,
};
const score=(overrides={})=>scoreCategories({...goodPortrait,...overrides});

test("a good intentional portrait lands in the ready-for-design band",()=>{
 const result=score();
 assert.ok(result.photoQuality>=78,`photo quality ${result.photoQuality}`);
 assert.ok(result.bodyCrop>=85,`body & crop ${result.bodyCrop}`);
 assert.ok(result.faceVisibility>=85,`face visibility ${result.faceVisibility}`);
 assert.ok(result.backgroundEditability>=85,`background & editability ${result.backgroundEditability}`);
 assert.ok(result.rawScore>=82,`final ${result.rawScore}`);
});

test("smooth skin is not evidence of blur",()=>{
 // Beauty retouching and soft studio lighting flatten the frame-wide sharpness average; the structural
 // edges — eyes, eyebrows, hairline, glasses, collar, silhouette — are what actually matter, and stay.
 const crisp=score(),retouched=score({sharpnessScore:46,structureScore:82});
 assert.ok(retouched.rawScore>=82,`a retouched portrait still ships: ${retouched.rawScore}`);
 assert.ok(crisp.rawScore-retouched.rawScore<=8,"heavy retouching costs a few points, not a verdict");
});

test("mild softness does not cascade into every category",()=>{
 const crisp=score(),soft=score({sharpnessScore:52,structureScore:84});
 // Photo quality carries it, by a small amount.
 assert.ok(crisp.photoQuality-soft.photoQuality<=8,"photo quality drops a little");
 assert.ok(soft.photoQuality>=78);
 // Facial features are no harder to use, and the subject edge is no harder to mask.
 assert.ok(crisp.faceVisibility-soft.faceVisibility<=3,"face visibility only moves if the features do");
 assert.ok(crisp.backgroundEditability-soft.backgroundEditability<=3,"editability only moves if the edges do");
});

test("structural detail genuinely going does lower all three",()=>{
 const gone=score({sharpnessScore:22,structureScore:16});
 assert.ok(gone.photoQuality<65,`photo quality ${gone.photoQuality}`);
 assert.ok(gone.faceVisibility<65,`face visibility ${gone.faceVisibility}`);
 assert.ok(gone.edgeQuality<40,`edge quality ${gone.edgeQuality}`);
});

test("a small file is capped by the detail it can carry, not by its dimensions alone",()=>{
 // 354 x 453 with the face pixelated away: few face pixels is what limits it.
 const pixelated=score({resolutionScore:41,faceHeightPixels:112,sharpnessScore:38,structureScore:34});
 assert.ok(pixelated.faceVisibility<65,`face visibility ${pixelated.faceVisibility}`);
 // The same small file with detail still holding up stays usable.
 const intact=score({resolutionScore:41,faceHeightPixels:190,structureScore:78});
 assert.ok(intact.faceVisibility>=70,`face visibility ${intact.faceVisibility}`);
});
