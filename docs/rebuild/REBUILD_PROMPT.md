# Studio+ — complete rebuild specification and agent prompt

Purpose: rebuild this exact product from nothing, on a clean machine, during a one-day
demo, as identically as possible to the validated `demo-v2` build. This
document is three things in one:

- **Part A** — the human plan: what to bring, the fast path (restore) vs. the scratch path
  (rebuild), time boxes, and the order of work.
- **Part B** — a copy-paste prompt for an AI coding agent (Claude Code, Codex, Cursor).
- **Part C** — the full specification: stack, file tree, every module's contract, every
  constant and formula, every screen and its copy, the API routes, the tests, and the
  verification gates. Part C is what makes "identical" possible.

The n8n backup (no-code path) is documented separately in [`../../n8n/README.md`](../../n8n/README.md).

---

## Part A — Human plan

### A1. What to carry to the venue (prepare tonight)

| Item | Why | How |
| --- | --- | --- |
| `photostudio-plus-demo.zip` | Source archive of the tagged build. Restores everything in minutes. | `git archive --format=zip --output=photostudio-plus-demo.zip demo-v2` |
| `node_modules` tarball **or** npm offline cache | The venue Wi-Fi may be unusable. `npm ci` needs ~390 packages. | `tar czf node_modules.tgz node_modules` (same OS/arch only), or `npm ci --cache ./npm-cache` tonight and carry `./npm-cache` |
| The 7 frozen assets + 2 extras (see C4) | Models/WASM/portraits cannot be re-created; sha256 is checked by preflight. | They live in `public/` — included in the zip. Also copy `public/` to USB separately. |
| Node.js 22.22.3 installer (`.pkg`/`.msi`) | `.nvmrc` pins it; venue laptop may not have it. | https://nodejs.org/dist/v22.22.3/ |
| Prepared sample photos (5) | Every verdict shown without a camera: REJECT, REVIEW, REUPLOAD, APPROVED, plus an Atlas "no photo" state. | Export from your phone/studio tonight; name them `sample-reject.jpg`, `sample-review.jpg`, `sample-reupload.jpg`, `sample-approved.jpg` |
| Screen recording of the 3-minute judge flow | Last-resort fallback. | QuickTime/OBS, 1080p |
| This document + `DEMO_RUNBOOK.md` + `CLAUDE.md` | Rules for people and agents. | In the zip |
| Anthropic API key (for the n8n backup only) | The n8n path calls Claude for vision; the real app needs no key. | Keep in a password manager, never in the repo |

### A2. Fast path — restore (target: 15 minutes)

```bash
# 1. Node
nvm install 22.22.3 && nvm use 22.22.3        # or run the carried installer
node -v                                        # v22.22.3
# 2. Source
unzip photostudio-plus-demo.zip -d studio-plus && cd studio-plus
# 3. Dependencies (pick one)
npm ci                                         # online
npm ci --offline --cache ../npm-cache          # offline cache carried from home
tar xzf ../node_modules.tgz                    # same OS/arch tarball
# 4. Gate
npm run verify                                 # preflight ✓, 86/86 tests, 0 lint errors (17 warnings expected)
# 5. Demo
npm run dev                                    # http://localhost:3000 and /atlas
```

If `verify` fails: preflight failures name the asset or version that is wrong; fix that and
re-run. Never `npm update`, never re-encode a `public/` asset.

### A3. Scratch path — rebuild from this spec (target: one working day)

Use this only if the event requires code written on the day, or the archive is lost.
Work in this order; each step ends in a verifiable state and the demo is showable from step 6.

| # | Time box | Deliverable | Done when |
| --- | --- | --- | --- |
| 1 | 0:00–0:30 | Scaffold: `package.json` (C2), configs (C3), `app/layout.tsx`, `app/page.tsx`, empty `studio.tsx`, `public/` assets copied, preflight script | `npm run preflight` passes, `npm run dev` serves a page |
| 2 | 0:30–2:00 | Pure engine: `photo-score.ts`, `photo-decision.ts`, `photo-body.ts`, `photo-artifacts.ts` (C6–C9) + their tests (C15) | `node --experimental-strip-types --test tests/*.test.mjs` green |
| 3 | 2:00–3:00 | `image-enhancement.ts` (C10) and `photo-quality.ts` (C5): MediaPipe loading, `evaluatePhoto` | Upload a sample in a scratch page, get a `PhotoRating` |
| 4 | 3:00–5:00 | `studio.tsx` upload → review → enhance → consent → success → Photos (C11) | File-import journey completes offline |
| 5 | 5:00–5:45 | Guided camera, batch select, QR scanner, manual code (C11.3–C11.5) | Camera journey completes; code fallback works |
| 6 | 5:45–6:30 | `atlas/profile.tsx`, API routes (C12, C13) | Book → QR → Open studio → session loaded |
| 7 | 6:30–7:30 | `brand-assets.tsx` + `print-orders.ts` + `photo-review-requests.ts` (C14) | Background removal, banner, mock print order, designer review request |
| 8 | 7:30–8:00 | CSS polish, `npm run verify`, tag, archive, rehearse | `verify` passes; judge flow rehearsed twice |

Rules that hold during the rebuild exactly as during the freeze: offline-first, no extra
dependencies beyond C2, non-generative enhancement, score the photograph not the person,
`min(raw, cap)` is the only arithmetic, never store full-size images in localStorage.

---

## Part B — Copy-paste prompt for an AI coding agent

> You are rebuilding **Studio+**, an offline-first, white-label AI portrait studio for a
> real-estate agency product demo. Build it exactly as specified in
> `docs/rebuild/REBUILD_PROMPT.md` Part C, in the step order of Part A3. Read
> `CLAUDE.md`, `DEMO_RUNBOOK.md`, and the two skills in `.claude/skills/` first if they
> exist; if they do not, recreate them from Part C17.
>
> Stack and versions are fixed (Part C2): Next.js-app-router code running on `vinext`
> 1.0.0-beta.2 + Vite 8 + `@cloudflare/vite-plugin`, React 19.2.6, TypeScript 5.9.3,
> Tailwind 4 (imported once in `globals.css`; the rest is hand-written CSS), MediaPipe
> `@mediapipe/tasks-vision` 0.10.22 with bundled models in `public/`, `qrcode`,
> `@zxing/browser`, `lucide-react`. Node 22.22.3. Do not add any other dependency.
>
> Non-negotiable product invariants:
> 1. The core journey (capture or import → on-device scoring → enhancement → consent →
>    galleries → banner → download/print) completes with no internet and no API keys.
>    Atlas, CodeFormer and payments are adapters with local fallbacks.
> 2. Enhancement is non-generative: never invent or reshape facial structure. Only the
>    clearly-labelled optional CodeFormer adapter reconstructs faces; the original is always
>    available to compare.
> 3. Scoring: four category scores weighted 30/30/20/20 → raw score; final score =
>    `min(rawScore, lowest applicable cap)` and nothing else; a quality-driven retake needs a
>    validated visual defect; a good attribute never cancels a critical one; file suitability
>    is a separate axis that never lowers photo quality; designer review eligibility =
>    `photoQuality >= 70 AND no defect-backed gate AND file usable`. Pose has zero weight. No
>    beauty/attractiveness/formality/character judgements anywhere in code or copy.
> 4. localStorage holds cases, not files: the gallery keeps at most 6 normalized photos; print
>    orders and review requests persist without the image; every read/write is try/catch.
> 5. Copy, labels, thresholds, and constants in Part C are exact — reproduce them verbatim.
>
> Conventions: app modules are dense (single-space indent, no spaces around `:` in type
> literals, several `const` bindings per line); comments explain *why* (the reasoning behind a
> threshold), never *what*. Tests are `node:test` + `node:assert/strict`, one behaviour per
> `test()`, assertion message states the rule protected. Commits are conventional
> (`feat:`/`fix:`/`docs:`), lowercase subject describing user-visible behaviour.
>
> Work step by step. After each step run the gate for that step (Part A3), then
> `npm run verify` once it exists. Report the real output. Never claim something works without
> running it. When finished: `npm run verify` must end with preflight passed, 86 tests
> passed, 0 lint errors; tag `demo-v2`; `git archive` the zip.

