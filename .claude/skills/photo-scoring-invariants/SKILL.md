---
name: photo-scoring-invariants
description: The rules the Profile Lab AI photo verdict engine must keep. Use before editing app/photo-decision.ts, photo-score.ts, photo-quality.ts, photo-body.ts or photo-artifacts.ts, and when a photo is scored, approved, rejected, capped or sent to designer review in a way that looks wrong.
metadata:
  author: studio-plus
  version: "1.0.0"
---

# Photo scoring invariants

The engine answers one question: **can a designer use this file to make marketing artwork?**
It never answers whether the agent looks good, dresses formally or poses professionally.

## The pipeline

```text
pixels + MediaPipe face/pose/segmentation
  → photo-artifacts.ts   structure, focus, screenshot, letterbox
  → photo-body.ts        body extent, crop, hands, accessories
  → photo-score.ts       four category scores (pure functions)
  → photo-decision.ts    caps, gates, validated defects, status
  → photo-quality.ts     PhotoRating for the UI
```

Category weights (`photoRatingWeights`): technical quality .30, body usability .30,
face visibility .20, editability .20. Pose has **zero** weight.

## Rules

1. **The only arithmetic between raw and final is `min(rawScore, lowest applicable cap)`.**
   No hidden deductions, no band fitting, no forcing the number to match a verdict. A note in
   `penalties` reports something at `points: 0` because a category score already carries it.
2. **A cap is a ceiling, not a value.** A weak photo that also trips a gate keeps its own
   lower raw score.
3. **No score, and no combination of scores, rejects on its own.** A quality-driven retake
   requires a validated visual defect from `validateQualityDefects` — severe blur, unusable
   face detail, low resolution with visible detail loss, or degradation. Estimates advise;
   measurements reject.
4. **Skin texture is not evidence of blur.** Every sharpness read is structural — eyes,
   hairline, lip and nose boundaries, glasses, collar, seams, silhouette. Smooth skin,
   retouching, soft light and JPEG compression must never read as softness.
5. **A good attribute never cancels a critical failure.** A clean background cannot carry a
   photo whose subject detail is gone (`subject_detail_floor`, `design_readiness_floor`).
6. **Photo quality and file suitability are different questions.** `FileStatus` describes
   whether the file can be shipped and never lowers the photo score. `UNUSABLE` produces
   `REUPLOAD`, which explicitly says the photograph is fine and only the file is too small.
7. **Designer review is for challenging AI judgement, never for rescuing a bad file.**
   `designerReviewEligible = photoQuality >= 70 AND no defect-backed gate AND file is usable`.
   Detector results (including `face_missing`) stay disputable; measurements do not.
8. **Two designer workflows, never mixed.** "Request Designer Approval" sends the ORIGINAL only
   (`kind: original_approval`, status `PENDING DESIGNER APPROVAL`) and needs the agent's explicit
   tick "use this original photo as-is" — the tick is a choice not to enhance, not an accusation.
   "Send to Designer Review" after an AI portrait sends both images and both ratings
   (`kind: enhanced_review`, status `PENDING DESIGNER REVIEW`). Neither modifies the photo or the
   original rating.
10. **AI usability is a separate axis** (`app/ai-usability.ts`). It measures identity detail on the
   face only — face pixels, clarity, structure, focus, fidelity, single face, face in frame, no
   validated defect. Crop, body, selfie and background cues carry zero weight, and it never feeds the
   marketing score. `aiEnhancementEligible = score >= 70 AND single face AND no defect AND face ≥ 150px`.
11. **An AI-enhanced portrait is held to the same bar as an upload** (`app/portrait-checks.ts`): the
   same `evaluatePhoto`, `enhancedMarketingReadiness >= 80`, identity similarity confirmed (not
   merely unverified), no artefact, hand or proportion failure. Anything else is "Designer Review
   Required". The original score is stored beside it and never overwritten.
9. **Advice is actionable and short.** Every gate maps to an instruction in
   `retakeInstructions` that names the fix, not the failure.

## Thresholds (single source of truth: `app/photo-decision.ts`)

| Constant | Value | Meaning |
| --- | --- | --- |
| `photoApprovalThresholds` | approved 80, review 65 | ≥80 ready, 65–79 designer review, <65 reject |
| `designerReviewFloor` | 70 | photo quality needed to dispute a verdict |
| `categoryFloors.ready` | photoQuality 72, faceVisibility 75, bodyCrop 70 | holds a photo at review |
| `categoryFloors.review` | photoQuality 65, faceVisibility 65 | one half of the retake test |
| `fileResolutionTargets` | 300 / 600 / 1000 px shortest edge | unusable / usable / recommended |
| `scoreCaps` | 39–79 | see the grouped comments in the file |

Do not duplicate these numbers into components or tests — import them.

## Changing the engine

- Add or move a threshold only with the reasoning written next to it. The file is unreadable
  without its comments; keep that standard.
- Every scoring change needs a test in `tests/photo-decision.test.mjs`, `photo-score.test.mjs`
  or `photo-body.test.mjs`, with an assertion message stating the rule it protects.
- Run `npm run verify` (108 tests at last check) before reporting the change.
- If a real photo is scored wrongly, find the signal that is wrong before moving a threshold.
  Thresholds are calibrated against designer decisions, not against one disappointing result.
