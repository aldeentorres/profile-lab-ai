// The four category scores, in one place, as pure functions.
//
// Every one of them answers "how well does this meet the standard for usable marketing artwork?", never
// "can the model see it?". A face the detector is certain about is not a face a designer can lay up at
// size, so detection confidence never becomes a score on its own.
export const photoRatingWeights={technical_quality:.3,body_usability:.3,face_visibility:.2,editability:.2} as const;

export type CategoryInputs={
 sharpnessScore:number;
 // Strength of the structural edges — eyes, eyebrows, hairline, nose and lip boundaries, glasses, a
 // collar, clothing seams, the outer silhouette. Skin texture is deliberately not part of it: smooth or
 // retouched skin is not evidence of blur, so it must never read as one.
 structureScore:number;
 lightingScore:number;
 contrastScore:number;
 fidelityScore:number;
 resolutionScore:number;
 faceCount:number;
 faceHeightPixels:number;
 faceScaleScore:number;
 faceEdgeScore:number;
 bodyExtentScore:number;
 cropScore:number;
 handScore:number;
 usableArea:number;
 backgroundQuality:number;
 // 0 when nothing the agent is wearing changes the silhouette, 1 when a head accessory dominates the
 // frame. Judged purely on crop and layout flexibility — never on whether the accessory suits them.
 accessoryImpact:number;
};
export type CategoryScores={
 photoQuality:number;
 bodyCrop:number;
 faceVisibility:number;
 backgroundEditability:number;
 faceClarity:number;
 edgeQuality:number;
 rawScore:number;
};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));

// The tonal and separation reads the categories are built from. They live here, with the categories, so
// that "excellent" has to be earned in each of them: none of these formulas carries headroom that hands
// out 100 for merely being in the acceptable range.
export const exposureScore=(mean:number,blownRatio:number,crushedRatio:number)=>clamp(102-Math.abs(mean-145)*1.35-blownRatio*260-crushedRatio*90);
export const contrastScore=(deviation:number)=>clamp(100-Math.max(0,52-deviation)*2-Math.max(0,deviation-92)*1.4);
export const fidelityScore=(flatFieldNoise:number)=>clamp(100-flatFieldNoise*2.1);
// How cleanly the agent sits against what is behind them, before the sharpness of the edge is considered.
export const backgroundQualityScore=(backgroundEdgeMean:number,coverage:number,hasMask:boolean,faceCount:number)=>{
 const clarity=hasMask?clamp(102-backgroundEdgeMean*2.6):45,space=coverage?clamp(104-Math.max(0,coverage-.55)*180):45,separation=hasMask?clamp(64+coverage*80):40;
 return rounded(clarity*.55+space*.2+separation*.15+(faceCount<=1?100:20)*.1);
};

// A face needs real pixels on it before a designer can print it. Below roughly 220px of face height the
// detail is gone no matter how confident the detector was, so that is where full marks start.
export const faceDetailTarget=220;
// Resolution is not a separate axis: it is the ceiling on how much detail the other reads can possibly
// carry. A 169px-tall upload cannot be a sharp photo, cannot show a detailed face, and cannot give a
// clean subject edge to mask against — so it caps photo quality and edge quality rather than being
// scored on its own. Body framing is unaffected: a small file can still be well composed.
export const detailCeilings={photoQuality:(resolutionScore:number)=>40+resolutionScore*.57,edgeQuality:(resolutionScore:number)=>25+resolutionScore*.7};

// PHOTO QUALITY 30% — what the designer actually receives: detail, exposure, contrast, compression and
// the resolution that limits all of them.
// The detail term leads on structural edges rather than the frame-wide sharpness average, because the
// average is mostly skin and fabric: beauty retouching, soft studio lighting and ordinary portrait
// processing pull it down without costing a designer anything. Mild softness therefore takes a few
// points off this category, never a collapse.
export const detailScore=(input:CategoryInputs)=>clamp(clamp(input.sharpnessScore)*.35+clamp(input.structureScore)*.65);
export const photoQualityScore=(input:CategoryInputs)=>rounded(Math.min(
 detailScore(input)*.40+input.lightingScore*.22+input.contrastScore*.12+input.fidelityScore*.12+input.resolutionScore*.14,
 detailCeilings.photoQuality(input.resolutionScore),
));