---

## Part C — Full specification

### C1. Product in one paragraph

Studio+ helps a real-estate agent replace a weak or missing profile photo. From the Atlas
agent profile (`/atlas`) a low marketing-photo score prompts a studio booking; the booking
produces a QR (or a manual code) that the studio kiosk (`/`) scans to load the agent and their
photo preflight. The kiosk then guides a camera capture (or file import), scores the
photograph on device with MediaPipe face/pose/segmentation plus pixel forensics, explains the
verdict transparently (`APPROVED` / `REVIEW` / `REUPLOAD` / `REJECT`) with at most two direct
retake instructions, lets the agent send a `REVIEW` photo to a designer or challenge a
`REJECT`, optionally applies a non-generative on-device enhancement (crop, relight, skin
smoothing limited to the face, background replacement, ≤2048px export), records Atlas-profile
consent and brand-use consent separately, saves to a personal gallery, shows brand-consented
portraits in a Brand Asset Gallery, removes the background, composes a 2650×1786 "For Sale"
subsale board with the agent's Atlas details, and places a mock print order with a local order
book. An operator console lists cameras and printers. Everything runs in the browser.

Surfaces: `/` (Studio+ kiosk), `/atlas` and `/atlas/{slug}` (Atlas profile demo),
`/api/atlas-agent`, `/api/atlas-avatar`, `/api/studio-sessions`, `/api/codeformer`.

### C2. Stack — exact `package.json`

```json
{
  "name": "photostudio-plus-demo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "npm@10.9.8",
  "engines": { "node": ">=22.13.0" },
  "scripts": {
    "dev": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext dev",
    "build": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext build",
    "start": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext start",
    "test": "npm run build && node --experimental-strip-types --test tests/photo-decision.test.mjs tests/photo-score.test.mjs tests/photo-body.test.mjs tests/rendered-html.test.mjs",
    "lint": "eslint . --ignore-pattern dist --ignore-pattern .next",
    "preflight": "node scripts/demo-preflight.mjs",
    "verify": "npm run preflight && npm run test && npm run lint",
    "demo:setup": "npm ci && npm run verify",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.22-rc.20250304",
    "@types/qrcode": "^1.5.6",
    "@zxing/browser": "^0.2.1",
    "drizzle-orm": "0.45.2",
    "lucide-react": "^1.33.0",
    "qrcode": "^1.5.4",
    "react": "19.2.6",
    "react-dom": "19.2.6"
  },
  "devDependencies": {
    "@cloudflare/vite-plugin": "1.37.1",
    "@eslint/js": "9.39.4",
    "@next/eslint-plugin-next": "16.2.6",
    "@openai/sites-vite-plugin": "0.1.0",
    "@tailwindcss/postcss": "4.2.1",
    "@types/node": "22.19.19",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.2",
    "@vitejs/plugin-rsc": "0.5.26",
    "drizzle-kit": "0.31.10",
    "eslint": "9.39.4",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-react": "7.37.5",
    "eslint-plugin-react-hooks": "7.1.1",
    "globals": "16.4.0",
    "react-server-dom-webpack": "19.2.6",
    "tailwindcss": "4.2.1",
    "typescript": "5.9.3",
    "typescript-eslint": "8.59.3",
    "vinext": "1.0.0-beta.2",
    "vite": "8.0.13",
    "wrangler": "4.92.0"
  },
  "type": "module"
}
```

`.nvmrc` = `22.22.3`. `.env.example`:

```
CODEFORMER_SERVICE_URL=http://127.0.0.1:7861
CODEFORMER_SERVICE_TOKEN=local-codeformer-demo
```

Plain-Next.js fallback: if `vinext`/Cloudflare tooling cannot be installed, the `app/` code is
standard Next.js App Router code and runs unchanged under `next@16` (`next dev`); only
`worker/index.ts`, `vite.config.ts`, `.openai/hosting.json`, `db/`, `drizzle*`, and the
`rendered-html.test.mjs` suite (which imports `dist/server/index.js`) are vinext-specific. Note
that in `README.md`/preflight if you take this route.

### C3. Config files (verbatim)

`tsconfig.json`: target ES2017, lib dom/dom.iterable/esnext, allowJs, skipLibCheck, strict,
noEmit, esModuleInterop, module esnext, moduleResolution bundler, resolveJsonModule,
isolatedModules, jsx react-jsx, incremental, paths `@/*` → `./*`; include `next-env.d.ts`,
`**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`, `**/*.mts`; exclude
`node_modules`.

`next.config.ts`: `const nextConfig: NextConfig = {}; export default nextConfig;`

`postcss.config.mjs`: `{ plugins: { "@tailwindcss/postcss": {} } }`.

`eslint.config.mjs`: flat config — `globalIgnores([".next/**","dist/**","out/**","build/**","public/mediapipe/**","next-env.d.ts"])`, `eslint.configs.recommended`, `tseslint.configs.recommended`, `react.configs.flat.recommended`, `react.configs.flat["jsx-runtime"]`, `reactHooks.configs.flat["recommended-latest"]`, `jsxA11y.flatConfigs.recommended`, `next.configs["core-web-vitals"]`, globals browser+node+serviceworker, react version detect.

`vite.config.ts`: plugins `vinext()`, `sites()` from `@openai/sites-vite-plugin`, and
`cloudflare({viteEnvironment:{name:"rsc",childEnvironments:["ssr"]},config:{main:"./worker/index.ts",compatibility_flags:["nodejs_compat"],d1_databases:[],r2_buckets:[]}})`; sets `WRANGLER_WRITE_LOGS=false`, `WRANGLER_LOG_PATH=.wrangler/logs`, `MINIFLARE_REGISTRY_PATH=.wrangler/registry`; polling watch when `CODEX_SANDBOX==="seatbelt"`.

`.openai/hosting.json`: `{ "project_id": "<any>", "d1": null, "r2": null }` (preflight asserts both null).

`worker/index.ts`: Cloudflare worker that routes `/_vinext/image` to `handleImageOptimization` and everything else to `vinext/server/app-router-entry`.

