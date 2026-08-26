import type {PhotoStatus, QualityDefect} from "./photo-decision.ts";

// AI usability answers one question, separate from marketing readiness: does this photograph carry
// enough *reliable identity information* for an identity-preserving enhancement to reproduce the agent
// faithfully? It is a measurement of the file, never of the person. Framing, crop, selfie cues, body
// extent and background all carry zero weight here — those are precisely what an enhancement can
// rebuild. What it cannot rebuild is a face the file never captured, so only detail on the face counts.
export type AiUsabilitySignals={faceCount:number;faceHeightPixels:number;faceClarity:number;structureScore:number;focusScore:number;fidelityScore:number;faceClearance:number;qualityDefects:QualityDefect[];marketingStatus:PhotoStatus};
export type AiUsability={score:number;eligible:boolean;reason:string};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));

// 70 mirrors the designer-review floor: below it the identity anchors — eyes, brows, lip and nose
// boundaries — are too thin for an enhancement to be trusted to keep them. `facePixels` is the hard
// anchor count: under 150px of face height a portrait can still be *designed* with (small web use), but
// there is not enough structure for anything that re-renders the face to stay faithful to it.
export const aiUsabilityThresholds={eligible:70,facePixels:150} as const;
export const aiUsabilityWeights={faceDetail:.35,faceClarity:.25,structure:.2,focus:.1,fidelity:.1} as const;

// Face height in pixels → how much identity detail those pixels can hold. Steep under 150px because
// features become blocks; flat past 400px because more pixels stop adding information.
export const faceDetailCurve=(faceHeightPixels:number)=>faceHeightPixels<90?0:faceHeightPixels<150?(faceHeightPixels-90)/60*55:faceHeightPixels<260?55+(faceHeightPixels-150)/110*35:faceHeightPixels<400?90+(faceHeightPixels-260)/140*10:100;

export function assessAiUsability(signals:AiUsabilitySignals):AiUsability{
 if(signals.faceCount<1)return {score:0,eligible:false,reason:"No clear face was detected, so there is no identity reference to preserve."};
 const w=aiUsabilityWeights,facePixels=Math.max(0,signals.faceHeightPixels);
 const score=rounded(faceDetailCurve(facePixels)*w.faceDetail+clamp(signals.faceClarity)*w.faceClarity+clamp(signals.structureScore)*w.structure+clamp(signals.focusScore)*w.focus+clamp(signals.fidelityScore)*w.fidelity);
 // Every gate here is a measurement. A validated defect (severe blur, unusable face, degradation) means
 // the identity anchors are genuinely gone; a second face means the reference is ambiguous; a face running
 // off the edge is missing part of itself. Judgement calls — crop, selfie, composition — never appear.
 const defect=signals.qualityDefects[0]??null;
 // A re-upload verdict is the one marketing status that closes enhancement too: the file itself is too
 // small, so there are no pixels to enhance from whatever the face score says. A retake recommendation is
 // different — it says a *designer* cannot work from this photograph (framing, background, body), and none
 // of that is what an identity-preserving generation reuses. If the face detail is genuinely there, the
 // enhancement may run; what the retake still closes is the original itself (`designerReviewEligible`).
 if(signals.marketingStatus==="REUPLOAD")return {score,eligible:false,reason:"Re-upload recommended — supply the original at a higher resolution before AI enhancement can run on it."};
 if(signals.faceCount>1)return {score,eligible:false,reason:`${signals.faceCount} faces detected — the identity reference must be a single person.`};
 if(defect)return {score,eligible:false,reason:`${defect.label}. ${defect.evidence}`};
 if(signals.faceClearance<.005)return {score,eligible:false,reason:"The face runs off the edge of the frame, so part of the identity reference is missing."};
 if(facePixels<aiUsabilityThresholds.facePixels)return {score,eligible:false,reason:`About ${Math.round(facePixels)}px of face height — below the ${aiUsabilityThresholds.facePixels}px an identity-preserving enhancement needs.`};
 if(score<aiUsabilityThresholds.eligible)return {score,eligible:false,reason:`AI usability ${score} is below the ${aiUsabilityThresholds.eligible} needed to reproduce the face reliably.`};
 return {score,eligible:true,reason:"Sufficient identity detail on the face for an identity-preserving enhancement."};
}