// BODY & CROP USABILITY 30% — how much design flexibility the framing gives. How much of the agent is
// in shot leads, and a clean crop, intact hands and a decently sized subject scale it up from there.
// Crucially they scale it: a head-and-shoulders crop stays in the 20s and 30s however tidy it is, so
// "some torso is visible" can never buy a close-up selfie an 89.
export const bodyCropScore=(input:CategoryInputs)=>rounded(input.bodyExtentScore*(.54+.22*clamp(input.cropScore)/100+.10*clamp(input.handScore)/100+.06*clamp(input.usableArea)/100)*(1-.28*clamp(input.accessoryImpact,0,1)));

// FACE & SUBJECT VISIBILITY 20% — usable facial detail, not detector confidence. Clarity is the smaller
// of "are there enough pixels on the face" and "do the facial features actually resolve". The second
// half reads structure — eyes, eyebrows, hairline, nose and lip boundaries, glasses — and never skin,
// so this category only drops when the features are genuinely harder to use. A retouched face on plenty
// of pixels is a face a designer can work with, and scores like one.
// Above the usable floor the ceiling barely moves: the difference between crisp and softly processed
// features is worth a few points, not a category. Below it the features are genuinely going rather than
// merely softening, and the ceiling falls away with them.
export const structureUsableFloor=50;
export const featureCeiling=(structureScore:number)=>{const structure=clamp(structureScore);return structure>=structureUsableFloor?80+(structure-structureUsableFloor)*.4:structure*1.6};
export const faceClarityScore=(input:CategoryInputs)=>clamp(Math.min(input.faceHeightPixels/faceDetailTarget*100,featureCeiling(input.structureScore)));
export const faceVisibilityScore=(input:CategoryInputs)=>{
 if(!input.faceCount)return 0;
  // Face size and edge clearance are framing, and body & crop already scores framing. What is left for
 // this category to answer is the one thing nothing else measures: how much usable detail is on the face.
 const usable=input.faceScaleScore*.08+input.faceEdgeScore*.07+faceClarityScore(input)*.85;
 // More than one face is a submission problem, not a visibility problem, but it does make the agent
 // ambiguous — so it scales the category rather than zeroing it.
 return rounded(input.faceCount===1?usable:usable*.4);
};

// BACKGROUND & EDITABILITY 20% — can the agent actually be cut out and laid up? A plain backdrop is not
// enough on its own: a subject whose outline has genuinely dissolved has no edge to mask against. What
// matters here is the silhouette and the clothing boundaries, which is what the structure read measures
// — a softly lit subject with a crisp outline masks perfectly well and is not marked down for it.
export const edgeQualityScore=(input:CategoryInputs)=>clamp(Math.min(Math.max(clamp(input.sharpnessScore),clamp(input.structureScore)),detailCeilings.edgeQuality(input.resolutionScore)));
export const backgroundEditabilityScore=(input:CategoryInputs)=>rounded(input.backgroundQuality*.42+edgeQualityScore(input)*.34+clamp(input.cropScore)*.12+clamp(input.usableArea)*.12-clamp(input.accessoryImpact,0,1)*10);

export function scoreCategories(input:CategoryInputs):CategoryScores{
 const photoQuality=photoQualityScore(input),bodyCrop=bodyCropScore(input),faceVisibility=faceVisibilityScore(input),backgroundEditability=backgroundEditabilityScore(input);
 // The raw score is exactly the published weighting of the four numbers above — nothing else feeds it.
 const rawScore=rounded(photoQuality*photoRatingWeights.technical_quality+bodyCrop*photoRatingWeights.body_usability+faceVisibility*photoRatingWeights.face_visibility+backgroundEditability*photoRatingWeights.editability);
 return {photoQuality,bodyCrop,faceVisibility,backgroundEditability,faceClarity:rounded(faceClarityScore(input)),edgeQuality:rounded(edgeQualityScore(input)),rawScore};
}