`db/schema.ts` exports nothing (`export {}`); `db/index.ts` `getDb()` throws unless `env.DB` exists. `drizzle.config.ts`: sqlite, schema `./db/schema.ts`, out `./drizzle`.

`.gitignore` adds `/dist/`, `/.wrangler/`, `/.vinext/`, `/outputs/`, `/work/`, `/tmp/`, `*.tsbuildinfo`, `__pycache__/`, `.env*` except `.env.example`.

### C4. Frozen assets in `public/`

| File | Size | sha256 (checked by preflight) | Source |
| --- | --- | --- | --- |
| `portraits-contact-sheet.png` | 1,987,112 B | `98145517c5df94136ff4338412a5b3dd1e663210696bed5e1f7b90a94dd37314` | Three fictional portraits side by side; used as CSS placeholder (`background-position` 0 / 50% / 100%) |
| `blaze_face_short_range.tflite` | 229,746 B | `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f` | MediaPipe face detector (short range) |
| `selfie_segmenter.tflite` | 249,537 B | `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b` | MediaPipe selfie segmenter |
| `mediapipe/vision_wasm_internal.js` | — | `4a97e2520ba506c680ecd6ba6acfb146888afa0e2746d57f205352bc6ebb82eb` | copied from `node_modules/@mediapipe/tasks-vision/wasm/` |
| `mediapipe/vision_wasm_internal.wasm` | — | `f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7` | same |
| `mediapipe/vision_wasm_nosimd_internal.js` | — | `927def7b465c51b86e4b3060f93646aca4e27121f4b8fc0483786e407ea9cf1f` | same |
| `mediapipe/vision_wasm_nosimd_internal.wasm` | — | `3821ea9b1f7fb8c549ef2a064ef5c85750bf375c545a49fd6eea0df44a95f1f4` | same |

Not hashed but required: `pose_landmarker_lite.task` (5,777,746 B, MediaPipe pose landmarker
lite), `subsale-banner-template.png` (109,882 B, the 2650×1786 designer "For Sale" board
artwork — text zones at x 72–1760, portrait zone from x=1800), `og.png`, `favicon.svg`.

If the exact hashed files are unavailable on the day, download the same MediaPipe model
versions from Google's storage (`blaze_face_short_range`, `selfie_segmenter`,
`pose_landmarker_lite`) and copy the WASM from the installed package, then **update the
hashes** in `scripts/demo-preflight.mjs` — the script's job is reproducibility, not a
specific byte sequence.

`scripts/demo-preflight.mjs` checks: Node ≥ 22.13.0; `package.json.name ===
"photostudio-plus-demo"`; lockfile name/version match; each asset's sha256; hosting.json
`d1`/`r2` are null. Prints ✓ notes or ✗ failures and sets exit code 1 on failure.

### C5. `app/photo-quality.ts` — orchestration and the `PhotoRating` shape

`evaluatePhoto(src: string, targetAspect = .8): Promise<PhotoRating>`:

1. Kick off `prepareEnhancementAssets(src)` (faces, person mask, pose) and
   `analyzePortraitComposition(src, targetAspect)` in parallel; both have `catch` fallbacks.
2. Load the image; draw a **128×128** thumbnail on white; compute Rec. 709 luminance
   (`.2126R+.7152G+.0722B`). This thumbnail is for tone only.
3. Faces: only detections with `confidence >= confidentFace (.75)` count; if none are
   confident, keep the single strongest weak one.
4. `inspectFullFrame` draws the image at ≤640px long edge and calls `inspectSource` (C8) with a
   `subjectAt(nx,ny)` mask lookup.
5. Tonal sample: subject pixels (mask > .42, or a centre box `.22<x<.78, .06<y<.72` without a
   mask); face-region pixels preferred when > 40 samples. `mean`, `deviation`, `blown` (>246),
   `crushed` (<12).
6. Background edge mean = mean |Laplacian| over pixels where mask < .28; `flatNoise` = mean
   |Laplacian| where local 4-neighbour range < 18 (compression estimate).
7. `minimumDimension = min(naturalWidth, naturalHeight)`;
   `resolutionCurve`: ≥1000 → 100; ≥600 → `70 + (d-600)/400*30`; else `clamp(d/600*70)`.
8. `sharpnessScore = round(min(subjectFocusScore, focusScore))`; `structureScore = round(artifacts.structureScore)`.
9. `body = analyzeBody(pose, mask, face, coverage)` (C7).
10. `backgroundQuality = backgroundQualityScore(backgroundEdgeMean, coverage, hasMask, faces.length)`;
    `usableArea = coverage ? clamp(coverage/.34*100) : face ? clamp(face.height/.16*100) : 0`;
    `faceClearance = min(face.x, face.y, 1-face.x-face.width, 1-face.y-face.height)`;
    `faceScaleScore = rangeScore(face.height, .06, .36, .1)` where
    `rangeScore(v,min,max,falloff) = v in [min,max] ? 100 : clamp(100 - min(|v-min|,|v-max|)/falloff*100)`;
    `faceEdgeScore = clamp(faceClearance/.05*100)`; `faceHeightPixels = face.height * naturalHeight`.
11. `categories = scoreCategories({...})` (C6). `baseScore = categories.rawScore`.
12. Informational only (zero weight): `selfieProbability = clamp(.03 + closeFace*.62 + croppedFace*.2 + (isScreenshot?.45:0))` with `closeFace = clamp((face.height-.34)/.28,0,1)`, `croppedFace = clamp((.035-faceClearance)/.035,0,1)`; `poseAppropriateness = face ? round(98 - croppedFace*30 - (faces>1?25:0)) : 25`; `professionalism = 30/30/20/20 blend`; `composition = round(portraitComposition.score*.4 + cropScore*.35 + usableArea*.25)`.
13. `decision = applyPhotoDecision(baseScore, GateSignals)` (C9).
14. Labels: `APPROVED` → "Ready for Design" (tone `good`); `REUPLOAD` → "Re-upload at Higher Resolution" (`fair`); `REVIEW` → "Designer Review" (`fair`); `REJECT` → "Retake Recommended" (`low`).
15. `issues` = deduped FAIL requirement details (excluding `resolution`) + body crop note; dedupe key = first 32 chars of normalised text.
16. Strengths (in order, when true): "Sharp and cleanly exposed" (tq≥80 & sharp≥70), "Sharp subject detail" (sharp≥75), "`{Extent} in frame — plenty for a designer`" (extentScore≥90), "Hands are fully in frame", "Nothing important is cropped" (crop≥85), "One clear, unobstructed face" (fv≥80), "Agent can be isolated cleanly" (edit≥80), "Clean background" (bg≥80).
17. Four `metrics`: "Photo quality", "Body & crop usability", "Face & subject visibility", "Background & editability" with the notes in the source (e.g. `Sharp, well exposed, clean · {d}px shortest edge`).
18. `file_note` = `"{JPEG|PNG|WEBP} · {MB} MB · {w} × {h}"` inferred from the data URL.
19. `recommendation` via `buildRecommendation`: APPROVED → "Ready for design." (+ "Noted, but not blocking: …"); REUPLOAD → "Keep this photo — re-upload the original at a higher resolution. {fileReason}"; REVIEW → eligible ? "Potentially usable — send it for designer review; {fixes}." : "Not enough usable quality for a designer to work from — upload a clearer or higher-quality photo; {fixes}."; REJECT with gates → "Retake recommended because: {gate}. {retakeAdvice}"; else "Retake the photo with these changes: …".

