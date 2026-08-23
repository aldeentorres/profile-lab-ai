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

---

## Appendix 3 — verbatim engine sources (the step-2 contract)

A dry run of this spec (2026-08-23) implemented step 2 from Parts C6–C9 alone and found the
prose insufficient to reproduce the engine identically: the `GateSignals` and
`PhotoDecision` types, the 14 requirement labels and detail strings, the `fileReason`,
`describe()`, hand-note and `scoreTrace` strings, the mask/landmark shapes, and the
histogram range of the structure read were all guessable but not specified. These four pure
modules are therefore included verbatim. They have no DOM or MediaPipe dependency and are the
exact files the 86 tests import. Reproduce them character-for-character; everything in
Parts C6–C9 is a reading guide to them.

### `app/photo-score.ts`

```ts
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
```

### `app/photo-decision.ts`

```ts
import type {BodyExtent, HandState} from "./photo-body";

export type PhotoStatus = "APPROVED"|"REVIEW"|"REUPLOAD"|"REJECT";
// "Is this a good photograph?" and "can we ship this file?" are separate questions.
// FileStatus answers the second one and never drags down the photo-quality score.
export type FileStatus = "OK"|"LOW"|"TOO_SMALL"|"UNUSABLE";
export type PhotoRequirement = {id:string;label:string;status:"PASS"|"FAIL";score:number;confidence:number;severity:"none"|"warning"|"critical";detail:string};
export type PhotoPenalty = {id:string;label:string;points:number;cap:number|null;forces_status:"REVIEW"|"REJECT"|null};
export type SnapshotSignal = {id:string;label:string;weight:number};
export type GateSignals={minimumDimension:number;resolutionScore:number;sharpnessScore:number;focusScore:number;structureScore:number;fidelityScore:number;faceCount:number;faceClearance:number;faceHeight:number;faceHeightPixels:number;faceClarity:number;selfieProbability:number;lightingScore:number;backgroundQuality:number;designerUsability:number;bodyExtent:BodyExtent;accessoryImpact:number;choppedLimbs:number;photoQuality:number;bodyCrop:number;faceVisibility:number;cropScore:number;hands:HandState;handScore:number;isScreenshot:boolean;letterboxed:boolean;contentCoverage:number;backgroundTexture:number;frameAspect:number;subjectCoverage:number;torsoVisible:number;shoulderTilt:number;handAtFace:boolean};
export type ScoreCap = {id:string;label:string;cap:number};
export type PhotoDecision={score:number;rawScore:number;appliedCap:ScoreCap|null;scoreTrace:string[];status:PhotoStatus;hardGates:string[];designerReviewEligible:boolean;disputableGates:string[];reviewBlockReason:string;qualityDefects:QualityDefect[];retakeAdvice:string;snapshotSignals:SnapshotSignal[];fileSuitability:number;fileStatus:FileStatus;fileReason:string;confidence:number;decisionReason:string;requirements:PhotoRequirement[];penalties:PhotoPenalty[]};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
// Pixel dimensions the marketing outputs actually need on the shortest edge.
// A file only blocks submission when it is too small to use anywhere at all.
export const fileResolutionTargets={unusable:300,usable:600,recommended:1000} as const;
export const bodyExtentLabels:Record<BodyExtent,string>={full_body:"Full body",three_quarter:"Three-quarter",half_body:"Half body",chest_up:"Head & chest",head_shoulders:"Head & shoulders",head_only:"Head only",unknown:"Unverified"};
export const bodyExtentScores:Record<BodyExtent,number>={full_body:100,three_quarter:100,half_body:92,chest_up:58,head_shoulders:38,head_only:14,unknown:0};
const rounded=(value:number)=>Math.round(clamp(value));
// What to actually do about each gate, so the advice answers the reason the photo was turned down.
const retakeInstructions:Record<string,string>={
 face_missing:"Take a new photo where the face is clearly visible and unobstructed.",
 face_unusable:"Send a photo taken closer, or at a higher resolution — there is too little detail on the face to use.",
 multiple_people:"Send a photo with only the agent in frame.",
 severe_blur:"Retake with the camera steady and the focus on the eyes.",
 screenshot:"Send the original photo file rather than a screenshot of it.",
 insufficient_body:"Step back so the frame reaches at least the waist.",
 minimal_body:"Step back so the frame reaches at least the waist — only the head and shoulders are in shot.",
 chopped_limbs:"Keep visible arms fully in frame, or leave them out of the composition entirely.",
 mirror_selfie:"Ask someone else to take the photo rather than shooting into a mirror.",
 subject_detail_floor:"Re-supply the original photo, or retake it sharper and closer — there is not enough usable detail on the subject.",
 low_resolution_detail_loss:"Re-upload the original file — at this size the facial detail is already pixelated away.",
 severe_degradation:"Re-supply the original photo file — this copy is too compressed or pixelated to use.",
 oversized_accessory:"Step back, or take the photo without the oversized headwear, so the agent can be cropped and laid up freely.",
 awkward_crop:"Leave room around the agent so nothing important is cut through.",
 severe_face_crop:"Leave space around the head — the face is running off the edge.",
 chopped_hands:"Keep hands fully in frame, or leave them out of the composition entirely.",
 obvious_selfie:"Ask someone else to take it, framed from head to waist with the camera at chest height.",
 casual_snapshot:"Ask someone else to take a portrait from head to waist, camera at chest height, against a tidy background.",
 severe_exposure:"Retake with even light on the face.",
 extreme_background:"Retake against a plainer background, or step further away from it.",
 unusable_for_design:"Frame the agent larger, with at least half the body in shot.",
};
export const photoApprovalThresholds={approved:80,review:65,score:80} as const;

// Some submission failures are not fully described by the four category scores. A phone screenshot can
// be sharp, well framed and easy to mask and still be the wrong file to send. Those failures apply a
// transparent maximum instead of a hidden deduction:
//
//   finalScore = min(rawScore, lowest applicable cap)
//
// The cap is a ceiling, not a value: a weak photo that also trips a gate keeps its own lower raw score.
// Nothing else moves the number — no deductions, no band fitting, no forcing the score to match a verdict.
export const scoreCaps:Record<string,number>={
 // Wrong kind of submission — the photograph may be fine, the file is not what a designer needs.
 obvious_selfie:59,
 casual_snapshot:59,
 screenshot:55,
 mirror_selfie:49,
 // Not enough of the agent, or the frame cuts through them.
 insufficient_body:59,
 minimal_body:49,
 chopped_limbs:59,
 awkward_crop:59,
 chopped_hands:59,
 severe_face_crop:49,
 unusable_for_design:49,
 // The image itself fails the minimum a designer can work from.
 severe_blur:39,
 face_missing:39,
 face_unusable:39,
 severe_exposure:39,
 severe_degradation:39,
 multiple_people:39,
 extreme_background:49,
 low_resolution_detail_loss:59,
 // Weak subject scores backed by a confirmed visual defect (see below). A clean background or a good
 // body crop is never allowed to carry a photo whose subject detail is genuinely gone.
 subject_detail_floor:64,
 design_readiness_floor:79,
 // Review-level: worth a human look, and the number says so rather than reading as ready.
 likely_selfie:79,
 snapshot_cues:79,
};
// Photo quality and face visibility are foundational: a designer cannot invent facial detail that the
// upload does not carry, however good the crop and background are. They are still only scores, though,
// and a score is an estimate — so `ready` holds a photo at designer review, and `review` is one half of
// a retake test whose other half is a confirmed visual defect. Neither number rejects on its own.
export const categoryFloors={ready:{photoQuality:72,faceVisibility:75,bodyCrop:70},review:{photoQuality:65,faceVisibility:65}} as const;

// Designer review is for challenging AI *judgement*, never for rescuing a bad file. A photo qualifies
// when nothing measured in the image is wrong with it — see `validateQualityDefects` — and the photo
// quality clears this floor. It sits deliberately between the two above: 65 reviews, 70 may be
// disputed, 72 is ready. A photo at 71 is below the ready bar and can argue the point; one at 69
// cannot, because at that level the weakness is in the photograph rather than in the verdict.
export const designerReviewFloor=70;
// Background edge magnitude above which a scene reads as busy. `lived` is the generic "not a plain
// backdrop" bar; `lostSubjectTexture` is deliberately higher, because concluding that the agent is lost
// in the scene is a much stronger claim than noticing the background is not seamless paper.
export const snapshotCueThresholds={lived:8,lostSubjectTexture:14} as const;
// Gates a measured defect produced. These are the objectively technical failures, and they are the only
// ones a designer cannot overrule: no judgement recovers detail the file does not carry.
const defectBackedGates=new Set(["severe_blur","face_unusable","severe_degradation","low_resolution_detail_loss","subject_detail_floor"]);

// --- Validated visual defects ---------------------------------------------------------------------
//
// A category score is a weighted estimate, and estimates are wrong sometimes. So no score, and no
// combination of scores, is ever a rejection trigger by itself: a quality-driven retake has to point at
// something genuinely visible in the image. That is what this section is for.
//
// Every rule below is written to separate three different things that all lower a sharpness read:
//
//   slight softness   smooth skin, beauty retouching, JPEG compression, soft studio lighting, AI
//                     enhancement, ordinary portrait processing. Structural detail is intact, so the
//                     photo stays ready for design.
//   moderate blur     detail is visibly reduced but the designer can still work with the subject. It
//                     costs category points and may reach designer review. Never a retake.
//   severe blur       the features genuinely lack definition and the subject boundary has dissolved.
//                     Only this is a defect.
//
// Structure — eyes, eyebrows, hairline, nose and lip boundaries, glasses, collar, seams, silhouette — is
// what every rule reads. Skin texture is not evidence of anything.
export type QualityDefect={id:string;label:string;evidence:string};
export const qualityDefectRules={
 // Two independent reads must agree before an image is called unusably blurred: the structural edges
 // have gone, and the frame-wide focus read confirms it rather than blaming retouching for it.
 severeBlur:{structure:30,focus:35},
 // Fewer pixels on the face than any output can print from, whatever the rest of the file measures.
 faceDetail:{pixels:90},
 // Small file AND the detail loss it implies is actually visible on the subject. Small dimensions on
 // their own are never a defect — a good photograph in a small file is still a good photograph.
 lowResolution:{minimumDimension:fileResolutionTargets.usable,facePixels:150,structure:48},
 // Blocky, over-compressed or corrupted: no structural edge survives, at any scale, anywhere.
 degradation:{structure:22,fidelity:32,supportingStructure:40},
} as const;

export function validateQualityDefects(signals:GateSignals):QualityDefect[]{
 const defects:QualityDefect[]=[];
 const structure=clamp(signals.structureScore??0),focus=Math.min(clamp(signals.focusScore??0),clamp(signals.sharpnessScore??0));
 const facePixels=signals.faceCount>0?Math.max(0,signals.faceHeightPixels??0):0,fidelity=clamp(signals.fidelityScore??100);
 const rules=qualityDefectRules;
 if(structure<rules.severeBlur.structure&&focus<rules.severeBlur.focus)
  defects.push({id:"severe_blur",label:"Severe blur — the subject cannot be edited",evidence:`Structural detail ${Math.round(structure)}/100 and focus ${Math.round(focus)}/100: the facial features and the subject outline have both lost definition.`});
 if(facePixels>0&&facePixels<rules.faceDetail.pixels)
  defects.push({id:"face_unusable",label:"Too little usable detail on the face",evidence:`Roughly ${Math.round(facePixels)}px of face height — below the detail any marketing output can print.`});
 if(facePixels>0&&signals.minimumDimension<rules.lowResolution.minimumDimension&&facePixels<rules.lowResolution.facePixels&&structure<rules.lowResolution.structure)
  defects.push({id:"low_resolution_detail_loss",label:"Low resolution with visible loss of facial detail",evidence:`${signals.minimumDimension}px shortest edge, ~${Math.round(facePixels)}px of face, structural detail ${Math.round(structure)}/100 — the detail is visibly pixelated away, not merely small.`});
 if(structure<rules.degradation.structure||(fidelity<rules.degradation.fidelity&&structure<rules.degradation.supportingStructure))
  defects.push({id:"severe_degradation",label:"Pixelation or compression has destroyed the subject detail",evidence:`Structural detail ${Math.round(structure)}/100, compression fidelity ${Math.round(fidelity)}/100.`});
 return defects;
}

export function applyPhotoDecision(baseScore:number,signals:GateSignals):PhotoDecision{
 const requirement=(id:string,label:string,score:number,pass:boolean,confidence:number,severity:PhotoRequirement["severity"],detail:string):PhotoRequirement=>({id,label,status:pass?"PASS":"FAIL",score:rounded(score),confidence:Number(clamp(confidence,0,1).toFixed(2)),severity:pass?"none":severity,detail});
 const hasFace=signals.faceCount>0,singleAgent=signals.faceCount===1,severeCrop=hasFace&&signals.faceClearance<.005,moderateCrop=hasFace&&signals.faceClearance<.025;
 // Validated before any gate reads a category score, because no category score may reject without one.
 const qualityDefects=validateQualityDefects(signals),defect=(id:string)=>qualityDefects.find(item=>item.id===id)??null;
 const subjectDetailFailed=signals.photoQuality<categoryFloors.review.photoQuality&&signals.faceVisibility<categoryFloors.review.faceVisibility&&qualityDefects.length>0;
 const minimalBody=signals.bodyExtent==="head_only"||signals.bodyExtent==="head_shoulders",chestOnly=signals.bodyExtent==="chest_up",thinBody=minimalBody||chestOnly,unknownBody=signals.bodyExtent==="unknown";
 const requirements:PhotoRequirement[]=[
  // "Slightly soft" and "cannot be cleanly used" are different findings and are never stated as if they
  // were the same one. Only a validated severe-blur defect earns the second wording.
  requirement("focus","Sharpness & focus",Math.min(signals.sharpnessScore,signals.focusScore),Math.min(signals.sharpnessScore,signals.focusScore)>=55||clamp(signals.structureScore??0)>=60,.85,defect("severe_blur")?"critical":"warning",defect("severe_blur")?"The subject is genuinely out of focus — the facial features and outline cannot be cleanly used":Math.min(signals.sharpnessScore,signals.focusScore)>=55?"Sharp enough to edit and print at size":clamp(signals.structureScore??0)>=60?"Softly processed, but the eyes, hairline and clothing edges stay usable":"Slightly soft — check focus on the eyes"),
  requirement("face_visibility","Face clearly visible",hasFace?100:0,hasFace,.9,"critical",hasFace?"The agent's face is clearly visible":"No clear face detected in this agent portrait"),
  requirement("single_agent","One agent",singleAgent?100:signals.faceCount?25:0,singleAgent,.9,"critical",singleAgent?"Exactly one agent detected":signals.faceCount>1?`${signals.faceCount} faces detected — submit one agent only`:"Cannot verify a single agent without a visible face"),
  requirement("body_visible","Enough body visible",bodyExtentScores[signals.bodyExtent],!thinBody&&!unknownBody,.8,thinBody?"critical":"warning",unknownBody?"Body framing could not be verified":minimalBody?"Only the head and shoulders are in frame — a designer needs at least half the body":chestOnly?"The frame stops at the chest — a designer needs it to reach the waist":`${bodyExtentLabels[signals.bodyExtent]} in frame — enough area for marketing layouts`),
  requirement("crop_safety","Clean crop",signals.cropScore,signals.cropScore>=62,.8,signals.cropScore<40?"critical":"warning",signals.cropScore>=62?"Nothing important is cut off":signals.cropScore<40?"The agent is cropped in a way that limits editing":"Slightly awkward crop — leave a little more room"),
  requirement("hands","Hand & limb framing",signals.hands==="partial"?55:100,signals.hands!=="partial",.7,"warning",signals.hands==="complete"?"Visible hands are fully in frame":signals.hands==="absent"?"Hands and arms are outside the composition — nothing to crop badly":signals.choppedLimbs?"A visible arm runs off the side of the frame and stops in mid-air":"A visible hand is cut off at the frame edge, which is awkward to mask"),
  requirement("selfie","Intentionally photographed",(1-signals.selfieProbability)*100,signals.selfieProbability<.5&&!signals.isScreenshot,Math.max(.62,Math.abs(signals.selfieProbability-.5)*1.6),signals.selfieProbability>=.75||signals.isScreenshot?"critical":"warning",signals.isScreenshot?"This is a phone screenshot, not a supplied photo file":signals.selfieProbability<.2?"Reads as an intentionally taken portrait":signals.selfieProbability<.5?"Some selfie cues — worth a quick look":"Reads as a casual or mirror selfie"),
  requirement("source_frame","Original photo file",Math.round(signals.contentCoverage*100),!signals.letterboxed,.78,"warning",signals.letterboxed?"Padded with empty canvas — a designer trims that in seconds; supply the original where you have it":"Supplied as a full photo frame"),
  requirement("exposure","Exposure",signals.lightingScore,signals.lightingScore>=60,.9,signals.lightingScore<35?"critical":"warning",signals.lightingScore>=60?"Exposure is usable":"Lighting is too dark, bright, or uneven"),
  requirement("background","Background & editability",signals.backgroundQuality,signals.backgroundQuality>=60,.72,signals.backgroundQuality<30?"critical":"warning",signals.backgroundQuality>=60?"Clean enough to isolate the agent":"Background is distracting and makes editing harder"),
  requirement("designer_usability","Designer usability",signals.designerUsability,signals.designerUsability>=60,.78,signals.designerUsability<35?"critical":"warning",signals.designerUsability>=60?"Usable for profile and marketing layouts":"Not enough usable subject area for design work"),
  requirement("accessory_fit","Accessory fit for layout",rounded(100-signals.accessoryImpact*45),signals.accessoryImpact<.4,.6,"warning",signals.accessoryImpact<.4?"Nothing the agent is wearing limits the crop":"A head accessory widens the silhouette and limits cropping and layout — the accessory itself is fine, its size in this frame is not"),
  // Fails only when weak scores and a confirmed visual defect agree. A 63 on its own is an estimate.
  requirement("subject_detail","Usable subject detail",Math.min(signals.photoQuality,signals.faceVisibility),!subjectDetailFailed,.85,"critical",subjectDetailFailed?`Too little usable detail on the subject — a clean crop and background cannot make up for it. ${qualityDefects[0].evidence}`:qualityDefects.length?qualityDefects[0].evidence:"Enough detail on the subject to edit and print"),
  requirement("resolution","File resolution",signals.resolutionScore,signals.minimumDimension>=fileResolutionTargets.usable,1,"warning",signals.minimumDimension>=fileResolutionTargets.recommended?"Large enough for every marketing output":signals.minimumDimension>=fileResolutionTargets.usable?`${signals.minimumDimension}px shortest edge — fine for profile cards, tight for large banners`:`${signals.minimumDimension}px shortest edge — good photo, small file; re-supply the original if you need print size`),
 ];
  const penalties:PhotoPenalty[]=[],addPenalty=(id:string,label:string,points:number,cap:number|null,forces_status:PhotoPenalty["forces_status"])=>penalties.push({id,label,points,cap,forces_status});
 // A hard gate may only fire when the problem materially prevents — or significantly limits — a graphic
 // designer from using the agent in marketing artwork. Cosmetic imperfections (padding or empty canvas,
 // aspect ratio, moderate resolution limits, casual posing, sitting, leaning, clothing style, naturally
 // hidden hands) are editable in seconds and must never force a verdict: they move the score only.
 // A hard gate decides the verdict and never edits the number: the technical qualities of the photograph
 // do not get worse because a gate fired, and a capped score hides what the photo is actually like.
 const blocker=(id:string,label:string)=>addPenalty(id,label,0,scoreCaps[id]??null,"REJECT");
 // Notes are exactly that: the four category scores already carry these problems, so a note never
 // deducts a second time. Where a note describes something the categories cannot see, it carries a cap.
 const note=(id:string,label:string,forces:PhotoPenalty["forces_status"]=null)=>addPenalty(id,label,0,scoreCaps[id]??null,forces);
 const focus=Math.min(signals.sharpnessScore,signals.focusScore);
 // --- Hard gates: a designer cannot work with this person from this photo. ---
 if(!hasFace)blocker("face_missing","Face not clearly visible");
 if(signals.faceCount>1)blocker("multiple_people","Multiple people detected");
 // Detecting a face is not the same as having a face a designer can use — but "cannot be used" is a
 // measurement of the pixels actually on the face, not a threshold on a derived score.
 if(hasFace&&defect("face_unusable"))blocker("face_unusable","Too little usable detail on the face");
 // Retouching, smooth skin, soft studio processing, AI enhancement and mild compression all lower a
 // sharpness read without making the photo impractical. Only the validated defect — structural edges
 // gone and the focus read agreeing — is severe blur; everything softer than that is reported by the
 // category scores (photo quality, face visibility, editability) and by the notes below.
 if(defect("severe_blur"))blocker("severe_blur","Severe blur — the subject cannot be edited");
 if(defect("severe_degradation"))blocker("severe_degradation","Pixelation or compression has destroyed the subject detail");
 // Small dimensions alone are advisory (see the file axis below). This fires only when the small file
 // has visibly cost the face its detail.
 if(defect("low_resolution_detail_loss"))blocker("low_resolution_detail_loss","Low resolution with visible loss of facial detail");
 if(signals.isScreenshot)blocker("screenshot","Phone screenshot, not a photo file");
 if(minimalBody)blocker("minimal_body","Only head and shoulders in frame");
 else if(chestOnly)blocker("insufficient_body","The frame stops at the chest, above the waist");
 if(signals.cropScore<40)blocker("awkward_crop","The crop cuts through the agent");
 if(severeCrop)blocker("severe_face_crop","Face severely cropped");
 if(signals.hands==="partial"&&signals.handScore<=40)blocker("chopped_hands","Both hands are chopped at the frame edge");
 // A visible arm running off the side of the frame is a crop problem whether or not the hand was ever
 // in shot. Arms continuing past the bottom edge are normal half-body framing and never counted here.
 if(signals.choppedLimbs>=1&&signals.hands!=="complete")blocker("chopped_limbs","A visible arm is cut off at the frame edge");
 // A mirror or arm's-length selfie is the least usable of the selfie shapes: the camera is right on the
 // agent and there is almost no body left to lay up, so it caps lower than a merely close self-portrait.
 if(signals.selfieProbability>=.85&&(signals.handAtFace||minimalBody))blocker("mirror_selfie","Mirror or arm's-length selfie");
 else if(signals.selfieProbability>=.75)blocker("obvious_selfie","Obvious casual selfie");
 if(signals.lightingScore<35)blocker("severe_exposure","Exposure is too far gone to edit");
 if(signals.backgroundQuality<30)blocker("extreme_background","Background makes isolating the agent impossible");
 if(signals.designerUsability<35)blocker("unusable_for_design","Not enough usable subject area to design with");
 // Obvious selfie / incidental snapshot. Never decided by one cue: a lived-in room, a phone aspect ratio or
 // a relaxed pose are each perfectly acceptable alone. Several agreeing cues are what make it a snapshot
 // rather than a portrait somebody set out to take.
 const snapshotCues:(SnapshotSignal&{hit:boolean})[]=[
  {id:"lived_in_scene",label:"Photographed in a lived-in room rather than set up as a portrait",weight:1,hit:signals.backgroundTexture>=snapshotCueThresholds.lived},
  {id:"full_frame_capture",label:"Straight-off-the-phone or webcam framing",weight:.5,hit:signals.frameAspect<=.6||signals.frameAspect>=1.15},
  {id:"camera_close",label:"Camera held close to the face",weight:1,hit:signals.faceHeight>=.28},
  {id:"hand_at_face",label:"Hand raised into frame at face height",weight:.5,hit:signals.handAtFace&&signals.backgroundTexture>=snapshotCueThresholds.lived},
  {id:"camera_tilt",label:"Hand-held camera tilt",weight:.5,hit:signals.shoulderTilt>=10},
  // Low coverage on its own means nothing: a standing figure in a 2:3 frame covers about a quarter of
  // it, and `bodyExtentScores` rates full-body framing at 100. So "small in frame" only reads as lost
  // when the scene around them is genuinely busy — a measured studio sweep sits near 9, a cluttered
  // room near 20. Sharing the 8 threshold with `lived_in_scene` made a deliberate full-length portrait
  // trip both cues at once and reach the blocking weight of 2 on a single borderline measurement.
  {id:"subject_lost_in_scene",label:"The agent occupies little of the frame",weight:1,hit:signals.subjectCoverage<.34&&signals.backgroundTexture>=snapshotCueThresholds.lostSubjectTexture},
  {id:"torso_cut_short",label:"The frame stops above the waist",weight:.5,hit:signals.torsoVisible>0&&signals.torsoVisible<.9},
 ];
 const snapshotSignals=snapshotCues.filter(cue=>cue.hit).map(({id,label,weight})=>({id,label,weight}));
 const snapshotWeight=snapshotSignals.reduce((total,cue)=>total+cue.weight,0);
 if(snapshotWeight>=2)blocker("casual_snapshot","Obvious selfie or incidental snapshot, not a portrait taken for marketing use");
 else if(snapshotWeight>=1.5)note("snapshot_cues","Some snapshot framing cues — worth a human look","REVIEW");
 // --- Notes only. Each of these already shows up in a category score, so none of them deducts again:
 // softness is in photo quality and face visibility, a busy background is in editability, a tight crop
 // is in body & crop usability. Punishing them a second time here would double-count one problem. ---
 if(focus>=35&&focus<55&&clamp(signals.structureScore??0)<60)note("soft_image","Slightly soft — the original file is preferred where available");
 if(signals.letterboxed)note("padded_export","Empty canvas around the photo — trimmed in seconds");
 if(signals.lightingScore>=35&&signals.lightingScore<60)note("poor_exposure","Exposure needs a lift");
 if(signals.backgroundQuality>=30&&signals.backgroundQuality<60)note("busy_background","Background is slightly distracting");
 if(signals.designerUsability>=35&&signals.designerUsability<60)note("limited_design_use","Limited space for the designer");
 if(signals.cropScore>=40&&signals.cropScore<62)note("tight_crop","Slightly awkward crop");
 if(moderateCrop&&!severeCrop)note("tight_face_crop","Face sits close to the frame edge");
 if(signals.hands==="partial"&&signals.handScore>40)note("cut_hands","A visible hand is cut off at the frame edge");
 // Selfie framing the categories cannot see on their own: worth a designer's eye, so it caps at review level.
 if(signals.selfieProbability>=.5&&signals.selfieProbability<.75)note("likely_selfie","Likely selfie framing","REVIEW");
 if(signals.accessoryImpact>=.4)note("oversized_accessory","A head accessory widens the silhouette and limits cropping and layout");
 // Score answers "is this a good photograph?" only — every capping penalty above is about what the
 // photograph shows, never about how many pixels the uploaded file happens to carry.
 // --- Critical category floors. Photo quality and face visibility are foundational: they describe how
 // much of the agent actually survived into the file, and no crop or background score can put detail
 // back. But a category score is an estimate, and a slightly inaccurate estimate must never be enough
 // on its own to turn down a good portrait. So the retake floor is a conjunction: both foundational
 // scores in the genuinely-degraded band AND a defect confirmed in the image. Neither half rejects
 // alone — a 63 with intact structural detail is a photo, not a fault. A floor is not a penalty; it is
 // a ceiling, applied the same transparent way as any gate. ---
 const {photoQuality,faceVisibility,bodyCrop}=signals;
 const subjectScoresPoor=photoQuality<categoryFloors.review.photoQuality&&faceVisibility<categoryFloors.review.faceVisibility;
 const subjectFloorFailed=subjectDetailFailed;
 const readyFloorFailed=photoQuality<categoryFloors.ready.photoQuality||faceVisibility<categoryFloors.ready.faceVisibility||bodyCrop<categoryFloors.ready.bodyCrop;
 if(subjectFloorFailed)blocker("subject_detail_floor",`Not enough usable subject detail — photo quality ${rounded(photoQuality)}, face visibility ${rounded(faceVisibility)}, confirmed by ${qualityDefects[0].label.toLowerCase()}`);
 // Below the ready-for-design bar but with nothing confirmed against it: designer review, never a retake.
 else if(readyFloorFailed||subjectScoresPoor)note("design_readiness_floor",`Usable, but below the ready-for-design minimum — photo quality ${rounded(photoQuality)}, face visibility ${rounded(faceVisibility)}, body & crop ${rounded(bodyCrop)}`,"REVIEW");
 // The raw score arrives already weighted from the four category scores and is never adjusted here.
 const rawScore=rounded(baseScore),forcedReject=penalties.some(penalty=>penalty.forces_status==="REJECT");
 const gatePenalties=penalties.filter(penalty=>penalty.forces_status==="REJECT"),hardGates=gatePenalties.map(penalty=>penalty.label);
 // Every validated gate contributes a ceiling; the lowest one wins. min() is the only arithmetic between
 // the raw score and the displayed one, so any difference between them is always attributable to a gate.
 const caps:ScoreCap[]=penalties.filter(penalty=>penalty.cap!==null).map(penalty=>({id:penalty.id,label:penalty.label,cap:penalty.cap as number}));
 const appliedCap=caps.filter(entry=>entry.cap<rawScore).sort((first,second)=>first.cap-second.cap)[0]??null;
 const score=appliedCap?appliedCap.cap:rawScore;
 const retakeAdvice=gatePenalties.map(penalty=>retakeInstructions[penalty.id]).find(Boolean)??"";
 // File suitability answers "can we ship this particular file?" and is tracked on its own axis.
 const fileSuitability=rounded(signals.resolutionScore),fileStatus:FileStatus=signals.minimumDimension>=fileResolutionTargets.recommended?"OK":signals.minimumDimension>=fileResolutionTargets.usable?"LOW":signals.minimumDimension>=fileResolutionTargets.unusable?"TOO_SMALL":"UNUSABLE",fileReason=fileStatus==="OK"?`${signals.minimumDimension}px shortest edge is large enough for every marketing output.`:fileStatus==="LOW"?`${signals.minimumDimension}px shortest edge works for profile cards but is tight for large banners and print.`:fileStatus==="TOO_SMALL"?`${signals.minimumDimension}px shortest edge is small — usable on screen, but re-supply the original for print or large banners.`:`${signals.minimumDimension}px shortest edge is too small to use anywhere — re-upload the original file.`;
 // --- Designer review eligibility ---
 // Three terms, and every one of them is a measurement rather than an estimate. `qualityDefects` is
 // already the set of failures validated against the pixels, so "no severe blur", "face has usable
 // detail", "not pixelated or corrupted" and "resolution carries enough detail" all collapse into it.
 // Note what is deliberately absent: no gate, no verdict and no derived score appears here. A gate
 // firing is precisely the thing the agent is entitled to argue about.
 const reviewBlockingDefect=qualityDefects[0]??null;
 const designerReviewEligible=photoQuality>=designerReviewFloor&&!reviewBlockingDefect&&fileStatus!=="UNUSABLE";
 const reviewBlockReason=designerReviewEligible?"":reviewBlockingDefect?`${reviewBlockingDefect.label}. ${reviewBlockingDefect.evidence}`:fileStatus==="UNUSABLE"?fileReason:`Photo quality ${rounded(photoQuality)} is below the ${designerReviewFloor} needed for a designer to work from this image.`;
 // What the agent would actually be challenging: every judgement that changed the verdict, minus the
 // measured defects, which are not matters of opinion.
 const disputableGates=penalties.filter(penalty=>penalty.forces_status&&!defectBackedGates.has(penalty.id)).map(penalty=>penalty.label);
 const photoIsUsable=!forcedReject&&rawScore>=photoApprovalThresholds.review;
 // Resolution is advisory: a good photograph in a small file is still a good photograph. Only a file
 // too small to use anywhere becomes a re-upload request, and it never lowers the quality score.
 // A genuine hard failure overrides the score; nothing else does. 80+ approves, 65+ reviews, below 65 retakes.
 const status:PhotoStatus=forcedReject||score<photoApprovalThresholds.review?"REJECT":fileStatus==="UNUSABLE"?"REUPLOAD":score<photoApprovalThresholds.approved?"REVIEW":"APPROVED";
 // Every gate caps at or below 59, so a fired gate already puts the score under the retake threshold:
 // the verdict and the number are two readings of the same value, and cannot contradict each other.
 const scoreTrace=[`Categories: photo quality ${rounded(photoQuality)}, body & crop ${rounded(bodyCrop)}, face visibility ${rounded(faceVisibility)}, background & editability ${rounded(signals.designerUsability)}.`,`Raw score ${rawScore} = those four weighted 30/30/20/20.`,`Validated quality defects: ${qualityDefects.length?qualityDefects.map(item=>`${item.label.toLowerCase()} — ${item.evidence}`).join(" "):"none — no score alone may force a retake."}`,`Critical floors: ${subjectFloorFailed?"FAIL — weak subject scores confirmed by a visual defect":readyFloorFailed||subjectScoresPoor?"below the ready-for-design minimum":"PASS"}.`,caps.length?`Validated gates: ${caps.map(entry=>`${entry.label} (max ${entry.cap})`).join("; ")}.`:"Validated gates: none.",appliedCap?`Final score ${score} = min(${rawScore}, ${appliedCap.cap}) — capped by ${appliedCap.label.toLowerCase()}.`:`Final score ${score} — no cap applied.`];
 const failed=requirements.filter(item=>item.status==="FAIL"),confidence=Number((requirements.reduce((total,item)=>total+item.confidence,0)/requirements.length).toFixed(2)),primaryPenalty=penalties.find(penalty=>penalty.forces_status==="REJECT")??null;
 const decisionReason=status==="REUPLOAD"?`${photoIsUsable&&!penalties.length?"The photograph itself is good":"The photograph is usable"} — only the file is too small. ${fileReason}`:primaryPenalty?`Retake recommended: ${primaryPenalty.label.toLowerCase()}. Marketing readiness ${score}/100${appliedCap?` — capped at ${appliedCap.cap} by that gate, from a raw ${rawScore}`:""}.`:penalties.length?`Usable for design. Noted: ${penalties[0].label.toLowerCase()}.`:failed.find(item=>item.id!=="resolution")?.detail??(fileStatus==="LOW"?fileReason:"Usable for design — nothing blocks a designer.");
 return {score,rawScore,appliedCap,scoreTrace,status,hardGates,designerReviewEligible,disputableGates,reviewBlockReason,qualityDefects,retakeAdvice,snapshotSignals,fileSuitability,fileStatus,fileReason,confidence,decisionReason,requirements,penalties};
}
```

