/* eslint-disable */
// Studio+ scoring engine — generated verbatim from app/photo-score.ts and app/photo-decision.ts via tsc (es2020).
// Pure functions, no DOM. Safe for an n8n Code node or any Node runtime.
var StudioEngine=(function(){
var scoreCategories,photoRatingWeights,applyPhotoDecision,validateQualityDefects,scoreCaps,photoApprovalThresholds,categoryFloors,designerReviewFloor,fileResolutionTargets,bodyExtentScores,bodyExtentLabels;
{
// The four category scores, in one place, as pure functions.
//
// Every one of them answers "how well does this meet the standard for usable marketing artwork?", never
// "can the model see it?". A face the detector is certain about is not a face a designer can lay up at
// size, so detection confidence never becomes a score on its own.
const photoRatingWeights = { technical_quality: .3, body_usability: .3, face_visibility: .2, editability: .2 };
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const rounded = (value) => Math.round(clamp(value));
// The tonal and separation reads the categories are built from. They live here, with the categories, so
// that "excellent" has to be earned in each of them: none of these formulas carries headroom that hands
// out 100 for merely being in the acceptable range.
const exposureScore = (mean, blownRatio, crushedRatio) => clamp(102 - Math.abs(mean - 145) * 1.35 - blownRatio * 260 - crushedRatio * 90);
const contrastScore = (deviation) => clamp(100 - Math.max(0, 52 - deviation) * 2 - Math.max(0, deviation - 92) * 1.4);
const fidelityScore = (flatFieldNoise) => clamp(100 - flatFieldNoise * 2.1);
// How cleanly the agent sits against what is behind them, before the sharpness of the edge is considered.
const backgroundQualityScore = (backgroundEdgeMean, coverage, hasMask, faceCount) => {
    const clarity = hasMask ? clamp(102 - backgroundEdgeMean * 2.6) : 45, space = coverage ? clamp(104 - Math.max(0, coverage - .55) * 180) : 45, separation = hasMask ? clamp(64 + coverage * 80) : 40;
    return rounded(clarity * .55 + space * .2 + separation * .15 + (faceCount <= 1 ? 100 : 20) * .1);
};
// A face needs real pixels on it before a designer can print it. Below roughly 220px of face height the
// detail is gone no matter how confident the detector was, so that is where full marks start.
const faceDetailTarget = 220;
// Resolution is not a separate axis: it is the ceiling on how much detail the other reads can possibly
// carry. A 169px-tall upload cannot be a sharp photo, cannot show a detailed face, and cannot give a
// clean subject edge to mask against — so it caps photo quality and edge quality rather than being
// scored on its own. Body framing is unaffected: a small file can still be well composed.
const detailCeilings = { photoQuality: (resolutionScore) => 40 + resolutionScore * .57, edgeQuality: (resolutionScore) => 25 + resolutionScore * .7 };
// PHOTO QUALITY 30% — what the designer actually receives: detail, exposure, contrast, compression and
// the resolution that limits all of them.
// The detail term leads on structural edges rather than the frame-wide sharpness average, because the
// average is mostly skin and fabric: beauty retouching, soft studio lighting and ordinary portrait
// processing pull it down without costing a designer anything. Mild softness therefore takes a few
// points off this category, never a collapse.
const detailScore = (input) => clamp(clamp(input.sharpnessScore) * .35 + clamp(input.structureScore) * .65);
const photoQualityScore = (input) => rounded(Math.min(detailScore(input) * .40 + input.lightingScore * .22 + input.contrastScore * .12 + input.fidelityScore * .12 + input.resolutionScore * .14, detailCeilings.photoQuality(input.resolutionScore)));
// BODY & CROP USABILITY 30% — how much design flexibility the framing gives. How much of the agent is
// in shot leads, and a clean crop, intact hands and a decently sized subject scale it up from there.
// Crucially they scale it: a head-and-shoulders crop stays in the 20s and 30s however tidy it is, so
// "some torso is visible" can never buy a close-up selfie an 89.
const bodyCropScore = (input) => rounded(input.bodyExtentScore * (.54 + .22 * clamp(input.cropScore) / 100 + .10 * clamp(input.handScore) / 100 + .06 * clamp(input.usableArea) / 100) * (1 - .28 * clamp(input.accessoryImpact, 0, 1)));
// FACE & SUBJECT VISIBILITY 20% — usable facial detail, not detector confidence. Clarity is the smaller
// of "are there enough pixels on the face" and "do the facial features actually resolve". The second
// half reads structure — eyes, eyebrows, hairline, nose and lip boundaries, glasses — and never skin,
// so this category only drops when the features are genuinely harder to use. A retouched face on plenty
// of pixels is a face a designer can work with, and scores like one.
// Above the usable floor the ceiling barely moves: the difference between crisp and softly processed
// features is worth a few points, not a category. Below it the features are genuinely going rather than
// merely softening, and the ceiling falls away with them.
const structureUsableFloor = 50;
const featureCeiling = (structureScore) => { const structure = clamp(structureScore); return structure >= structureUsableFloor ? 80 + (structure - structureUsableFloor) * .4 : structure * 1.6; };
const faceClarityScore = (input) => clamp(Math.min(input.faceHeightPixels / faceDetailTarget * 100, featureCeiling(input.structureScore)));
const faceVisibilityScore = (input) => {
    if (!input.faceCount)
        return 0;
    // Face size and edge clearance are framing, and body & crop already scores framing. What is left for
    // this category to answer is the one thing nothing else measures: how much usable detail is on the face.
    const usable = input.faceScaleScore * .08 + input.faceEdgeScore * .07 + faceClarityScore(input) * .85;
    // More than one face is a submission problem, not a visibility problem, but it does make the agent
    // ambiguous — so it scales the category rather than zeroing it.
    return rounded(input.faceCount === 1 ? usable : usable * .4);
};
// BACKGROUND & EDITABILITY 20% — can the agent actually be cut out and laid up? A plain backdrop is not
// enough on its own: a subject whose outline has genuinely dissolved has no edge to mask against. What
// matters here is the silhouette and the clothing boundaries, which is what the structure read measures
// — a softly lit subject with a crisp outline masks perfectly well and is not marked down for it.
const edgeQualityScore = (input) => clamp(Math.min(Math.max(clamp(input.sharpnessScore), clamp(input.structureScore)), detailCeilings.edgeQuality(input.resolutionScore)));
const backgroundEditabilityScore = (input) => rounded(input.backgroundQuality * .42 + edgeQualityScore(input) * .34 + clamp(input.cropScore) * .12 + clamp(input.usableArea) * .12 - clamp(input.accessoryImpact, 0, 1) * 10);
scoreCategories=function(input) {
    const photoQuality = photoQualityScore(input), bodyCrop = bodyCropScore(input), faceVisibility = faceVisibilityScore(input), backgroundEditability = backgroundEditabilityScore(input);
    // The raw score is exactly the published weighting of the four numbers above — nothing else feeds it.
    const rawScore = rounded(photoQuality * photoRatingWeights.technical_quality + bodyCrop * photoRatingWeights.body_usability + faceVisibility * photoRatingWeights.face_visibility + backgroundEditability * photoRatingWeights.editability);
    return { photoQuality, bodyCrop, faceVisibility, backgroundEditability, faceClarity: rounded(faceClarityScore(input)), edgeQuality: rounded(edgeQualityScore(input)), rawScore };
}
}
{
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
// Pixel dimensions the marketing outputs actually need on the shortest edge.
// A file only blocks submission when it is too small to use anywhere at all.
fileResolutionTargets= { unusable: 300, usable: 600, recommended: 1000 };
bodyExtentLabels= { full_body: "Full body", three_quarter: "Three-quarter", half_body: "Half body", chest_up: "Head & chest", head_shoulders: "Head & shoulders", head_only: "Head only", unknown: "Unverified" };
bodyExtentScores= { full_body: 100, three_quarter: 100, half_body: 92, chest_up: 58, head_shoulders: 38, head_only: 14, unknown: 0 };
const rounded = (value) => Math.round(clamp(value));
// What to actually do about each gate, so the advice answers the reason the photo was turned down.
const retakeInstructions = {
    face_missing: "Take a new photo where the face is clearly visible and unobstructed.",
    face_unusable: "Send a photo taken closer, or at a higher resolution — there is too little detail on the face to use.",
    multiple_people: "Send a photo with only the agent in frame.",
    severe_blur: "Retake with the camera steady and the focus on the eyes.",
    screenshot: "Send the original photo file rather than a screenshot of it.",
    insufficient_body: "Step back so the frame reaches at least the waist.",
    minimal_body: "Step back so the frame reaches at least the waist — only the head and shoulders are in shot.",
    chopped_limbs: "Keep visible arms fully in frame, or leave them out of the composition entirely.",
    mirror_selfie: "Ask someone else to take the photo rather than shooting into a mirror.",
    subject_detail_floor: "Re-supply the original photo, or retake it sharper and closer — there is not enough usable detail on the subject.",
    low_resolution_detail_loss: "Re-upload the original file — at this size the facial detail is already pixelated away.",
    severe_degradation: "Re-supply the original photo file — this copy is too compressed or pixelated to use.",
    oversized_accessory: "Step back, or take the photo without the oversized headwear, so the agent can be cropped and laid up freely.",
    awkward_crop: "Leave room around the agent so nothing important is cut through.",
    severe_face_crop: "Leave space around the head — the face is running off the edge.",
    chopped_hands: "Keep hands fully in frame, or leave them out of the composition entirely.",
    obvious_selfie: "Ask someone else to take it, framed from head to waist with the camera at chest height.",
    casual_snapshot: "Ask someone else to take a portrait from head to waist, camera at chest height, against a tidy background.",
    severe_exposure: "Retake with even light on the face.",
    extreme_background: "Retake against a plainer background, or step further away from it.",
    unusable_for_design: "Frame the agent larger, with at least half the body in shot.",
};
photoApprovalThresholds= { approved: 80, review: 65, score: 80 };
// Some submission failures are not fully described by the four category scores. A phone screenshot can
// be sharp, well framed and easy to mask and still be the wrong file to send. Those failures apply a
// transparent maximum instead of a hidden deduction:
//
//   finalScore = min(rawScore, lowest applicable cap)
//
// The cap is a ceiling, not a value: a weak photo that also trips a gate keeps its own lower raw score.
// Nothing else moves the number — no deductions, no band fitting, no forcing the score to match a verdict.
scoreCaps= {
    // Wrong kind of submission — the photograph may be fine, the file is not what a designer needs.
    obvious_selfie: 59,
    casual_snapshot: 59,
    screenshot: 55,
    mirror_selfie: 49,
    // Not enough of the agent, or the frame cuts through them.
    insufficient_body: 59,
    minimal_body: 49,
    chopped_limbs: 59,
    awkward_crop: 59,
    chopped_hands: 59,
    severe_face_crop: 49,
    unusable_for_design: 49,
    // The image itself fails the minimum a designer can work from.
    severe_blur: 39,
    face_missing: 39,
    face_unusable: 39,
    severe_exposure: 39,
    severe_degradation: 39,
    multiple_people: 39,
    extreme_background: 49,
    low_resolution_detail_loss: 59,
    // Weak subject scores backed by a confirmed visual defect (see below). A clean background or a good
    // body crop is never allowed to carry a photo whose subject detail is genuinely gone.
    subject_detail_floor: 64,
    design_readiness_floor: 79,
    // Review-level: worth a human look, and the number says so rather than reading as ready.
    likely_selfie: 79,
    snapshot_cues: 79,
};
// Photo quality and face visibility are foundational: a designer cannot invent facial detail that the
// upload does not carry, however good the crop and background are. They are still only scores, though,
// and a score is an estimate — so `ready` holds a photo at designer review, and `review` is one half of
// a retake test whose other half is a confirmed visual defect. Neither number rejects on its own.
categoryFloors= { ready: { photoQuality: 72, faceVisibility: 75, bodyCrop: 70 }, review: { photoQuality: 65, faceVisibility: 65 } };
// Designer review is for challenging AI *judgement*, never for rescuing a bad file. A photo qualifies
// when nothing measured in the image is wrong with it — see `validateQualityDefects` — and the photo
// quality clears this floor. It sits deliberately between the two above: 65 reviews, 70 may be
// disputed, 72 is ready. A photo at 71 is below the ready bar and can argue the point; one at 69
// cannot, because at that level the weakness is in the photograph rather than in the verdict.
designerReviewFloor= 70;
// Background edge magnitude above which a scene reads as busy. `lived` is the generic "not a plain
// backdrop" bar; `lostSubjectTexture` is deliberately higher, because concluding that the agent is lost
// in the scene is a much stronger claim than noticing the background is not seamless paper.
const snapshotCueThresholds = { lived: 8, lostSubjectTexture: 14 };
// Gates a measured defect produced. These are the objectively technical failures, and they are the only
// ones a designer cannot overrule: no judgement recovers detail the file does not carry.
const defectBackedGates = new Set(["severe_blur", "face_unusable", "severe_degradation", "low_resolution_detail_loss", "subject_detail_floor"]);
const qualityDefectRules = {
    // Two independent reads must agree before an image is called unusably blurred: the structural edges
    // have gone, and the frame-wide focus read confirms it rather than blaming retouching for it.
    severeBlur: { structure: 30, focus: 35 },
    // Fewer pixels on the face than any output can print from, whatever the rest of the file measures.
    faceDetail: { pixels: 90 },
    // Small file AND the detail loss it implies is actually visible on the subject. Small dimensions on
    // their own are never a defect — a good photograph in a small file is still a good photograph.
    lowResolution: { minimumDimension: fileResolutionTargets.usable, facePixels: 150, structure: 48 },
    // Blocky, over-compressed or corrupted: no structural edge survives, at any scale, anywhere.
    degradation: { structure: 22, fidelity: 32, supportingStructure: 40 },
};
validateQualityDefects=function(signals) {
    const defects = [];
    const structure = clamp(signals.structureScore ?? 0), focus = Math.min(clamp(signals.focusScore ?? 0), clamp(signals.sharpnessScore ?? 0));
    const facePixels = signals.faceCount > 0 ? Math.max(0, signals.faceHeightPixels ?? 0) : 0, fidelity = clamp(signals.fidelityScore ?? 100);
    const rules = qualityDefectRules;
    if (structure < rules.severeBlur.structure && focus < rules.severeBlur.focus)
        defects.push({ id: "severe_blur", label: "Severe blur — the subject cannot be edited", evidence: `Structural detail ${Math.round(structure)}/100 and focus ${Math.round(focus)}/100: the facial features and the subject outline have both lost definition.` });
    if (facePixels > 0 && facePixels < rules.faceDetail.pixels)
        defects.push({ id: "face_unusable", label: "Too little usable detail on the face", evidence: `Roughly ${Math.round(facePixels)}px of face height — below the detail any marketing output can print.` });
    if (facePixels > 0 && signals.minimumDimension < rules.lowResolution.minimumDimension && facePixels < rules.lowResolution.facePixels && structure < rules.lowResolution.structure)
        defects.push({ id: "low_resolution_detail_loss", label: "Low resolution with visible loss of facial detail", evidence: `${signals.minimumDimension}px shortest edge, ~${Math.round(facePixels)}px of face, structural detail ${Math.round(structure)}/100 — the detail is visibly pixelated away, not merely small.` });
    if (structure < rules.degradation.structure || (fidelity < rules.degradation.fidelity && structure < rules.degradation.supportingStructure))
        defects.push({ id: "severe_degradation", label: "Pixelation or compression has destroyed the subject detail", evidence: `Structural detail ${Math.round(structure)}/100, compression fidelity ${Math.round(fidelity)}/100.` });
    return defects;
}
applyPhotoDecision=function(baseScore, signals) {
    const requirement = (id, label, score, pass, confidence, severity, detail) => ({ id, label, status: pass ? "PASS" : "FAIL", score: rounded(score), confidence: Number(clamp(confidence, 0, 1).toFixed(2)), severity: pass ? "none" : severity, detail });
    const hasFace = signals.faceCount > 0, singleAgent = signals.faceCount === 1, severeCrop = hasFace && signals.faceClearance < .005, moderateCrop = hasFace && signals.faceClearance < .025;
    // Validated before any gate reads a category score, because no category score may reject without one.
    const qualityDefects = validateQualityDefects(signals), defect = (id) => qualityDefects.find(item => item.id === id) ?? null;
    const subjectDetailFailed = signals.photoQuality < categoryFloors.review.photoQuality && signals.faceVisibility < categoryFloors.review.faceVisibility && qualityDefects.length > 0;
    const minimalBody = signals.bodyExtent === "head_only" || signals.bodyExtent === "head_shoulders", chestOnly = signals.bodyExtent === "chest_up", thinBody = minimalBody || chestOnly, unknownBody = signals.bodyExtent === "unknown";
    const requirements = [
        // "Slightly soft" and "cannot be cleanly used" are different findings and are never stated as if they
        // were the same one. Only a validated severe-blur defect earns the second wording.
        requirement("focus", "Sharpness & focus", Math.min(signals.sharpnessScore, signals.focusScore), Math.min(signals.sharpnessScore, signals.focusScore) >= 55 || clamp(signals.structureScore ?? 0) >= 60, .85, defect("severe_blur") ? "critical" : "warning", defect("severe_blur") ? "The subject is genuinely out of focus — the facial features and outline cannot be cleanly used" : Math.min(signals.sharpnessScore, signals.focusScore) >= 55 ? "Sharp enough to edit and print at size" : clamp(signals.structureScore ?? 0) >= 60 ? "Softly processed, but the eyes, hairline and clothing edges stay usable" : "Slightly soft — check focus on the eyes"),
        requirement("face_visibility", "Face clearly visible", hasFace ? 100 : 0, hasFace, .9, "critical", hasFace ? "The agent's face is clearly visible" : "No clear face detected in this agent portrait"),
        requirement("single_agent", "One agent", singleAgent ? 100 : signals.faceCount ? 25 : 0, singleAgent, .9, "critical", singleAgent ? "Exactly one agent detected" : signals.faceCount > 1 ? `${signals.faceCount} faces detected — submit one agent only` : "Cannot verify a single agent without a visible face"),
        requirement("body_visible", "Enough body visible", bodyExtentScores[signals.bodyExtent], !thinBody && !unknownBody, .8, thinBody ? "critical" : "warning", unknownBody ? "Body framing could not be verified" : minimalBody ? "Only the head and shoulders are in frame — a designer needs at least half the body" : chestOnly ? "The frame stops at the chest — a designer needs it to reach the waist" : `${bodyExtentLabels[signals.bodyExtent]} in frame — enough area for marketing layouts`),
        requirement("crop_safety", "Clean crop", signals.cropScore, signals.cropScore >= 62, .8, signals.cropScore < 40 ? "critical" : "warning", signals.cropScore >= 62 ? "Nothing important is cut off" : signals.cropScore < 40 ? "The agent is cropped in a way that limits editing" : "Slightly awkward crop — leave a little more room"),
        requirement("hands", "Hand & limb framing", signals.hands === "partial" ? 55 : 100, signals.hands !== "partial", .7, "warning", signals.hands === "complete" ? "Visible hands are fully in frame" : signals.hands === "absent" ? "Hands and arms are outside the composition — nothing to crop badly" : signals.choppedLimbs ? "A visible arm runs off the side of the frame and stops in mid-air" : "A visible hand is cut off at the frame edge, which is awkward to mask"),
        requirement("selfie", "Intentionally photographed", (1 - signals.selfieProbability) * 100, signals.selfieProbability < .5 && !signals.isScreenshot, Math.max(.62, Math.abs(signals.selfieProbability - .5) * 1.6), signals.selfieProbability >= .75 || signals.isScreenshot ? "critical" : "warning", signals.isScreenshot ? "This is a phone screenshot, not a supplied photo file" : signals.selfieProbability < .2 ? "Reads as an intentionally taken portrait" : signals.selfieProbability < .5 ? "Some selfie cues — worth a quick look" : "Reads as a casual or mirror selfie"),
        requirement("source_frame", "Original photo file", Math.round(signals.contentCoverage * 100), !signals.letterboxed, .78, "warning", signals.letterboxed ? "Padded with empty canvas — a designer trims that in seconds; supply the original where you have it" : "Supplied as a full photo frame"),
        requirement("exposure", "Exposure", signals.lightingScore, signals.lightingScore >= 60, .9, signals.lightingScore < 35 ? "critical" : "warning", signals.lightingScore >= 60 ? "Exposure is usable" : "Lighting is too dark, bright, or uneven"),
        requirement("background", "Background & editability", signals.backgroundQuality, signals.backgroundQuality >= 60, .72, signals.backgroundQuality < 30 ? "critical" : "warning", signals.backgroundQuality >= 60 ? "Clean enough to isolate the agent" : "Background is distracting and makes editing harder"),
        requirement("designer_usability", "Designer usability", signals.designerUsability, signals.designerUsability >= 60, .78, signals.designerUsability < 35 ? "critical" : "warning", signals.designerUsability >= 60 ? "Usable for profile and marketing layouts" : "Not enough usable subject area for design work"),
        requirement("accessory_fit", "Accessory fit for layout", rounded(100 - signals.accessoryImpact * 45), signals.accessoryImpact < .4, .6, "warning", signals.accessoryImpact < .4 ? "Nothing the agent is wearing limits the crop" : "A head accessory widens the silhouette and limits cropping and layout — the accessory itself is fine, its size in this frame is not"),
        // Fails only when weak scores and a confirmed visual defect agree. A 63 on its own is an estimate.
        requirement("subject_detail", "Usable subject detail", Math.min(signals.photoQuality, signals.faceVisibility), !subjectDetailFailed, .85, "critical", subjectDetailFailed ? `Too little usable detail on the subject — a clean crop and background cannot make up for it. ${qualityDefects[0].evidence}` : qualityDefects.length ? qualityDefects[0].evidence : "Enough detail on the subject to edit and print"),
        requirement("resolution", "File resolution", signals.resolutionScore, signals.minimumDimension >= fileResolutionTargets.usable, 1, "warning", signals.minimumDimension >= fileResolutionTargets.recommended ? "Large enough for every marketing output" : signals.minimumDimension >= fileResolutionTargets.usable ? `${signals.minimumDimension}px shortest edge — fine for profile cards, tight for large banners` : `${signals.minimumDimension}px shortest edge — good photo, small file; re-supply the original if you need print size`),
    ];
    const penalties = [], addPenalty = (id, label, points, cap, forces_status) => penalties.push({ id, label, points, cap, forces_status });
    // A hard gate may only fire when the problem materially prevents — or significantly limits — a graphic
    // designer from using the agent in marketing artwork. Cosmetic imperfections (padding or empty canvas,
    // aspect ratio, moderate resolution limits, casual posing, sitting, leaning, clothing style, naturally
    // hidden hands) are editable in seconds and must never force a verdict: they move the score only.
    // A hard gate decides the verdict and never edits the number: the technical qualities of the photograph
    // do not get worse because a gate fired, and a capped score hides what the photo is actually like.
    const blocker = (id, label) => addPenalty(id, label, 0, scoreCaps[id] ?? null, "REJECT");
    // Notes are exactly that: the four category scores already carry these problems, so a note never
    // deducts a second time. Where a note describes something the categories cannot see, it carries a cap.
    const note = (id, label, forces = null) => addPenalty(id, label, 0, scoreCaps[id] ?? null, forces);
    const focus = Math.min(signals.sharpnessScore, signals.focusScore);
    // --- Hard gates: a designer cannot work with this person from this photo. ---
    if (!hasFace)
        blocker("face_missing", "Face not clearly visible");
    if (signals.faceCount > 1)
        blocker("multiple_people", "Multiple people detected");
    // Detecting a face is not the same as having a face a designer can use — but "cannot be used" is a
    // measurement of the pixels actually on the face, not a threshold on a derived score.
    if (hasFace && defect("face_unusable"))
        blocker("face_unusable", "Too little usable detail on the face");
    // Retouching, smooth skin, soft studio processing, AI enhancement and mild compression all lower a
    // sharpness read without making the photo impractical. Only the validated defect — structural edges
    // gone and the focus read agreeing — is severe blur; everything softer than that is reported by the
    // category scores (photo quality, face visibility, editability) and by the notes below.
    if (defect("severe_blur"))
        blocker("severe_blur", "Severe blur — the subject cannot be edited");
    if (defect("severe_degradation"))
        blocker("severe_degradation", "Pixelation or compression has destroyed the subject detail");
    // Small dimensions alone are advisory (see the file axis below). This fires only when the small file
    // has visibly cost the face its detail.
    if (defect("low_resolution_detail_loss"))
        blocker("low_resolution_detail_loss", "Low resolution with visible loss of facial detail");
    if (signals.isScreenshot)
        blocker("screenshot", "Phone screenshot, not a photo file");
    if (minimalBody)
        blocker("minimal_body", "Only head and shoulders in frame");
    else if (chestOnly)
        blocker("insufficient_body", "The frame stops at the chest, above the waist");
    if (signals.cropScore < 40)
        blocker("awkward_crop", "The crop cuts through the agent");
    if (severeCrop)
        blocker("severe_face_crop", "Face severely cropped");
    if (signals.hands === "partial" && signals.handScore <= 40)
        blocker("chopped_hands", "Both hands are chopped at the frame edge");
    // A visible arm running off the side of the frame is a crop problem whether or not the hand was ever
    // in shot. Arms continuing past the bottom edge are normal half-body framing and never counted here.
    if (signals.choppedLimbs >= 1 && signals.hands !== "complete")
        blocker("chopped_limbs", "A visible arm is cut off at the frame edge");
    // A mirror or arm's-length selfie is the least usable of the selfie shapes: the camera is right on the
    // agent and there is almost no body left to lay up, so it caps lower than a merely close self-portrait.
    if (signals.selfieProbability >= .85 && (signals.handAtFace || minimalBody))
        blocker("mirror_selfie", "Mirror or arm's-length selfie");
    else if (signals.selfieProbability >= .75)
        blocker("obvious_selfie", "Obvious casual selfie");
    if (signals.lightingScore < 35)
        blocker("severe_exposure", "Exposure is too far gone to edit");
    if (signals.backgroundQuality < 30)
        blocker("extreme_background", "Background makes isolating the agent impossible");
    if (signals.designerUsability < 35)
        blocker("unusable_for_design", "Not enough usable subject area to design with");
    // Obvious selfie / incidental snapshot. Never decided by one cue: a lived-in room, a phone aspect ratio or
    // a relaxed pose are each perfectly acceptable alone. Several agreeing cues are what make it a snapshot
    // rather than a portrait somebody set out to take.
    const snapshotCues = [
        { id: "lived_in_scene", label: "Photographed in a lived-in room rather than set up as a portrait", weight: 1, hit: signals.backgroundTexture >= snapshotCueThresholds.lived },
        { id: "full_frame_capture", label: "Straight-off-the-phone or webcam framing", weight: .5, hit: signals.frameAspect <= .6 || signals.frameAspect >= 1.15 },
        { id: "camera_close", label: "Camera held close to the face", weight: 1, hit: signals.faceHeight >= .28 },
        { id: "hand_at_face", label: "Hand raised into frame at face height", weight: .5, hit: signals.handAtFace && signals.backgroundTexture >= snapshotCueThresholds.lived },
        { id: "camera_tilt", label: "Hand-held camera tilt", weight: .5, hit: signals.shoulderTilt >= 10 },
        // Low coverage on its own means nothing: a standing figure in a 2:3 frame covers about a quarter of
        // it, and `bodyExtentScores` rates full-body framing at 100. So "small in frame" only reads as lost
        // when the scene around them is genuinely busy — a measured studio sweep sits near 9, a cluttered
        // room near 20. Sharing the 8 threshold with `lived_in_scene` made a deliberate full-length portrait
        // trip both cues at once and reach the blocking weight of 2 on a single borderline measurement.
        { id: "subject_lost_in_scene", label: "The agent occupies little of the frame", weight: 1, hit: signals.subjectCoverage < .34 && signals.backgroundTexture >= snapshotCueThresholds.lostSubjectTexture },
        { id: "torso_cut_short", label: "The frame stops above the waist", weight: .5, hit: signals.torsoVisible > 0 && signals.torsoVisible < .9 },
    ];
    const snapshotSignals = snapshotCues.filter(cue => cue.hit).map(({ id, label, weight }) => ({ id, label, weight }));
    const snapshotWeight = snapshotSignals.reduce((total, cue) => total + cue.weight, 0);
    if (snapshotWeight >= 2)
        blocker("casual_snapshot", "Obvious selfie or incidental snapshot, not a portrait taken for marketing use");
    else if (snapshotWeight >= 1.5)
        note("snapshot_cues", "Some snapshot framing cues — worth a human look", "REVIEW");
    // --- Notes only. Each of these already shows up in a category score, so none of them deducts again:
    // softness is in photo quality and face visibility, a busy background is in editability, a tight crop
    // is in body & crop usability. Punishing them a second time here would double-count one problem. ---
    if (focus >= 35 && focus < 55 && clamp(signals.structureScore ?? 0) < 60)
        note("soft_image", "Slightly soft — the original file is preferred where available");
    if (signals.letterboxed)
        note("padded_export", "Empty canvas around the photo — trimmed in seconds");
    if (signals.lightingScore >= 35 && signals.lightingScore < 60)
        note("poor_exposure", "Exposure needs a lift");
    if (signals.backgroundQuality >= 30 && signals.backgroundQuality < 60)
        note("busy_background", "Background is slightly distracting");
    if (signals.designerUsability >= 35 && signals.designerUsability < 60)
        note("limited_design_use", "Limited space for the designer");
    if (signals.cropScore >= 40 && signals.cropScore < 62)
        note("tight_crop", "Slightly awkward crop");
    if (moderateCrop && !severeCrop)
        note("tight_face_crop", "Face sits close to the frame edge");
    if (signals.hands === "partial" && signals.handScore > 40)
        note("cut_hands", "A visible hand is cut off at the frame edge");
    // Selfie framing the categories cannot see on their own: worth a designer's eye, so it caps at review level.
    if (signals.selfieProbability >= .5 && signals.selfieProbability < .75)
        note("likely_selfie", "Likely selfie framing", "REVIEW");
    if (signals.accessoryImpact >= .4)
        note("oversized_accessory", "A head accessory widens the silhouette and limits cropping and layout");
    // Score answers "is this a good photograph?" only — every capping penalty above is about what the
    // photograph shows, never about how many pixels the uploaded file happens to carry.
    // --- Critical category floors. Photo quality and face visibility are foundational: they describe how
    // much of the agent actually survived into the file, and no crop or background score can put detail
    // back. But a category score is an estimate, and a slightly inaccurate estimate must never be enough
    // on its own to turn down a good portrait. So the retake floor is a conjunction: both foundational
    // scores in the genuinely-degraded band AND a defect confirmed in the image. Neither half rejects
    // alone — a 63 with intact structural detail is a photo, not a fault. A floor is not a penalty; it is
    // a ceiling, applied the same transparent way as any gate. ---
    const { photoQuality, faceVisibility, bodyCrop } = signals;
    const subjectScoresPoor = photoQuality < categoryFloors.review.photoQuality && faceVisibility < categoryFloors.review.faceVisibility;
    const subjectFloorFailed = subjectDetailFailed;
    const readyFloorFailed = photoQuality < categoryFloors.ready.photoQuality || faceVisibility < categoryFloors.ready.faceVisibility || bodyCrop < categoryFloors.ready.bodyCrop;
    if (subjectFloorFailed)
        blocker("subject_detail_floor", `Not enough usable subject detail — photo quality ${rounded(photoQuality)}, face visibility ${rounded(faceVisibility)}, confirmed by ${qualityDefects[0].label.toLowerCase()}`);
    // Below the ready-for-design bar but with nothing confirmed against it: designer review, never a retake.
    else if (readyFloorFailed || subjectScoresPoor)
        note("design_readiness_floor", `Usable, but below the ready-for-design minimum — photo quality ${rounded(photoQuality)}, face visibility ${rounded(faceVisibility)}, body & crop ${rounded(bodyCrop)}`, "REVIEW");
    // The raw score arrives already weighted from the four category scores and is never adjusted here.
    const rawScore = rounded(baseScore), forcedReject = penalties.some(penalty => penalty.forces_status === "REJECT");
    const gatePenalties = penalties.filter(penalty => penalty.forces_status === "REJECT"), hardGates = gatePenalties.map(penalty => penalty.label);
    // Every validated gate contributes a ceiling; the lowest one wins. min() is the only arithmetic between
    // the raw score and the displayed one, so any difference between them is always attributable to a gate.
    const caps = penalties.filter(penalty => penalty.cap !== null).map(penalty => ({ id: penalty.id, label: penalty.label, cap: penalty.cap }));
    const appliedCap = caps.filter(entry => entry.cap < rawScore).sort((first, second) => first.cap - second.cap)[0] ?? null;
    const score = appliedCap ? appliedCap.cap : rawScore;
    const retakeAdvice = gatePenalties.map(penalty => retakeInstructions[penalty.id]).find(Boolean) ?? "";
    // File suitability answers "can we ship this particular file?" and is tracked on its own axis.
    const fileSuitability = rounded(signals.resolutionScore), fileStatus = signals.minimumDimension >= fileResolutionTargets.recommended ? "OK" : signals.minimumDimension >= fileResolutionTargets.usable ? "LOW" : signals.minimumDimension >= fileResolutionTargets.unusable ? "TOO_SMALL" : "UNUSABLE", fileReason = fileStatus === "OK" ? `${signals.minimumDimension}px shortest edge is large enough for every marketing output.` : fileStatus === "LOW" ? `${signals.minimumDimension}px shortest edge works for profile cards but is tight for large banners and print.` : fileStatus === "TOO_SMALL" ? `${signals.minimumDimension}px shortest edge is small — usable on screen, but re-supply the original for print or large banners.` : `${signals.minimumDimension}px shortest edge is too small to use anywhere — re-upload the original file.`;
    // --- Designer review eligibility ---
    // Three terms, and every one of them is a measurement rather than an estimate. `qualityDefects` is
    // already the set of failures validated against the pixels, so "no severe blur", "face has usable
    // detail", "not pixelated or corrupted" and "resolution carries enough detail" all collapse into it.
    // Note what is deliberately absent: no gate, no verdict and no derived score appears here. A gate
    // firing is precisely the thing the agent is entitled to argue about.
    const reviewBlockingDefect = qualityDefects[0] ?? null;
    const designerReviewEligible = photoQuality >= designerReviewFloor && !reviewBlockingDefect && fileStatus !== "UNUSABLE";
    const reviewBlockReason = designerReviewEligible ? "" : reviewBlockingDefect ? `${reviewBlockingDefect.label}. ${reviewBlockingDefect.evidence}` : fileStatus === "UNUSABLE" ? fileReason : `Photo quality ${rounded(photoQuality)} is below the ${designerReviewFloor} needed for a designer to work from this image.`;
    // What the agent would actually be challenging: every judgement that changed the verdict, minus the
    // measured defects, which are not matters of opinion.
    const disputableGates = penalties.filter(penalty => penalty.forces_status && !defectBackedGates.has(penalty.id)).map(penalty => penalty.label);
    const photoIsUsable = !forcedReject && rawScore >= photoApprovalThresholds.review;
    // Resolution is advisory: a good photograph in a small file is still a good photograph. Only a file
    // too small to use anywhere becomes a re-upload request, and it never lowers the quality score.
    // A genuine hard failure overrides the score; nothing else does. 80+ approves, 65+ reviews, below 65 retakes.
    const status = forcedReject || score < photoApprovalThresholds.review ? "REJECT" : fileStatus === "UNUSABLE" ? "REUPLOAD" : score < photoApprovalThresholds.approved ? "REVIEW" : "APPROVED";
    // Every gate caps at or below 59, so a fired gate already puts the score under the retake threshold:
    // the verdict and the number are two readings of the same value, and cannot contradict each other.
    const scoreTrace = [`Categories: photo quality ${rounded(photoQuality)}, body & crop ${rounded(bodyCrop)}, face visibility ${rounded(faceVisibility)}, background & editability ${rounded(signals.designerUsability)}.`, `Raw score ${rawScore} = those four weighted 30/30/20/20.`, `Validated quality defects: ${qualityDefects.length ? qualityDefects.map(item => `${item.label.toLowerCase()} — ${item.evidence}`).join(" ") : "none — no score alone may force a retake."}`, `Critical floors: ${subjectFloorFailed ? "FAIL — weak subject scores confirmed by a visual defect" : readyFloorFailed || subjectScoresPoor ? "below the ready-for-design minimum" : "PASS"}.`, caps.length ? `Validated gates: ${caps.map(entry => `${entry.label} (max ${entry.cap})`).join("; ")}.` : "Validated gates: none.", appliedCap ? `Final score ${score} = min(${rawScore}, ${appliedCap.cap}) — capped by ${appliedCap.label.toLowerCase()}.` : `Final score ${score} — no cap applied.`];
    const failed = requirements.filter(item => item.status === "FAIL"), confidence = Number((requirements.reduce((total, item) => total + item.confidence, 0) / requirements.length).toFixed(2)), primaryPenalty = penalties.find(penalty => penalty.forces_status === "REJECT") ?? null;
    const decisionReason = status === "REUPLOAD" ? `${photoIsUsable && !penalties.length ? "The photograph itself is good" : "The photograph is usable"} — only the file is too small. ${fileReason}` : primaryPenalty ? `Retake recommended: ${primaryPenalty.label.toLowerCase()}. Marketing readiness ${score}/100${appliedCap ? ` — capped at ${appliedCap.cap} by that gate, from a raw ${rawScore}` : ""}.` : penalties.length ? `Usable for design. Noted: ${penalties[0].label.toLowerCase()}.` : failed.find(item => item.id !== "resolution")?.detail ?? (fileStatus === "LOW" ? fileReason : "Usable for design — nothing blocks a designer.");
    return { score, rawScore, appliedCap, scoreTrace, status, hardGates, designerReviewEligible, disputableGates, reviewBlockReason, qualityDefects, retakeAdvice, snapshotSignals, fileSuitability, fileStatus, fileReason, confidence, decisionReason, requirements, penalties };
}
}
return {scoreCategories,photoRatingWeights,applyPhotoDecision,validateQualityDefects,scoreCaps,photoApprovalThresholds,categoryFloors,designerReviewFloor,fileResolutionTargets,bodyExtentScores,bodyExtentLabels};
})();