Exports: `PhotoRating` (fields: score, overall_score, base_score, raw_score, applied_cap,
score_trace[], status, label, tone, confidence, technical_quality, body_usability,
face_visibility, editability, body_extent, hands, file_suitability, file_status, file_reason,
file_note, professionalism, composition, background_quality, face_quality,
designer_usability, pose_appropriateness, selfie_probability, hard_gates[],
designer_review_eligible, disputable_gates[], review_block_reason, quality_defects[],
snapshot_signals[], issues[], strengths[], recommendation, decision_reason, requirements[],
penalties[], metrics[]), `emptyPhotoRating`, `isPhotoApproved(r) = r.status==="APPROVED" || (!r.status && r.score>=80)`, `companyProfessionalStandard` (six bullet strings), re-exports of the engine constants.

### C6. `app/photo-score.ts` — the four categories (pure)

```ts
photoRatingWeights = {technical_quality:.3, body_usability:.3, face_visibility:.2, editability:.2}
exposureScore(mean, blown, crushed) = clamp(102 - |mean-145|*1.35 - blown*260 - crushed*90)
contrastScore(deviation)            = clamp(100 - max(0,52-dev)*2 - max(0,dev-92)*1.4)
fidelityScore(flatNoise)            = clamp(100 - flatNoise*2.1)
backgroundQualityScore(edgeMean, coverage, hasMask, faceCount):
  clarity = hasMask ? clamp(102 - edgeMean*2.6) : 45
  space   = coverage ? clamp(104 - max(0,coverage-.55)*180) : 45
  separation = hasMask ? clamp(64 + coverage*80) : 40
  round(clarity*.55 + space*.2 + separation*.15 + (faceCount<=1?100:20)*.1)
faceDetailTarget = 220            // px of face height for full marks
detailCeilings = { photoQuality: r => 40 + r*.57, edgeQuality: r => 25 + r*.7 }   // r = resolutionScore
detailScore     = clamp(sharpness*.35 + structure*.65)
photoQuality    = round(min(detail*.40 + lighting*.22 + contrast*.12 + fidelity*.12 + resolution*.14, detailCeilings.photoQuality(resolution)))
bodyCrop        = round(bodyExtentScore * (.54 + .22*crop/100 + .10*hand/100 + .06*usableArea/100) * (1 - .28*accessoryImpact))
structureUsableFloor = 50
featureCeiling(s)    = s>=50 ? 80 + (s-50)*.4 : s*1.6
faceClarity     = clamp(min(faceHeightPixels/220*100, featureCeiling(structure)))
faceVisibility  = faceCount ? round((faceScale*.08 + faceEdge*.07 + faceClarity*.85) * (faceCount===1 ? 1 : .4)) : 0
edgeQuality     = clamp(min(max(sharpness, structure), detailCeilings.edgeQuality(resolution)))
backgroundEditability = round(bg*.42 + edgeQuality*.34 + crop*.12 + usableArea*.12 - accessoryImpact*10)
rawScore        = round(pq*.3 + bodyCrop*.3 + faceVisibility*.2 + backgroundEditability*.2)
```

`CategoryInputs` = {sharpnessScore, structureScore, lightingScore, contrastScore,
fidelityScore, resolutionScore, faceCount, faceHeightPixels, faceScaleScore, faceEdgeScore,
bodyExtentScore, cropScore, handScore, usableArea, backgroundQuality, accessoryImpact}.
`scoreCategories` returns {photoQuality, bodyCrop, faceVisibility, backgroundEditability,
faceClarity, edgeQuality, rawScore}.

### C7. `app/photo-body.ts` — pose/mask reading

Types: `BodyExtent = unknown|head_only|head_shoulders|chest_up|half_body|three_quarter|full_body`;
`HandState = absent|complete|partial`. MediaPipe pose indices: NOSE 0, shoulders 11/12, elbows
13/14, wrists 15/16, hips 23/24, knees 25/26, ankles 27/28, hand points L [17,19,21] R
[18,20,22]. `VISIBLE = .55`; a landmark is `seen` when visibility ≥ .55 and inside [0,1]².

- `measureExtent`: ankles → full_body 100; knees → three_quarter 100; hips → half_body 92;
  shoulders and (hip predicted at `1 < y < 1.6` with `-.2 ≤ x ≤ 1.2` **or** silhouette/face
  ratio ≥ 3.1) → half_body 92; shoulders and ratio ≥ 2.4 → chest_up 58; shoulders → head_shoulders 38;
  nose only → head_only 14; else unknown 0.
- `measureLimbs`: count arms where elbow seen and (elbow.x ≤ .05 or ≥ .95) or wrist visibility ≥ .385 and wrist outside the frame horizontally. Bottom edge never counts.
- `measureHands`: per side — wrist unseen/outside → absent; fingers (visibility ≥ .385) none → partial; all in frame → complete else partial. Both partial or ≥2 chopped limbs → {partial, 34}; one → {partial, 62}; any complete → {complete, 100}; else {absent, 100}. Notes as in source.
- `measureCrop(mask)`: no mask → 70. Edge coverage ratios top/bottom/left/right of mask > .5.
  `cropScore = clamp(100 - top*260 - max(0,left-.3)*120 - max(0,right-.3)*120 - (nose seen && top>.06 ? 28 : 0) - max(0,bottom-.86)*40)`; croppedEdges "top of the head" (top>.06), "left side"/"right side" (>.3).
- `measureFraming`: `torsoVisible = clamp((1-shoulderY)/(hipY-shoulderY),0,4)`; `shoulderTilt` in degrees (folded to ≤90); `handAtFace` = a seen wrist with `y < nose.y + .15`.
- `accessorySpreadThreshold = 2.2`; `headSpread` = widest mask run in the band `face.y - .7h … face.y + .35h` divided by face width; `accessoryImpact = clamp((headSpread-2.2)/1.4, 0, 1)`.
- No-pose fallback: extent from silhouette/face ratio (≥6 full, ≥4.2 three-quarter, ≥3.1 half, ≥1.8 head_shoulders, >0 head_only), hands absent 100, note "Hand framing could not be verified".
- `describe()` notes: chopped limb → "A visible arm is cut off at the frame edge…"; cropped edges → "Cut off at the …"; accessoryImpact ≥ .4 → "A head accessory widens the silhouette and limits how the agent can be cropped or laid up"; else per-extent strings ("Half body in frame — usable for design", "Only head and shoulders — too little body for design use", …).

### C8. `app/photo-artifacts.ts` — source forensics

`inspectSource(luminance, width, height, subjectAt?)` returns `{contentCoverage, deadCanvas,
letterboxed, chromeRatio, isScreenshot, detailVariance, focusScore, subjectFocusScore,
structureScore, note}`.

