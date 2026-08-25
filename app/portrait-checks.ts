import type {HandState} from "./photo-body";
import type {QualityDefect} from "./photo-decision";

// Automatic checks on an AI-enhanced portrait, all pure so they can be tested outside the browser.
// They answer "did the enhancement keep the person and introduce nothing a designer would have to hide?"
// An enhanced image is never presented as passed on its marketing score alone: a beautiful render of
// somebody else is worse than the original, so identity is a hard term and every other check is a veto.
export type PortraitCheckSignals={faceCount:number;faceHeightPixels:number;hands:HandState;structureScore:number;fidelityScore:number;bodyProportion:number|null;qualityDefects:QualityDefect[]};
export type PortraitCheck={id:string;label:string;status:"PASS"|"FAIL"|"UNVERIFIED";detail:string};
export type PortraitVerdict={checks:PortraitCheck[];identityPreserved:boolean;passed:boolean;concerns:string[]};

// Identity similarity is a normalised cross-correlation of the face region, original against enhanced.
// .8 leaves room for relighting, retouching and resampling — all of which the local pipeline applies —
// while a different face, or one reshaped by a generative model, lands well below it. Fidelity falling
// 25 points means new noise or blockiness appeared. Structure is read frame-wide and a flat studio
// backdrop legitimately removes background edges and a tighter crop upscaled from a small source reads
// softer at the same inspection size, so a structure drop alone is not an artefact: it fails only when
// the drop is large AND the enhanced image has fallen under `structureFloor`, the bottom of the engine's
// "slightly soft" band and the edge of severe-blur territory — a portrait cannot get there by losing
// background texture or by resampling, only by having its edges smeared. Ordinary softness is already
// carried by the enhanced image's own marketing score, which is held to the same 80 as an upload.
// Proportion drift of 15% is the tolerance for a limb or torso that a generator has stretched; a
// uniform crop and scale changes the ratio by nothing.
export const portraitCheckThresholds={identitySimilarity:.8,structureDrop:25,structureFloor:35,fidelityDrop:25,proportionDrift:.15} as const;

const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));

// Normalised cross-correlation of two equal-length luminance samples, clamped to 0..1. Mean and scale
// are removed first so exposure and contrast changes — which an enhancement applies on purpose — do not
// read as a different person.
export function identitySimilarity(original:ArrayLike<number>,enhanced:ArrayLike<number>):number{
 const length=Math.min(original.length,enhanced.length);
 if(!length)return 0;
 let meanA=0,meanB=0;
 for(let index=0;index<length;index+=1){meanA+=original[index];meanB+=enhanced[index]}
 meanA/=length;meanB/=length;
 let cross=0,varianceA=0,varianceB=0;
 for(let index=0;index<length;index+=1){const a=original[index]-meanA,b=enhanced[index]-meanB;cross+=a*b;varianceA+=a*a;varianceB+=b*b}
 if(!varianceA||!varianceB)return varianceA===varianceB?1:0;
 return clamp(cross/Math.sqrt(varianceA*varianceB));
}

// `approvalThreshold` is `photoApprovalThresholds.approved`, passed in by the caller: the enhanced portrait is
// held to exactly the bar an upload is, and this module stays free of runtime imports so node can test it.
export function checkGeneratedPortrait(original:PortraitCheckSignals,enhanced:PortraitCheckSignals,enhancedScore:number,similarity:number|null,approvalThreshold:number):PortraitVerdict{
 const t=portraitCheckThresholds,check=(id:string,label:string,status:PortraitCheck["status"],detail:string):PortraitCheck=>({id,label,status,detail});
 const identityStatus=similarity===null?"UNVERIFIED":similarity>=t.identitySimilarity?"PASS":"FAIL";
 const enhancedDefect=enhanced.qualityDefects[0]??null;
 const structureDrop=original.structureScore-enhanced.structureScore,fidelityDrop=original.fidelityScore-enhanced.fidelityScore,structureSmeared=structureDrop>t.structureDrop&&enhanced.structureScore<t.structureFloor;
 const handsIntroduced=original.hands!=="partial"&&enhanced.hands==="partial";
 const proportionKnown=original.bodyProportion!==null&&enhanced.bodyProportion!==null&&original.bodyProportion>0;
 const proportionDrift=proportionKnown?Math.abs((enhanced.bodyProportion as number)-(original.bodyProportion as number))/(original.bodyProportion as number):0;
 const checks:PortraitCheck[]=[
  check("identity","Identity preservation",identityStatus,similarity===null?"The face could not be compared against the original.":`Face similarity ${Math.round(similarity*100)}% against the original${identityStatus==="PASS"?" — the same person, same features.":" — the features have drifted from the original."}`),
  check("face_integrity","Face integrity",enhanced.faceCount===1&&!enhancedDefect?"PASS":"FAIL",enhanced.faceCount!==1?`${enhanced.faceCount||"No"} face${enhanced.faceCount===1?"":"s"} detected in the enhanced portrait.`:enhancedDefect?`${enhancedDefect.label}. ${enhancedDefect.evidence}`:"One clear, intact face."),
  check("artifacts","AI artifact check",!structureSmeared&&fidelityDrop<=t.fidelityDrop?"PASS":"FAIL",structureSmeared?`Structural detail fell ${Math.round(structureDrop)} points to ${Math.round(enhanced.structureScore)} — edges have been repainted or smeared.`:fidelityDrop>t.fidelityDrop?`Image fidelity fell ${Math.round(fidelityDrop)} points — new noise or blockiness has appeared.`:structureDrop>t.structureDrop?`Structural detail read ${Math.round(structureDrop)} points lower — a plain backdrop carries fewer edges; the subject's detail is intact.`:"No new artefacts against the original."),
  check("hands","Hand & finger anatomy",handsIntroduced?"FAIL":"PASS",handsIntroduced?"A hand that was intact in the original is now cut or malformed.":enhanced.hands==="absent"?"No hands in the composition.":"Hands match the original."),
  check("body_proportion","Body proportion",!proportionKnown?"UNVERIFIED":proportionDrift<=t.proportionDrift?"PASS":"FAIL",!proportionKnown?"Body landmarks were not available on both images.":`Shoulder-to-face ratio changed ${Math.round(proportionDrift*100)}%${proportionDrift<=t.proportionDrift?" — within tolerance.":" — the body has been reshaped."}`),
 ];
 const identityPreserved=identityStatus==="PASS";
 // Identity must be *confirmed*, not merely not-refuted: an unverifiable face is a designer's call.
 const passed=identityPreserved&&enhancedScore>=approvalThreshold&&checks.every(item=>item.status!=="FAIL");
 const concerns=checks.filter(item=>item.status==="FAIL"||(item.id==="identity"&&item.status==="UNVERIFIED")).map(item=>`${item.label}: ${item.detail}`);
 if(enhancedScore<approvalThreshold)concerns.push(`Marketing readiness ${enhancedScore} is below the ${approvalThreshold} an enhanced portrait must reach.`);
 return {checks,identityPreserved,passed,concerns};
}
