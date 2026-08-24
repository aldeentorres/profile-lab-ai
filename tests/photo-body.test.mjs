import assert from "node:assert/strict";
import test from "node:test";

import {analyzeBody} from "../app/photo-body.ts";

// MediaPipe returns a full 33-landmark skeleton even when the frame cuts through the torso: the
// landmarks it cannot see are extrapolated past the edge with a low visibility score.
const landmark=(y,visibility,x=.5)=>({x,y,visibility});
const skeleton=(overrides={})=>{
 const points=Array.from({length:33},()=>landmark(.5,0));
 points[0]=landmark(.31,1);      // nose
 points[11]=landmark(.52,1);     // left shoulder
 points[12]=landmark(.53,1);     // right shoulder
 return Object.assign(points,overrides);
};
// A silhouette that fills the frame and runs off the bottom edge, as an agent cut-out does.
const maskFilling=(fromY=.08)=>{
 const width=32,height=32,data=new Float32Array(width*height);
 for(let y=Math.round(fromY*height);y<height;y+=1)for(let x=8;x<24;x+=1)data[y*width+x]=1;
 return {width,height,data};
};
const face={x:.4,y:.19,width:.23,height:.21};

test("a waist-up portrait is half body, not head and shoulders",()=>{
 // Hips predicted just below the bottom edge with low visibility — the exact shape of a chest-up crop.
 const points=skeleton({23:landmark(1.095,.126),24:landmark(1.097,.153)});
 const result=analyzeBody(points,maskFilling(),face,.44);
 assert.equal(result.extent,"half_body");
 assert.equal(result.extentScore,92);
});

test("a true head and shoulders crop is still head and shoulders",()=>{
 // Hips far outside the frame and a silhouette only about two face-heights tall.
 const points=skeleton({23:landmark(2.4,.04),24:landmark(2.45,.05)});
 const shortMask=maskFilling(.55);
 const result=analyzeBody(points,shortMask,{x:.4,y:.1,width:.23,height:.21},.2);
 assert.equal(result.extent,"head_shoulders");
});

test("visible hips still read as half body",()=>{
 const points=skeleton({23:landmark(.94,.92),24:landmark(.95,.9)});
 assert.equal(analyzeBody(points,maskFilling(),face,.44).extent,"half_body");
});

test("visible knees read as three-quarter",()=>{
 const points=skeleton({23:landmark(.7,.95),24:landmark(.71,.95),25:landmark(.94,.8),26:landmark(.95,.8)});
 assert.equal(analyzeBody(points,maskFilling(),face,.44).extent,"three_quarter");
});

test("hands resting outside the frame cost nothing",()=>{
 const points=skeleton({23:landmark(1.09,.13),24:landmark(1.09,.15)});
 const result=analyzeBody(points,maskFilling(),face,.44);
 assert.equal(result.hands,"absent");
 assert.equal(result.handScore,100);
});

// --- visible limbs ---

test("an arm that leaves through a side edge is a chopped limb, hand or no hand",()=>{
 // Elbow clearly in shot, wrist tracked but predicted outside the left edge.
 const points=skeleton({23:landmark(1.09,.13),24:landmark(1.09,.15),13:landmark(.72,.9,.14),15:landmark(.78,.8,-.06)});
 const result=analyzeBody(points,maskFilling(),face,.44);
 assert.equal(result.choppedLimbs,1);
 assert.equal(result.hands,"partial");
 assert.equal(result.handScore,62);
 assert.ok(!result.handNote.includes("nothing to crop badly"));
 assert.match(result.handNote,/arm/i);
});

test("an arm continuing past the bottom edge is normal half-body framing",()=>{
 // Every waist-up portrait cuts the subject at the bottom; that is not an awkward crop.
 const points=skeleton({23:landmark(1.09,.13),24:landmark(1.09,.15),13:landmark(.86,.9,.3),15:landmark(1.12,.8,.28)});
 const result=analyzeBody(points,maskFilling(),face,.44);
 assert.equal(result.choppedLimbs,0);
 assert.equal(result.hands,"absent");
 assert.equal(result.handScore,100);
});

test("both arms chopped at the edges is the harder failure",()=>{
 const points=skeleton({23:landmark(1.09,.13),24:landmark(1.09,.15),13:landmark(.72,.9,.03),14:landmark(.73,.9,.97)});
 const result=analyzeBody(points,maskFilling(),face,.44);
 assert.equal(result.choppedLimbs,2);
 assert.equal(result.handScore,34);
});

// --- accessories: silhouette impact only, never style ---

const maskWithHat=()=>{
 const width=32,height=32,data=new Float32Array(width*height);
 for(let y=Math.round(.08*height);y<height;y+=1)for(let x=12;x<20;x+=1)data[y*width+x]=1;
 // A wide brim spanning most of the frame across the head band.
 for(let y=2;y<6;y+=1)for(let x=2;x<30;x+=1)data[y*width+x]=1;
 return {width,height,data};
};

test("an ordinary head reads as no accessory impact",()=>{
 const points=skeleton({23:landmark(1.09,.13),24:landmark(1.09,.15)});
 const result=analyzeBody(points,maskFilling(),face,.44);
 assert.ok(result.headSpread<2.2,`ordinary hair and head, got ${result.headSpread}`);
 assert.equal(result.accessoryImpact,0);
});

test("an oversized hat widens the silhouette and costs crop flexibility",()=>{
 const points=skeleton({23:landmark(1.09,.13),24:landmark(1.09,.15)});
 const result=analyzeBody(points,maskWithHat(),{x:.4,y:.16,width:.23,height:.21},.44);
 assert.ok(result.headSpread>2.2,`expected a wide silhouette, got ${result.headSpread}`);
 assert.ok(result.accessoryImpact>0);
 assert.match(result.note,/accessory|crop/i);
 assert.ok(!/hat|beach|inappropriate/i.test(result.note),"the note is about layout, never about the item");
});