### `app/photo-body.ts`

```ts
import type {FaceRegion, PersonMask} from "./image-enhancement";

export type PoseLandmark = {x:number;y:number;visibility:number};
export type BodyExtent = "unknown"|"head_only"|"head_shoulders"|"chest_up"|"half_body"|"three_quarter"|"full_body";
export type HandState = "absent"|"complete"|"partial";
export type BodyAnalysis = {
 extent:BodyExtent;
 extentScore:number;
 bodyVisibleRatio:number;
 cropScore:number;
 croppedEdges:string[];
 hands:HandState;
 handScore:number;
 handNote:string;
 subjectArea:number;
 // Framing geometry the snapshot gate reads. torsoVisible is how far down the torso the frame reaches:
 // 1 = the waist is at the bottom edge, below 1 = the frame stops higher up the chest.
 torsoVisible:number;
 shoulderTilt:number;
 handAtFace:boolean;
 // How far the silhouette spreads around the head relative to the face, and what that costs a designer.
 // This is about crop and layout flexibility only — never about whether an accessory suits the agent.
 headSpread:number;
 accessoryImpact:number;
 choppedLimbs:number;
 note:string;
};

// MediaPipe pose landmark indices we care about.
const NOSE=0,L_SHOULDER=11,R_SHOULDER=12,L_ELBOW=13,R_ELBOW=14,L_WRIST=15,R_WRIST=16,L_HIP=23,R_HIP=24,L_KNEE=25,R_KNEE=26,L_ANKLE=27,R_ANKLE=28;
const L_HAND=[17,19,21],R_HAND=[18,20,22];
const VISIBLE=.55,clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const inFrame=(point?:PoseLandmark)=>!!point&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1;
const seen=(point?:PoseLandmark)=>!!point&&point.visibility>=VISIBLE&&inFrame(point);
const eitherSeen=(points:PoseLandmark[],a:number,b:number)=>seen(points[a])||seen(points[b]);

// "Enough body for a designer to work with" is a function of how far down the torso the frame reaches,
// never of how formally the agent is posed. Sitting, leaning and relaxed arms all read the same here.
function measureExtent(points:PoseLandmark[],silhouetteRatio:number):{extent:BodyExtent;extentScore:number}{
 const shoulders=eitherSeen(points,L_SHOULDER,R_SHOULDER),hips=eitherSeen(points,L_HIP,R_HIP),knees=eitherSeen(points,L_KNEE,R_KNEE),ankles=eitherSeen(points,L_ANKLE,R_ANKLE),head=seen(points[NOSE]);
 if(ankles)return {extent:"full_body",extentScore:100};
 if(knees)return {extent:"three_quarter",extentScore:100};
 if(hips)return {extent:"half_body",extentScore:92};
 // Half body means head to waist or hip. A frame that stops at mid-chest is a different, much less
 // flexible photograph, so it gets its own tier rather than being rounded up to half body.
 // A hip landmark that lands just past the bottom edge means the frame cuts through the torso — a
 // waist-up portrait, not a head-and-shoulders crop. The silhouette-to-face ratio says the same thing,
 // and it is the only read available when the pose model is missing, so honour either signal.
 if(shoulders&&(torsoRunsPastBottom(points)||silhouetteRatio>=3.1))return {extent:"half_body",extentScore:92};
 if(shoulders&&silhouetteRatio>=2.4)return {extent:"chest_up",extentScore:58};
 if(shoulders)return {extent:"head_shoulders",extentScore:38};
 if(head)return {extent:"head_only",extentScore:14};
 return {extent:"unknown",extentScore:0};
}

// Hips predicted below the frame edge (but not wildly extrapolated) mean the torso continues past the crop.
function torsoRunsPastBottom(points:PoseLandmark[]){return [L_HIP,R_HIP].some(index=>{const point=points[index];return !!point&&point.y>1&&point.y<1.6&&point.x>=-.2&&point.x<=1.2})}

// A visible arm that leaves through a side edge is a chopped limb even when the hand itself was never
// in shot: the designer is left with a forearm that stops in mid-air. The bottom edge is different —
// every half-body portrait cuts the subject there, so an arm continuing past it is normal framing.
function measureLimbs(points:PoseLandmark[]){
 return [[L_ELBOW,L_WRIST],[R_ELBOW,R_WRIST]].filter(([elbowIndex,wristIndex])=>{
  const elbow=points[elbowIndex],wrist=points[wristIndex];
  if(!seen(elbow))return false;
  if(elbow.x<=.05||elbow.x>=.95)return true;
  return !!wrist&&wrist.visibility>=VISIBLE*.7&&!inFrame(wrist)&&(wrist.x<0||wrist.x>1);
 }).length;
}

// A hand only matters when the agent actually put it in the shot. Hands resting out of frame or
// tucked behind the body are normal portrait framing and must not cost anything — but an arm the
// designer can see running off the side of the frame is never "nothing to crop badly".
function measureHands(points:PoseLandmark[],choppedLimbs:number):{hands:HandState;handScore:number;handNote:string}{
 const side=(wrist:number,fingers:number[])=>{
  const w=points[wrist];
  if(!w||w.visibility<VISIBLE)return "absent" as HandState;
  if(!inFrame(w))return "absent" as HandState;
  const tracked=fingers.map(index=>points[index]).filter((point):point is PoseLandmark=>!!point&&point.visibility>=VISIBLE*.7);
  if(!tracked.length)return "partial" as HandState;
  return tracked.every(inFrame)?"complete" as HandState:"partial" as HandState;
 };
 const left=side(L_WRIST,L_HAND),right=side(R_WRIST,R_HAND),states=[left,right];
 const partial=states.filter(state=>state==="partial").length,complete=states.filter(state=>state==="complete").length;
 if(partial>=2||choppedLimbs>=2)return {hands:"partial",handScore:34,handNote:choppedLimbs>=2?"Both arms are cut off at the frame edge — hard to mask cleanly":"Both hands run out of frame — hard to mask cleanly"};
 if(partial===1||choppedLimbs===1)return {hands:"partial",handScore:62,handNote:partial?"One hand is cut off at the frame edge":"A visible arm runs off the side of the frame and stops in mid-air"};
 if(complete)return {hands:"complete",handScore:100,handNote:`${complete===2?"Both hands are":"The visible hand is"} fully in frame`};
 return {hands:"absent",handScore:100,handNote:"Hands are outside the composition — nothing to crop badly"};
}

// Which frame edges the silhouette runs off, and how much of it does so.
function measureCrop(mask:PersonMask|null,points:PoseLandmark[]):{cropScore:number;croppedEdges:string[]}{
 const croppedEdges:string[]=[];
 if(!mask)return {cropScore:70,croppedEdges};
 const {data,width,height}=mask,covered=(index:number)=>data[index]>.5;
 const edgeRun=(cells:number[])=>cells.filter(covered).length/cells.length;
 const topCells=[],bottomCells=[],leftCells=[],rightCells=[];
 for(let x=0;x<width;x+=1){topCells.push(x);bottomCells.push((height-1)*width+x)}
 for(let y=0;y<height;y+=1){leftCells.push(y*width);rightCells.push(y*width+width-1)}
 const top=edgeRun(topCells),bottom=edgeRun(bottomCells),left=edgeRun(leftCells),right=edgeRun(rightCells);
 // A subject standing on the bottom edge is normal framing; the head and the sides are not.
 if(top>.06)croppedEdges.push("top of the head");
 if(left>.3)croppedEdges.push("left side");
 if(right>.3)croppedEdges.push("right side");
 const headCut=seen(points[NOSE])&&top>.06?28:0;
 const cropScore=clamp(100-top*260-Math.max(0,left-.3)*120-Math.max(0,right-.3)*120-headCut-Math.max(0,bottom-.86)*40);
 return {cropScore,croppedEdges};
}

function measureFraming(points:PoseLandmark[]){
 const left=points[L_SHOULDER],right=points[R_SHOULDER],leftHip=points[L_HIP],rightHip=points[R_HIP],nose=points[NOSE];
 if(!left||!right)return {torsoVisible:0,shoulderTilt:0,handAtFace:false};
 const shoulderY=(left.y+right.y)/2,hipY=leftHip&&rightHip?(leftHip.y+rightHip.y)/2:0;
 const torsoVisible=hipY>shoulderY?clamp((1-shoulderY)/(hipY-shoulderY),0,4):0;
 const degrees=Math.abs(Math.atan2(left.y-right.y,left.x-right.x))*180/Math.PI;
 const shoulderTilt=Math.min(degrees,180-degrees);
 const handAtFace=!!nose&&[points[L_WRIST],points[R_WRIST]].some(wrist=>!!wrist&&wrist.visibility>=VISIBLE&&inFrame(wrist)&&wrist.y<nose.y+.15);
 return {torsoVisible,shoulderTilt,handAtFace};
}

export function analyzeBody(points:PoseLandmark[]|null,mask:PersonMask|null,face:FaceRegion|null,subjectArea:number):BodyAnalysis{
 if(!points?.length){
  // No pose model result: fall back to silhouette height relative to the face, which still separates
  // a head-and-shoulders crop from a half-body shot.
  const ratio=face&&face.height>0?estimateSilhouetteHeight(mask)/face.height:0;
  const extent:BodyExtent=ratio>=6?"full_body":ratio>=4.2?"three_quarter":ratio>=3.1?"half_body":ratio>=1.8?"head_shoulders":ratio>0?"head_only":"unknown";
  const extentScore=extent==="full_body"||extent==="three_quarter"?100:extent==="half_body"?92:extent==="head_shoulders"?38:extent==="head_only"?14:0;
  const {cropScore,croppedEdges}=measureCrop(mask,[]);
  const headSpread=measureHeadSpread(mask,face),accessoryImpact=clamp((headSpread-accessorySpreadThreshold)/1.4,0,1);
  return {extent,extentScore,bodyVisibleRatio:ratio,cropScore,croppedEdges,hands:"absent",handScore:100,handNote:"Hand framing could not be verified",subjectArea,torsoVisible:0,shoulderTilt:0,handAtFace:false,headSpread,accessoryImpact,choppedLimbs:0,note:describe(extent,croppedEdges)};
 }
 const ratio=face&&face.height>0?estimateSilhouetteHeight(mask)/face.height:0;
 const choppedLimbs=measureLimbs(points);
 const {extent,extentScore}=measureExtent(points,ratio),{hands,handScore,handNote}=measureHands(points,choppedLimbs),{cropScore,croppedEdges}=measureCrop(mask,points);
 const headSpread=measureHeadSpread(mask,face),accessoryImpact=clamp((headSpread-accessorySpreadThreshold)/1.4,0,1);
 return {extent,extentScore,bodyVisibleRatio:ratio,cropScore,croppedEdges,hands,handScore,handNote,subjectArea,...measureFraming(points),headSpread,accessoryImpact,choppedLimbs,note:describe(extent,croppedEdges,accessoryImpact,choppedLimbs)};
}

// Accessories are never judged as style. What matters is what they do to the silhouette: hair and
// ordinary headwear sit around 1.3-1.8x the face width, while a wide-brim hat or similar reaches past
// 2.2x, which is exactly what makes a tight frame hard to crop and hard to lay text beside.
export const accessorySpreadThreshold=2.2;
function measureHeadSpread(mask:PersonMask|null,face:FaceRegion|null){
 if(!mask||!face||face.width<=0)return 0;
 const bandTop=Math.max(0,Math.floor((face.y-face.height*.7)*mask.height)),bandBottom=Math.min(mask.height-1,Math.floor((face.y+face.height*.35)*mask.height));
 let widest=0;
 for(let y=bandTop;y<=bandBottom;y+=1){
  let left=-1,right=-1;
  for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.5){if(left<0)left=x;right=x}
  if(left>=0)widest=Math.max(widest,(right-left+1)/mask.width);
 }
 return face.width>0?widest/face.width:0;
}

function estimateSilhouetteHeight(mask:PersonMask|null){
 if(!mask)return 0;
 let top=-1,bottom=-1;
 for(let y=0;y<mask.height&&top<0;y+=1)for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.5){top=y;break}
 for(let y=mask.height-1;y>=0&&bottom<0;y-=1)for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.5){bottom=y;break}
 return top<0||bottom<top?0:(bottom-top+1)/mask.height;
}

function describe(extent:BodyExtent,croppedEdges:string[],accessoryImpact=0,choppedLimbs=0){
 if(choppedLimbs)return `A visible arm is cut off at the frame edge${croppedEdges.length?`, and the subject is cut off at the ${croppedEdges.join(" and ")}`:""}`;
 if(croppedEdges.length)return `Cut off at the ${croppedEdges.join(" and ")}`;
 if(accessoryImpact>=.4)return "A head accessory widens the silhouette and limits how the agent can be cropped or laid up";
 return {full_body:"Full body in frame — plenty for any layout",three_quarter:"Three-quarter framing — very usable",half_body:"Half body in frame — usable for design",chest_up:"Head and chest only — the frame stops above the waist",head_shoulders:"Only head and shoulders — too little body for design use",head_only:"Face only — no body area to work with",unknown:"Body framing could not be verified"}[extent];
}
```