- Flat bars: walk inward while row/column range < `FLAT_ROW_RANGE = 14`, up to 45% each side. `contentCoverage = ((h-top-bottom)/h)*((w-left-right)/w)`; `letterboxed = coverage < .62`.
- Screenshot: mean |Laplacian| of the top 10% strip ÷ overall mean = `chromeRatio`; `isScreenshot = chromeRatio >= 1.6` (only when overall mean > .4).
- Focus: variance of the Laplacian over the photographic area; `focusScore = clamp(sqrt(var)/33*100)`. Subject-only variant when > 2000 subject samples (mask > .6 in a 5-pixel cross).
- Structure: histogram (512 bins) of |Laplacian|; `structureScore = clamp(percentile(.98)/70*100)` read on the subject when > 2000 samples, else the frame.
- Note: screenshot → "Looks like a phone screenshot rather than a photo file"; letterboxed → "Padded with empty bars — supply the original photo, not a boxed export"; structure < 45 → "Structural detail on the subject is soft"; min(focus) < 45 → "Softly processed, but the structural detail is intact"; else "Source frame looks like an original photo".

### C9. `app/photo-decision.ts` — the verdict engine

Constants (single source of truth):

```ts
fileResolutionTargets = {unusable:300, usable:600, recommended:1000}     // shortest edge px
bodyExtentScores = {full_body:100, three_quarter:100, half_body:92, chest_up:58, head_shoulders:38, head_only:14, unknown:0}
bodyExtentLabels = {full_body:"Full body", three_quarter:"Three-quarter", half_body:"Half body", chest_up:"Head & chest", head_shoulders:"Head & shoulders", head_only:"Head only", unknown:"Unverified"}
photoApprovalThresholds = {approved:80, review:65, score:80}
scoreCaps = { obvious_selfie:59, casual_snapshot:59, screenshot:55, mirror_selfie:49,
  insufficient_body:59, minimal_body:49, chopped_limbs:59, awkward_crop:59, chopped_hands:59,
  severe_face_crop:49, unusable_for_design:49, severe_blur:39, face_missing:39, face_unusable:39,
  severe_exposure:39, severe_degradation:39, multiple_people:39, extreme_background:49,
  low_resolution_detail_loss:59, subject_detail_floor:64, design_readiness_floor:79,
  likely_selfie:79, snapshot_cues:79 }
categoryFloors = {ready:{photoQuality:72, faceVisibility:75, bodyCrop:70}, review:{photoQuality:65, faceVisibility:65}}
designerReviewFloor = 70
snapshotCueThresholds = {lived:8, lostSubjectTexture:14}
defectBackedGates = {severe_blur, face_unusable, severe_degradation, low_resolution_detail_loss, subject_detail_floor}
qualityDefectRules = { severeBlur:{structure:30, focus:35}, faceDetail:{pixels:90},
  lowResolution:{minimumDimension:600, facePixels:150, structure:48},
  degradation:{structure:22, fidelity:32, supportingStructure:40} }
```

`retakeInstructions` (gate id → sentence) — reproduce verbatim:
face_missing "Take a new photo where the face is clearly visible and unobstructed." ·
face_unusable "Send a photo taken closer, or at a higher resolution — there is too little detail on the face to use." ·
multiple_people "Send a photo with only the agent in frame." · severe_blur "Retake with the camera steady and the focus on the eyes." ·
screenshot "Send the original photo file rather than a screenshot of it." · insufficient_body "Step back so the frame reaches at least the waist." ·
minimal_body "Step back so the frame reaches at least the waist — only the head and shoulders are in shot." ·
chopped_limbs "Keep visible arms fully in frame, or leave them out of the composition entirely." ·
mirror_selfie "Ask someone else to take the photo rather than shooting into a mirror." ·
subject_detail_floor "Re-supply the original photo, or retake it sharper and closer — there is not enough usable detail on the subject." ·
low_resolution_detail_loss "Re-upload the original file — at this size the facial detail is already pixelated away." ·
severe_degradation "Re-supply the original photo file — this copy is too compressed or pixelated to use." ·
oversized_accessory "Step back, or take the photo without the oversized headwear, so the agent can be cropped and laid up freely." ·
awkward_crop "Leave room around the agent so nothing important is cut through." · severe_face_crop "Leave space around the head — the face is running off the edge." ·
chopped_hands "Keep hands fully in frame, or leave them out of the composition entirely." ·
obvious_selfie "Ask someone else to take it, framed from head to waist with the camera at chest height." ·
casual_snapshot "Ask someone else to take a portrait from head to waist, camera at chest height, against a tidy background." ·
severe_exposure "Retake with even light on the face." · extreme_background "Retake against a plainer background, or step further away from it." ·
unusable_for_design "Frame the agent larger, with at least half the body in shot."

`validateQualityDefects(signals)` → list of `{id,label,evidence}`:
- `severe_blur` when structure < 30 **and** min(focus, sharpness) < 35.
- `face_unusable` when a face exists and faceHeightPixels < 90.
- `low_resolution_detail_loss` when face exists, minimumDimension < 600, facePixels < 150, structure < 48.
- `severe_degradation` when structure < 22, or fidelity < 32 and structure < 40.