### `app/photo-artifacts.ts`

```ts
export type SourceArtifacts = {
 contentCoverage:number;
 deadCanvas:number;
 letterboxed:boolean;
 chromeRatio:number;
 isScreenshot:boolean;
 detailVariance:number;
 focusScore:number;
 subjectFocusScore:number;
 structureScore:number;
 note:string;
};

const FLAT_ROW_RANGE=14;
// Structural detail: the edges a designer actually needs — eyes, eyebrows, hairline, nose and lip
// boundaries, glasses, a shirt collar, clothing seams, the outer silhouette. It is read as the strength
// of the strongest few per cent of edges rather than their average, because the average is dominated by
// skin and fabric. Smooth skin, beauty retouching, soft studio lighting and JPEG compression all flatten
// the average without touching those structural edges, so a mean-based sharpness read calls a perfectly
// usable portrait "blurred". This one only falls when the structure itself is genuinely gone.
const STRUCTURE_PERCENTILE=.98;
// |Laplacian| on 8-bit luminance: a crisp lash line or collar seam runs 60-150, visible softness lands
// in the 20s and 30s, and below ~15 nothing structural has survived at any scale.
const STRUCTURE_FULL_MARKS=70;
const EDGE_BINS=512;

// Exact enough at 1-unit resolution, and far cheaper than sorting a few hundred thousand samples.
function edgePercentile(histogram:Uint32Array,ratio:number){
 let total=0;
 for(let bin=0;bin<histogram.length;bin+=1)total+=histogram[bin];
 if(!total)return 0;
 const target=total*ratio;
 let seen=0;
 for(let bin=0;bin<histogram.length;bin+=1){seen+=histogram[bin];if(seen>=target)return bin}
 return histogram.length-1;
}

// Screenshots, letterboxed exports and re-saved thumbnails all look "clean" to a background check
// because their padding is perfectly flat. These read the source frame itself instead.
// `subjectAt` receives normalised coordinates and returns the person-mask value there. Supplying it lets
// focus be read on the agent alone, which matters for cut-outs where flat backdrop dominates the frame.
export function inspectSource(luminance:Float32Array,width:number,height:number,subjectAt?:(nx:number,ny:number)=>number):SourceArtifacts{
 const at=(x:number,y:number)=>luminance[y*width+x];
 const rowRange=(y:number)=>{let min=Infinity,max=-Infinity;for(let x=0;x<width;x+=1){const value=at(x,y);if(value<min)min=value;if(value>max)max=value}return max-min};
 const columnRange=(x:number)=>{let min=Infinity,max=-Infinity;for(let y=0;y<height;y+=1){const value=at(x,y);if(value<min)min=value;if(value>max)max=value}return max-min};
 let top=0,bottom=0,left=0,right=0;
 while(top<height*.45&&rowRange(top)<FLAT_ROW_RANGE)top+=1;
 while(bottom<height*.45&&rowRange(height-1-bottom)<FLAT_ROW_RANGE)bottom+=1;
 while(left<width*.45&&columnRange(left)<FLAT_ROW_RANGE)left+=1;
 while(right<width*.45&&columnRange(width-1-right)<FLAT_ROW_RANGE)right+=1;
 const contentCoverage=((height-top-bottom)/height)*((width-left-right)/width),deadCanvas=1-contentCoverage;
 const absLaplacian=(x:number,y:number)=>Math.abs(4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1));
 let total=0,count=0;
 for(let y=1;y<height-1;y+=1)for(let x=1;x<width-1;x+=1){total+=absLaplacian(x,y);count+=1}
 const overallMean=total/Math.max(1,count);
 // Phone screenshots carry a status bar: dense, high-contrast glyph edges packed into the top strip.
 const stripHeight=Math.max(3,Math.floor(height*.1));
 let strip=0,stripCount=0;
 for(let y=1;y<stripHeight;y+=1)for(let x=1;x<width-1;x+=1){strip+=absLaplacian(x,y);stripCount+=1}
 const chromeRatio=overallMean>.4?strip/Math.max(1,stripCount)/overallMean:0;
 // Focus is judged on the real photographic area only, so flat padding cannot fake or hide softness.
 const x0=Math.max(1,left+1),x1=Math.max(x0+1,width-1-right),y0=Math.max(1,top+1),y1=Math.max(y0+1,height-1-bottom);
 let sum=0,sumSquares=0,samples=0;
 const frameEdges=new Uint32Array(EDGE_BINS),subjectEdges=new Uint32Array(EDGE_BINS);
 const bin=(value:number)=>Math.min(EDGE_BINS-1,Math.round(Math.abs(value)));
 for(let y=y0;y<y1;y+=1)for(let x=x0;x<x1;x+=1){const value=4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1);sum+=value;sumSquares+=value*value;samples+=1;frameEdges[bin(value)]+=1}
 const mean=sum/Math.max(1,samples),detailVariance=Math.max(0,sumSquares/Math.max(1,samples)-mean*mean);
 let subjectSum=0,subjectSquares=0,subjectSamples=0;
 if(subjectAt)for(let y=y0;y<y1;y+=1)for(let x=x0;x<x1;x+=1){
  const inside=subjectAt(x/width,y/height)>.6&&subjectAt((x-1)/width,y/height)>.6&&subjectAt((x+1)/width,y/height)>.6&&subjectAt(x/width,(y-1)/height)>.6&&subjectAt(x/width,(y+1)/height)>.6;
  if(!inside)continue;
  const value=4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1);subjectSum+=value;subjectSquares+=value*value;subjectSamples+=1;subjectEdges[bin(value)]+=1;
 }
 const letterboxed=contentCoverage<.62,isScreenshot=chromeRatio>=1.6;
 // ~1000 is a crisp studio portrait, ~300 is visibly soft, <150 is unusable.
 const focusScore=Math.max(0,Math.min(100,Math.sqrt(detailVariance)/33*100));
 // Too few subject pixels to trust (tiny or failed mask): fall back to the whole-frame read.
 const subjectMean=subjectSum/Math.max(1,subjectSamples),subjectVariance=Math.max(0,subjectSquares/Math.max(1,subjectSamples)-subjectMean*subjectMean);
 const subjectFocusScore=subjectSamples>2000?Math.max(0,Math.min(100,Math.sqrt(subjectVariance)/33*100)):focusScore;
 // Read on the agent where there are enough subject pixels to trust, on the photographic area otherwise.
 const structureScore=Math.max(0,Math.min(100,edgePercentile(subjectSamples>2000?subjectEdges:frameEdges,STRUCTURE_PERCENTILE)/STRUCTURE_FULL_MARKS*100));
 // "Soft" and "unusable" are different findings, so the note says softness only when the structural
 // edges are going too — a mean-based focus read alone is retouching as often as it is blur.
 const note=isScreenshot?"Looks like a phone screenshot rather than a photo file":letterboxed?"Padded with empty bars — supply the original photo, not a boxed export":structureScore<45?"Structural detail on the subject is soft":Math.min(focusScore,subjectFocusScore)<45?"Softly processed, but the structural detail is intact":"Source frame looks like an original photo";
 return {contentCoverage,deadCanvas,letterboxed,chromeRatio,isScreenshot,detailVariance,focusScore,subjectFocusScore,structureScore,note};
}
```