`applyPhotoDecision(baseScore, signals)`:
1. 14 `requirements` in this order with thresholds: focus (min(sharp,focus) ≥ 55 or structure ≥ 60), face_visibility (faceCount>0), single_agent (=1), body_visible (not head_only/head_shoulders/chest_up/unknown), crop_safety (crop ≥ 62; critical < 40), hands (≠ partial), selfie (selfieProbability < .5 and not screenshot), source_frame (not letterboxed), exposure (≥ 60; critical < 35), background (≥ 60; critical < 30), designer_usability (≥ 60; critical < 35), accessory_fit (accessoryImpact < .4), subject_detail (not (pq<65 & fv<65 & defect)), resolution (minimumDimension ≥ 600). Labels/details verbatim from source.
2. Hard gates (`blocker`, forces REJECT, cap from `scoreCaps`, points 0) in order: face_missing; multiple_people (faceCount>1); face_unusable (defect); severe_blur (defect); severe_degradation (defect); low_resolution_detail_loss (defect); screenshot; minimal_body (head_only/head_shoulders) else insufficient_body (chest_up); awkward_crop (crop<40); severe_face_crop (faceClearance<.005); chopped_hands (hands partial & handScore ≤ 40); chopped_limbs (≥1 & hands ≠ complete); mirror_selfie (selfie ≥ .85 & (handAtFace | minimalBody)) else obvious_selfie (selfie ≥ .75); severe_exposure (lighting<35); extreme_background (bg<30); unusable_for_design (designerUsability<35).
3. Snapshot cues (weights): lived_in_scene 1 (backgroundTexture ≥ 8), full_frame_capture .5 (aspect ≤ .6 or ≥ 1.15), camera_close 1 (faceHeight ≥ .28), hand_at_face .5 (handAtFace & texture ≥ 8), camera_tilt .5 (shoulderTilt ≥ 10), subject_lost_in_scene 1 (subjectCoverage < .34 & texture ≥ 14), torso_cut_short .5 (0 < torsoVisible < .9). Sum ≥ 2 → blocker `casual_snapshot`; ≥ 1.5 → note `snapshot_cues` forcing REVIEW (cap 79).
4. Notes (points 0, cap only where listed): soft_image (35 ≤ focus < 55 & structure < 60), padded_export, poor_exposure (35–59), busy_background (30–59), limited_design_use (35–59), tight_crop (40–61), tight_face_crop (clearance < .025), cut_hands (partial & handScore > 40), likely_selfie (.5 ≤ p < .75, forces REVIEW, cap 79), oversized_accessory (≥ .4).
5. Floors: `subject_detail_floor` blocker when pq<65 & fv<65 & any defect; else `design_readiness_floor` note forcing REVIEW (cap 79) when pq<72 or fv<75 or bodyCrop<70 or (pq<65 & fv<65).
6. `rawScore = round(baseScore)`; caps = penalties with a cap; `appliedCap` = lowest cap < rawScore; `score = appliedCap ? cap : rawScore`.
7. `fileStatus`: ≥1000 OK; ≥600 LOW; ≥300 TOO_SMALL; else UNUSABLE, with `fileReason` strings from source.
8. `designerReviewEligible = photoQuality ≥ 70 && no defect && fileStatus !== UNUSABLE`; `disputableGates` = forcing penalties not in `defectBackedGates`.
9. `status = forcedReject || score < 65 ? REJECT : fileStatus===UNUSABLE ? REUPLOAD : score < 80 ? REVIEW : APPROVED`.
10. `scoreTrace` (6 lines): categories; "Raw score N = those four weighted 30/30/20/20."; validated defects; critical floors; validated gates with caps; "Final score S = min(R, C) — capped by …" or "— no cap applied.".
11. `decisionReason`, `confidence` (mean of requirement confidences), `retakeAdvice` (first gate's instruction).

### C10. `app/image-enhancement.ts` — MediaPipe + canvas pipeline

- `prepareEnhancementAssets(src)` (cached, max 4): `FaceDetector` (`/blaze_face_short_range.tflite`, IMAGE, minDetectionConfidence .5) → faces sorted by confidence then area, normalised boxes; `ImageSegmenter` (`/selfie_segmenter.tflite`, confidence masks) → `PersonMask{data:Float32Array,width,height}`; `PoseLandmarker` (`/pose_landmarker_lite.task`, numPoses 1, detection/presence .4). All via `FilesetResolver.forVisionTasks("/mediapipe")`. `confidentFace = .75`.
- `analyzePortraitComposition(src, targetAspect)`: centre (offset ≤ .18 → 100, else −420/unit), headroom (.035–.24), face scale (.1–.36), aspect loss ×180, crop safety (clearance ≥ .025); weights .2/.2/.2/.25/.15; notes e.g. "Marketing-safe framing · relaxed poses welcome".
- `portraitCrop`: target face height .22 (4:5) or .24 (1:1); widen to shoulders/.88; centre on shoulders; `idealY = face.y*H - cropH*.09`.
- `renderProfessionalPhoto(src, settings, assets, preview, targetAspect)`: preview ≤1400px, export `highResolution ? min(2048, max(1600, source)) : source`; tone canvas with `brightness(1 + ((145-meanLight)/255)*.62*(light/70)) contrast(1+definition*.00105) saturate(1+definition*.00028)`; `applyFaceRetouch` = blurred copy (`blur(max(1.2, minDim*(.0012+skin*.000025)))`) masked by an elliptical radial gradient on the face (rx .72w, ry .82h, centre y +.52h) at `globalAlpha min(.38, skin*.0062)`; person mask feathered with smoothstep over (v−.14)/.72 and `blur(minDim*.0012)`; backgrounds: `blur` (overscan 1.06, `blur(max(12,minDim*.018)) brightness(.82) saturate(.72)`), `gray` palette `#26302e/#67716d`, `ivory` `#c9bcaa/#f1eadf` with radial glow and a soft drop shadow (alpha .22); `addRelight` warm radial light at (.3w,.2h) in `screen` mode masked to the subject. Output JPEG .88 preview / .93 export.
- `EnhanceSettings = {skin, light, definition, background: original|blur|gray|ivory, highResolution}`.

### C11. `app/studio.tsx` — the kiosk (views and copy)

`View = profile|session|capture|batch|review|select|consent|success|personal|assets|console`.
Nav rail: Home (profile), Photos (personal), Assets (assets), Studio (console); plus Help and
Reset. URL sync: `/?view=…`, `/?session=CODE` auto-loads a session. Gallery persisted as
`ps-gallery` (max 6). Toasts auto-clear after 2.6 s. Escape closes dialogs.

Presets: Natural {skin16, light20, definition16, original}, Studio {30,38,28,gray} (default),
Warm {25,34,22,ivory}. Background options: Original "Keep the scene", Soft blur "Reduce
distractions", Slate "Corporate studio", Ivory "Warm editorial".

`mockAgent` = {agentName "John Doe", agentId "MOCK-AGENT", agentMobile "012-345 6789",
agentRenTag "12345", agentOfficePhone "03-7453 5155"}.

C11.1 **profile (home)**: eyebrow GET STARTED, h1 "Take a photo or scan QR", p "Start a portrait now, or scan your Atlas appointment QR.", buttons "Take a photo" and "Open Atlas →"; QR scanner panel (`@zxing/browser` `BrowserQRCodeReader`, environment camera, 10 s permission timeout, button "Scan QR"/"Try QR camera again"); manual "Enter code" form placeholder `STUDIO-ATLAS-…`, button "Load"; error "Appointment not found. Book in Atlas, then scan the new QR or enter its code.".

C11.2 **session** (`SessionProfile`): header SESSION LOADED + agent name + appointment + code + exit; crop workbench with 4:5 Portrait / 1:1 Square tabs, FACE SAFE AREA overlay, "Crop too tight"/"Crop ready" with "{loss}% hidden from the {sides}" (warn when > 12%); PHOTO PREFLIGHT aside with conic score ring, four metrics, file line, `RatingFeedback` + appeal; primary "Start guided camera".

C11.3 **capture** (guided camera): live `FaceDetector` in VIDEO mode every 140 ms; placement states checking/ready/close/far/center with copy "Detecting your face…", "Ready · hold for 5 seconds", "Take one small step back", "Move a little closer", "Move your face into the oval"; readiness score 35/92/58/60/68; auto-shoot after 700 ms ready; 5 s countdown per shot, 1/2/3/5 shots; 4:5 → 960×1200, 1:1 → 960×960, mirrored; per-shot `evaluatePhoto`. Simple fallback capture panel: "Start camera"/"Take photo"/"Upload" with 3-2-1 countdown.

C11.4 **batch**: "Select photo", highest-rated preselected, remove, "Add photos", "Continue".

C11.5 **review** (`UploadedPhotoCheck`): same layout as session for an uploaded file; format switch re-scores at 1:1; "Continue to enhance" enabled when approved or review requested; "Retake".

C11.6 **select** (`StudioEnhanceEditor`): compare slider ORIGINAL/PROFESSIONAL, pipeline chips Subject/Light/Export, enable toggle, presets, sliders Skin (max 60) / Light (max 70) / Definition (max 60), background options, high-resolution toggle, CodeFormer card "Neural blur restoration — CodeFormer face recovery + Real-ESRGAN image upscale" with fidelity slider (0–1, default .8) enabled only when `GET /api/codeformer` reports available; "Continue" re-exports and re-scores.

C11.7 **consent**: Step 4 "Review", FINAL PHOTO PREFLIGHT, score card, `RatingFeedback`; two switches "Atlas profile — Set as your profile photo." and "Brand use — Approve this photo for brand materials."; save enabled when approved or a review request exists and profile consent on; button "Save approved photo" / "Save pending designer review"; `brandOK` is stored as `brandOK && approved`.

C11.8 **success**: "Photo ready", "Saved to Photos. Approved for brand use." / "Profile only.", "Open Photos".

C11.9 **personal (Photos)**: toolbar Import photo / Take a photo; cards with badge Approved/Profile, category switch Atlas photo / Awards night, Download, Print (opens a print window with `@page{size:auto|4in 6in|A4|letter}`), Remove (confirm dialog).

C11.10 **assets**: `BrandAssetStudio` (C14) fed with the gallery; the component itself filters nothing — brand gating is the `brandOK` flag shown on cards and the `photos` prop passed from Studio.

C11.11 **console (Studio)**: "Connect your studio" — camera card (device `<select>`, "Find cameras", "Use camera") and printer card (paper preset, "Open print dialog"). Status "● LOCAL & PRIVATE".

`DesignerReviewAppeal`: hidden when APPROVED; when not eligible shows "This image does not have enough usable quality for designer review. Please upload a clearer or higher-quality photo." + block reason; REVIEW shows "This photo needs a designer to decide. Send it over and carry on." with "Send for designer review" (no checkbox); REJECT shows checkbox "I think the AI got this wrong" → note textarea (280 chars) → "Request designer review"; sent state "Designer review requested · IQI-REV-XXXXXX".

### C12. `app/atlas/profile.tsx` — Atlas demo

Fallback agent: `{id:"71502", name:"Aaron Paul", role:"Negotiator · REN76860", office:"Ipoh, Malaysia", phone:"60126791098", officePhone:"03-7453 5155", email:"aaronyuva1017@gmail.com", renTag:"REN76860"}`. On mount fetch `/api/atlas-agent?slug=…`; map `display_name||full_name`, `designation · ren_tag`, `branch_name, country`, `mobile_contact_number`, `office_contact_number`, avatar via `/api/atlas-avatar?slug=…`; then `evaluatePhoto(avatar)`. Quality banner when score > 0 and not approved: "Retake recommended" / "Designer review needed" / "Re-upload at higher resolution" + "{score}/100 · {recommendation}" + "Book studio". Profile card with rating ring, "MARKETING PHOTO PREFLIGHT {score}/100", Upload (JPG/PNG/WebP ≤ 12 MB), Book studio. Assessment modal shows raw/final/confidence/selfie likelihood, metrics, requirements, penalties, score trace, and the standard line "Photo quality 30 · Body & crop 30 · Face visibility 20 · Background & editability 20 · then hard gates. Sitting, leaning and casual poses are never penalised.". Booking modal: date (default 2026-08-22), time 09:30/10:30/14:00/16:30, location "Studio+ · Kuala Lumpur · Level 12"; confirm → session `PS-{agentId}-{YYYYMMDD}-{HHMM}`, POST `/api/studio-sessions`, localStorage `photostudio-session:{session}`, QR via `qrcode` (`width 360, margin 4, errorCorrectionLevel H, dark #17221e`) encoding **only the session code**, "Open studio" → `/?session=CODE`. Left rail mimics Atlas (Dashboard, Team Hub, Insights & Reports, Real Estate Radar, Engagement Hub, Calendar, Global Network). `/atlas/[agent]` validates slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

### C13. API routes

- `GET /api/atlas-agent?slug=` → proxies `https://api.iqiglobal.com/api/web/agents/{slug}` (400 invalid slug, 502 on network error, `Cache-Control: public, max-age=60, stale-while-revalidate=300`).
- `GET /api/atlas-avatar?slug=` → streams `avatar_original_url || avatar_url` with its content type, `max-age=3600`.
- `POST /api/studio-sessions` body {session, agentId, agentName, date, time, +optional agentPhoto, agentMobile, agentRenTag, agentOfficePhone, rating, ratingLabel, ratingMetrics, photoPreflight} → 201 record (in-memory `globalThis.__photoStudioSessions` Map); 400 when required fields missing. `GET ?session=` → record or 404.
- `GET /api/codeformer` → `{available:false, reason:"not_configured"}` without env, else health check (5 s timeout) → `{available, engine}`. `POST /api/codeformer?fidelity=0.8&upscale=2` → validates JPEG/PNG/WebP ≤ 12 MB, forwards to `{SERVICE_URL}/restore` with bearer token, 300 s timeout, returns PNG with `X-CodeFormer-Faces`.
- `services/codeformer/`: FastAPI app pinned to CodeFormer commit `b33cc7d639d6545bfcccc7e0bc6ae51f24e79c2b`, torch 2.1.2, `GET /health`, `POST /restore`, semaphore(1), `docker compose up --build` on port 7861. Optional; S-Lab licence, non-commercial.

### C14. Brand assets, print orders, review requests

`print-orders.ts`: sizes 3×2 ft RM55 "Standard subsale board", 4×3 ft RM85 "Large frontage board", 6×4 ft RM150 "Premium roadside board"; delivery "Collect at IQI office" RM0 "Ready in 2 working days", "Courier to site address" RM15 "3 – 5 working days"; payment FPX (Maybank2u, CIMB Clicks, RHB Now), card (Visa, Mastercard), e-wallet (Touch 'n Go, GrabPay); `formatMYR` → `RM 55.00`; order id `IQI-PRT-XXXXXX`; localStorage `studio-print-orders` (max 20, no artwork).

`photo-review-requests.ts`: `ReviewRequest{id, createdAt, agentName, agentId?, photo, score, status, disputedGates[], note, state:"pending"}`; id `IQI-REV-XXXXXX`; localStorage `studio-review-requests` (max 40, photo stripped).

`brand-assets.tsx`: steps 01 Choose portrait, 02 Background removal (auto on select; selfie segmenter; mask smoothstep over (v−.04)/.78; crop to person bounds with padding x max(4%, 18% subject), top max(3%, 8%), bottom max(2%, 5%)), 03 Atlas information (mobile, name, REN, office from the photo's Atlas fields; otherwise mock "sample agent details"); sliders Portrait size 40–150 (default 80), Vertical −100..100, Horizontal −100..100; subsale banner 2650×1786 with text left 72, text right 1760, portrait from x 1800; text layout: mobile 472px weight 800 at baseline 970, name 210px/700 at 1260, REN `(REN No.: …)` 84px/700 beside the name, office phone 172px/700 white at (410, 1684); font stack `"DIN Alternate","Avenir Next Condensed","Arial Narrow",Arial`; phone formatting `012-345 6789` / `011-2345 6789` / `03-7453 5155`; export bar "2650 × 1786 print file · boards from RM 55.00", "Send for printing" → `PrintOrderSheet` (size, quantity 1–20, delivery, address when courier ≥ 10 chars, method, total, "Pay RM …", 1.4 s fake confirmation, "Demo checkout · no live payment is processed and no card details are collected."). Awards template exists but is hidden (`showAwardsTemplate=false`).

### C15. Tests (86 in total)

`tests/photo-body.test.mjs` (10), `tests/photo-score.test.mjs` (5), `tests/photo-decision.test.mjs` (66), `tests/rendered-html.test.mjs` (5: `/` renders "Take a photo or scan QR", `/atlas` renders booking entry, studio session create/reload, incomplete/unknown sessions rejected, `/api/codeformer` reports `not_configured`). The full list of test names is in Appendix 1; each imports the `.ts` module directly with `--experimental-strip-types`, and rendered-html imports `dist/server/index.js` produced by `npm run build`.

### C16. Styling

`app/layout.tsx` imports, in order: `globals.css`, `iq-theme.css`, `app-ui.css`, `studio-camera.css`, `camera-pro.css`, `camera-v2.css`, `studio-session.css`, `polish.css`, `device-portability.css`, `studio-enhance.css`, `brand-assets.css`. Tokens: `--ink #111318`, `--ivory #f7f4ee`, `--gold #c6a15b`, `--blue #3f76ff`, `--green #487d5e`, `--line #d8d3c9`, `--muted #6c6a65`; body 17px "Atkinson Hyperlegible","Avenir Next",Arial; h1 Georgia serif `clamp(46px,6vw,86px)` with −.045em tracking; primary buttons 56px high; focus ring 3px `--blue`; reduced-motion respected; tone colours good `#5ce493`, fair `#f3b44d`, low `#ef7656`. Metadata title "Studio+", description "AI-guided portraits and a permissioned Brand Asset Gallery.".

### C17. Agent guardrails to recreate

`CLAUDE.md` (symlinked as `AGENTS.md`) with the table of modules, the seven invariants and conventions; `.claude/skills/studio-plus-demo/SKILL.md` (freeze rules and live-demo triage table) and `.claude/skills/photo-scoring-invariants/SKILL.md` (the nine rules and the threshold table); `.agents/skills` symlinked to `.claude/skills`. Both already exist in the archive — copy them.

### C18. Verification gates

- `npm run preflight` → "Studio+ demo preflight passed" with Node, lockfile v3, "7 offline demo assets verified", "no API keys or hosted storage required".
- `npm run test` → 86 pass, 0 fail.
- `npm run lint` → 0 errors (17 warnings are the known state: `<img>` and two `react-hooks/exhaustive-deps`).
- Manual: Atlas → Book → QR → `/` scan or code → session → camera or import → verdicts for all five samples → enhance → consent → Photos → Assets → banner → print order; all with Wi-Fi off.

---

## Appendix 1 — test names (assertion messages state the protected rule)

photo-body: a waist-up portrait is half body, not head and shoulders · a true head and shoulders crop is still head and shoulders · visible hips still read as half body · visible knees read as three-quarter · hands resting outside the frame cost nothing · an arm that leaves through a side edge is a chopped limb, hand or no hand · an arm continuing past the bottom edge is normal half-body framing · both arms chopped at the edges is the harder failure · an ordinary head reads as no accessory impact · an oversized hat widens the silhouette and costs crop flexibility.

photo-score: a good intentional portrait lands in the ready-for-design band · smooth skin is not evidence of blur · mild softness does not cascade into every category · structural detail genuinely going does lower all three · a small file is capped by the detail it can carry, not by its dimensions alone.

photo-decision: approves a usable portrait regardless of formality of pose · approves a seated casual portrait with hands resting out of frame · no note ever deducts from the score · padding is a note, never a deduction and never a verdict · a cap is a ceiling, not a value — a weak photo keeps its lower raw score · the lowest applicable cap wins when several gates fire · severe blur caps the score at 39 · smooth studio processing is softness, not severe blur · rejects a head-and-shoulders crop, and a chest-up crop caps higher · a phone screenshot caps at 55 · rejects an awkward crop that cuts the agent · an obvious selfie caps at 59 · a lived-in room on its own is an acceptable portrait setting · a phone aspect ratio on its own changes nothing · a lived-in room plus phone framing plus a raised hand is a snapshot · a close-camera selfie in a room is a snapshot · an agent lost in a wide room shot is a snapshot · a single snapshot cue changes nothing at all · cues that add up but fall short of the gate ask for human judgement · a studio cut-out never trips the snapshot gate · one cut-off hand is a note, both chopped hands is a capped reject · likely selfie framing caps at review level rather than retake · a busy background is a note; the editability score already carries it · the score bands are 80 approved, 65 review, below 65 retake · a hard failure overrides a high raw score · the number and the verdict can never contradict each other · every gap between the raw score and the final score is attributable · a visually excellent photo keeps its score and approval when the file is small · only a file too small to use anywhere becomes a re-upload request · file suitability is reported on its own axis · a genuinely bad photo in a small file is a retake, not a re-upload · a clean crop and background cannot carry a photo with poor facial detail · a category score is never a rejection trigger on its own · weak subject scores reject only once a defect is visually confirmed · the ready-for-design floor holds a photo at review rather than retake · a photo clearing every floor is not touched by them · a visible arm running off the frame edge is a crop failure, hands or not · hands and arms genuinely out of the composition still cost nothing · an ordinary accessory changes nothing · an oversized accessory is a note about layout flexibility, not about taste · a mirror or arm's-length selfie caps lower than a merely close one · mild softness is not a defect and does not touch the verdict · moderate blur reaches designer review, never a retake · severe blur needs the structural detail and the focus read to agree · a large mildly soft portrait stays ready for design · a small file only rejects when the facial detail is visibly gone · severe compression is its own confirmed defect · a clean background and a good crop never rescue a genuinely degraded subject · a technically sound photo rejected on judgement can be disputed · an approved photo has nothing to dispute · photo quality below the floor blocks designer review · photo quality exactly at the floor is eligible · a file too small to use anywhere blocks designer review · a face the detector could not find is still disputable · a full-body studio portrait is not a lost subject · a genuinely tiny subject in a cluttered scene still reads as a snapshot (the remaining decision tests cover per-gate caps and notes; see the archive).

## Appendix 2 — the three-minute judge flow (from the runbook)

0:00 `/atlas`, point at the low score — "A weak profile photo affects trust and leaves the brand team without approved assets." · 0:25 Book studio, show QR + code — "Atlas creates a studio handoff without putting personal details in the QR." · 0:45 Open studio / load code — "The agent and appointment arrive in the studio with the current photo-quality breakdown." · 1:05 camera or import — "The browser checks framing, light, size, contrast, and sharpness locally. It scores the photograph, not the person." · 1:35 retake result, then the passing portrait — "Feedback is limited to direct, fixable instructions." · 2:00 Studio Enhance, hold to compare — "Enhancement is optional, non-generative, and runs on this device." · 2:20 consent toggles — "Profile use and brand use are separate permissions attached to this photo." · 2:40 Save, Photos, Assets — "The agent receives the portrait, while the brand team sees only approved assets ready to download or print."