### Test fixtures

The tests build `CategoryInputs`/`GateSignals` from a "good portrait" base fixture and override
one or two fields per test. A base that lands in the ready-for-design band (raw 88, APPROVED):

```js
const inputs={sharpnessScore:80,structureScore:85,lightingScore:90,contrastScore:85,fidelityScore:95,resolutionScore:100,faceCount:1,faceHeightPixels:300,faceScaleScore:100,faceEdgeScore:100,bodyExtentScore:92,cropScore:95,handScore:100,usableArea:90,backgroundQuality:85,accessoryImpact:0};
const signals={minimumDimension:1200,resolutionScore:100,sharpnessScore:80,focusScore:80,structureScore:85,fidelityScore:95,faceCount:1,faceClearance:.1,faceHeight:.2,faceHeightPixels:300,faceClarity:94,selfieProbability:.05,lightingScore:90,backgroundQuality:85,designerUsability:87,bodyExtent:"half_body",accessoryImpact:0,choppedLimbs:0,photoQuality:89,bodyCrop:83,faceVisibility:95,cropScore:95,hands:"absent",handScore:100,isScreenshot:false,letterboxed:false,contentCoverage:1,backgroundTexture:5,frameAspect:.8,subjectCoverage:.4,torsoVisible:1,shoulderTilt:2,handAtFace:false};
// scoreCategories(inputs) → {photoQuality:89, bodyCrop:83, faceVisibility:95, backgroundEditability:87, faceClarity:94, edgeQuality:85, rawScore:88}
// applyPhotoDecision(88, signals) → status "APPROVED", score 88, rawScore 88, appliedCap null
```

Derived checks the test suite relies on: `structureScore 22 / focus 20` → `severe_blur`, score 39;
`bodyExtent "head_shoulders"` → `minimal_body`, cap 49; `isScreenshot` → cap 55;
`minimumDimension 240, faceHeightPixels 60` → `face_unusable` (39, REJECT) while the same photo
at 240px with enough face pixels → `REUPLOAD`; `photoQuality 70` with no defect → eligible for
designer review, 69 → not.
