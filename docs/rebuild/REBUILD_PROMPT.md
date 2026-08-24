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

Paste everything between the rules as the **first message**. Then drive one step per message
("Do step N") and paste the step's gate output back if the agent did not run it.

---

> # Rebuild Studio+ — identical reproduction
>
> You are rebuilding **Studio+**, an offline-first, white-label AI portrait studio for a
> real-estate agency product demo, in an empty repository. The complete specification is in
> `docs/rebuild/REBUILD_PROMPT.md`. Read it fully before writing any file: Part C is the
> prose spec, **Appendix 3 holds the four scoring-engine files verbatim, and Appendix 4 holds
> every other source file verbatim** (components, CSS, API routes, tests, configs, scripts).
> Where an appendix contains a file, reproduce it **character-for-character** — do not
> "improve", reformat, rename, or modernise anything. Where only prose exists, follow the prose
> exactly, including copy strings and numbers. `CLAUDE.md` and the two skills in
> `.claude/skills/` already exist in this folder — read and obey them.
>
> ## Stack (fixed — no other dependency, no version change)
> Node 22.22.3 · npm 10.9.8 · `vinext` 1.0.0-beta.2 (Next.js App Router on Vite 8 +
> `@cloudflare/vite-plugin`) · React 19.2.6 · TypeScript 5.9.3 · Tailwind 4 via
> `@tailwindcss/postcss` (imported once; the UI is hand-written CSS) · `@mediapipe/tasks-vision`
> 0.10.22 with models in `public/` · `qrcode` · `@zxing/browser` · `lucide-react`. The exact
> `package.json` is in Part C2; write it verbatim. `public/` is already populated with the
> frozen assets — never modify, re-encode or replace anything in it.
>
> ## Product invariants (the judges are told these; code must match)
> 1. The core journey — capture or import → on-device scoring → optional enhancement →
>    separate Atlas-profile and brand-use consent → Photos gallery → Brand Asset Gallery →
>    subsale banner → download/print → mock print order — completes with no internet and no
>    API keys. Atlas data, CodeFormer and payments are adapters with local fallbacks; never make
>    one a hard dependency.
> 2. Enhancement is non-generative: crop, relight, face-limited smoothing, background
>    replacement, ≤2048px resample. Never invent or reshape facial structure. Only the
>    labelled optional CodeFormer adapter reconstructs faces; the original always stays
>    available for comparison.
> 3. Scoring: four category scores weighted 30/30/20/20 → raw score; final score =
>    `min(rawScore, lowest applicable cap)` and nothing else; a cap is a ceiling, not a value;
>    a quality-driven retake requires a validated visual defect (severe blur, unusable face
>    detail, low-resolution detail loss, degradation); a good attribute never cancels a critical
>    one; file suitability is its own axis (`REUPLOAD`) and never lowers photo quality; designer
>    review eligibility = `photoQuality >= 70 AND no validated defect AND file usable`; a REVIEW
>    verdict is sent without a dispute checkbox, a REJECT can be challenged. Pose has zero
>    weight. No beauty, attractiveness, formality or character judgements anywhere.
> 4. localStorage holds cases, never full-size images: gallery max 6 normalised JPEGs
>    (`ps-gallery`), print orders (`studio-print-orders`, max 20) and review requests
>    (`studio-review-requests`, max 40) persist without the image; every storage read/write is
>    wrapped in try/catch.
> 5. Every fallback ships: camera blocked → Import photo; QR blocked → manual code; Atlas down →
>    bundled Aaron Paul record; CodeFormer offline → local enhancement; printer missing →
>    download or Save as PDF.
>
> ## Conventions
> App modules are dense: single-space indent, no spaces around `:` in type literals, several
> `const` bindings per line, `"use client"` on components. Comments explain **why** (the
> reasoning behind a threshold or the failure being defended against), never what. Tests are
> `node:test` + `node:assert/strict`, one behaviour per `test()`, assertion message states the
> rule protected, importing `.ts` directly with `--experimental-strip-types`. Commits are
> conventional (`feat:`/`fix:`/`docs:`/`chore:`), lowercase subject describing user-visible
> behaviour, body explaining reasoning. Never add a dependency, never touch `public/`.
>
> ## Work plan — one step per instruction, gate after each, commit after each
> | Step | Build | Gate |
> | --- | --- | --- |
> | 1 | Part C2 `package.json`, C3 configs, `scripts/demo-preflight.mjs`, `app/layout.tsx`, `app/page.tsx`, placeholder `app/studio.tsx`, `worker/`, `db/`, `.openai/hosting.json`, `.gitignore`, `.nvmrc`, `.env.example` — all from Appendix 4. Then `npm install` (lockfile will regenerate; versions are pinned). | `npm run preflight` passes; `npm run dev` serves `/` |
> | 2 | Appendix 3 verbatim: `app/photo-score.ts`, `app/photo-decision.ts`, `app/photo-body.ts`, `app/photo-artifacts.ts`; Appendix 4 tests `tests/photo-score.test.mjs`, `tests/photo-decision.test.mjs`, `tests/photo-body.test.mjs`. | `node --experimental-strip-types --test tests/photo-*.test.mjs` → 81 pass |
> | 3 | `app/image-enhancement.ts`, `app/photo-quality.ts`, `app/mock-agent.ts`, `app/print-orders.ts`, `app/photo-review-requests.ts`. | type-checks; a scratch page calling `evaluatePhoto` on a sample returns a `PhotoRating` |
> | 4 | `app/studio.tsx` + all CSS files listed in C16 (Appendix 4). | Import-photo journey completes with Wi-Fi off: review → enhance → consent → success → Photos |
> | 5 | Verify guided camera, batch select, QR scanner and manual code inside `studio.tsx`. | Camera journey completes; typed code loads a session |
> | 6 | `app/atlas/` (page, `[agent]/page`, `profile.tsx`, css) and `app/api/` four routes; `tests/rendered-html.test.mjs`. | `/atlas` Book → QR → Open studio → session loaded; `npm run test` → 86 pass |
> | 7 | `app/brand-assets.tsx` + `brand-assets.css`; `services/codeformer/` files. | Assets: background removed, banner composed, mock print order paid |
> | 8 | `README.md`, `DEMO_RUNBOOK.md`, lint clean-up only if errors. | `npm run verify`: preflight ✓, 86 tests, 0 lint errors (17 warnings expected — do not fix them); `git tag demo-v2` |
>
> ## How to work
> - Start each step by re-reading only the spec sections and appendix files that step names.
> - Run the gate yourself and paste the real output. Never claim a step works without running
>   it. If a gate fails, fix the defect; do not relax the test or the threshold.
> - If anything in the spec is ambiguous, the appendix source wins over the prose, and the
>   prose wins over your judgement. Do not invent copy, names, thresholds or screens.
> - If a step cannot be completed in its time box (Part A3), finish what is verifiable, report
>   exactly what is missing, and move on — steps 2, 3 and 4 are mandatory; 5 and 7 are cuttable.

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

---

## Appendix 4 — verbatim sources for every other file

Everything not in Appendix 3, in build order. Reproduce character-for-character. (`package-lock.json` is omitted — `npm install` regenerates it from the pinned versions; `public/` binaries come from the kit.) Markdown sources are wrapped in four-backtick fences because they contain fences of their own.

### `package.json`

```json
{
  "name": "photostudio-plus-demo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "npm@10.9.8",
  "engines": {
    "node": ">=22.13.0"
  },
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

### `.nvmrc`

```text
22.22.3
```

### `.env.example`

```text
CODEFORMER_SERVICE_URL=http://127.0.0.1:7861
CODEFORMER_SERVICE_TOKEN=local-codeformer-demo
```

### `.gitignore`

```text
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/.vinext/
/out/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*
!.env.example

# generated language caches
__pycache__/
*.py[cod]
*.tsbuildinfo

# vercel
.vercel

/dist/
/.wrangler/
/outputs/
/work/
/tmp/
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

### `postcss.config.mjs`

```mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### `eslint.config.mjs`

```mjs
import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "public/mediapipe/**",
    "next-env.d.ts",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);

export default eslintConfig;
```

### `vite.config.ts`

```ts
import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
```

### `.openai/hosting.json`

```json
{
  "project_id": "appgprj_6a8802bbefb48191a82e2f8e9af8423c",
  "d1": null,
  "r2": null
}
```

### `worker/index.ts`

```ts
/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
```

### `db/schema.ts`

```ts
// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
export {};
```

### `db/index.ts`

```ts
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
```

### `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "sqlite",
});
```

### `next-env.d.ts`

```ts
import "vinext/types";
import "./.next/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

### `scripts/demo-preflight.mjs`

```mjs
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

const minimumNode = [22, 13, 0];
const expectedAssets = new Map([
  ["public/portraits-contact-sheet.png", "98145517c5df94136ff4338412a5b3dd1e663210696bed5e1f7b90a94dd37314"],
  ["public/blaze_face_short_range.tflite", "b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f"],
  ["public/selfie_segmenter.tflite", "191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b"],
  ["public/mediapipe/vision_wasm_internal.js", "4a97e2520ba506c680ecd6ba6acfb146888afa0e2746d57f205352bc6ebb82eb"],
  ["public/mediapipe/vision_wasm_internal.wasm", "f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7"],
  ["public/mediapipe/vision_wasm_nosimd_internal.js", "927def7b465c51b86e4b3060f93646aca4e27121f4b8fc0483786e407ea9cf1f"],
  ["public/mediapipe/vision_wasm_nosimd_internal.wasm", "3821ea9b1f7fb8c549ef2a064ef5c85750bf375c545a49fd6eea0df44a95f1f4"],
]);

const failures = [];
const notes = [];

function atLeast(actual, expected) {
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] > expected[index]) return true;
    if (actual[index] < expected[index]) return false;
  }
  return true;
}

const nodeVersion = process.versions.node.split(".").map(Number);
if (!atLeast(nodeVersion, minimumNode)) {
  failures.push(`Node ${minimumNode.join(".")} or newer is required; found ${process.versions.node}.`);
} else {
  notes.push(`Node ${process.versions.node}`);
}

try {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
  if (packageJson.name !== "photostudio-plus-demo") failures.push("package.json has the wrong app identity.");
  if (packageLock.name !== packageJson.name || packageLock.version !== packageJson.version) failures.push("package-lock.json is not synchronized with package.json.");
  notes.push(`lockfile v${packageLock.lockfileVersion}`);
} catch (error) {
  failures.push(`Package metadata could not be read: ${error.message}`);
}

for (const [path, expectedHash] of expectedAssets) {
  try {
    const contents = await readFile(path);
    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== expectedHash) failures.push(`${path} does not match the frozen demo asset.`);
  } catch {
    failures.push(`${path} is missing.`);
  }
}
notes.push(`${expectedAssets.size} offline demo assets verified`);

try {
  const hosting = JSON.parse(await readFile(".openai/hosting.json", "utf8"));
  if (hosting.d1 !== null || hosting.r2 !== null) failures.push("Unexpected hosted storage binding found.");
  notes.push("no API keys or hosted storage required");
} catch (error) {
  failures.push(`Hosting configuration could not be read: ${error.message}`);
}

if (failures.length) {
  console.error("\nDemo preflight failed:\n");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error("\nFix these items before relying on the demo.\n");
  process.exitCode = 1;
} else {
  console.log("\nStudio+ demo preflight passed:\n");
  for (const note of notes) console.log(`  ✓ ${note}`);
  console.log("\nRun `npm run dev`, then open the address shown in the terminal.\n");
}
```

### `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";
import "./iq-theme.css";
import "./app-ui.css";
import "./studio-camera.css";
import "./camera-pro.css";
import "./camera-v2.css";
import "./studio-session.css";
import "./polish.css";
import "./device-portability.css";
import "./studio-enhance.css";
import "./brand-assets.css";
export const metadata: Metadata = { title: "Studio+", description: "AI-guided portraits and a permissioned Brand Asset Gallery." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
```

### `app/page.tsx`

```tsx
export { default } from "./studio";
```

### `app/mock-agent.ts`

```ts
// Single demo identity used whenever no Atlas appointment is attached to a portrait.
export const mockAgent = {
 agentName: "John Doe",
 agentId: "MOCK-AGENT",
 agentMobile: "012-345 6789",
 agentRenTag: "12345",
 agentOfficePhone: "03-7453 5155",
};
```

### `app/print-orders.ts`

```ts
// Demo print shop: prices, delivery and a local order book. No payment provider is contacted.
export type PrintOption = {id:string;label:string;detail:string;price:number};
export type PrintOrder = {id:string;createdAt:string;agentName:string;agentId?:string;sizeLabel:string;quantity:number;deliveryLabel:string;address:string;methodLabel:string;subtotal:number;deliveryFee:number;total:number;status:"paid"};

export const printSizes:PrintOption[]=[
 {id:"3x2",label:"3 × 2 ft board",detail:"Standard subsale board",price:55},
 {id:"4x3",label:"4 × 3 ft board",detail:"Large frontage board",price:85},
 {id:"6x4",label:"6 × 4 ft board",detail:"Premium roadside board",price:150},
];
export const deliveryOptions:PrintOption[]=[
 {id:"pickup",label:"Collect at IQI office",detail:"Ready in 2 working days",price:0},
 {id:"courier",label:"Courier to site address",detail:"3 – 5 working days",price:15},
];
export const paymentMethods:{id:string;label:string;detail:string}[]=[
 {id:"fpx",label:"Online banking (FPX)",detail:"Maybank2u, CIMB Clicks, RHB Now"},
 {id:"card",label:"Credit or debit card",detail:"Visa, Mastercard"},
 {id:"wallet",label:"E-wallet",detail:"Touch 'n Go, GrabPay"},
];

const storageKey="studio-print-orders";

export function formatMYR(value:number){return `RM ${value.toFixed(2)}`}
export function createOrderId(){return `IQI-PRT-${Math.random().toString(36).slice(2,8).toUpperCase()}`}

// Artwork stays in memory: a 2650 × 1786 PNG would blow past the localStorage quota.
export function recordPrintOrder(order:PrintOrder){try{const book=loadPrintOrders();localStorage.setItem(storageKey,JSON.stringify([order,...book].slice(0,20)))}catch{/* Private mode or a full quota must not block the order. */}return order}
export function loadPrintOrders():PrintOrder[]{try{const raw=localStorage.getItem(storageKey);return raw?JSON.parse(raw) as PrintOrder[]:[]}catch{return[]}}
```

### `app/photo-review-requests.ts`

```ts
// Designer review queue: an agent's challenge to an AI verdict they believe is wrong.
//
// This exists only for judgement calls. A photo with a validated visual defect never reaches here —
// `designerReviewEligible` in photo-decision.ts is the gate, and it is decided on measurements of the
// image rather than on any score the model derived from it.
export type ReviewRequest = {
 id:string;
 createdAt:string;
 agentName:string;
 agentId?:string;
 photo:string;
 score:number;
 status:"REVIEW"|"REJECT"|"REUPLOAD";
 // What the AI concluded that the agent is challenging, in the AI's own words.
 disputedGates:string[];
 // The agent's case, in theirs.
 note:string;
 state:"pending";
};

const storageKey="studio-review-requests";

export function createReviewRequestId(){return `IQI-REV-${Math.random().toString(36).slice(2,8).toUpperCase()}`}

// Requests persist, but the portrait itself does not: a full-size data URL would blow past the
// localStorage quota, exactly as the print order book found. The queue keeps the case, not the file.
export function recordReviewRequest(request:ReviewRequest){
 try{
  const stored:Omit<ReviewRequest,"photo">={id:request.id,createdAt:request.createdAt,agentName:request.agentName,agentId:request.agentId,score:request.score,status:request.status,disputedGates:request.disputedGates,note:request.note,state:request.state};
  localStorage.setItem(storageKey,JSON.stringify([stored,...listReviewRequests()].slice(0,40)));
 }catch{/* a full or unavailable store must never block the agent from asking */}
 return request;
}

export function listReviewRequests():Omit<ReviewRequest,"photo">[]{
 try{
  const raw=localStorage.getItem(storageKey);
  return raw?JSON.parse(raw) as Omit<ReviewRequest,"photo">[]:[];
 }catch{return []}
}
```

### `app/photo-quality.ts`

```ts
import {analyzePortraitComposition, confidentFace, prepareEnhancementAssets, type FaceRegion, type PersonMask} from "./image-enhancement";
import {analyzeBody, type BodyExtent, type HandState} from "./photo-body";
import {inspectSource, type SourceArtifacts} from "./photo-artifacts";
import {applyPhotoDecision, bodyExtentLabels, fileResolutionTargets, photoApprovalThresholds, categoryFloors, qualityDefectRules, scoreCaps, validateQualityDefects, type FileStatus, type QualityDefect, type PhotoPenalty, type PhotoRequirement, type PhotoStatus, type ScoreCap} from "./photo-decision";
import {backgroundQualityScore, contrastScore, exposureScore, fidelityScore, photoRatingWeights, scoreCategories} from "./photo-score";

export {applyPhotoDecision, backgroundQualityScore, bodyExtentLabels, categoryFloors, contrastScore, exposureScore, fidelityScore, fileResolutionTargets, photoApprovalThresholds, photoRatingWeights, qualityDefectRules, scoreCaps, scoreCategories, validateQualityDefects};
export type {FileStatus, PhotoPenalty, PhotoRequirement, PhotoStatus, QualityDefect, ScoreCap};

export type PhotoMetric = {name:string;score:number;note:string};
export type PhotoRating = {
 score:number;
 overall_score:number;
 base_score:number;
 raw_score:number;
 applied_cap:ScoreCap|null;
 score_trace:string[];
 status:PhotoStatus;
 label:string;
 tone:"good"|"fair"|"low";
 confidence:number;
 technical_quality:number;
 body_usability:number;
 face_visibility:number;
 editability:number;
 body_extent:BodyExtent;
 hands:HandState;
 file_suitability:number;
 file_status:FileStatus;
 file_reason:string;
 file_note:string;
 professionalism:number;
 composition:number;
 background_quality:number;
 face_quality:number;
 designer_usability:number;
 pose_appropriateness:number;
 selfie_probability:number;
 hard_gates:string[];
 designer_review_eligible:boolean;
 disputable_gates:string[];
 review_block_reason:string;
 quality_defects:QualityDefect[];
 snapshot_signals:{id:string;label:string;weight:number}[];
 issues:string[];
 strengths:string[];
 recommendation:string;
 decision_reason:string;
 requirements:PhotoRequirement[];
 penalties:PhotoPenalty[];
 metrics:PhotoMetric[];
};

// Usability weights live in ./photo-score alongside the category maths. Formality is deliberately
// absent: a relaxed, seated, smart-casual portrait that a designer can cut out and lay up scores
// exactly as well as a suited one.
export const companyProfessionalStandard=["One clearly visible agent, face unobstructed","Sharp and well exposed enough to edit","At least half the body in frame, nothing awkwardly cropped","Hands either fully in frame or naturally out of the composition","Background clean enough to isolate the agent","Sitting, leaning, relaxed posture and smart-casual clothing are all fine"] as const;

export function isPhotoApproved(rating:PhotoRating){return rating.status==="APPROVED"||(!rating.status&&rating.score>=photoApprovalThresholds.approved)}

const emptyMetrics=["Photo quality","Body & crop usability","Face & subject visibility","Background & editability"];
export const emptyPhotoRating:PhotoRating={score:0,overall_score:0,base_score:0,raw_score:0,applied_cap:null,score_trace:[],status:"REJECT",label:"Checking photo…",tone:"fair",confidence:0,technical_quality:0,body_usability:0,face_visibility:0,editability:0,body_extent:"unknown",hands:"absent",file_suitability:0,file_status:"OK",file_reason:"Waiting for image analysis.",file_note:"Waiting for image",professionalism:0,composition:0,background_quality:0,face_quality:0,designer_usability:0,pose_appropriateness:0,selfie_probability:0,hard_gates:[],designer_review_eligible:false,disputable_gates:[],review_block_reason:"",quality_defects:[],snapshot_signals:[],issues:[],strengths:[],recommendation:"Waiting for image analysis.",decision_reason:"Waiting for image analysis.",requirements:[],penalties:[],metrics:emptyMetrics.map(name=>({name,score:0,note:"Waiting for image"}))};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));
const faceEdgeClearance=(face:FaceRegion)=>Math.min(face.x,face.y,1-face.x-face.width,1-face.y-face.height);
// 1000px on the shortest edge is full marks; 600px still clears the pass bar for web-sized marketing use.
// Reads the source at up to 640px on the long edge: enough to see real focus, letterbox bars and
// screenshot chrome, cheap enough to run on every upload.
function inspectFullFrame(image:HTMLImageElement,personMask:PersonMask|null):SourceArtifacts{
 const longEdge=Math.max(image.naturalWidth,image.naturalHeight),scale=Math.min(1,640/Math.max(1,longEdge));
 const width=Math.max(8,Math.round(image.naturalWidth*scale)),height=Math.max(8,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
 canvas.width=width;canvas.height=height;
 if(!context)return {contentCoverage:1,deadCanvas:0,letterboxed:false,chromeRatio:0,isScreenshot:false,detailVariance:0,focusScore:100,subjectFocusScore:100,structureScore:100,note:"Source frame could not be inspected"};
 context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
 const pixels=context.getImageData(0,0,width,height).data,luminance=new Float32Array(width*height);
 for(let index=0;index<pixels.length;index+=4)luminance[index/4]=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
 return inspectSource(luminance,width,height,personMask?(nx,ny)=>maskValue(personMask,nx,ny):undefined);
}

const resolutionCurve=(minimumDimension:number)=>minimumDimension>=1000?100:minimumDimension>=600?70+(minimumDimension-600)/400*30:clamp(minimumDimension/600*70);
const rangeScore=(value:number,minimum:number,maximum:number,falloff:number)=>value>=minimum&&value<=maximum?100:clamp(100-Math.min(Math.abs(value-minimum),Math.abs(value-maximum))/falloff*100);

function maskCoverage(mask:PersonMask|null){
 if(!mask)return 0;
 let person=0;
 for(let index=0;index<mask.data.length;index+=1)if(mask.data[index]>.48)person+=1;
 return person/mask.data.length;
}

function maskValue(mask:PersonMask|null,x:number,y:number){
 if(!mask)return 0;
 const mx=Math.min(mask.width-1,Math.max(0,Math.floor(x*mask.width))),my=Math.min(mask.height-1,Math.max(0,Math.floor(y*mask.height)));
 return mask.data[my*mask.width+mx]??0;
}

function inferFileNote(src:string){
 const match=/^data:(image\/[a-z0-9.+-]+);base64,/i.exec(src);
 if(!match)return "Browser-supported image · file size unavailable";
 const bytes=Math.round((src.length-(match[0]?.length??0))*.75),megabytes=bytes/1024/1024;
 return `${match[1].replace("image/","").toUpperCase()} · ${megabytes.toFixed(megabytes<1?2:1)} MB`;
}

// The same problem reaches us from a requirement and from the source-frame note in slightly different
// words. Key on the opening of each sentence so it is stated once, in the issue list and in the advice.
function dedupeIssues(candidates:string[]){
 const seen=new Set<string>(),issues:string[]=[];
 for(const candidate of candidates){
  const text=candidate?.trim();
  if(!text)continue;
  const key=text.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim().slice(0,32);
  if(seen.has(key))continue;
  seen.add(key);issues.push(text);
 }
 return issues;
}

function buildRecommendation(status:PhotoStatus,issues:string[],fileReason="",hardGates:string[]=[],retakeAdvice="",designerReviewEligible=true){
 if(status==="APPROVED")return issues.length?`Ready for design. Noted, but not blocking: ${issues[0].toLowerCase()}.`:"Ready for design.";
 const fixes=issues.slice(0,3).map(issue=>issue.replace(/\.$/,"").toLowerCase());
 // A good photograph in a small file needs the same shot re-supplied, not a new shoot.
 if(status==="REUPLOAD")return `Keep this photo — re-upload the original at a higher resolution. ${fileReason}`;
 // Never offer a designer review the agent is not allowed to request: below the eligibility floor the
 // weakness is in the photograph itself, and a designer cannot add detail the file does not carry.
 if(status==="REVIEW")return designerReviewEligible
  ?`Potentially usable — send it for designer review${fixes.length?`; ${fixes.join(", ")}`:""}.`
  :`Not enough usable quality for a designer to work from — upload a clearer or higher-quality photo${fixes.length?`; ${fixes.join(", ")}`:""}.`;
 // The gate is the reason for the retake, so the advice has to answer the gate, not the smallest nit found.
 if(hardGates.length)return `Retake recommended because: ${hardGates[0].toLowerCase()}.${retakeAdvice?` ${retakeAdvice}`:""}`;
 return `Retake the photo${fixes.length?` with these changes: ${fixes.join(", ")}`:" from farther away with even lighting and a clean background"}.`;
}

export function evaluatePhoto(src:string,targetAspect=.8){
 return new Promise<PhotoRating>((resolve,reject)=>{
  const assetsPromise=prepareEnhancementAssets(src).catch(()=>({face:null,faces:[],personMask:null,pose:null}));
  const compositionPromise=analyzePortraitComposition(src,targetAspect).catch(()=>({score:0,note:"Could not verify portrait framing"}));
  const image=new Image();
  image.crossOrigin="anonymous";
  image.onload=async()=>{
   try{
    const sampleSize=128,canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
    canvas.width=sampleSize;canvas.height=sampleSize;
    if(!context)throw new Error("Canvas is unavailable");
    context.fillStyle="#fff";context.fillRect(0,0,sampleSize,sampleSize);context.drawImage(image,0,0,sampleSize,sampleSize);
    const pixels=context.getImageData(0,0,sampleSize,sampleSize).data,luminance=new Float32Array(sampleSize*sampleSize);
    for(let index=0;index<pixels.length;index+=4)luminance[index/4]=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
    // Focus, letterboxing and screenshot chrome all vanish at 128px, so inspect the source frame at
    // (capped) native resolution instead of the thumbnail used for the tonal statistics.
    const [assets,portraitComposition]=await Promise.all([assetsPromise,compositionPromise]),coverage=maskCoverage(assets.personMask);
    // Only confident detections count as agents, so a phantom face on folded arms cannot read as a second
    // person. A lone weak detection is still kept: one soft face is a soft photo, not a faceless one.
    const detectedFaces=assets.faces??(assets.face?[assets.face]:[]),confidentFaces=detectedFaces.filter(item=>(item.confidence??1)>=confidentFace),faces=confidentFaces.length?confidentFaces:detectedFaces.slice(0,1),face=faces[0]??null;
    const artifacts=inspectFullFrame(image,assets.personMask);
    const subjectLuminance:number[]=[],tonalLuminance:number[]=[];
    for(let y=0;y<sampleSize;y++)for(let x=0;x<sampleSize;x++){
     const nx=x/sampleSize,ny=y/sampleSize,value=luminance[y*sampleSize+x],isSubject=assets.personMask?maskValue(assets.personMask,nx,ny)>.42:(nx>.22&&nx<.78&&ny>.06&&ny<.72);
     if(isSubject)subjectLuminance.push(value);
     if(isSubject&&face&&nx>=face.x&&nx<=face.x+face.width&&ny>=face.y&&ny<=face.y+face.height)tonalLuminance.push(value);
    }
    const luminanceSample=subjectLuminance.length>80?subjectLuminance:Array.from(luminance),tonalSample=tonalLuminance.length>40?tonalLuminance:luminanceSample,mean=tonalSample.reduce((sum,value)=>sum+value,0)/tonalSample.length,deviation=Math.sqrt(tonalSample.reduce((sum,value)=>sum+(value-mean)**2,0)/tonalSample.length),blown=tonalSample.filter(value=>value>246).length/tonalSample.length,crushed=tonalSample.filter(value=>value<12).length/tonalSample.length;
    let backgroundEdgeTotal=0,backgroundEdgeCount=0,flatNoiseTotal=0,flatNoiseCount=0;
    const step=1/sampleSize,subjectAt=(x:number,y:number)=>maskValue(assets.personMask,x*step,y*step);
    for(let y=1;y<sampleSize-1;y++)for(let x=1;x<sampleSize-1;x++){
     const index=y*sampleSize+x,left=luminance[index-1],right=luminance[index+1],top=luminance[index-sampleSize],bottom=luminance[index+sampleSize],edge=Math.abs(4*luminance[index]-left-right-top-bottom);
     if(!assets.personMask||subjectAt(x,y)<.28){backgroundEdgeTotal+=edge;backgroundEdgeCount+=1}
     const range=Math.max(left,right,top,bottom)-Math.min(left,right,top,bottom);
     if(range<18){flatNoiseTotal+=edge;flatNoiseCount+=1}
    }
    const backgroundEdgeMean=backgroundEdgeTotal/Math.max(1,backgroundEdgeCount),flatNoise=flatNoiseTotal/Math.max(1,flatNoiseCount),minimumDimension=Math.min(image.naturalWidth,image.naturalHeight),resolutionScore=resolutionCurve(minimumDimension),sourceAspect=image.naturalWidth/image.naturalHeight,lightingScore=exposureScore(mean,blown,crushed),contrast=contrastScore(deviation),fidelity=fidelityScore(flatNoise);
    // Sharpness is read on the agent at source resolution, then held to the whole-frame focus read.
    // The 128px thumbnail below is for tone only: at that size a sharp portrait and a blurred one measure the same.
    const sharpnessScore=rounded(Math.min(artifacts.subjectFocusScore,artifacts.focusScore));
    // Structural detail is read separately from that average, and it is the one the categories and the
    // defect checks lean on: smooth skin, retouching and soft studio lighting flatten the average while
    // leaving eyes, hairline, glasses and clothing edges perfectly usable.
    const structureScore=rounded(artifacts.structureScore);
    const body=analyzeBody(assets.pose??null,assets.personMask,face,coverage);

    // How cleanly the agent sits against what is behind them. This feeds the Background & Editability
    // category rather than being one: on its own a plain backdrop proves nothing about masking.
    const backgroundQuality=backgroundQualityScore(backgroundEdgeMean,coverage,Boolean(assets.personMask),faces.length);
    const usableArea=coverage?clamp(coverage/.34*100):face?clamp(face.height/.16*100):0;
    const faceClearance=face?faceEdgeClearance(face):-1,faceScaleScore=face?rangeScore(face.height,.06,.36,.1):0,faceEdgeScore=face?clamp(faceClearance/.05*100):0;
    // The four category scores, weighted 30/30/20/20 into the raw score. Everything they need is above;
    // the maths itself lives in ./photo-score so the same numbers can be checked outside the browser.
    const faceHeightPixels=(face?.height??0)*image.naturalHeight;
    const categories=scoreCategories({sharpnessScore,structureScore,lightingScore,contrastScore:contrast,fidelityScore:fidelity,resolutionScore,faceCount:faces.length,faceHeightPixels,faceScaleScore,faceEdgeScore,bodyExtentScore:body.extentScore,cropScore:body.cropScore,handScore:body.handScore,usableArea,backgroundQuality,accessoryImpact:body.accessoryImpact});
    const technicalQuality=categories.photoQuality,bodyUsability=categories.bodyCrop,faceVisibility=categories.faceVisibility,editability=categories.backgroundEditability,faceQuality=faceVisibility;

    // Informational only — never rewards formality, never feeds the score.
    const closeFace=face?clamp((face.height-.34)/.28,0,1):0,croppedFace=face?clamp((.035-faceClearance)/.035,0,1):0;
    const selfieProbability=Number(clamp(.03+closeFace*.62+croppedFace*.2+(artifacts.isScreenshot?.45:0),0,1).toFixed(2));
    const poseAppropriateness=face?rounded(98-croppedFace*30-(faces.length>1?25:0)):25;
    const professionalism=rounded(technicalQuality*.3+bodyUsability*.3+faceVisibility*.2+editability*.2);
    const designerUsability=editability;
    const composition=rounded(portraitComposition.score*.4+body.cropScore*.35+usableArea*.25);
    const baseScore=categories.rawScore;
    const decision=applyPhotoDecision(baseScore,{minimumDimension,resolutionScore,sharpnessScore,structureScore,fidelityScore:rounded(fidelity),focusScore:artifacts.focusScore,faceCount:faces.length,faceClearance,faceHeight:face?.height??0,faceHeightPixels,faceClarity:categories.faceClarity,accessoryImpact:body.accessoryImpact,choppedLimbs:body.choppedLimbs,photoQuality:categories.photoQuality,bodyCrop:categories.bodyCrop,faceVisibility:categories.faceVisibility,selfieProbability,lightingScore,backgroundQuality,designerUsability:editability,bodyExtent:body.extent,cropScore:body.cropScore,hands:body.hands,handScore:body.handScore,backgroundTexture:backgroundEdgeMean,frameAspect:sourceAspect,subjectCoverage:coverage,torsoVisible:body.torsoVisible,shoulderTilt:body.shoulderTilt,handAtFace:body.handAtFace,isScreenshot:artifacts.isScreenshot,letterboxed:artifacts.letterboxed,contentCoverage:artifacts.contentCoverage});
    const score=decision.score,status=decision.status,tone=status==="APPROVED"?"good":status==="REJECT"?"low":"fair",label=status==="APPROVED"?"Ready for Design":status==="REUPLOAD"?"Re-upload at Higher Resolution":status==="REVIEW"?"Designer Review":"Retake Recommended",issues=dedupeIssues([...decision.requirements.filter(requirement=>requirement.status==="FAIL"&&requirement.id!=="resolution").map(requirement=>requirement.detail),...(body.croppedEdges.length?[body.note]:[])]),strengths:string[]=[];
    if(technicalQuality>=80&&sharpnessScore>=70)strengths.push("Sharp and cleanly exposed");
    if(sharpnessScore>=75)strengths.push("Sharp subject detail");
    if(body.extentScore>=90)strengths.push(`${bodyExtentLabels[body.extent]} in frame — plenty for a designer`);
    if(body.hands==="complete")strengths.push("Hands are fully in frame");
    if(body.cropScore>=85)strengths.push("Nothing important is cropped");
    if(faceVisibility>=80)strengths.push("One clear, unobstructed face");
    if(editability>=80)strengths.push("Agent can be isolated cleanly");
    if(backgroundQuality>=80)strengths.push("Clean background");
    const metrics:PhotoMetric[]=[
     {name:"Photo quality",score:technicalQuality,note:technicalQuality>=80?`Sharp, well exposed, clean · ${minimumDimension}px shortest edge`:technicalQuality>=65?`Usable, with visible softness or compression · ${minimumDimension}px shortest edge`:artifacts.note},
     {name:"Body & crop usability",score:bodyUsability,note:`${bodyExtentLabels[body.extent]} · ${body.handNote}`},
     {name:"Face & subject visibility",score:faceVisibility,note:faces.length!==1?(faces.length?`${faces.length} faces detected`:"No clear face detected"):faceVisibility>=80?"One agent, plenty of usable facial detail":faceVisibility>=65?"One agent, but facial detail is limited":"One agent, too little facial detail to work with"},
     {name:"Background & editability",score:editability,note:editability>=80?"Easy to isolate and lay up":editability>=65?"Workable, but the subject edge or crop limits masking":"Hard to isolate cleanly"},
    ];
    // Technical file facts are reported, never weighted: a valid JPEG is not a good photograph, and a
    // small file is not a bad one.
    const fileNote=`${inferFileNote(src)} · ${image.naturalWidth} × ${image.naturalHeight}`;
    resolve({score,overall_score:score,base_score:baseScore,raw_score:decision.rawScore,applied_cap:decision.appliedCap,score_trace:decision.scoreTrace,status,label,tone,confidence:decision.confidence,file_note:fileNote,hard_gates:decision.hardGates,designer_review_eligible:decision.designerReviewEligible,disputable_gates:decision.disputableGates,review_block_reason:decision.reviewBlockReason,quality_defects:decision.qualityDefects,snapshot_signals:decision.snapshotSignals,technical_quality:technicalQuality,body_usability:bodyUsability,face_visibility:faceVisibility,editability,body_extent:body.extent,hands:body.hands,file_suitability:decision.fileSuitability,file_status:decision.fileStatus,file_reason:decision.fileReason,professionalism,composition,background_quality:backgroundQuality,face_quality:faceQuality,designer_usability:designerUsability,pose_appropriateness:poseAppropriateness,selfie_probability:selfieProbability,issues,strengths,recommendation:buildRecommendation(status,issues,decision.fileReason,decision.hardGates,decision.retakeAdvice,decision.designerReviewEligible),decision_reason:decision.decisionReason,requirements:decision.requirements,penalties:decision.penalties,metrics});
   }catch(error){reject(error)}
  };
  image.onerror=reject;image.src=src;
 });
}
```

### `app/image-enhancement.ts`

```ts
export type FaceRegion = {x:number;y:number;width:number;height:number;confidence?:number};
export type BackgroundMode = "original"|"blur"|"gray"|"ivory";
export type EnhanceSettings = {
  skin:number;
  light:number;
  definition:number;
  background:BackgroundMode;
  highResolution:boolean;
};

export type PersonMask = {data:Float32Array;width:number;height:number};
export type PoseLandmark = {x:number;y:number;visibility:number};
export type EnhancementAssets = {face:FaceRegion|null;faces:FaceRegion[];personMask:PersonMask|null;pose:PoseLandmark[]|null};
export type RenderedPhoto = {dataUrl:string;width:number;height:number};
export type PortraitComposition = {score:number;note:string};
type NormalizedCrop = {x:number;y:number;width:number;height:number};
type ShoulderBounds = {left:number;right:number};
const enhancementAssetCache=new Map<string,Promise<EnhancementAssets>>();

export function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=reject;
    image.src=src;
  });
}

export async function prepareEnhancementAssets(src:string):Promise<EnhancementAssets>{
  const cached=enhancementAssetCache.get(src);
  if(cached)return cached;
  const pending=Promise.allSettled([detectFaces(src),segmentPerson(src),detectPose(src)]).then(([faceResult,maskResult,poseResult])=>{
    const faces=faceResult.status==="fulfilled"?faceResult.value:[];
    return {face:faces[0]??null,faces,personMask:maskResult.status==="fulfilled"?maskResult.value:null,pose:poseResult.status==="fulfilled"?poseResult.value:null};
  });
  enhancementAssetCache.set(src,pending);
  if(enhancementAssetCache.size>4)enhancementAssetCache.delete(enhancementAssetCache.keys().next().value!);
  return pending;
}

function findShoulderBounds(mask:PersonMask|null,face:FaceRegion|null):ShoulderBounds|null{
  if(!mask||!face)return null;
  const startY=Math.max(0,Math.floor((face.y+face.height*1.2)*mask.height)),endY=Math.min(mask.height-1,Math.ceil((face.y+face.height*1.85)*mask.height));
  if(endY<=startY)return null;
  const rows=endY-startY+1,counts=new Uint16Array(mask.width);
  for(let y=startY;y<=endY;y+=1)for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.38)counts[x]+=1;
  const minimum=Math.max(2,Math.round(rows*.16));
  let left=-1,right=-1;
  for(let x=0;x<mask.width;x+=1)if(counts[x]>=minimum){left=x;break}
  for(let x=mask.width-1;x>=0;x-=1)if(counts[x]>=minimum){right=x;break}
  return left>=0&&right>left?{left:left/mask.width,right:(right+1)/mask.width}:null;
}

export async function analyzePortraitComposition(src:string,targetAspect=.8):Promise<PortraitComposition>{
  const [assets,image]=await Promise.all([prepareEnhancementAssets(src),loadImage(src)]),face=assets.face;
  if(!face)return {score:0,note:"Face not detected"};
  const shoulders=findShoulderBounds(assets.personMask,face),subjectCenter=shoulders?(shoulders.left+shoulders.right)/2:face.x+face.width/2,offset=Math.abs(subjectCenter-.5),centerScore=offset<=.18?100:Math.max(0,100-(offset-.18)*420),headroom=face.y,headroomScore=headroom>=.035&&headroom<=.24?100:Math.max(0,100-Math.min(Math.abs(headroom-.035),Math.abs(headroom-.24))*520),scaleScore=face.height>=.1&&face.height<=.36?100:Math.max(0,100-Math.min(Math.abs(face.height-.1),Math.abs(face.height-.36))*650),sourceAspect=image.naturalWidth/image.naturalHeight,aspectLoss=sourceAspect>targetAspect?1-targetAspect/sourceAspect:1-sourceAspect/targetAspect,aspectScore=Math.max(0,100-aspectLoss*180),faceClearance=Math.min(face.x,face.y,1-face.x-face.width,1-face.y-face.height),cropSafety=faceClearance>=.025?100:Math.max(0,100-(.025-faceClearance)*2200),score=Math.round(centerScore*.2+headroomScore*.2+scaleScore*.2+cropSafety*.25+aspectScore*.15);
  const note=faceClearance<.02?"Leave more room around the face":face.height<.1?"Agent is small, but lifestyle framing is allowed":face.height>.36?"Frame wider to avoid selfie-style proximity":offset>.25?"Reposition the agent or preserve intentional copy space":score>=75?"Marketing-safe framing · relaxed poses welcome":"Reframe for cleaner design space";
  return {score,note};
}

// A real face lands near .96; crossed arms, folded hands and patterned fabric produce phantoms around .6.
export const confidentFace=.75;
async function detectFaces(src:string):Promise<FaceRegion[]>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const detector=await vision.FaceDetector.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/blaze_face_short_range.tflite"},
    runningMode:"IMAGE",
    minDetectionConfidence:.5,
  });
  try{
    // Ranked by confidence, not by area: the largest box is not always the actual face. Callers decide
    // what to do with the weak ones — see confidentFace.
    return detector.detect(image).detections.flatMap(detection=>{
      const box=detection.boundingBox,confidence=detection.categories?.[0]?.score??0;
      return box?[{
        x:box.originX/image.naturalWidth,
        y:box.originY/image.naturalHeight,
        width:box.width/image.naturalWidth,
        height:box.height/image.naturalHeight,
        confidence,
      }]:[];
    }).sort((a,b)=>b.confidence-a.confidence||b.width*b.height-a.width*a.height);
  }finally{
    detector.close();
  }
}

// Body framing and hand completeness need skeleton landmarks; face box plus silhouette cannot tell
// "hands resting out of shot" from "hands chopped off at the wrist".
async function detectPose(src:string):Promise<PoseLandmark[]|null>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const landmarker=await vision.PoseLandmarker.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/pose_landmarker_lite.task"},
    runningMode:"IMAGE",
    numPoses:1,
    minPoseDetectionConfidence:.4,
    minPosePresenceConfidence:.4,
  });
  try{
    const landmarks=landmarker.detect(image).landmarks?.[0];
    return landmarks?.length?landmarks.map(point=>({x:point.x,y:point.y,visibility:point.visibility??0})):null;
  }finally{
    landmarker.close();
  }
}

async function segmentPerson(src:string):Promise<PersonMask>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const segmenter=await vision.ImageSegmenter.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/selfie_segmenter.tflite"},
    runningMode:"IMAGE",
    outputConfidenceMasks:true,
    outputCategoryMask:false,
  });
  try{
    return await new Promise<PersonMask>((resolve,reject)=>{
      segmenter.segment(image,result=>{
        const mask=result.confidenceMasks?.[0];
        if(!mask){reject(new Error("No person mask was returned"));return}
        resolve({data:new Float32Array(mask.getAsFloat32Array()),width:mask.width,height:mask.height});
      });
    });
  }finally{
    segmenter.close();
  }
}

function makeCanvas(width:number,height:number){
  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  return canvas;
}

function measureLight(image:CanvasImageSource){
  const sample=makeCanvas(48,48),context=sample.getContext("2d",{willReadFrequently:true});
  if(!context)return 145;
  context.fillStyle="#fff";
  context.fillRect(0,0,48,48);
  context.drawImage(image,0,0,48,48);
  const pixels=context.getImageData(0,0,48,48).data;
  let total=0,count=0;
  for(let y=4;y<22;y+=1)for(let x=11;x<31;x+=1){
    const index=(y*48+x)*4;
    total+=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
    count+=1;
  }
  return total/count;
}

function applyFaceRetouch(canvas:HTMLCanvasElement,face:FaceRegion|null,strength:number){
  if(!face||!strength)return;
  const context=canvas.getContext("2d"),soft=makeCanvas(canvas.width,canvas.height),softContext=soft.getContext("2d"),mask=makeCanvas(canvas.width,canvas.height),maskContext=mask.getContext("2d");
  if(!context||!softContext||!maskContext)return;
  const blur=Math.max(1.2,Math.min(canvas.width,canvas.height)*(.0012+strength*.000025));
  softContext.filter=`blur(${blur}px) brightness(${1+strength*.00025}) saturate(${1-strength*.00022})`;
  softContext.drawImage(canvas,0,0);
  const cx=(face.x+face.width/2)*canvas.width,cy=(face.y+face.height*.52)*canvas.height,rx=face.width*canvas.width*.72,ry=face.height*canvas.height*.82;
  maskContext.save();
  maskContext.translate(cx,cy);
  maskContext.scale(rx,ry);
  const feather=maskContext.createRadialGradient(0,0,0,0,0,1);
  feather.addColorStop(0,"rgba(255,255,255,1)");
  feather.addColorStop(.56,"rgba(255,255,255,.96)");
  feather.addColorStop(.83,"rgba(255,255,255,.36)");
  feather.addColorStop(1,"rgba(255,255,255,0)");
  maskContext.fillStyle=feather;
  maskContext.fillRect(-1,-1,2,2);
  maskContext.restore();
  softContext.globalCompositeOperation="destination-in";
  softContext.drawImage(mask,0,0);
  context.save();
  context.globalAlpha=Math.min(.38,strength*.0062);
  context.drawImage(soft,0,0);
  context.restore();
}

function createPersonMask(mask:PersonMask,targetWidth:number,targetHeight:number,crop:NormalizedCrop={x:0,y:0,width:1,height:1}){
  const source=makeCanvas(mask.width,mask.height),sourceContext=source.getContext("2d"),image=sourceContext?.createImageData(mask.width,mask.height);
  if(!sourceContext||!image)return null;
  for(let index=0;index<mask.data.length;index+=1){
    const confidence=Math.max(0,Math.min(1,(mask.data[index]-.14)/.72));
    const feather=confidence*confidence*(3-2*confidence);
    const offset=index*4;
    image.data[offset]=255;
    image.data[offset+1]=255;
    image.data[offset+2]=255;
    image.data[offset+3]=Math.round(feather*255);
  }
  sourceContext.putImageData(image,0,0);
  const target=makeCanvas(targetWidth,targetHeight),targetContext=target.getContext("2d");
  if(!targetContext)return null;
  targetContext.imageSmoothingEnabled=true;
  targetContext.imageSmoothingQuality="high";
  targetContext.filter=`blur(${Math.max(1,Math.min(targetWidth,targetHeight)*.0012)}px)`;
  targetContext.drawImage(source,crop.x*mask.width,crop.y*mask.height,crop.width*mask.width,crop.height*mask.height,0,0,targetWidth,targetHeight);
  return target;
}

function paintBackground(context:CanvasRenderingContext2D,image:CanvasImageSource,mode:BackgroundMode,width:number,height:number){
  if(mode==="blur"){
    const overscan=1.06,drawWidth=width*overscan,drawHeight=height*overscan;
    context.save();
    context.filter=`blur(${Math.max(12,Math.min(width,height)*.018)}px) brightness(.82) saturate(.72)`;
    context.drawImage(image,(width-drawWidth)/2,(height-drawHeight)/2,drawWidth,drawHeight);
    context.restore();
    return;
  }
  const palette=mode==="gray"?["#26302e","#67716d"]:["#c9bcaa","#f1eadf"];
  context.fillStyle=palette[0];
  context.fillRect(0,0,width,height);
  const glow=context.createRadialGradient(width*.48,height*.28,0,width*.48,height*.28,Math.max(width,height)*.76);
  glow.addColorStop(0,palette[1]);
  glow.addColorStop(.62,palette[0]);
  glow.addColorStop(1,"#151a18");
  context.fillStyle=glow;
  context.fillRect(0,0,width,height);
}

function portraitCrop(image:HTMLImageElement,assets:EnhancementAssets,targetAspect:number):NormalizedCrop{
  const sourceWidth=image.naturalWidth,sourceHeight=image.naturalHeight,face=assets.face,shoulders=findShoulderBounds(assets.personMask,face);
  let cropHeight=sourceHeight,cropWidth=cropHeight*targetAspect;
  if(cropWidth>sourceWidth){cropWidth=sourceWidth;cropHeight=cropWidth/targetAspect}
  if(face){
    const targetFaceHeight=targetAspect===1?.24:.22;
    cropHeight=Math.min(sourceHeight,face.height*sourceHeight/targetFaceHeight);
    cropWidth=cropHeight*targetAspect;
    if(shoulders){
      const requiredWidth=(shoulders.right-shoulders.left)*sourceWidth/.88;
      if(requiredWidth>cropWidth){cropWidth=requiredWidth;cropHeight=cropWidth/targetAspect}
    }
    if(cropWidth>sourceWidth){cropWidth=sourceWidth;cropHeight=cropWidth/targetAspect}
    if(cropHeight>sourceHeight){cropHeight=sourceHeight;cropWidth=cropHeight*targetAspect}
  }
  const subjectCenter=(shoulders?(shoulders.left+shoulders.right)/2:face?face.x+face.width/2:.5)*sourceWidth,idealY=face?face.y*sourceHeight-cropHeight*.09:(sourceHeight-cropHeight)/2,x=Math.max(0,Math.min(sourceWidth-cropWidth,subjectCenter-cropWidth/2)),y=Math.max(0,Math.min(sourceHeight-cropHeight,idealY));
  return {x:x/sourceWidth,y:y/sourceHeight,width:cropWidth/sourceWidth,height:cropHeight/sourceHeight};
}

function frameSource(image:HTMLImageElement,crop:NormalizedCrop){
  const width=Math.max(1,Math.round(image.naturalWidth*crop.width)),height=Math.max(1,Math.round(image.naturalHeight*crop.height)),canvas=makeCanvas(width,height),context=canvas.getContext("2d");
  if(context)context.drawImage(image,crop.x*image.naturalWidth,crop.y*image.naturalHeight,crop.width*image.naturalWidth,crop.height*image.naturalHeight,0,0,width,height);
  return canvas;
}

function cropFace(face:FaceRegion|null,crop:NormalizedCrop):FaceRegion|null{
  if(!face)return null;
  return {x:(face.x-crop.x)/crop.width,y:(face.y-crop.y)/crop.height,width:face.width/crop.width,height:face.height/crop.height};
}

function addRelight(context:CanvasRenderingContext2D,width:number,height:number,strength:number,mask:HTMLCanvasElement|null){
  if(!strength)return;
  const light=makeCanvas(width,height),lightContext=light.getContext("2d");
  if(!lightContext)return;
  const gradient=lightContext.createRadialGradient(width*.3,height*.2,0,width*.3,height*.2,Math.max(width,height)*.72);
  gradient.addColorStop(0,`rgba(255,244,220,${.22*strength})`);
  gradient.addColorStop(.5,`rgba(255,240,218,${.08*strength})`);
  gradient.addColorStop(1,"rgba(255,255,255,0)");
  lightContext.fillStyle=gradient;
  lightContext.fillRect(0,0,width,height);
  if(mask){lightContext.globalCompositeOperation="destination-in";lightContext.drawImage(mask,0,0)}
  context.save();
  context.globalCompositeOperation="screen";
  context.drawImage(light,0,0);
  context.restore();
}

export async function renderProfessionalPhoto(src:string,settings:EnhanceSettings,assets:EnhancementAssets,preview=false,targetAspect=.8):Promise<RenderedPhoto>{
  const image=await loadImage(src),crop=portraitCrop(image,assets,targetAspect),framed=frameSource(image,crop),sourceLongEdge=Math.max(framed.width,framed.height),desiredLongEdge=preview?Math.min(sourceLongEdge,1400):settings.highResolution?Math.min(2048,Math.max(1600,sourceLongEdge)):sourceLongEdge,scale=desiredLongEdge/sourceLongEdge,width=Math.max(1,Math.round(framed.width*scale)),height=Math.max(1,Math.round(framed.height*scale));
  const canvas=makeCanvas(width,height),context=canvas.getContext("2d");
  if(!context)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const tone=makeCanvas(width,height),toneContext=tone.getContext("2d");
  if(!toneContext)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const meanLight=measureLight(framed),exposureStrength=settings.light/70,brightness=1+((145-meanLight)/255)*.62*exposureStrength;
  toneContext.imageSmoothingEnabled=true;
  toneContext.imageSmoothingQuality="high";
  toneContext.filter=`brightness(${brightness}) contrast(${1+settings.definition*.00105}) saturate(${1+settings.definition*.00028})`;
  toneContext.drawImage(framed,0,0,width,height);
  toneContext.filter="none";
  applyFaceRetouch(tone,cropFace(assets.face,crop),settings.skin);

  const personMask=assets.personMask?createPersonMask(assets.personMask,width,height,crop):null;
  const canReplaceBackground=settings.background!=="original"&&personMask;
  if(canReplaceBackground){
    paintBackground(context,framed,settings.background,width,height);
    if(settings.background!=="blur"){
      context.save();
      context.globalAlpha=.22;
      context.filter=`blur(${Math.max(10,width*.015)}px)`;
      context.drawImage(personMask!,width*.012,height*.015);
      context.restore();
    }
    const subject=makeCanvas(width,height),subjectContext=subject.getContext("2d");
    if(subjectContext){
      subjectContext.drawImage(tone,0,0);
      subjectContext.globalCompositeOperation="destination-in";
      subjectContext.drawImage(personMask!,0,0);
      context.drawImage(subject,0,0);
    }
  }else{
    context.drawImage(tone,0,0);
  }
  addRelight(context,width,height,exposureStrength,personMask);
  return {dataUrl:canvas.toDataURL("image/jpeg",preview?.88:.93),width,height};
}
```

### `app/chatgpt-auth.ts`

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!userId || !email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
```

### `app/studio.tsx`

```tsx
"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Camera, Check, Download, HelpCircle, Home, Images, Keyboard, LayoutTemplate, MonitorCog, Printer, QrCode, RefreshCw, RotateCcw, ScanFace, ScanLine, ShieldCheck, SlidersHorizontal, Sparkles, SunMedium, Trash2, Upload, X } from "lucide-react";
import type {IScannerControls} from "@zxing/browser";
import {emptyPhotoRating, evaluatePhoto, isPhotoApproved, photoApprovalThresholds, PhotoMetric, PhotoRating} from "./photo-quality";
import {createReviewRequestId, recordReviewRequest} from "./photo-review-requests";
import BrandAssetStudio from "./brand-assets";
import {mockAgent} from "./mock-agent";
import {EnhanceSettings, EnhancementAssets, loadImage, prepareEnhancementAssets, renderProfessionalPhoto} from "./image-enhancement";

type View = "profile"|"session"|"capture"|"batch"|"review"|"select"|"consent"|"success"|"personal"|"assets"|"console";
type Assessment = PhotoRating;
type PhotoCategory = "atlas"|"awards";
type Photo = { id:string; dataUrl:string; createdAt:string; enhanced:boolean; profileOK:boolean; brandOK:boolean; width:number; height:number; category?:PhotoCategory; rating?:PhotoRating; agentName?:string; agentId?:string; agentMobile?:string; agentRenTag?:string; agentOfficePhone?:string };
const photoCategories:{id:PhotoCategory;label:string;note:string}[]=[{id:"atlas",label:"Atlas photo",note:"Profile and subsale banner"},{id:"awards",label:"Awards night",note:"Event screen artwork"}];
const categoryOf=(item:Photo):PhotoCategory=>item.category??"atlas";
type SessionAgent = {agentName:string;agentId:string;agentPhoto?:string;agentMobile?:string;agentRenTag?:string;agentOfficePhone?:string;rating?:number;ratingLabel?:string;ratingMetrics?:PhotoMetric[];photoPreflight?:PhotoRating;date?:string;time?:string};
type CameraDevice = {deviceId:string;label:string};
type PrintSize = "auto"|"4x6"|"a4"|"letter";
type CapturedShot = {id:string;original:string;rating:PhotoRating};
const demoAgent:SessionAgent=mockAgent;
const enhancePresets:{name:string;settings:EnhanceSettings}[]=[
 {name:"Natural",settings:{skin:16,light:20,definition:16,background:"original",highResolution:true}},
 {name:"Studio",settings:{skin:30,light:38,definition:28,background:"gray",highResolution:true}},
 {name:"Warm",settings:{skin:25,light:34,definition:22,background:"ivory",highResolution:true}},
];
const backgroundOptions=[{id:"original" as const,label:"Original",note:"Keep the scene"},{id:"blur" as const,label:"Soft blur",note:"Reduce distractions"},{id:"gray" as const,label:"Slate",note:"Corporate studio"},{id:"ivory" as const,label:"Ivory",note:"Warm editorial"}];

const nav=[{id:"profile" as View,label:"Home",icon:Home},{id:"personal" as View,label:"Photos",icon:Images},{id:"assets" as View,label:"Assets",icon:LayoutTemplate},{id:"console" as View,label:"Studio",icon:MonitorCog}];
const navigableViews=new Set<View>(nav.map(item=>item.id));

const Placeholder=({n=2,badge}:{n?:number;badge?:string})=><div className={`portrait p${n}`}>{badge?<span className="badge"><Check size={14}/> {badge}</span>:null}</div>;
const PhotoView=({src,className="",alt="Portrait",badge}:{src?:string;className?:string;alt?:string;badge?:string})=>src?<div className="photo-media"><img className={`user-photo ${className}`} src={src} alt={alt} width={960} height={1200}/>{badge?<span className="badge"><Check size={14}/> {badge}</span>:null}</div>:<Placeholder badge={badge}/>;

function formatAppointment(date?:string,time?:string){if(!date||!time)return "";try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(`${date}T${time}`))}catch{return `${date} · ${time}`}}
function readGallery(){if(typeof window==="undefined")return[] as Photo[];try{const saved=localStorage.getItem("ps-gallery");return saved?JSON.parse(saved) as Photo[]:[]}catch{return[] as Photo[]}}
function Step({n,label}:{n:number;label:string}){return <div className="steps" role="progressbar" aria-label={`${label}, step ${n} of 4`} aria-valuemin={1} aria-valuemax={4} aria-valuenow={n}><span>Step {n} of 4</span><i><b style={{width:`${n*25}%`}}/></i><span>{label}</span></div>}

function CameraRating({rating,compact=false}:{rating:PhotoRating;compact?:boolean}){return <div className={`camera-rating ${rating.tone} ${compact?"compact":""}`} aria-label={`Photo rating ${rating.score} out of 100, ${rating.label}`}><strong>{rating.score}</strong><span><b>Photo rating</b><small>{rating.label}</small></span></div>}

function RatingFeedback({rating,appeal}:{rating:PhotoRating;appeal?:AppealContext}){return <div className={`rating-feedback ${rating.tone}`}><div className="rating-feedback-meta"><span>{rating.status}</span><b>Technical usability {rating.score}/100 · {Math.round(rating.confidence*100)}% confidence</b></div>{rating.hard_gates.length?<ul className="hard-gates">{rating.hard_gates.map(gate=><li key={gate}>{gate}</li>)}</ul>:null}<p>{rating.decision_reason}</p>{rating.issues.length?<ul>{rating.issues.slice(0,3).map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>{rating.strengths.slice(0,3).join(" · ")}</p>}<strong>{rating.recommendation} Sitting, leaning and smart-casual poses are never penalised.</strong>{appeal?<DesignerReviewAppeal rating={rating} appeal={appeal}/>:null}</div>}

// The agent's right of reply. Shown only where the AI made a judgement call: composition, framing,
// whether something reads as a selfie. Where the image itself is measurably unusable there is nothing
// to argue about, so the appeal is replaced by a plain statement of what is wrong with the file.
type AppealContext={agentName:string;agentId?:string;photo:string;onSent:(id:string)=>void};

function DesignerReviewAppeal({rating,appeal}:{rating:PhotoRating;appeal:AppealContext}){
 const [open,setOpen]=useState(false),[note,setNote]=useState(""),[sentId,setSentId]=useState("");
 const status=rating.status;
 if(status==="APPROVED")return null;
 if(!rating.designer_review_eligible)return <p className="appeal-blocked" role="note"><ShieldCheck size={15}/> <span>This image does not have enough usable quality for designer review. Please upload a clearer or higher-quality photo.{rating.review_block_reason?<small>{rating.review_block_reason}</small>:null}</span></p>;
 if(sentId)return <p className="appeal-sent" role="status"><Check size={15}/> <span>Designer review requested · {sentId}<small>A designer will look at this photo and decide. You can carry on in the meantime.</small></span></p>;
 // A REVIEW verdict is the AI asking for a designer itself, so sending it is agreement, not a dispute —
 // making the agent tick "the AI got this wrong" to act on the AI's own recommendation would be absurd.
 // A REJECT is the case the checkbox exists for.
 const recommended=status==="REVIEW";
 const send=()=>{
  const request=recordReviewRequest({id:createReviewRequestId(),createdAt:new Date().toISOString(),agentName:appeal.agentName,agentId:appeal.agentId,photo:appeal.photo,score:rating.score,status,disputedGates:rating.disputable_gates,note:note.trim(),state:"pending"});
  setSentId(request.id);
  appeal.onSent(request.id);
 };
 const body=<div className="appeal-body">
  {rating.disputable_gates.length?<><small>{recommended?"A designer will look at":"You are challenging"}:</small><ul>{rating.disputable_gates.map(gate=><li key={gate}>{gate}</li>)}</ul></>:<small>{recommended?`A designer will judge this photo's marketing readiness score of ${rating.score}.`:`You are challenging this photo's marketing readiness score of ${rating.score}.`}</small>}
  <label className="appeal-note"><span>Anything the designer should know? (optional)</span><textarea value={note} onChange={event=>setNote(event.target.value)} maxLength={280} rows={3} placeholder="For example: this was taken by a photographer in a studio."/></label>
  <button type="button" className="appeal-send" onClick={send}>{recommended?"Send for designer review":"Request designer review"}</button>
 </div>;
 if(recommended)return <div className="appeal recommended"><p className="appeal-lead"><HelpCircle size={15}/> <span>This photo needs a designer to decide. Send it over and carry on.</span></p>{body}</div>;
 return <div className="appeal">
  <label className="appeal-toggle"><input type="checkbox" checked={open} onChange={event=>setOpen(event.target.checked)}/><span>I think the AI got this wrong</span></label>
  {open?body:null}
 </div>;
}

function SessionProfile({agent,code,onStart,onExit}:{agent:SessionAgent;code:string;onStart:()=>void;onExit:()=>void}){
 const initialRating:PhotoRating=agent.photoPreflight?{...emptyPhotoRating,...agent.photoPreflight,requirements:agent.photoPreflight.requirements??[],penalties:agent.photoPreflight.penalties??[]}:(agent.rating&&agent.ratingMetrics?.length?{...emptyPhotoRating,score:agent.rating,overall_score:agent.rating,base_score:agent.rating,status:agent.rating>=80?"APPROVED":agent.rating>=60?"REVIEW":"REJECT",label:agent.ratingLabel||"Photo assessed",tone:agent.rating>=80?"good":agent.rating>=60?"fair":"low",metrics:agent.ratingMetrics}:emptyPhotoRating);
 const [format,setFormat]=useState<"square"|"portrait">("portrait"),[sourceRatio,setSourceRatio]=useState(.8),[rating,setRating]=useState<PhotoRating>(initialRating),[checking,setChecking]=useState(true);
 const src=agent.agentPhoto||"/api/atlas-avatar?slug=aaron-paul",target=format==="square"?1:.8;
 useEffect(()=>{let active=true;Promise.all([loadImage(src),evaluatePhoto(src,target)]).then(([image,nextRating])=>{if(!active)return;setSourceRatio(image.naturalWidth/image.naturalHeight);setRating(nextRating)}).catch(()=>{if(active)setRating(current=>current.score?current:{...emptyPhotoRating,label:"Could not assess"})}).finally(()=>{if(active)setChecking(false)});return()=>{active=false}},[src,target]);
 const loss=sourceRatio>target?Math.round((1-target/sourceRatio)*100):Math.round((1-sourceRatio/target)*100),direction=sourceRatio>target?"left and right sides":"top and bottom",scoreColor=rating.tone==="good"?"#5ce493":rating.tone==="fair"?"#f3b44d":"#ef7656";
 return <main className="session-profile-check">
  <header className="session-loaded-header"><div className="session-loaded-title"><div><span className="eyebrow">SESSION LOADED</span><b>{agent.agentName}</b></div></div><div className="session-loaded-actions"><div className="session-loaded-meta">{agent.date&&agent.time?<span>{formatAppointment(agent.date,agent.time)}</span>:null}<code translate="no">{code}</code></div><button type="button" className="session-exit" onClick={onExit} aria-label="Exit session" title="Exit session"><X size={20}/></button></div></header>
  <div className="session-profile-grid">
   <section className="crop-workbench"><div className="crop-workbench-head"><div><span className="eyebrow">SOURCE PHOTO</span><b>Crop preview</b></div><div className="format-tabs" aria-label="Preview format"><button type="button" className={format==="portrait"?"active":""} onClick={()=>{setChecking(true);setFormat("portrait")}} aria-pressed={format==="portrait"}>4:5 Portrait</button><button type="button" className={format==="square"?"active":""} onClick={()=>{setChecking(true);setFormat("square")}} aria-pressed={format==="square"}>1:1 Square</button></div></div><div className={`crop-preview ${format}`}><img src={src} alt={`${agent.agentName} ${format} crop preview`} width={960} height={format==="square"?960:1200}/><span className="preview-format">{format==="square"?"1:1 SQUARE":"4:5 PORTRAIT"}</span><span className="bleed-border"/><span className="face-safe">FACE SAFE AREA</span></div><div className={`crop-warning ${loss>12?"warn":"good"}`}><span className="crop-warning-icon">{loss>12?<HelpCircle size={18}/>:<Check size={18}/>}</span><div><b>{loss>12?"Crop too tight":"Crop ready"}</b><span>{loss}% hidden from the {direction}.</span></div></div></section>
   <aside className="session-quality"><div className="session-agent"><div className="session-agent-thumb"><img src={src} alt="" width={52} height={60}/></div><div><span className="eyebrow">PHOTO PREFLIGHT</span><h1>{agent.agentName}</h1><p>Agent ID {agent.agentId}</p></div></div><div className={`session-score ${rating.tone}`} aria-live="polite"><div className="session-score-ring" style={{background:`conic-gradient(${scoreColor} ${rating.score*3.6}deg,#303835 0deg)`}}><span><strong>{checking?"—":rating.score}</strong><small>/100</small></span></div><div><span>Marketing readiness</span><b>{checking?"Checking…":rating.label}</b><small>Selected: {format==="square"?"1:1":"4:5"}</small></div></div><div className="session-metrics">{rating.metrics.map(metric=><div className="session-metric" key={metric.name}><div><span>{metric.name}<small>{metric.note}</small></span><b>{checking?"—":metric.score}</b></div><i><b style={{width:checking?"0%":`${metric.score}%`}}/></i></div>)}</div><p className="session-file"><span>File</span> {rating.file_note}{rating.file_status==="OK"?"":` · ${rating.file_reason}`}</p>{checking?null:<RatingFeedback rating={rating} appeal={{agentName:agent.agentName,agentId:agent.agentId,photo:src,onSent:()=>{}}}/>}<div className="session-method"><ShieldCheck size={18}/><p><b>Designer usability standard</b><span>Photo quality 30 · Body &amp; crop 30 · Face visibility 20 · Background &amp; editability 20. Only problems that stop a designer using the agent can force a retake — padding, file size, posing and clothing never do.</span></p></div><button className="primary session-start" onClick={onStart}>Start camera <ArrowRight size={19}/></button></aside>
  </div>
 </main>;
}

function UploadedPhotoCheck({src,dimensions,assessment,agent,onContinue,onRetake,onExit,onUpload}:{src:string;dimensions:{width:number;height:number};assessment:Assessment;agent:SessionAgent;onContinue:(format:"portrait"|"square")=>void;onRetake:()=>void;onExit:()=>void;onUpload:(event:ChangeEvent<HTMLInputElement>)=>void}){
 const [reviewRequested,setReviewRequested]=useState(false),[format,setFormat]=useState<"square"|"portrait">("portrait"),[rating,setRating]=useState<PhotoRating>(assessment),[checking,setChecking]=useState(false),inputRef=useRef<HTMLInputElement>(null),ratingRunRef=useRef(0);
 const target=format==="square"?1:.8,sourceRatio=dimensions.height?dimensions.width/dimensions.height:.8,loss=sourceRatio>target?Math.round((1-target/sourceRatio)*100):Math.round((1-sourceRatio/target)*100),direction=sourceRatio>target?"left and right sides":"top and bottom",scoreColor=rating.tone==="good"?"#5ce493":rating.tone==="fair"?"#f3b44d":"#ef7656",ready=isPhotoApproved(rating)||reviewRequested;
 const selectFormat=async(nextFormat:"portrait"|"square")=>{if(nextFormat===format)return;const runId=++ratingRunRef.current;setFormat(nextFormat);if(nextFormat==="portrait"){setRating(assessment);setChecking(false);return}setChecking(true);try{const nextRating=await evaluatePhoto(src,1);if(ratingRunRef.current===runId)setRating(nextRating)}catch{if(ratingRunRef.current===runId)setRating({...emptyPhotoRating,label:"Could not assess"})}finally{if(ratingRunRef.current===runId)setChecking(false)}};
 return <main className="session-profile-check uploaded-photo-check">
  <header className="session-loaded-header"><div className="session-loaded-title"><div><span className="eyebrow">PHOTO UPLOADED</span><b>Review before continuing</b></div></div><div className="session-loaded-actions"><div className="session-loaded-meta"><span>Camera, phone or file</span><code>{dimensions.width} × {dimensions.height}</code></div><button type="button" className="session-exit" onClick={onExit} aria-label="Close photo check" title="Close photo check"><X size={20}/></button></div></header>
  <div className="session-profile-grid">
   <section className="crop-workbench"><div className="crop-workbench-head"><div><span className="eyebrow">SOURCE PHOTO</span><b>Crop preview</b></div><div className="format-tabs" aria-label="Preview format"><button type="button" className={format==="portrait"?"active":""} onClick={()=>void selectFormat("portrait")} aria-pressed={format==="portrait"}>4:5 Portrait</button><button type="button" className={format==="square"?"active":""} onClick={()=>void selectFormat("square")} aria-pressed={format==="square"}>1:1 Square</button></div></div><div className={`crop-preview ${format}`}><img src={src} alt={`Uploaded ${format} crop preview`} width={960} height={format==="square"?960:1200}/><span className="preview-format">{format==="square"?"1:1 SQUARE":"4:5 PORTRAIT"}</span><span className="bleed-border"/><span className="face-safe">FACE SAFE AREA</span></div><div className={`crop-warning ${loss>12?"warn":"good"}`}><span className="crop-warning-icon">{loss>12?<HelpCircle size={18}/>:<Check size={18}/>}</span><div><b>{loss>12?"Crop too tight":"Crop ready"}</b><span>{loss}% hidden from the {direction}.</span></div></div></section>
   <aside className="session-quality"><div className="session-agent"><div className="session-agent-thumb"><img src={src} alt="" width={52} height={60}/></div><div><span className="eyebrow">PHOTO PREFLIGHT</span><h1>{agent.agentName}</h1><p>Uploaded image · {dimensions.width} × {dimensions.height}px</p></div></div><div className={`session-score ${rating.tone}`} aria-live="polite"><div className="session-score-ring" style={{background:`conic-gradient(${scoreColor} ${rating.score*3.6}deg,#303835 0deg)`}}><span><strong>{checking?"—":rating.score}</strong><small>/100</small></span></div><div><span>Marketing readiness</span><b>{checking?"Checking…":rating.label}</b><small>Selected: {format==="square"?"1:1":"4:5"}</small></div></div><div className="session-metrics">{rating.metrics.map(metric=><div className="session-metric" key={metric.name}><div><span>{metric.name}<small>{metric.note}</small></span><b>{checking?"—":metric.score}</b></div><i><b style={{width:checking?"0%":`${metric.score}%`}}/></i></div>)}</div><p className="session-file"><span>File</span> {rating.file_note}{rating.file_status==="OK"?"":` · ${rating.file_reason}`}</p>{checking?null:<RatingFeedback rating={rating} appeal={{agentName:agent.agentName,agentId:agent.agentId,photo:src,onSent:()=>setReviewRequested(true)}}/>}<div className="session-method"><ShieldCheck size={18}/><p><b>Designer usability standard</b><span>Photo quality 30 · Body &amp; crop 30 · Face visibility 20 · Background &amp; editability 20. Only problems that stop a designer using the agent can force a retake — padding, file size, posing and clothing never do.</span></p></div><div className="upload-review-actions">{ready?<button type="button" className="primary session-start" onClick={()=>onContinue(format)}>Continue <ArrowRight size={19}/></button>:<><button type="button" className="primary session-start" onClick={onRetake}><Camera size={18}/>{rating.status==="REUPLOAD"?"Re-upload larger file":"Retake photo"}</button><button type="button" className="upload-review-secondary enhance-anyway" onClick={()=>onContinue(format)}><Sparkles size={17}/>{rating.status==="REUPLOAD"?"Continue with this file anyway":rating.status==="REVIEW"?"Review or enhance":"Try professional enhancement"}</button></>}<button type="button" className="upload-review-secondary" onClick={()=>inputRef.current?.click()}><Upload size={17}/> Choose another file</button></div><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} aria-label="Choose another portrait photo"/></aside>
  </div>
 </main>;
}

function StudioEnhanceEditor({src,targetAspect,onBack,onContinue}:{src:string;targetAspect:number;onBack:()=>void;onContinue:(result:string,enhanced:boolean,dimensions:{width:number;height:number})=>Promise<void>}){
 const [enabled,setEnabled]=useState(true),[settings,setSettings]=useState<EnhanceSettings>(enhancePresets[1].settings),[assets,setAssets]=useState<EnhancementAssets|null>(null),[prepared,setPrepared]=useState(false),[preview,setPreview]=useState(src),[rendering,setRendering]=useState(true),[comparePosition,setComparePosition]=useState(50),[finishing,setFinishing]=useState(false),[baseSrc,setBaseSrc]=useState(src),[restoring,setRestoring]=useState(false),[restored,setRestored]=useState(false),[restoreError,setRestoreError]=useState(""),[fidelity,setFidelity]=useState(.8),[restoredFaces,setRestoredFaces]=useState(0),[restorationAvailable,setRestorationAvailable]=useState<"checking"|"available"|"unavailable">("checking"),restoredUrlRef=useRef<string|null>(null);
 useEffect(()=>{let active=true;fetch("/api/codeformer",{cache:"no-store"}).then(response=>response.json()).then((result:{available?:boolean})=>{if(active)setRestorationAvailable(result.available?"available":"unavailable")}).catch(()=>{if(active)setRestorationAvailable("unavailable")});return()=>{active=false}},[]);
 useEffect(()=>()=>{if(restoredUrlRef.current)URL.revokeObjectURL(restoredUrlRef.current)},[]);
 useEffect(()=>{let active=true;prepareEnhancementAssets(baseSrc).then(result=>{if(!active)return;setAssets(result);setPrepared(true);if(!result.personMask)setSettings(current=>({...current,background:"original"}))}).catch(()=>{if(active){setAssets({face:null,faces:[],personMask:null,pose:null});setPrepared(true)}});return()=>{active=false}},[baseSrc]);
 useEffect(()=>{if(!enabled||!prepared||!assets)return;let active=true;const timer=window.setTimeout(()=>{if(!active)return;setRendering(true);renderProfessionalPhoto(baseSrc,settings,assets,true,targetAspect).then(result=>{if(active)setPreview(result.dataUrl)}).catch(()=>{if(active)setPreview(baseSrc)}).finally(()=>{if(active)setRendering(false)})},160);return()=>{active=false;window.clearTimeout(timer)}},[enabled,prepared,assets,settings,baseSrc,targetAspect]);
 const update=(key:keyof EnhanceSettings,value:number)=>setSettings(current=>({...current,[key]:value}));
 const restoreWithCodeFormer=async()=>{if(restoring||restorationAvailable!=="available")return;setRestoring(true);setRestoreError("");try{const source=await fetch(src).then(response=>response.blob()),response=await fetch(`/api/codeformer?fidelity=${fidelity.toFixed(2)}&upscale=2`,{method:"POST",headers:{"Content-Type":source.type||"image/png"},body:source});if(!response.ok){const result=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(result?.error||"CodeFormer could not restore this photo.")}const resultUrl=URL.createObjectURL(await response.blob());if(restoredUrlRef.current)URL.revokeObjectURL(restoredUrlRef.current);restoredUrlRef.current=resultUrl;setPrepared(false);setRendering(true);setRestoredFaces(Number(response.headers.get("x-codeformer-faces")??0));setRestored(true);setBaseSrc(resultUrl);setPreview(resultUrl)}catch(error){setRestoreError(error instanceof Error?error.message:"CodeFormer could not restore this photo.")}finally{setRestoring(false)}};
 const finish=async()=>{if(finishing)return;setFinishing(true);try{if(enabled&&assets){const result=await renderProfessionalPhoto(baseSrc,settings,assets,false,targetAspect);await onContinue(result.dataUrl,true,{width:result.width,height:result.height})}else{const image=await loadImage(baseSrc);await onContinue(baseSrc,restored,{width:image.naturalWidth,height:image.naturalHeight})}}finally{setFinishing(false)}};
 const busy=restoring||(enabled&&rendering),afterSrc=enabled?preview:baseSrc,afterLabel=restoring?"AI RESTORING…":!prepared?"ANALYSING…":busy?"UPDATING…":restored?"AI RESTORED":"PROFESSIONAL",activePreset=enhancePresets.find(preset=>preset.settings.skin===settings.skin&&preset.settings.light===settings.light&&preset.settings.definition===settings.definition&&preset.settings.background===settings.background)?.name,subjectCopy=!prepared?"Finding subject…":assets?.personMask?"Subject isolated":"Original background only",faceCopy=!prepared?"Finding face…":assets?.face?"Face-aware retouch ready":"Global adjustments only";
 return <main className="enhance-editor">
  <header className="enhance-header"><button type="button" className="enhance-back" onClick={onBack}><ArrowLeft size={18}/> Back</button><div><span className="eyebrow">POST-CAPTURE</span><b>Professional pipeline</b></div><span className="enhance-local"><ShieldCheck size={15}/>{restored?" Secure AI restore + local edits":" Private · on device"}</span></header>
  <div className="enhance-layout">
   <section className="enhance-preview-panel"><div className="enhance-preview"><img src={afterSrc} alt="Professionally enhanced portrait" width={960} height={1200}/><img className="compare-original-image" src={src} alt="" aria-hidden="true" width={960} height={1200} style={{clipPath:`inset(0 ${100-comparePosition}% 0 0)`}}/><span className="enhance-preview-label original">ORIGINAL</span><span className="enhance-preview-label active after">{afterLabel}</span><div className="compare-divider" aria-hidden="true" style={{left:`${comparePosition}%`}}><span>↔</span></div><input className="compare-slider" type="range" min="0" max="100" step="1" value={comparePosition} onChange={event=>setComparePosition(Number(event.target.value))} aria-label="Compare original and enhanced photo" aria-valuetext={`${comparePosition}% original photo visible`}/></div><p className="compare-instruction">Drag across the photo to compare original and enhanced</p><div className="enhance-pipeline" aria-label="Enhancement pipeline" aria-live="polite"><span className={prepared?"done":"active"}><i>{prepared?<Check size={13}/>:"1"}</i><b>Subject</b></span><span className={prepared&&!busy?"done":prepared?"active":""}><i>{prepared&&!busy?<Check size={13}/>:"2"}</i><b>Background</b></span><span className={prepared&&!busy?"done":""}><i>{prepared&&!busy?<Check size={13}/>:"3"}</i><b>Relight</b></span><span className={prepared&&!busy?"done":""}><i>{prepared&&!busy?<Check size={13}/>:"4"}</i><b>Retouch</b></span><span className={prepared&&!busy?"done":""}><i>{prepared&&!busy?<Check size={13}/>:"5"}</i><b>Export</b></span></div><div className="enhance-trust"><ScanFace size={17}/><span><b>{subjectCopy} · {faceCopy}</b><small>{restored?"CodeFormer reconstructs missing facial detail; compare identity before use.":"Local edits preserve the original facial structure."}</small></span></div></section>
   <aside className="enhance-controls"><div className="enhance-title"><span><Sparkles size={18}/></span><div><h1>Professional, still natural.</h1><p>Restore blur, clean the scene and prepare a crisp profile-ready export.</p></div></div><section className={`codeformer-card ${restored?"restored":""}`} aria-labelledby="codeformer-title"><div className="codeformer-heading"><span><ScanFace size={17}/></span><div><b id="codeformer-title">Neural blur restoration</b><small>CodeFormer face recovery + Real-ESRGAN image upscale</small></div><i>{restored?"Restored":restorationAvailable==="checking"?"Checking":restorationAvailable==="available"?"Ready":"Service needed"}</i></div><label className="codeformer-fidelity"><span><b>Identity fidelity</b><small>Lower = more reconstruction · Higher = closer identity</small></span><output>{fidelity.toFixed(2)}</output><input type="range" min="0" max="1" step="0.05" value={fidelity} onChange={event=>setFidelity(Number(event.target.value))} disabled={restoring} aria-label="CodeFormer identity fidelity"/></label><button type="button" className="codeformer-action" disabled={restoring||restorationAvailable!=="available"} onClick={()=>void restoreWithCodeFormer()}>{restoring?<><RefreshCw className="spinning" size={16}/> Restoring — this can take a minute</>:restored?<><RefreshCw size={16}/> Restore again</>:<><Sparkles size={16}/> Restore blur with CodeFormer</>}</button><p className={restoreError?"codeformer-error":"codeformer-caption"} role={restoreError?"alert":undefined}>{restoreError||restorationAvailable==="unavailable"?restoreError||"Connect the optional CodeFormer service to enable true AI restoration. Local enhancement still works.":restored?`${restoredFaces} face${restoredFaces===1?"":"s"} restored. Check identity against the original before use.`:"Experimental · sends this photo to your configured private service."}</p><a href="https://github.com/sczhou/CodeFormer/blob/master/LICENSE" target="_blank" rel="noreferrer">S-Lab non-commercial license ↗</a></section><button type="button" className={`enhance-toggle ${enabled?"on":""}`} onClick={()=>setEnabled(value=>!value)} aria-pressed={enabled}><span><b>Local finishing</b><small>{enabled?"Five-stage browser pipeline applied":restored?"AI-restored photo selected":"Original photo selected"}</small></span><i>{enabled?"On":"Off"}</i></button><div className="enhance-presets" aria-label="Enhancement presets">{enhancePresets.map(preset=><button type="button" className={activePreset===preset.name?"active":""} onClick={()=>{setEnabled(true);setSettings(preset.settings)}} aria-pressed={activePreset===preset.name} key={preset.name}>{preset.name}</button>)}</div><fieldset className={`background-options ${enabled?"":"disabled"}`}><legend>Background</legend><div>{backgroundOptions.map(option=><button type="button" className={settings.background===option.id?"active":""} onClick={()=>setSettings(current=>({...current,background:option.id}))} disabled={option.id!=="original"&&prepared&&!assets?.personMask} aria-pressed={settings.background===option.id} key={option.id}><i className={`background-swatch ${option.id}`}/><span><b>{option.label}</b><small>{option.note}</small></span></button>)}</div></fieldset><div className={`enhance-sliders ${enabled?"":"disabled"}`}><EnhanceSlider icon={<ScanFace size={17}/>} label="Face retouch" note="Softens texture, never features" value={settings.skin} max={60} onChange={value=>update("skin",value)}/><EnhanceSlider icon={<SunMedium size={17}/>} label="Adaptive light" note="Balances exposure and adds fill" value={settings.light} max={70} onChange={value=>update("light",value)}/><EnhanceSlider icon={<SlidersHorizontal size={17}/>} label="Definition" note="Adds clean studio contrast" value={settings.definition} max={60} onChange={value=>update("definition",value)}/></div><button type="button" className={`resolution-toggle ${settings.highResolution?"on":""}`} onClick={()=>setSettings(current=>({...current,highResolution:!current.highResolution}))} disabled={!enabled} aria-pressed={settings.highResolution}><span><b>High-resolution export</b><small>Up to 2048px · high-quality resampling</small></span><i>{settings.highResolution?<Check size={14}/>:null}</i></button><div className="enhance-note"><ShieldCheck size={17}/><p><b>{restored?"Private service restore + local finishing":"Private, local finishing"}</b><span>{restored?"The restored result is finished in this browser. The original remains available for comparison.":"The person mask, face check and edits stay in this browser. The original remains unchanged."}</span></p></div><button type="button" className="enhance-continue" disabled={finishing||busy||!prepared} onClick={()=>void finish()}>{finishing?"Exporting high-resolution photo…":enabled?"Use professional version":restored?"Use AI-restored photo":"Use original"}<ArrowRight size={18}/></button></aside>
  </div>
 </main>;
}

function EnhanceSlider({icon,label,note,value,max,onChange}:{icon:React.ReactNode;label:string;note:string;value:number;max:number;onChange:(value:number)=>void}){
 return <label className="enhance-slider"><span className="enhance-slider-icon">{icon}</span><span className="enhance-slider-copy"><b>{label}</b><small>{note}</small></span><output>{value}</output><input type="range" min="0" max={max} value={value} onChange={event=>onChange(Number(event.target.value))} aria-label={label}/></label>;
}

async function assess(src:string,targetAspect=.8):Promise<Assessment>{
 return evaluatePhoto(src,targetAspect);
}
async function normalizePhoto(src:string){const img=await loadImage(src),max=1600,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas"),ctx=c.getContext("2d");c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);if(!ctx)return src;ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.88)}

export default function Studio(){
 const [view,setView]=useState<View>("profile"),[reviewRequestId,setReviewRequestId]=useState(""),[toast,setToast]=useState(""),[count,setCount]=useState<number|null>(null),[cameraStatus,setCameraStatus]=useState<"idle"|"starting"|"live"|"error">("idle"),[cameraError,setCameraError]=useState(""),[photo,setPhoto]=useState<string>(""),[original,setOriginal]=useState<string>(""),[dimensions,setDimensions]=useState({width:0,height:0}),[assessment,setAssessment]=useState<Assessment|null>(null),[checking,setChecking]=useState(false),[enhanced,setEnhanced]=useState(false),[profileOK,setProfileOK]=useState(true),[brandOK,setBrandOK]=useState(true),[gallery,setGallery]=useState<Photo[]>(readGallery);
 const [scanStatus,setScanStatus]=useState<"idle"|"starting"|"live"|"error">("idle"),[scanError,setScanError]=useState(""),[sessionCode,setSessionCode]=useState(""),[sessionAgent,setSessionAgent]=useState<SessionAgent|null>(null),[resetConfirm,setResetConfirm]=useState(false),[deletePhotoId,setDeletePhotoId]=useState<string|null>(null);
 const [cameraDevices,setCameraDevices]=useState<CameraDevice[]>([]),[selectedCameraId,setSelectedCameraId]=useState(""),[discoveringCameras,setDiscoveringCameras]=useState(false),[printSize,setPrintSize]=useState<PrintSize>("auto");
 const [shotCount,setShotCount]=useState<1|2|3|5>(1),[cropFormat,setCropFormat]=useState<"portrait"|"square">("portrait"),[shooting,setShooting]=useState(false),[timer,setTimer]=useState<number|null>(null),[capturePreview,setCapturePreview]=useState(""),[captureRating,setCaptureRating]=useState<PhotoRating|null>(null),[shots,setShots]=useState<CapturedShot[]>([]),[selectedShotId,setSelectedShotId]=useState(""),[enhanceBackView,setEnhanceBackView]=useState<"review"|"batch">("review"),[placement,setPlacement]=useState<"checking"|"ready"|"close"|"far"|"center">("checking"),[,setFaceBox]=useState<{x:number;y:number;width:number;height:number}|null>(null);
 const videoRef=useRef<HTMLVideoElement>(null),cameraViewportRef=useRef<HTMLDivElement>(null),headGuideRef=useRef<HTMLDivElement>(null),sourceFaceRef=useRef<{x:number;y:number;width:number;height:number}|null>(null),scannerVideoRef=useRef<HTMLVideoElement>(null),scannerControlsRef=useRef<IScannerControls|null>(null),scannerStreamRef=useRef<MediaStream|null>(null),scannerRunRef=useRef(0),streamRef=useRef<MediaStream|null>(null),fileRef=useRef<HTMLInputElement>(null),placementRef=useRef(placement),shootingRef=useRef(false),captureRunRef=useRef(0),autoReadyRef=useRef<number|null>(null);
 useEffect(()=>{placementRef.current=placement},[placement]);
 useEffect(()=>{shootingRef.current=shooting},[shooting]);
 useEffect(()=>{try{localStorage.setItem("ps-gallery",JSON.stringify(gallery.slice(0,6)))}catch{/* Storage may be unavailable in private browsing. */}},[gallery]);
 useEffect(()=>()=>streamRef.current?.getTracks().forEach(t=>t.stop()),[]);
 useEffect(()=>()=>{scannerRunRef.current+=1;scannerControlsRef.current?.stop();scannerStreamRef.current?.getTracks().forEach(track=>track.stop())},[]);
 useEffect(()=>{if(view!=="capture"||cameraStatus!=="live")return;let cancelled=false,detector:{detectForVideo:(video:HTMLVideoElement,time:number)=>{detections:Array<{boundingBox?:{originX:number;originY:number;width:number;height:number}}>} ;close:()=>void}|null=null,lastCheck=0,frame=0;const clearFace=()=>{sourceFaceRef.current=null;setFaceBox(null)};const run=async()=>{try{const vision=await import("@mediapipe/tasks-vision"),files=await vision.FilesetResolver.forVisionTasks("/mediapipe");detector=await vision.FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:"/blaze_face_short_range.tflite"},runningMode:"VIDEO",minDetectionConfidence:.5});if(cancelled){detector.close();return}const check=(time:number)=>{if(cancelled)return;frame=requestAnimationFrame(check);if(time-lastCheck<140)return;lastCheck=time;const video=videoRef.current,viewport=cameraViewportRef.current,guide=headGuideRef.current;if(!video||!viewport||!guide||video.readyState<2)return;try{const detections=detector?.detectForVideo(video,time).detections??[];if(detections.length!==1||!detections[0].boundingBox){clearFace();setPlacement("center");return}const box=detections[0].boundingBox,vw=video.videoWidth,vh=video.videoHeight,vr=viewport.getBoundingClientRect(),gr=guide.getBoundingClientRect(),videoAspect=vw/vh,viewAspect=vr.width/vr.height;let rw=vr.width,rh=vr.height,ox=0,oy=0;if(videoAspect>viewAspect){rh=rw/videoAspect;oy=(vr.height-rh)/2}else{rw=rh*videoAspect;ox=(vr.width-rw)/2}const source={x:box.originX/vw,y:box.originY/vh,width:box.width/vw,height:box.height/vh},displayX=ox+(1-source.x-source.width)*rw,displayY=oy+source.y*rh,displayWidth=source.width*rw,displayHeight=source.height*rh,faceCenterX=vr.left+displayX+displayWidth/2,faceCenterY=vr.top+displayY+displayHeight/2,guideCenterX=gr.left+gr.width/2,guideCenterY=gr.top+gr.height/2,dx=Math.abs(faceCenterX-guideCenterX)/(gr.width/2),dy=Math.abs(faceCenterY-guideCenterY)/(gr.height/2),size=displayHeight/gr.height;sourceFaceRef.current=source;setFaceBox({x:displayX/vr.width,y:displayY/vr.height,width:displayWidth/vr.width,height:displayHeight/vr.height});if(size>1.08)setPlacement("close");else if(size<.36)setPlacement("far");else if(dx>.68||dy>.68)setPlacement("center");else setPlacement("ready")}catch{clearFace();setPlacement("checking")}};frame=requestAnimationFrame(check)}catch{if(!cancelled){clearFace();setPlacement("checking")}}};void run();return()=>{cancelled=true;cancelAnimationFrame(frame);detector?.close();sourceFaceRef.current=null}},[view,cameraStatus]);
 useEffect(()=>{const syncView=()=>{const params=new URLSearchParams(location.search),raw=params.get("view"),requested=(raw==="brand"?"personal":raw) as View|null;if(requested&&navigableViews.has(requested))setView(requested);else if(!params.get("session"))setView("profile")};syncView();addEventListener("popstate",syncView);return()=>removeEventListener("popstate",syncView)},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(!resetConfirm&&!deletePhotoId)return;const close=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;setResetConfirm(false);setDeletePhotoId(null)};addEventListener("keydown",close);return()=>removeEventListener("keydown",close)},[deletePhotoId,resetConfirm]);
 useEffect(()=>{document.getElementById("app-content")?.scrollTo({top:0,behavior:"auto"});window.scrollTo({top:0,behavior:"auto"})},[view]);
 useEffect(()=>{const devices=navigator.mediaDevices;if(!devices?.enumerateDevices)return;const sync=async()=>{try{const cameras=(await devices.enumerateDevices()).filter(device=>device.kind==="videoinput").map((device,index)=>({deviceId:device.deviceId,label:device.label||`Camera ${index+1}`}));setCameraDevices(cameras);setSelectedCameraId(current=>current&&cameras.some(camera=>camera.deviceId===current)?current:cameras[0]?.deviceId??"")}catch{/* Device discovery is also retried from the Studio screen. */}};void sync();devices.addEventListener?.("devicechange",sync);return()=>devices.removeEventListener?.("devicechange",sync)},[]);
 const stopScanner=()=>{scannerRunRef.current+=1;scannerControlsRef.current?.stop();scannerControlsRef.current=null;scannerStreamRef.current?.getTracks().forEach(track=>track.stop());scannerStreamRef.current=null;if(scannerVideoRef.current)scannerVideoRef.current.srcObject=null};
 const go=(v:View)=>{if(v!=="capture")stopCamera();if(v!=="profile")stopScanner();setView(v);if(navigableViews.has(v)){const next=v==="profile"?"/":`/?view=${v}`;history.pushState({view:v},"",next)}document.getElementById("app-content")?.scrollTo({top:0,behavior:"smooth"});window.scrollTo({top:0,behavior:"smooth"})};
 const loadStudioSession=async(raw:string)=>{let code=raw.trim();try{const parsed=new URL(code);code=parsed.searchParams.get("session")||code}catch{/* Plain appointment codes are expected here. */}code=decodeURIComponent(code);setScanError("");try{let data:SessionAgent|null=null;const saved=localStorage.getItem(`photostudio-session:${code}`);if(saved)data=JSON.parse(saved);if(!data){const response=await fetch(`/api/studio-sessions?session=${encodeURIComponent(code)}`,{cache:"no-store"});if(!response.ok)throw new Error("Appointment not found");data=await response.json()}stopScanner();setSessionAgent(data);setSessionCode(code);setScanStatus("idle");setView("session");history.replaceState({},"",`/?session=${encodeURIComponent(code)}`);setToast(`${data.agentName} loaded`)}catch{stopScanner();setScanError("Appointment not found. Book in Atlas, then scan the new QR or enter its code.");setScanStatus("error")}};
 useEffect(()=>{const code=new URLSearchParams(location.search).get("session");if(!code)return;const timer=window.setTimeout(()=>void loadStudioSession(code),0);return()=>window.clearTimeout(timer)},[]);
 const startScanner=async()=>{if(scanStatus==="starting")return;stopScanner();const runId=scannerRunRef.current,setError=(message:string)=>{if(scannerRunRef.current!==runId)return;stopScanner();setScanStatus("error");setScanError(message)};setScanStatus("starting");setScanError("");let timedOut=false,timeoutId=0;try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera access is not supported in this browser.");const video=scannerVideoRef.current;if(!video)throw new Error("The QR preview is not ready. Try again.");const {BrowserQRCodeReader}=await import("@zxing/browser");if(scannerRunRef.current!==runId)return;const request=navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});request.then(stream=>{if(timedOut||scannerRunRef.current!==runId)stream.getTracks().forEach(track=>track.stop())}).catch(()=>{});const timeout=new Promise<never>((_,reject)=>{timeoutId=window.setTimeout(()=>{timedOut=true;reject(new Error("Camera permission timed out. Check the browser camera icon, then try again."))},10000)}),stream=await Promise.race([request,timeout]);window.clearTimeout(timeoutId);if(scannerRunRef.current!==runId){stream.getTracks().forEach(track=>track.stop());return}scannerStreamRef.current=stream;let found=false;const reader=new BrowserQRCodeReader(undefined,{delayBetweenScanAttempts:120,delayBetweenScanSuccess:800}),controls=await reader.decodeFromStream(stream,video,result=>{if(!result||found||scannerRunRef.current!==runId)return;found=true;stopScanner();setScanStatus("starting");void loadStudioSession(result.getText())});if(scannerRunRef.current!==runId){controls.stop();return}scannerControlsRef.current=controls;setScanStatus("live")}catch(e){window.clearTimeout(timeoutId);const error=e instanceof Error?e:null;if(error?.name==="NotAllowedError"||error?.name==="SecurityError")setError("Camera permission is off. Allow access in your browser, then try again.");else if(error?.name==="NotFoundError"||error?.name==="OverconstrainedError")setError("No camera was found. Connect or enable a camera, then try again.");else if(error?.name==="NotReadableError"||error?.name==="AbortError")setError("The camera is busy. Close other camera apps, then try again.");else setError(error?.message||"The QR camera could not start. Enter the appointment code below.")}};
 const stopCamera=()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCameraStatus(s=>s==="error"?s:"idle")};
 const syncCameraDevices=async()=>{if(!navigator.mediaDevices?.enumerateDevices)return[];const cameras=(await navigator.mediaDevices.enumerateDevices()).filter(device=>device.kind==="videoinput").map((device,index)=>({deviceId:device.deviceId,label:device.label||`Camera ${index+1}`}));setCameraDevices(cameras);setSelectedCameraId(current=>current&&cameras.some(camera=>camera.deviceId===current)?current:cameras[0]?.deviceId??"");return cameras};
 const discoverCameras=async()=>{setDiscoveringCameras(true);setCameraError("");try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera access is not supported in this browser.");if(!streamRef.current){const permissionStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});permissionStream.getTracks().forEach(track=>track.stop())}const cameras=await syncCameraDevices();setToast(cameras.length?`${cameras.length} camera${cameras.length===1?"":"s"} found`:"No cameras found. Connect one, then refresh.")}catch(e){setCameraError(e instanceof Error&&e.name==="NotAllowedError"?"Camera permission is off. Allow access, then find cameras again.":e instanceof Error?e.message:"Cameras could not be detected.")}finally{setDiscoveringCameras(false)}};
 const startCamera=async(deviceId=selectedCameraId)=>{setCameraStatus("starting");setCameraError("");stopCamera();let timedOut=false,timeoutId=0;try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera access is not supported in this browser.");const video:MediaTrackConstraints=deviceId?{deviceId:{exact:deviceId},width:{ideal:1920},height:{ideal:1080}}:{facingMode:"user",width:{ideal:1920},height:{ideal:1080}};const request=navigator.mediaDevices.getUserMedia({video,audio:false});request.then(s=>{if(timedOut)s.getTracks().forEach(t=>t.stop())}).catch(()=>{});const timeout=new Promise<never>((_,reject)=>{timeoutId=window.setTimeout(()=>{timedOut=true;reject(new Error("Camera permission timed out. Check the browser camera icon, allow access, then try again."))},10000)});const stream=await Promise.race([request,timeout]);window.clearTimeout(timeoutId);streamRef.current=stream;const activeId=stream.getVideoTracks()[0]?.getSettings().deviceId;if(activeId)setSelectedCameraId(activeId);if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}await syncCameraDevices();setCameraStatus("live")}catch(e){window.clearTimeout(timeoutId);setCameraStatus("error");setCameraError(e instanceof Error&&e.name==="NotAllowedError"?"Camera permission is off. Allow camera access in your browser, then try again.":e instanceof Error&&e.name==="OverconstrainedError"?"That camera is no longer available. Refresh the camera list and choose another.":e instanceof Error?e.message:"Camera could not start.")}};
 const reviewPhoto=async(src:string)=>{setChecking(true);try{const img=await loadImage(src);setDimensions({width:img.naturalWidth,height:img.naturalHeight});const normalized=await normalizePhoto(src);setPhoto(normalized);setOriginal(normalized);const result=await assess(normalized);setAssessment(result);setView("review")}catch{setToast("This image could not be opened. Choose a JPG, PNG or WebP file.")}finally{setChecking(false)}};
 const upload=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;if(!file.type.startsWith("image/")){setToast("Choose an image file: JPG, PNG or WebP.");return}if(file.size>12*1024*1024){setToast("Choose a photo smaller than 12 MB.");return}const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"&&reviewPhoto(reader.result);reader.onerror=()=>setToast("The file could not be read. Try another photo.");reader.readAsDataURL(file)};
 const takePhoto=()=>{if(cameraStatus!=="live"||!videoRef.current){startCamera();return}setCount(3);let n=3;const timer=setInterval(()=>{n-=1;setCount(n);if(n>0)return;clearInterval(timer);const v=videoRef.current!;const c=document.createElement("canvas");c.width=v.videoWidth||960;c.height=v.videoHeight||960;c.getContext("2d")?.drawImage(v,0,0,c.width,c.height);const src=c.toDataURL("image/jpeg",.9);stopCamera();setCount(null);reviewPhoto(src)},700)};
 const waitCountdown=async(seconds:number,runId:number)=>{for(let value=seconds;value>0;value-=.1){if(placementRef.current!=="ready"||captureRunRef.current!==runId)return false;setTimer(Math.max(0,Math.round(value*10)/10));await new Promise(r=>setTimeout(r,100))}return captureRunRef.current===runId};
 const captureCurrent=()=>{const v=videoRef.current!,c=document.createElement("canvas"),ctx=c.getContext("2d")!,vw=v.videoWidth||1280,vh=v.videoHeight||720,target=cropFormat==="square"?1:.8;let sx=0,sy=0,sw=vw,sh=vh;if(vw/vh>target){sw=vh*target;sx=(vw-sw)/2}else{sh=vw/target;sy=(vh-sh)/2}c.width=960;c.height=cropFormat==="square"?960:1200;ctx.save();ctx.translate(c.width,0);ctx.scale(-1,1);ctx.drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);ctx.restore();return c.toDataURL("image/jpeg",.92)};
 const shootSequence=async()=>{if(cameraStatus!=="live"||shootingRef.current||placementRef.current!=="ready")return;const runId=++captureRunRef.current;setShooting(true);setShots([]);setSelectedShotId("");const next=[] as CapturedShot[];for(let i=0;i<shotCount;i++){const held=await waitCountdown(5,runId);if(!held||placementRef.current!=="ready"){setTimer(null);setCapturePreview("");setCaptureRating(null);setShooting(false);return}setTimer(null);const captured=captureCurrent(),rating=await evaluatePhoto(captured,cropFormat==="square"?1:.8).catch(()=>({...emptyPhotoRating,label:"Rating unavailable"}));if(captureRunRef.current!==runId){setShooting(false);return}const shot={id:crypto.randomUUID(),original:captured,rating};next.push(shot);setShots([...next]);setCapturePreview(captured);setCaptureRating(rating);await new Promise(resolve=>setTimeout(resolve,1400));setCapturePreview("");setCaptureRating(null);if(captureRunRef.current!==runId){setShooting(false);return}}const best=next.reduce((current,shot)=>shot.rating.score>current.rating.score?shot:current,next[0]);if(best)setSelectedShotId(best.id);setShooting(false);stopCamera();setView("batch")};
 const cancelAutoCapture=()=>{captureRunRef.current+=1;placementRef.current="checking";shootingRef.current=false;setTimer(null);setCapturePreview("");setCaptureRating(null);setShooting(false)};
 const closeGuidedCamera=()=>{cancelAutoCapture();sourceFaceRef.current=null;setFaceBox(null);stopCamera();if(sessionAgent)setView("session");else go("personal")};
 const selectCropFormat=(format:"portrait"|"square")=>{if(format===cropFormat)return;cancelAutoCapture();setCropFormat(format)};
 const removeShot=(id:string)=>{const remaining=shots.filter(shot=>shot.id!==id);setShots(remaining);if(selectedShotId===id)setSelectedShotId(remaining[0]?.id??"")};
 const continueWithSelectedShot=()=>{const selected=shots.find(shot=>shot.id===selectedShotId)??shots[0];if(!selected)return;setDimensions({width:960,height:cropFormat==="square"?960:1200});setPhoto(selected.original);setOriginal(selected.original);setEnhanceBackView("batch");setView("select")};
 useEffect(()=>{if(view!=="capture"||cameraStatus!=="live"||placement!=="ready"||shooting){if(autoReadyRef.current){window.clearTimeout(autoReadyRef.current);autoReadyRef.current=null}return}autoReadyRef.current=window.setTimeout(()=>{autoReadyRef.current=null;void shootSequence()},700);return()=>{if(autoReadyRef.current){window.clearTimeout(autoReadyRef.current);autoReadyRef.current=null}}},[view,cameraStatus,placement,shooting]);
 const openGuidedCamera=()=>{setView("capture");setTimeout(()=>startCamera(),80)};
 const addPhoto=()=>openGuidedCamera();
 const exitLoadedSession=()=>{setSessionAgent(null);setSessionCode("");setScanError("");setView("profile");history.replaceState({},"","/");window.scrollTo({top:0,behavior:"smooth"})};
 const confirm=()=>{const finalUrl=photo||original;if(!assessment||(!isPhotoApproved(assessment)&&!reviewRequestId)){setToast("Improve the photo until it reaches the approval standard.");return}const item:Photo={id:crypto.randomUUID(),dataUrl:finalUrl,createdAt:new Date().toISOString(),category:"atlas",enhanced,profileOK,brandOK:brandOK&&isPhotoApproved(assessment),rating:assessment,agentName:sessionAgent?.agentName||demoAgent.agentName,agentId:sessionAgent?.agentId||demoAgent.agentId,agentMobile:sessionAgent?.agentMobile||demoAgent.agentMobile,agentRenTag:sessionAgent?.agentRenTag||demoAgent.agentRenTag,agentOfficePhone:sessionAgent?.agentOfficePhone||demoAgent.agentOfficePhone,...dimensions};setGallery(g=>[item,...g.filter(x=>x.dataUrl!==finalUrl)].slice(0,6));setView("success")};
 const download=(src:string,name="studio-professional-portrait.jpg")=>{const a=document.createElement("a");a.href=src;a.download=name;document.body.appendChild(a);a.click();a.remove();setToast("Photo downloaded")};
 const printPhoto=(src:string)=>{const w=window.open("","_blank","noopener,noreferrer");if(!w){setToast("Allow pop-ups to open the print page.");return}const pageSize={auto:"auto", "4x6":"4in 6in",a4:"A4",letter:"letter"}[printSize];w.document.write(`<title>Print Studio+ Portrait</title><style>@page{size:${pageSize};margin:0}*{box-sizing:border-box}body{margin:0;display:grid;place-items:center;min-height:100vh;background:#eee}img{display:block;max-width:100%;max-height:100vh;object-fit:contain}@media print{html,body{width:100%;height:100%;background:#fff}img{width:100%;height:100%;object-fit:contain}}</style><img src="${src}" onload="setTimeout(()=>print(),120)" alt="Studio+ portrait">`);w.document.close();setToast("Choose any installed printer in the system dialog")};
 const setPhotoCategory=(id:string,category:PhotoCategory)=>{setGallery(current=>current.map(item=>item.id===id?{...item,category}:item));setToast(category==="awards"?"Marked for awards night":"Marked as the Atlas photo")};
 const removePhoto=()=>{if(!deletePhotoId)return;setGallery(current=>current.filter(item=>item.id!==deletePhotoId));setDeletePhotoId(null);setToast("Photo removed")};
 const reset=()=>{stopCamera();stopScanner();setPhoto("");setOriginal("");setAssessment(null);setEnhanced(false);setProfileOK(true);setBrandOK(true);setGallery([]);setSessionAgent(null);setSessionCode("");setResetConfirm(false);setDeletePhotoId(null);localStorage.removeItem("ps-gallery");setView("profile");history.replaceState({},"","/");setToast("Session reset")};
 const cameraAgent=sessionAgent??demoAgent,qualityApproved=assessment?isPhotoApproved(assessment):false,savable=qualityApproved||Boolean(reviewRequestId);
 if(view==="session"&&sessionAgent)return <SessionProfile agent={sessionAgent} code={sessionCode} onStart={openGuidedCamera} onExit={exitLoadedSession}/>;
 if(view==="review"&&assessment&&photo)return <UploadedPhotoCheck key={photo} src={photo} dimensions={dimensions} assessment={assessment} agent={cameraAgent} onContinue={format=>{setCropFormat(format);setEnhanceBackView("review");setView("select")}} onRetake={openGuidedCamera} onExit={()=>go("personal")} onUpload={upload}/>;
 if(view==="select"&&original)return <StudioEnhanceEditor key={original} src={original} targetAspect={cropFormat==="square"?1:.8} onBack={()=>setView(enhanceBackView)} onContinue={async(result,usedEnhancement,nextDimensions)=>{setPhoto(result);setDimensions(nextDimensions);setEnhanced(usedEnhancement);try{setAssessment(await assess(result,cropFormat==="square"?1:.8))}catch{setAssessment({...emptyPhotoRating,label:"Rating unavailable",recommendation:"Try exporting the photo again."})}setView("consent")}}/>;
 if(view==="capture"){const placementCopy={checking:"Detecting your face…",ready:capturePreview?`Photo ${shots.length} captured`:shooting?"Hold that pose":"Ready · hold for 5 seconds",close:"Take one small step back",far:"Move a little closer",center:"Move your face into the oval"}[placement],poseInstruction={checking:"Face the camera so we can guide you.",ready:"Look at the lens, relax your shoulders and keep your chin level.",close:"Step back until your head and shoulders fit inside the guide.",far:"Move closer until your face fills the oval.",center:"Move gently until your eyes and face sit inside the guide."}[placement],readinessScore={checking:35,ready:92,close:58,far:60,center:68}[placement],readinessTone=readinessScore>=85?"good":readinessScore>=60?"fair":"low";return <main className={`studio-camera placement-${placement} crop-${cropFormat}`}><div className="camera-workspace"><div className="camera-top"><button type="button" className="camera-close" onClick={closeGuidedCamera} aria-label="Close camera"><span aria-hidden="true">×</span></button><div><span>{cameraAgent.agentName}</span><small>Guided auto capture</small></div><b>{shots.length}/{shotCount}</b></div><div ref={cameraViewportRef} className="camera-viewport"><video ref={videoRef} autoPlay muted playsInline/><div className={`live-pose-card ${readinessTone}`} aria-live="polite"><div><span>Camera readiness</span><strong>{readinessScore}<small>/100</small></strong></div><i><b style={{width:`${readinessScore}%`}}/></i><p>{poseInstruction}</p><small>Framing and distance only</small></div><div className="camera-stage"><div className="ratio-label">{cropFormat==="square"?"1:1 SQUARE":"4:5 PORTRAIT"}</div><div className="crop-corners"><i/><i/><i/><i/></div><div ref={headGuideRef} className="head-guide"/><div className="waist-guide"><span>SHOULDERS</span></div></div>{timer!==null?<div className="studio-timer"><div className="countdown-pulse"><strong>{Math.max(1,Math.ceil(timer))}</strong></div></div>:null}{capturePreview?<><div className="camera-flash"/><div className="shot-preview"><div className={`shot-preview-frame ${cropFormat}`}><img src={capturePreview} alt={`Properly cropped capture ${shots.length} preview`} width={cropFormat==="square"?960:768} height={960}/><span className="preview-crop-label">{cropFormat==="square"?"1:1 crop":"4:5 crop"}</span></div>{captureRating?<CameraRating rating={captureRating}/>:null}<span className="shot-confirmation"><Check size={16}/> Photo {shots.length} captured</span></div></>:null}</div><div className={`placement-status ${placement}`}><i>{placement==="ready"?<Check size={17}/>:<ScanLine size={17}/>}</i><span>{placementCopy}</span></div><div className="camera-controls"><div className="format-options" aria-label="Photo crop"><button type="button" className={cropFormat==="portrait"?"active":""} onClick={()=>selectCropFormat("portrait")} aria-pressed={cropFormat==="portrait"}>4:5 Portrait</button><button type="button" className={cropFormat==="square"?"active":""} onClick={()=>selectCropFormat("square")} aria-pressed={cropFormat==="square"}>1:1 Square</button></div><div className="shot-options"><span>Photos</span>{([1,2,3,5] as const).map(n=><button type="button" className={shotCount===n?"active":""} onClick={()=>setShotCount(n)} disabled={shooting} aria-pressed={shotCount===n} key={n}>{n}</button>)}</div><div className="auto-capture"><Check size={16}/><span>Auto capture</span><small>5s steady pose</small></div></div></div>{cameraStatus!=="live"?<div className="camera-loading">{cameraStatus==="error"?<><span>{cameraError}</span><button type="button" onClick={()=>go("console")}>Back to Studio</button></>:"Starting camera…"}</div>:null}</main>}
 if(view==="batch")return <main className={`batch-review batch-${cropFormat}`}><header><div><span className="eyebrow">CAPTURE REVIEW</span><h1>Select photo</h1><p>{shots.length===1?"Review the crop and rating before continuing.":"The highest-rated photo is selected. Compare the crops and choose your favourite."}</p></div><button type="button" className="take-more" onClick={openGuidedCamera}><Camera size={18}/> Add photos</button></header><div className="batch-grid" role="list">{shots.map((shot,index)=>{const selected=selectedShotId===shot.id;return <article className={selected?"selected":""} key={shot.id} role="listitem"><button type="button" className="photo-choice" onClick={()=>setSelectedShotId(shot.id)} aria-pressed={selected}><img src={shot.original} alt={`Properly cropped capture ${index+1}`} width={cropFormat==="square"?960:768} height={960}/><span className="batch-crop-label">{cropFormat==="square"?"1:1 crop":"4:5 crop"}</span><CameraRating rating={shot.rating} compact/>{selected?<span className="selected-mark"><Check size={17}/> Selected</span>:null}</button><div className="photo-meta"><span><b>Photo {index+1}</b><small>{cropFormat==="square"?"1:1 square":"4:5 portrait"} · Ready for enhancement</small></span><button type="button" className="remove-shot" onClick={()=>removeShot(shot.id)} aria-label={`Remove photo ${index+1}`}><Trash2 size={17}/></button></div></article>})}</div><footer><span>{shots.length?`${shots.length} cropped photo${shots.length===1?"":"s"}`:"No photos selected"}</span><button type="button" className="primary" disabled={!shots.length} onClick={continueWithSelectedShot}>Continue <ArrowRight size={18}/></button></footer></main>;
 return <main className="app-shell"><a className="skip-link" href="#app-content">Skip to content</a><nav className="app-nav" aria-label="Main navigation"><button type="button" className="app-wordmark" onClick={()=>go("profile")} aria-label="Studio+ home"><b>Studio<sup>+</sup></b></button><div className="app-nav-main">{nav.map(({id,label,icon:NavIcon})=><button type="button" className={view===id?"active":""} onClick={()=>go(id)} aria-current={view===id?"page":undefined} key={id}><span aria-hidden="true"><NavIcon size={22}/></span><b>{label}</b></button>)}</div><div className="rail-actions"><button type="button" className="rail-help" onClick={()=>setToast("Help requested")} aria-label="Request help"><HelpCircle size={18}/><b>Help</b></button><button type="button" className="rail-reset" onClick={()=>setResetConfirm(true)}><RotateCcw size={18}/><b>Reset</b></button></div></nav><div id="app-content" className="app-content">
 {view==="profile"&&<section className="qr-home enter"><div className="qr-intro"><span className="eyebrow">GET STARTED</span><h1>Take a photo or scan QR</h1><p>Start a portrait now, or scan your Atlas appointment QR.</p><div className="qr-main-actions"><button type="button" className="main-photo-action" onClick={openGuidedCamera}><Camera size={18}/> Take a photo</button><Link href="/atlas" prefetch={false}>Open Atlas <ArrowRight size={16}/></Link></div></div><div className={`qr-scanner ${scanStatus}`} aria-busy={scanStatus==="starting"}><video ref={scannerVideoRef} autoPlay muted playsInline/><div className="scan-shade"/><div className="scan-frame"><i/><i/><i/><i/>{scanStatus==="live"?<span role="status">Scanning…</span>:scanStatus==="starting"?<span role="status">Preparing camera…</span>:<QrCode size={54}/>}</div>{scanStatus!=="live"?<button type="button" className="scanner-start" onClick={startScanner} disabled={scanStatus==="starting"}><Camera size={19}/>{scanStatus==="starting"?"Starting camera…":scanStatus==="error"?"Try QR camera again":"Scan QR"}</button>:null}</div><div className="manual-checkin"><div><Keyboard size={19}/><span><b>Enter code</b></span></div><form onSubmit={e=>{e.preventDefault();loadStudioSession(sessionCode)}}><input name="appointment-code" autoComplete="off" spellCheck={false} translate="no" value={sessionCode} onChange={e=>setSessionCode(e.target.value)} placeholder="STUDIO-ATLAS-…" aria-label="Appointment code"/><button type="submit"><ScanLine size={18}/> Load</button></form>{scanError?<p role="alert">{scanError}</p>:null}</div></section>}
 {view==="capture"&&<section className="dark enter"><Step n={1} label="Photo"/><div className="capture"><div><span className="eyebrow pale">PHOTO</span><h1>{cameraStatus==="live"?"Ready":"Add a photo"}</h1><p>{cameraStatus==="live"?"Look at the lens. Hold still.":"Use the camera or upload."}</p><ul><li><span>1</span> One person in frame</li><li><span>2</span> Face the light</li></ul>{cameraError?<div className="camera-error" role="alert">{cameraError}</div>:null}<button type="button" className="gold" disabled={cameraStatus==="starting"||checking} onClick={takePhoto}><Camera size={19}/>{cameraStatus==="live"?"Take photo":cameraStatus==="starting"?"Starting…":cameraStatus==="error"?"Try again":"Start camera"}</button><button type="button" className="upload" onClick={()=>fileRef.current?.click()} disabled={checking}><Upload size={18}/>{checking?"Checking…":"Upload"}</button><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label="Upload portrait photo"/></div><div className={`viewfinder ${cameraStatus==="live"?"has-video":""}`}><div className="vfhead"><span>DEVICE CAMERA</span><span className={cameraStatus==="live"?"live":""}>● {cameraStatus==="live"?"LIVE":"READY"}</span></div><video ref={videoRef} className="camera-video" autoPlay playsInline muted/><div className="person"><i/><b/></div><div className="oval"/><div className="cross x"/><div className="cross y"/><span className="tip">Eyes on line</span><div className="vfmeta"><span>LOCAL</span><span>PRIVATE</span><span>HD</span></div>{count!==null?<div className="count">{count||<Check size={72}/>}</div>:null}</div></div></section>}
 {view==="consent"&&<section className="flow narrow final-review enter"><Step n={4} label="Review"/><span className="eyebrow">FINAL PHOTO PREFLIGHT</span><h1>Review your finished photo</h1><p className="lead">The finished export is checked for marketing readiness and designer usability.</p>{assessment?<div className={`final-quality ${qualityApproved?"approved":"needs-work"} ${assessment.tone}`} role="status"><div className="final-quality-summary"><span>{qualityApproved?<Check size={24}/>:<HelpCircle size={24}/>}</span><strong>{assessment.score}<small>/100</small></strong><div><small>{assessment.status}</small><b>{assessment.label}</b><p>{assessment.recommendation}</p></div></div><div className="final-quality-metrics">{assessment.metrics.map(metric=><span key={metric.name}><small>{metric.name}</small><b>{metric.score}</b></span>)}</div><p className="session-file"><span>File</span> {assessment.file_note}{assessment.file_status==="OK"?"":` · ${assessment.file_reason}`}</p><RatingFeedback rating={assessment} appeal={{agentName:sessionAgent?.agentName||demoAgent.agentName,agentId:sessionAgent?.agentId||demoAgent.agentId,photo:photo||original,onSent:id=>{setReviewRequestId(id);setToast(`Designer review requested · ${id}`)}}}/></div>:null}{savable?<><div className="consents"><label><span><b>Atlas profile</b><small>Set as your profile photo.</small></span><input name="atlas-profile-permission" type="checkbox" aria-label="Allow use on my Atlas profile" checked={profileOK} onChange={e=>setProfileOK(e.target.checked)}/><i/></label><label><span><b>Brand use</b><small>Approve this photo for brand materials.</small></span><input name="brand-materials-permission" type="checkbox" aria-label="Allow use in brand materials" checked={brandOK} onChange={e=>setBrandOK(e.target.checked)}/><i/></label></div><p className="privacy">Photo approval and your permissions stay with this photo.</p></>:<p className="privacy quality-warning">{assessment?.status==="REUPLOAD"?assessment.recommendation:assessment?.status==="REVIEW"?"This photo needs a designer review before brand use.":`This photo needs ${photoApprovalThresholds.review}+ for review or ${photoApprovalThresholds.approved}+ for approval. Use the feedback above before retaking.`}</p>}<div className="final-review-actions"><button type="button" className="review-back" onClick={()=>setView("select")}><ArrowLeft size={17}/>{savable?"Back to edit":"Improve photo"}</button><button type="button" className="primary" disabled={!savable||!profileOK||!photo} onClick={confirm}>{reviewRequestId&&!qualityApproved?"Save pending designer review":"Save approved photo"}</button></div></section>}
 {view==="success"&&<section className="success enter"><div className="tick"><Check size={36}/></div><span className="eyebrow">COMPLETE</span><h1>Photo ready</h1><p>Saved to Photos. {brandOK?"Approved for brand use.":"Profile only."}</p><div className="mini"><PhotoView src={photo}/><div><small>Atlas profile</small><b>{sessionAgent?.agentName||demoAgent.agentName}</b><span>● Updated now</span></div></div><button type="button" className="primary" onClick={()=>go("personal")}>Open Photos <ArrowRight size={18}/></button></section>}
 {view==="personal"&&<section className="gallery photos-page enter"><div className="photos-toolbar"><div className="photos-heading"><h1>Photos</h1><span>{gallery.length} {gallery.length===1?"photo":"photos"}{sessionAgent?` · ${sessionAgent.agentName}`:""}</span></div><div className="photos-actions"><button type="button" className="primary" onClick={()=>fileRef.current?.click()} disabled={checking}><Upload size={18}/>{checking?"Checking…":"Import photo"}</button><button type="button" className="take-photo" onClick={addPhoto}><Camera size={18}/> Take a photo</button></div></div><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label="Import a photo from a camera, phone, or computer"/>{gallery.length?<div className="personal-grid">{gallery.map((item,i)=><article className="photo-card" key={item.id}><PhotoView src={item.dataUrl} badge={item.brandOK?"Approved":i===0?"Profile":undefined}/><div className={`photo-card-category ${categoryOf(item)}`}><span className="photo-category-tag">{categoryOf(item)==="awards"?<Award size={13}/>:<Images size={13}/>}{photoCategories.find(category=>category.id===categoryOf(item))?.label}</span><div className="photo-category-switch" role="group" aria-label={`Photo category for ${item.agentName||"this portrait"}`}>{photoCategories.map(category=><button type="button" key={category.id} className={categoryOf(item)===category.id?"active":""} aria-pressed={categoryOf(item)===category.id} title={category.note} onClick={()=>setPhotoCategory(item.id,category.id)}>{category.label}</button>)}</div></div><div className="photo-card-info"><div><b>{item.agentName||"Aisha Rahman"}</b><span>{item.enhanced?"Enhanced":"Original"} · {item.rating?`${item.rating.score}/100 ${isPhotoApproved(item.rating)?"approved":"needs improvement"}`:item.brandOK?"Brand approved":"Profile only"} · {new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(item.createdAt))}</span></div><div className="photo-actions"><button type="button" onClick={()=>download(item.dataUrl)} aria-label="Download photo" title="Download"><Download size={18}/><span>Download</span></button><button type="button" onClick={()=>printPhoto(item.dataUrl)} aria-label="Print photo" title="Print"><Printer size={18}/><span>Print</span></button><button type="button" className="remove-photo" onClick={()=>setDeletePhotoId(item.id)} aria-label="Remove photo" title="Remove"><Trash2 size={18}/><span>Remove</span></button></div></div></article>)}</div>:<div className="photos-empty"><span><Images size={28}/></span><h2>No photos</h2><p>Import a portrait or take one with the studio camera.</p><div className="photos-actions"><button type="button" className="primary" onClick={()=>fileRef.current?.click()} disabled={checking}><Upload size={18}/>{checking?"Checking…":"Import photo"}</button><button type="button" className="take-photo" onClick={addPhoto}><Camera size={18}/> Take a photo</button></div></div>}</section>}
 {view==="assets"&&<BrandAssetStudio photos={gallery} onOpenPhotos={()=>go("personal")} onToast={setToast}/>}
 {view==="console"&&<section className="console enter"><div className="console-title"><div><span className="eyebrow pale">DEVICE SETUP</span><h1>Connect your studio</h1><p>Choose a camera and print through any printer installed on this device.</p></div><span>● LOCAL &amp; PRIVATE</span></div><div className="devices portable-devices"><article><i><Camera size={34}/></i><small>CAMERA INPUT</small><h2>Any camera</h2><b className={cameraStatus==="error"?"offline":"ready"}>● {cameraStatus==="live"?"Connected":cameraStatus==="error"?"Needs attention":cameraDevices.length?`${cameraDevices.length} found`:"Ready to scan"}</b><p>Webcam, phone webcam, USB camera, or DSLR/mirrorless through webcam mode or a capture card.</p><label className="device-field"><span>Camera</span><select value={selectedCameraId} onChange={event=>setSelectedCameraId(event.target.value)}>{cameraDevices.length?cameraDevices.map(device=><option value={device.deviceId} key={device.deviceId}>{device.label}</option>):<option value="">Default camera</option>}</select></label>{cameraError?<div className="device-error" role="alert">{cameraError}</div>:null}<div className="device-buttons"><button type="button" onClick={()=>void discoverCameras()} disabled={discoveringCameras}><RefreshCw size={17}/>{discoveringCameras?"Finding…":"Find cameras"}</button><button type="button" className="device-primary" onClick={addPhoto}><Camera size={17}/> Use camera</button></div></article><article><i><Printer size={34}/></i><small>PRINT OUTPUT</small><h2>Any printer</h2><b className="ready">● System ready</b><p>USB, Wi-Fi, network, AirPrint, or PDF. Choose the printer and copies in your system print dialog.</p><label className="device-field"><span>Paper preset</span><select value={printSize} onChange={event=>setPrintSize(event.target.value as PrintSize)}><option value="auto">Printer default</option><option value="4x6">4 × 6 in photo</option><option value="a4">A4</option><option value="letter">US Letter</option></select></label><div className="device-buttons"><button type="button" disabled={!gallery[0]} onClick={()=>gallery[0]&&printPhoto(gallery[0].dataUrl)}><Printer size={17}/> Open print dialog</button></div></article></div></section>}
 {toast?<div className="toast" role="status" aria-live="polite"><Check size={18}/> {toast}</div>:null}
 {deletePhotoId?<div className="reset-backdrop"><section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-photo-title" aria-describedby="remove-photo-copy"><button type="button" className="reset-close" onClick={()=>setDeletePhotoId(null)} aria-label="Close remove dialog"><X size={19}/></button><span className="reset-icon delete-icon"><Trash2 size={22}/></span><span className="eyebrow">PHOTO</span><h2 id="remove-photo-title">Remove this photo?</h2><p id="remove-photo-copy">This deletes it from Photos on this device.</p><div className="reset-actions"><button type="button" onClick={()=>setDeletePhotoId(null)}>Keep photo</button><button type="button" className="danger" onClick={removePhoto}>Remove</button></div></section></div>:null}
 {resetConfirm?<div className="reset-backdrop"><section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-copy"><button type="button" className="reset-close" onClick={()=>setResetConfirm(false)} aria-label="Close reset dialog"><X size={19}/></button><span className="reset-icon"><RotateCcw size={22}/></span><span className="eyebrow">RESET</span><h2 id="reset-title">Reset session?</h2><p id="reset-copy">Clears the photo and local gallery.</p><div className="reset-actions"><button type="button" onClick={()=>setResetConfirm(false)}>Keep session</button><button type="button" className="danger" onClick={reset}>Reset</button></div></section></div>:null}
 </div></main>
}
```

### `app/brand-assets.tsx`

```tsx
"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {Award, Check, CreditCard, Eye, Images, Layers3, LayoutTemplate, Printer, ShieldCheck, Truck, WandSparkles, X} from "lucide-react";
import {mockAgent} from "./mock-agent";
import {createOrderId, deliveryOptions, formatMYR, paymentMethods, printSizes, recordPrintOrder, type PrintOrder} from "./print-orders";

export type BrandAssetPhoto={id:string;dataUrl:string;category?:"atlas"|"awards";agentName?:string;agentId?:string;agentMobile?:string;agentRenTag?:string;agentOfficePhone?:string};
type Template="subsale"|"awards";
type SubsaleDetails={name:string;mobile:string;ren:string;officePhone:string};
// Demo fallback: portraits taken without an Atlas appointment carry the mock agent, so the banner uses these sample details.
const showAwardsTemplate=false; // the awards night mockup is parked until its layout is ready; the subsale board is the only template on offer
const mockAtlasDetails={name:mockAgent.agentName.toUpperCase(),mobile:mockAgent.agentMobile,ren:mockAgent.agentRenTag,officePhone:mockAgent.agentOfficePhone};

export default function BrandAssetStudio({photos,onOpenPhotos,onToast}:{photos:BrandAssetPhoto[];onOpenPhotos:()=>void;onToast:(message:string)=>void}){
 const [selectedId,setSelectedId]=useState(photos[0]?.id??""),[template,setTemplate]=useState<Template>("subsale"),[cutout,setCutout]=useState(""),[removing,setRemoving]=useState(Boolean(photos[0])),[exporting,setExporting]=useState(false),[name,setName]=useState(photos[0]?.agentName||"AGENT NAME"),[award,setAward]=useState("Top Producer 2026"),[scale,setScale]=useState(defaultSubsaleScale),[position,setPosition]=useState(0),[offset,setOffset]=useState(0),[artwork,setArtwork]=useState(""),[ordering,setOrdering]=useState(false),[order,setOrder]=useState<PrintOrder|null>(null);
 const previewRef=useRef<HTMLDivElement>(null);
 const photo=photos.find(item=>item.id===selectedId)??photos[0],portrait=cutout||(template==="awards"?photo?.dataUrl:"")||"",subsaleDetails=getSubsaleDetails(photo,name),usingMockDetails=!hasRealAtlasDetails(photo);
 const choosePhoto=(next:BrandAssetPhoto)=>{setSelectedId(next.id);setCutout("");setRemoving(true);setName(next.agentName||"AGENT NAME")};
 const chooseTemplate=(next:Template)=>{setTemplate(next);setScale(current=>next==="subsale"?Math.min(Math.max(current,40),150):Math.min(Math.max(current,80),130));setPosition(current=>next==="subsale"?Math.min(Math.max(current,-100),100):Math.min(Math.max(current,-20),20));const tagged=photos.find(item=>categoryOf(item)===(next==="awards"?"awards":"atlas"));if(tagged&&tagged.id!==photo?.id)choosePhoto(tagged)};
 const removeBackground=async()=>{if(!photo||removing)return;setRemoving(true);try{setCutout(await createPortraitCutout(photo.dataUrl));onToast("AI background removed")}catch{onToast("Background removal could not finish. Try another photo.")}finally{setRemoving(false)}};
 const startPrintOrder=async()=>{if(!cutout||exporting)return;setExporting(true);try{setArtwork(await renderSubsaleBanner(cutout,{scale,position,offset,details:subsaleDetails}));setOrder(null);setOrdering(true)}catch{onToast("The print file could not be prepared.")}finally{setExporting(false)}};
 const closePrintOrder=useCallback(()=>{setOrdering(false)},[]);
 const confirmPrintOrder=(placed:PrintOrder)=>{setOrder(placed);onToast(`Print order ${placed.id} paid · ${formatMYR(placed.total)}`)};
 const previewFullscreen=async()=>{try{await previewRef.current?.requestFullscreen()}catch{onToast("Full-screen preview is not available in this browser.")}};
 useEffect(()=>{if(!photo?.dataUrl)return;let active=true;createPortraitCutout(photo.dataUrl).then(result=>{if(active)setCutout(result)}).catch(()=>{if(active)onToast("Background removal could not finish. Choose another portrait or retry.")}).finally(()=>{if(active)setRemoving(false)});return()=>{active=false}},[photo?.dataUrl,onToast]);
 if(!photo)return <section className="asset-empty"><span><Images size={28}/></span><h1>Create brand assets</h1><p>Save or import a portrait first. Your approved photo can then be placed into designer-supplied templates.</p><button type="button" onClick={onOpenPhotos}>Open Photos</button></section>;
 return <section className="asset-studio">
  <header className="asset-header"><div><span className="eyebrow">DESIGNER TEMPLATES</span><h1>Place your portrait. Keep the brand intact.</h1><p>Choose a designer-supplied format, apply the automatic cutout, and export without changing the locked artwork.</p></div><span className="asset-local"><ShieldCheck size={15}/> Local &amp; private</span></header>
  <div className="asset-layout">
   <aside className="asset-controls">
    <section className="asset-control-group"><div className="asset-group-title"><span>01</span><div><b>Choose portrait</b><small>Approved photos</small></div></div><div className="asset-photo-list" role="list">{photos.map(item=><button type="button" className={`${item.id===photo.id?"active":""} ${categoryOf(item)}`} onClick={()=>choosePhoto(item)} aria-pressed={item.id===photo.id} key={item.id}><img src={item.dataUrl} alt={`${item.agentName||"Saved portrait"} · ${categoryOf(item)==="awards"?"Awards night photo":"Atlas photo"}`} width={58} height={72}/><em>{categoryOf(item)==="awards"?"Awards":"Atlas"}</em>{item.id===photo.id?<i><Check size={13}/></i>:null}</button>)}</div></section>
    <section className="asset-control-group"><div className="asset-group-title"><span>02</span><div><b>Background removal</b><small>Required for this template</small></div></div><button type="button" className={`asset-ai-button ${cutout?"done":""}`} onClick={()=>void removeBackground()} disabled={removing}>{cutout?<Check size={18}/>:<WandSparkles size={18}/>}<span><b>{removing?"Removing background…":cutout?"Background removed":"Retry background removal"}</b><small>{cutout?"Transparent portrait applied automatically":"Nothing exports until this is ready"}</small></span></button></section>
    <section className="asset-control-group"><div className="asset-group-title"><span>03</span><div><b>{template==="subsale"?"Atlas information":"Event details"}</b><small>{template==="subsale"?"Filled from the agent profile":"Editable fields"}</small></div></div>{template==="awards"?<><label className="asset-field"><span>Name</span><input value={name} onChange={event=>setName(event.target.value.toUpperCase())} maxLength={32}/></label><label className="asset-field"><span>Award</span><input value={award} onChange={event=>setAward(event.target.value)} maxLength={46}/></label></>:<><p className="asset-template-note">The layout follows the approved 3 × 2 For Sale board. {usingMockDetails?"This portrait has no Atlas appointment, so sample agent details are used for the demo.":"Agent details come from the Atlas appointment."}</p><dl className="asset-atlas-info"><div><dt>Mobile</dt><dd>{subsaleDetails.mobile}</dd></div><div><dt>Name</dt><dd>{subsaleDetails.name}</dd></div><div><dt>REN</dt><dd>{subsaleDetails.ren}</dd></div><div><dt>Office</dt><dd>{subsaleDetails.officePhone}</dd></div></dl></>}<div className="asset-range"><span><label htmlFor="asset-portrait-size">Portrait size</label><output>{scale}%</output></span><input id="asset-portrait-size" type="range" min={template==="subsale"?40:80} max={template==="subsale"?150:130} value={scale} onChange={event=>setScale(Number(event.target.value))}/></div><div className="asset-range"><span><label htmlFor="asset-portrait-position">Vertical position</label><output>{template==="subsale"?`${position}%`:position}</output></span><input id="asset-portrait-position" type="range" min={template==="subsale"?-100:-20} max={template==="subsale"?100:20} value={position} onChange={event=>setPosition(Number(event.target.value))}/></div>{template==="subsale"?<div className="asset-range"><span><label htmlFor="asset-portrait-offset">Horizontal position</label><output>{offset}%</output></span><input id="asset-portrait-offset" type="range" min="-100" max="100" value={offset} onChange={event=>setOffset(Number(event.target.value))}/></div>:null}</section>
   </aside>
   <div className="asset-workbench">
    <div className="asset-tabs" aria-label="Designer template"><button type="button" className={template==="subsale"?"active":""} onClick={()=>chooseTemplate("subsale")} aria-pressed={template==="subsale"}><LayoutTemplate size={17}/><span><b>Subsale banner</b><small>Designer artwork · Print ready</small></span></button>{showAwardsTemplate?<button type="button" className={template==="awards"?"active":""} onClick={()=>chooseTemplate("awards")} aria-pressed={template==="awards"}><Award size={17}/><span><b>Awards night</b><small>16:9 · Preview</small></span></button>:null}</div>
    <div className="designer-lock"><Layers3 size={15}/><span><b>Designer artwork</b> Logo, colours and layout are locked</span></div>
    <div ref={previewRef} className={`asset-preview-shell ${template}`}>{template==="subsale"?<SubsaleBannerPreview portrait={portrait} details={subsaleDetails} scale={scale} position={position} offset={offset} cutout={Boolean(cutout)}/>:<AwardsPreview portrait={portrait} name={name} award={award} scale={scale} position={position} cutout={Boolean(cutout)}/>}</div>
    {template==="subsale"?<div className={`asset-export-bar ${usingMockDetails?"mock-atlas":""}`}><div><span><Check size={16}/>{usingMockDetails?"Designer template with sample agent details":"Designer template and Atlas details applied"}</span><small>{usingMockDetails?"2650 × 1786 print file · book through Atlas to replace the sample mobile and REN":`2650 × 1786 print file · boards from ${formatMYR(printSizes[0].price)}`}</small></div><button type="button" onClick={()=>void startPrintOrder()} disabled={exporting||!cutout}><Printer size={18}/>{removing?"Removing background…":exporting?"Preparing artwork…":"Send for printing"}</button></div>:<div className="asset-preview-bar"><div><span><Eye size={16}/> Preview only</span><small>16:9 screen mockup · Nothing will be downloaded</small></div><button type="button" onClick={()=>void previewFullscreen()}><Eye size={17}/> Preview full screen</button></div>}
   </div>
  </div>
  {ordering?<PrintOrderSheet artwork={artwork} details={subsaleDetails} agentId={photo?.agentId} order={order} onClose={closePrintOrder} onPaid={confirmPrintOrder}/>:null}
 </section>;
}

function PrintOrderSheet({artwork,details,agentId,order,onClose,onPaid}:{artwork:string;details:SubsaleDetails;agentId?:string;order:PrintOrder|null;onClose:()=>void;onPaid:(order:PrintOrder)=>void}){
 const [sizeId,setSizeId]=useState(printSizes[0].id),[quantity,setQuantity]=useState(1),[deliveryId,setDeliveryId]=useState(deliveryOptions[0].id),[address,setAddress]=useState(""),[methodId,setMethodId]=useState(paymentMethods[0].id),[paying,setPaying]=useState(false);
 const size=printSizes.find(item=>item.id===sizeId)??printSizes[0],delivery=deliveryOptions.find(item=>item.id===deliveryId)??deliveryOptions[0],method=paymentMethods.find(item=>item.id===methodId)??paymentMethods[0];
 const subtotal=size.price*quantity,total=subtotal+delivery.price,needsAddress=delivery.id==="courier",ready=!paying&&(!needsAddress||address.trim().length>9);
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[onClose]);
 // Demo payment: the delay stands in for a bank redirect, nothing leaves the browser.
 const pay=()=>{if(!ready)return;setPaying(true);window.setTimeout(()=>{onPaid(recordPrintOrder({id:createOrderId(),createdAt:new Date().toISOString(),agentName:details.name,agentId,sizeLabel:size.label,quantity,deliveryLabel:delivery.label,address:needsAddress?address.trim():"",methodLabel:method.label,subtotal,deliveryFee:delivery.price,total,status:"paid"}))},1400)};
 return <div className="print-sheet" role="dialog" aria-modal="true" aria-label="Send banner for printing">
  <button type="button" className="print-scrim" onClick={onClose} aria-label="Close print order"/>
  <div className="print-card">
   <header><div><span>PRINT ORDER</span><b>{order?"Payment received":"Send this banner for printing"}</b></div><button type="button" onClick={onClose} aria-label="Close"><X size={17}/></button></header>
   {order?<div className="print-done">
    <div className="print-done-tick"><Check size={26}/></div>
    <b>{order.id}</b>
    <p>Artwork is queued with the IQI print partner. {order.address?`Delivery to ${order.address}.`:"Collect at the IQI office when notified."}</p>
    <dl className="print-summary"><div><dt>Board</dt><dd>{order.sizeLabel} × {order.quantity}</dd></div><div><dt>Delivery</dt><dd>{order.deliveryLabel}</dd></div><div><dt>Paid with</dt><dd>{order.methodLabel}</dd></div><div><dt>Total</dt><dd>{formatMYR(order.total)}</dd></div></dl>
    <button type="button" className="print-pay" onClick={onClose}>Done</button>
   </div>:<div className="print-body">
    <div className="print-proof">{artwork?<img src={artwork} alt="Print-ready subsale banner" width={2650} height={1786}/>:null}<small>{details.name} · {details.mobile}</small></div>
    <fieldset className="print-group"><legend>Board size</legend>{printSizes.map(option=><label key={option.id} className={`print-option ${option.id===sizeId?"active":""}`}><input type="radio" name="print-size" value={option.id} checked={option.id===sizeId} onChange={()=>setSizeId(option.id)}/><span><b>{option.label}</b><small>{option.detail}</small></span><em>{formatMYR(option.price)}</em></label>)}</fieldset>
    <div className="print-quantity"><span>Quantity</span><div><button type="button" onClick={()=>setQuantity(value=>Math.max(1,value-1))} aria-label="Fewer boards">−</button><output>{quantity}</output><button type="button" onClick={()=>setQuantity(value=>Math.min(20,value+1))} aria-label="More boards">+</button></div></div>
    <fieldset className="print-group"><legend>Delivery</legend>{deliveryOptions.map(option=><label key={option.id} className={`print-option ${option.id===deliveryId?"active":""}`}><input type="radio" name="print-delivery" value={option.id} checked={option.id===deliveryId} onChange={()=>setDeliveryId(option.id)}/><span><b>{option.label}</b><small>{option.detail}</small></span><em>{option.price?formatMYR(option.price):"Free"}</em></label>)}</fieldset>
    {needsAddress?<label className="asset-field print-address"><span>Site address</span><input value={address} onChange={event=>setAddress(event.target.value)} placeholder="Unit, street, postcode, state" maxLength={120}/></label>:null}
    <fieldset className="print-group"><legend>Payment method</legend>{paymentMethods.map(option=><label key={option.id} className={`print-option ${option.id===methodId?"active":""}`}><input type="radio" name="print-method" value={option.id} checked={option.id===methodId} onChange={()=>setMethodId(option.id)}/><span><b>{option.label}</b><small>{option.detail}</small></span><em><CreditCard size={15}/></em></label>)}</fieldset>
    <dl className="print-summary"><div><dt>Boards</dt><dd>{formatMYR(subtotal)}</dd></div><div><dt><Truck size={13}/> Delivery</dt><dd>{delivery.price?formatMYR(delivery.price):"Free"}</dd></div><div className="print-total"><dt>Total</dt><dd>{formatMYR(total)}</dd></div></dl>
    <button type="button" className="print-pay" onClick={pay} disabled={!ready}>{paying?"Confirming payment…":`Pay ${formatMYR(total)}`}</button>
    <small className="print-note">Demo checkout · no live payment is processed and no card details are collected.</small>
   </div>}
  </div>
 </div>;
}

function SubsaleBannerPreview({portrait,details,scale,position,offset,cutout}:{portrait:string;details:SubsaleDetails;scale:number;position:number;offset:number;cutout:boolean}){const layout=useSubsaleTextLayout(details),cqw=(value:number)=>`${value/bannerUnit}cqw`,[loaded,setLoaded]=useState<{src:string;width:number;height:number}|null>(null),natural=loaded&&loaded.src===portrait?loaded:null;const fit=fitSubsalePortrait(natural?.width??960,natural?.height??1200,scale,position,offset),portraitStyle={left:`${fit.x/bannerWidth*100}%`,top:`${fit.y/bannerHeight*100}%`,width:`${fit.width/bannerWidth*100}%`,height:`${fit.height/bannerHeight*100}%`};return <div className={`subsale-banner-preview ${cutout?"has-cutout":""}`}><img className="subsale-artwork" src="/subsale-banner-template.png" alt="IQI For Sale designer banner template" width={2650} height={1786}/><strong className="subsale-mobile" style={layout?{fontSize:cqw(layout.mobile)}:undefined}>{details.mobile}</strong><div className="subsale-agent-line" style={layout?{fontSize:cqw(layout.name)}:undefined}><strong style={layout?{maxWidth:cqw(layout.nameMax)}:undefined}>{details.name}</strong><span style={layout?{fontSize:cqw(layout.ren)}:undefined}>{details.ren}</span></div><strong className="subsale-office-phone" style={layout?{fontSize:cqw(layout.officePhone)}:undefined}>{details.officePhone}</strong><div className="subsale-photo">{portrait?<img src={portrait} alt="Agent portrait with background removed" width={960} height={1200} onLoad={event=>setLoaded({src:portrait,width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight})} style={portraitStyle}/>:<span><WandSparkles size={22}/> Removing background…</span>}</div></div>}

function AwardsPreview({portrait,name,award,scale,position,cutout}:{portrait:string;name:string;award:string;scale:number;position:number;cutout:boolean}){return <div className={`awards-preview ${cutout?"has-cutout":""}`}><div className="awards-beam one"/><div className="awards-beam two"/><div className="awards-copy"><span>STUDIO+ AWARDS NIGHT · 2026</span><Award size={30}/><small>CELEBRATING EXCELLENCE</small><h2>{name||"Agent Name"}</h2><p>{award||"Top Producer 2026"}</p></div><div className="awards-photo"><img src={portrait} alt="Awards night screen portrait preview" width={960} height={1200} style={{transform:`translateY(${position}%) scale(${scale/100})`}}/></div><div className="awards-footer"><span>STUDIO+</span><i/><b>YOUR SUCCESS. OUR PRIDE.</b></div></div>}

async function createPortraitCutout(src:string){
 const image=await loadAssetImage(src),vision=await import("@mediapipe/tasks-vision"),files=await vision.FilesetResolver.forVisionTasks("/mediapipe"),segmenter=await vision.ImageSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:"/selfie_segmenter.tflite"},runningMode:"IMAGE",outputConfidenceMasks:true,outputCategoryMask:false});
 try{const result=segmenter.segment(image);try{const mask=result.confidenceMasks?.[0];if(!mask)throw new Error("No person mask");const values=mask.getAsFloat32Array(),maskCanvas=document.createElement("canvas"),maskContext=maskCanvas.getContext("2d"),output=document.createElement("canvas"),context=output.getContext("2d");maskCanvas.width=mask.width;maskCanvas.height=mask.height;output.width=image.naturalWidth;output.height=image.naturalHeight;if(!maskContext||!context)throw new Error("Canvas unavailable");const pixels=maskContext.createImageData(mask.width,mask.height);for(let index=0;index<values.length;index++){const confidence=Math.max(0,Math.min(1,(values[index]-.04)/.78)),soft=confidence*confidence*(3-2*confidence),offset=index*4;pixels.data[offset]=255;pixels.data[offset+1]=255;pixels.data[offset+2]=255;pixels.data[offset+3]=Math.round(soft*255)}maskContext.putImageData(pixels,0,0);context.drawImage(image,0,0,output.width,output.height);context.globalCompositeOperation="destination-in";context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";context.drawImage(maskCanvas,0,0,output.width,output.height);const bounds=findPersonBounds(values,mask.width,mask.height);if(!bounds)throw new Error("No person detected");return cropCutoutToPerson(output,{...bounds,maskWidth:mask.width,maskHeight:mask.height}).toDataURL("image/png")}finally{result.close()}}finally{segmenter.close()}
}

function findPersonBounds(values:Float32Array,width:number,height:number){const columns=new Uint16Array(width),rows=new Uint16Array(height);for(let index=0;index<values.length;index++){if(values[index]<.45)continue;const x=index%width,y=Math.floor(index/width);columns[x]++;rows[y]++}const columnMinimum=Math.max(2,Math.floor(height*.018)),rowMinimum=Math.max(2,Math.floor(width*.018)),minX=columns.findIndex(count=>count>=columnMinimum),minY=rows.findIndex(count=>count>=rowMinimum);let maxX=-1,maxY=-1;for(let x=width-1;x>=0;x--){if(columns[x]>=columnMinimum){maxX=x;break}}for(let y=height-1;y>=0;y--){if(rows[y]>=rowMinimum){maxY=y;break}}return minX<0||minY<0||maxX<minX||maxY<minY?null:{minX,minY,maxX,maxY}}

function cropCutoutToPerson(source:HTMLCanvasElement,bounds:{minX:number;minY:number;maxX:number;maxY:number;maskWidth:number;maskHeight:number}){const scaleX=source.width/bounds.maskWidth,scaleY=source.height/bounds.maskHeight,subjectLeft=bounds.minX*scaleX,subjectTop=bounds.minY*scaleY,subjectRight=(bounds.maxX+1)*scaleX,subjectBottom=(bounds.maxY+1)*scaleY,subjectWidth=subjectRight-subjectLeft,subjectHeight=subjectBottom-subjectTop,padX=Math.max(source.width*.04,subjectWidth*.18),padTop=Math.max(source.height*.03,subjectHeight*.08),padBottom=Math.max(source.height*.02,subjectHeight*.05),left=Math.max(0,Math.floor(subjectLeft-padX)),top=Math.max(0,Math.floor(subjectTop-padTop)),right=Math.min(source.width,Math.ceil(subjectRight+padX)),bottom=Math.min(source.height,Math.ceil(subjectBottom+padBottom)),width=right-left,height=bottom-top;if(width<2||height<2)return source;const cropped=document.createElement("canvas"),context=cropped.getContext("2d");cropped.width=width;cropped.height=height;if(!context)return source;context.drawImage(source,left,top,width,height,0,0,width,height);return cropped}

function loadAssetImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})}
function formatAtlasPhone(value:string|undefined,fallback:string){const raw=value?.trim();if(!raw||raw.toLowerCase()==="not provided")return fallback;let digits=raw.replace(/\D/g,"");if(digits.startsWith("60"))digits=`0${digits.slice(2)}`;if(/^01\d{8}$/.test(digits))return `${digits.slice(0,3)}-${digits.slice(3,6)} ${digits.slice(6)}`;if(/^011\d{8}$/.test(digits))return `${digits.slice(0,3)}-${digits.slice(3,7)} ${digits.slice(7)}`;if(/^0[2-9]\d{8}$/.test(digits))return `${digits.slice(0,2)}-${digits.slice(2,6)} ${digits.slice(6)}`;return raw}
function formatRen(value:string|undefined){const ren=value?.replace(/^REN\s*(?:NO\.?\s*:?)?\s*/i,"").trim();return `(REN No.: ${ren||"NOT SET"})`}
function categoryOf(photo:BrandAssetPhoto){return photo.category??"atlas"}
function isMockAgent(photo:BrandAssetPhoto|undefined){return !photo?.agentName||photo.agentId===mockAgent.agentId}
function hasRealAtlasDetails(photo:BrandAssetPhoto|undefined){return Boolean(photo?.agentMobile&&photo?.agentRenTag&&!isMockAgent(photo))}
function getSubsaleDetails(photo:BrandAssetPhoto|undefined,name:string):SubsaleDetails{const realName=!isMockAgent(photo)&&photo?.agentName?photo.agentName:name&&name!=="AGENT NAME"&&name!==mockAgent.agentName?name:mockAtlasDetails.name;return{name:realName,mobile:formatAtlasPhone(photo?.agentMobile,mockAtlasDetails.mobile),ren:formatRen(photo?.agentRenTag||mockAtlasDetails.ren),officePhone:formatAtlasPhone(photo?.agentOfficePhone,mockAtlasDetails.officePhone)}}
// 100% fits the designer frame; above that the portrait grows past it and is only stopped by the artwork edges. Both sliders run edge to edge — 0 is left/bottom flush, 100 is right/top flush — so a side of the cutout always sits on an artwork edge and never drifts inside it.
// The whole portrait always shows: 100% stands it the full height of the artwork and nothing masks it, so the width follows the aspect and may reach over the text. 0 anchors it flush with the artwork right and bottom edges; the sliders then track the photo - dragging left walks it left/up until it is flush with the far edges, dragging right walks it off the board by that share of its own size.
function placeSubsalePortrait(span:number,size:number,value:number){const travel=-Math.min(Math.max(value,-100),100)/100;return travel<0?span-travel*size:span*(1-travel)}
function fitSubsalePortrait(naturalWidth:number,naturalHeight:number,scale:number,position:number,offset:number){const base=bannerHeight/naturalHeight*scale/100,width=naturalWidth*base,height=naturalHeight*base;return{x:placeSubsalePortrait(bannerWidth-width,width,offset),y:placeSubsalePortrait(bannerHeight-height,height,position),width,height}}

type SubsaleTextLayout={mobile:number;name:number;nameMax:number;nameWidth:number;ren:number;officePhone:number};
const bannerFamily='"DIN Alternate","Avenir Next Condensed","Arial Narrow",Arial,sans-serif',bannerTracking="-0.035em",renTracking="-0.025em",bannerUnit=26.5; // 2650px artwork width ÷ 100 container query units
let measureContext:CanvasRenderingContext2D|null|undefined;
function bannerTextWidth(text:string,size:number,weight:number,tracking:string){if(measureContext===undefined)measureContext=typeof document==="undefined"?null:document.createElement("canvas").getContext("2d");if(!measureContext)return 0;measureContext.letterSpacing=tracking;measureContext.font=`${weight} ${size}px ${bannerFamily}`;return measureContext.measureText(text).width}
function fitBannerFontSize(text:string,maxWidth:number,fontSize:number,weight:number,tracking:string){let size=fontSize;while(size>42&&bannerTextWidth(text,size,weight,tracking)>maxWidth)size-=4;return size}
// One layout drives both the preview and the exported PNG, so what the designer sees is what downloads.
function subsaleTextLayout(details:SubsaleDetails):SubsaleTextLayout{const mobile=fitBannerFontSize(details.mobile,textWidth,472,800,bannerTracking),nameMax=textWidth-Math.min(bannerTextWidth(details.ren,84,700,renTracking),textWidth*.45)-34,name=fitBannerFontSize(details.name,nameMax,210,700,bannerTracking),nameWidth=Math.min(bannerTextWidth(details.name,name,700,bannerTracking),nameMax),ren=fitBannerFontSize(details.ren,textWidth-nameWidth-34,84,700,renTracking),officePhone=fitBannerFontSize(details.officePhone,1000,172,700,bannerTracking);return{mobile,name,nameMax,nameWidth,ren,officePhone}}
function useSubsaleTextLayout(details:SubsaleDetails){const {mobile,name,ren,officePhone}=details,[layout,setLayout]=useState<SubsaleTextLayout|null>(null);useEffect(()=>{let active=true;const apply=()=>{if(active)setLayout(subsaleTextLayout({mobile,name,ren,officePhone}))};apply();void document.fonts?.ready.then(apply);return()=>{active=false}},[mobile,name,ren,officePhone]);return layout}
function drawBannerText(context:CanvasRenderingContext2D,text:string,x:number,baseline:number,size:number,maxWidth:number,color:string,weight:number,tracking:string){context.letterSpacing=tracking;context.font=`${weight} ${size}px ${bannerFamily}`;context.fillStyle=color;context.fillText(text,x,baseline,maxWidth);context.letterSpacing="0px"}
const textLeft=72,portraitLeft=1800,textRight=portraitLeft-40,textWidth=textRight-textLeft; // text never crosses into the portrait cutout at x=1800
const bannerWidth=2650,bannerHeight=1786; // the portrait is sized and anchored against the full artwork
const defaultSubsaleScale=80; // 100% stands the portrait the full height of the board, so a new one opens a little short of that, flush right and bottom
function drawSubsaleDetails(context:CanvasRenderingContext2D,details:SubsaleDetails){const layout=subsaleTextLayout(details);context.textBaseline="alphabetic";drawBannerText(context,details.mobile,textLeft,970,layout.mobile,textWidth,"#231f20",800,bannerTracking);drawBannerText(context,details.name,textLeft,1260,layout.name,layout.nameMax,"#332f30",700,bannerTracking);drawBannerText(context,details.ren,textLeft+layout.nameWidth+34,1260,layout.ren,textWidth-layout.nameWidth-34,"#332f30",700,renTracking);drawBannerText(context,details.officePhone,410,1684,layout.officePhone,1000,"#fff",700,bannerTracking)}

async function renderSubsaleBanner(src:string,options:{scale:number;position:number;offset:number;details:SubsaleDetails}){const [template,image]=await Promise.all([loadAssetImage("/subsale-banner-template.png"),loadAssetImage(src)]),canvas=document.createElement("canvas"),context=canvas.getContext("2d"),width=bannerWidth,height=bannerHeight;canvas.width=width;canvas.height=height;if(!context)throw new Error("Canvas unavailable");context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(template,0,0,width,height);drawSubsaleDetails(context,options.details);const portrait=fitSubsalePortrait(image.naturalWidth,image.naturalHeight,options.scale,options.position,options.offset);context.drawImage(image,portrait.x,portrait.y,portrait.width,portrait.height);return canvas.toDataURL("image/png")}
```

### `app/atlas/page.tsx`

```tsx
import AtlasProfile from "./profile";

export default function AtlasPage(){
  return <AtlasProfile/>;
}
```

### `app/atlas/[agent]/page.tsx`

```tsx
import AtlasProfile from "../profile";

export default async function AgentAtlasPage({params}:{params:Promise<{agent:string}>}){
 const {agent}=await params;
 return <AtlasProfile agentSlug={agent}/>;
}
```

### `app/atlas/profile.tsx`

```tsx
"use client";

import {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {BarChart3, Bell, CalendarDays, Camera, Check, ChevronDown, Globe2, Handshake, Headphones, LayoutDashboard, MapPin, Menu, MessageSquare, QrCode, Radar, ShieldCheck, Upload, Users, X} from "lucide-react";
import {emptyPhotoRating, evaluatePhoto, isPhotoApproved, PhotoRating} from "../photo-quality";
import "./atlas.css";
import "./skeleton-fix.css";

type Agent={id:string;name:string;role:string;office:string;phone:string;officePhone:string;email:string;avatar:string;renTag:string};
const fallbackAgent:Agent={id:"71502",name:"Aaron Paul",role:"Negotiator · REN76860",office:"Ipoh, Malaysia",phone:"60126791098",officePhone:"03-7453 5155",email:"aaronyuva1017@gmail.com",avatar:"",renTag:"REN76860"};

export default function AtlasProfile({agentSlug="aaron-paul"}:{agentSlug?:string}){
 const [agent,setAgent]=useState<Agent>(fallbackAgent); const [live,setLive]=useState(false); const [photo,setPhoto]=useState(""); const [rating,setRating]=useState<PhotoRating>(emptyPhotoRating); const [showAssessment,setShowAssessment]=useState(false); const [booking,setBooking]=useState(false); const [confirmed,setConfirmed]=useState(false); const [qr,setQr]=useState(""); const [qrError,setQrError]=useState(""); const [date,setDate]=useState("2026-08-22"); const [time,setTime]=useState("10:30"); const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{fetch(`/api/atlas-agent?slug=${encodeURIComponent(agentSlug)}`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{const mapped:Agent={id:String(data.id),name:data.display_name||data.full_name,role:[data.designation,data.ren_tag].filter(Boolean).join(" · ")||data.role,office:`${data.branch_name||data.branch_region_name}, ${data.country}`,phone:data.mobile_contact_number||data.work_contact_number||"Not provided",officePhone:data.office_contact_number||data.branch_contact_number||data.branch_phone_number||"03-7453 5155",email:data.email||"Not provided",avatar:`/api/atlas-avatar?slug=${encodeURIComponent(agentSlug)}`,renTag:data.ren_tag||""};setAgent(mapped);setLive(true);setPhoto(mapped.avatar);evaluatePhoto(mapped.avatar).then(setRating).catch(()=>setRating({...emptyPhotoRating,label:"Could not assess"}))}).catch(()=>{})},[agentSlug]);
 const session=useMemo(()=>`PS-${agent.id}-${date.replaceAll("-","")}-${time.replace(":","")}`,[agent.id,date,time]);
 const appointmentLabel=useMemo(()=>{try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(`${date}T${time}`))}catch{return `${date} · ${time}`}},[date,time]);
 const initials=useMemo(()=>agent.name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase(),[agent.name]);
 useEffect(()=>{if(!confirmed)return;let active=true;const create=async()=>{setQr("");setQrError("");const payload={session,agentId:agent.id,agentName:agent.name,agentPhoto:photo,agentMobile:agent.phone,agentRenTag:agent.renTag,agentOfficePhone:agent.officePhone,rating:rating.score,ratingLabel:rating.label,ratingMetrics:rating.metrics,photoPreflight:rating,date,time},stored={...payload,createdAt:new Date().toISOString(),status:"confirmed"};localStorage.setItem(`photostudio-session:${session}`,JSON.stringify(stored));try{const response=await fetch("/api/studio-sessions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw Error();const image=await QRCode.toDataURL(session,{width:360,margin:4,errorCorrectionLevel:"H",color:{dark:"#17221e",light:"#ffffff"}});if(active)setQr(image)}catch{if(active)setQrError("Could not register this QR. Check the demo server and select Try again.")}};create();return()=>{active=false}},[confirmed,session,date,time,agent.id,agent.name,agent.phone,agent.renTag,agent.officePhone,photo,rating]);
 useEffect(()=>{if(!booking&&!showAssessment)return;const close=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;setBooking(false);setShowAssessment(false);setConfirmed(false);setQr("");setQrError("")};addEventListener("keydown",close);return()=>removeEventListener("keydown",close)},[booking,showAssessment]);
 const choose=async(e:ChangeEvent<HTMLInputElement>)=>{const selected=e.target.files?.[0];e.target.value="";if(!selected)return;if(!["image/jpeg","image/png","image/webp"].includes(selected.type)){alert("Choose a JPG, PNG or WebP photo.");return}if(selected.size>12*1024*1024){alert("Choose a photo smaller than 12 MB.");return}const reader=new FileReader();reader.onload=async()=>{if(typeof reader.result!=="string")return;setPhoto(reader.result);setRating(emptyPhotoRating);try{setRating(await evaluatePhoto(reader.result))}catch{alert("This photo could not be assessed. Try another image.")}};reader.onerror=()=>alert("This photo could not be opened.");reader.readAsDataURL(selected)};
 const openStudio=()=>location.href=`/?session=${encodeURIComponent(session)}`;
 return <main className="atlas-app">
  <header className="atlas-top"><button type="button" className="menu-toggle" aria-label="Menu"><Menu/></button><div className="atlas-utilities"><Globe2/><MessageSquare/><Headphones/><span className="notice"><Bell/><i>1</i></span><b>{agent.name}</b><span className="user-dot">{initials}</span></div></header>
  <aside className="atlas-side"><Link className="atlas-mark" href="/atlas" prefetch={false}><b><i/><i/><i/></b><span>ATLAS<em>Demo profile</em></span></Link><div className="side-search">⌕ &nbsp; Search menu</div><small>QUICK LINKS</small><nav><button type="button"><LayoutDashboard/><span>Dashboard</span></button><button type="button"><Users/><span>Team Hub</span><ChevronDown/></button><button><BarChart3/><span>Insights & Reports</span><ChevronDown/></button><button><Radar/><span>Real Estate Radar</span><ChevronDown/></button><button><Handshake/><span>Engagement Hub</span><ChevronDown/></button><button><CalendarDays/><span>Calendar</span></button><button><Globe2/><span>Global Network</span></button></nav></aside>
  <section className="atlas-content">
   <div className="atlas-page-title"><span><Users/></span><h1>Profile</h1></div><div className="atlas-tabs"><button type="button" className="active" aria-current="page">Profile</button><button type="button">Digital Signature</button><button>Change Password</button></div>
   <div className="atlas-heading"><div><small>PROFILE · {live?"LIVE":"OFFLINE"}</small><h1>Profile</h1><p>Public agent profile.</p></div><button type="button" className="save"><Check size={17}/> {live?"Connected":"Offline"}</button></div>
   {rating.score>0&&!isPhotoApproved(rating)?<div className={`quality-banner ${!photo?"empty":""}`}><div className="banner-icon"><Camera/></div><div><strong>{!photo?"Add a profile photo":rating.status==="REUPLOAD"?"Re-upload at higher resolution":rating.status==="REVIEW"?"Designer review needed":"Retake recommended"}</strong><span>{!photo?"Upload or book a session.":`${rating.score}/100 · ${rating.recommendation}`}</span></div><button type="button" onClick={()=>setBooking(true)}><CalendarDays size={18}/> Book studio</button></div>:null}
   <div className="profile-layout">
    <article className="profile-card"><div className="cover"><span>GLOBAL NETWORK</span></div><div className="identity"><div className={`agent-photo ${photo?"has-photo":""}`} style={photo?{backgroundImage:`url(${photo})`}:undefined}><span className={`rating-ring ${rating.tone}`}>{rating.score}</span></div><div><h2>{agent.name}</h2><p>{agent.role}</p><span><MapPin size={15}/>{agent.office}</span></div></div><button type="button" className="photo-score" onClick={()=>setShowAssessment(true)} aria-label="View full photo preflight"><div><small>MARKETING PHOTO PREFLIGHT</small><strong>{rating.score}<span>/100</span></strong></div><div className="score-track"><i style={{width:`${rating.score}%`}}/></div><b className={rating.tone}>{rating.label}</b><p>View feedback <span>→</span></p></button><div className="atlas-photo-actions"><button type="button" onClick={()=>file.current?.click()}><Upload size={18}/> Upload</button><button type="button" className="studio-book" onClick={()=>{setConfirmed(false);setQr("");setQrError("");setBooking(true)}}><CalendarDays size={18}/> Book studio</button><input ref={file} name="profile-photo" type="file" aria-label="Upload profile photo" accept="image/jpeg,image/png,image/webp" onChange={choose}/></div></article>
    <article className="details-card atlas-skeleton" aria-label="Atlas profile modules loading"><div className="skeleton-tabs"><i/><i/><i/><i/></div><div className="skeleton-title"><i/><i/></div><div className="skeleton-grid">{Array.from({length:9},(_,i)=><span key={i}><i/><b/></span>)}</div><div className="skeleton-lines"><i/><i/><i/></div></article>
   </div>
  </section>
  {showAssessment?<div className="booking-backdrop" role="dialog" aria-modal="true" aria-label="Photo preflight"><div className="booking-card assessment-modal"><button type="button" className="close" onClick={()=>setShowAssessment(false)} aria-label="Close assessment"><X/></button><small>MARKETING PHOTO PREFLIGHT · {rating.status}</small><h2>{rating.score}/100 · {rating.label}</h2><p>Can a designer actually work with this photo? Judged on usability, not formality.</p><div className="assessment-signals"><div><span>Raw score</span><strong>{rating.raw_score}</strong></div><div><span>Final score</span><strong>{rating.score}</strong></div><div><span>Confidence</span><strong>{Math.round(rating.confidence*100)}%</strong></div><div><span>Selfie likelihood</span><strong>{Math.round(rating.selfie_probability*100)}%</strong></div></div><div className="metric-list">{rating.metrics.map(metric=><div className="metric" key={metric.name}><div><b>{metric.name}</b><span>{metric.note}</span><strong>{metric.score}</strong></div><i><b style={{width:`${metric.score}%`}}/></i></div>)}</div><section className="requirement-panel" aria-label="Submission requirements"><div><b>Submission requirements</b><small>Hard rules run after image analysis</small></div><div className="requirement-list">{rating.requirements.map(requirement=><article className={requirement.status.toLowerCase()} key={requirement.id}><span>{requirement.status}</span><div><b>{requirement.label}</b><small>{requirement.detail}</small></div><strong>{requirement.score}</strong></article>)}</div></section><div className={`assessment-feedback ${rating.tone}`}><b>Final decision</b><p>{rating.decision_reason}</p>{rating.penalties.length?<ul>{rating.penalties.map(penalty=><li key={penalty.id}>{penalty.label}{penalty.points?` · −${penalty.points}`:""}{penalty.cap!==null?` · score capped at ${penalty.cap}`:""}</li>)}</ul>:<p>No penalties or caps applied.</p>}<strong>{rating.recommendation}</strong></div><section className="score-trace" aria-label="How this score was calculated"><b>How this score was calculated</b><ol>{rating.score_trace.map(step=><li key={step}>{step}</li>)}</ol></section><div className="rating-method"><ShieldCheck size={18}/><p><b>Designer usability standard</b><span>Photo quality 30 · Body &amp; crop 30 · Face visibility 20 · Background &amp; editability 20 · then hard gates. Sitting, leaning and casual poses are never penalised.</span></p></div></div></div>:null}
  {booking?<div className="booking-backdrop" role="dialog" aria-modal="true" aria-label="Book studio session"><div className="booking-card"><button type="button" className="close" onClick={()=>{setBooking(false);setConfirmed(false);setQr("");setQrError("")}} aria-label="Close"><X/></button>{!confirmed?<><span className="modal-icon"><Camera/></span><small>STUDIO</small><h2>Book studio</h2><p>Choose a time. Scan at arrival.</p><div className="booking-fields"><label>Date<input name="appointment-date" autoComplete="off" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<select name="appointment-time" value={time} onChange={e=>setTime(e.target.value)}><option>09:30</option><option>10:30</option><option>14:00</option><option>16:30</option></select></label></div><div className="booking-location"><MapPin/><div><b>Studio+</b><span>Kuala Lumpur · Level 12</span></div></div><button type="button" className="confirm" onClick={()=>setConfirmed(true)}>Book session</button></>:<><span className="modal-icon success"><QrCode/></span><small>CONFIRMED</small><h2>Studio QR</h2><p>Scan at Studio+.</p><div className="qr-wrap" aria-live="polite">{qr?<img src={qr} alt={`Studio appointment QR for ${agent.name}`} width={360} height={360}/>:<span className="qr-loading">Creating QR…</span>}</div><div className="session-code"><small>SESSION CODE</small><code translate="no">{session}</code><span>Use if QR scanning fails.</span></div>{qrError?<p className="qr-error">{qrError}</p>:null}<div className="appointment-meta"><div><small>AGENT</small><b>{agent.name}</b></div><div><small>TIME</small><b>{appointmentLabel}</b></div></div><button type="button" className="confirm" disabled={!qr} onClick={openStudio}><QrCode size={18}/> Open studio</button></>}</div></div>:null}
 </main>
}
```

### `app/api/atlas-agent/route.ts`

```ts
export async function GET(request:Request){
 try{
  const slug=new URL(request.url).searchParams.get("slug")||"aaron-paul";
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return Response.json({error:"Invalid agent slug"},{status:400});
  const response=await fetch(`https://api.iqiglobal.com/api/web/agents/${slug}`,{headers:{Accept:"application/json"},next:{revalidate:300}});
  if(!response.ok)return Response.json({error:"Atlas agent unavailable"},{status:response.status});
  return Response.json(await response.json(),{headers:{"Cache-Control":"public, max-age=60, stale-while-revalidate=300"}});
 }catch{
  return Response.json({error:"Could not connect to Atlas"},{status:502});
 }
}
```

### `app/api/atlas-avatar/route.ts`

```ts
export async function GET(request:Request){try{const slug=new URL(request.url).searchParams.get("slug")||"aaron-paul";if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return new Response("Invalid agent slug",{status:400});const a=await fetch(`https://api.iqiglobal.com/api/web/agents/${slug}`);if(!a.ok)return new Response("Agent unavailable",{status:a.status});const agent=await a.json(),image=await fetch(agent.avatar_original_url||agent.avatar_url);return new Response(image.body,{status:image.status,headers:{"Content-Type":image.headers.get("content-type")||"image/jpeg","Cache-Control":"public, max-age=3600"}})}catch{return new Response("Avatar unavailable",{status:502})}}
```

### `app/api/studio-sessions/route.ts`

```ts
type RatingMetric={name:string;score:number;note:string};
type PhotoRequirement={id:string;label:string;status:"PASS"|"FAIL";score:number;confidence:number;severity:"none"|"warning"|"critical";detail:string};
type PhotoPenalty={id:string;label:string;points:number;cap:number|null;forces_status:"REVIEW"|"REJECT"|null};
type PhotoPreflight={score:number;overall_score:number;base_score:number;raw_score?:number;applied_cap?:{id:string;label:string;cap:number}|null;score_trace?:string[];status:"APPROVED"|"REVIEW"|"REUPLOAD"|"REJECT";label:string;confidence:number;designer_review_eligible?:boolean;disputable_gates?:string[];review_block_reason?:string;technical_quality:number;file_suitability?:number;file_status?:"OK"|"LOW"|"TOO_SMALL"|"UNUSABLE";file_reason?:string;body_usability?:number;face_visibility?:number;editability?:number;body_extent?:string;hands?:string;professionalism:number;composition:number;background_quality:number;face_quality:number;designer_usability:number;pose_appropriateness:number;selfie_probability:number;issues:string[];strengths:string[];recommendation:string;decision_reason:string;requirements:PhotoRequirement[];penalties:PhotoPenalty[];metrics:RatingMetric[]};
type StudioSession={session:string;agentId:string;agentName:string;agentPhoto?:string;agentMobile?:string;agentRenTag?:string;agentOfficePhone?:string;rating?:number;ratingLabel?:string;ratingMetrics?:RatingMetric[];photoPreflight?:PhotoPreflight;date:string;time:string;createdAt:string;status:"confirmed"};

const globalSessions=globalThis as typeof globalThis&{__photoStudioSessions?:Map<string,StudioSession>};
const sessions=globalSessions.__photoStudioSessions??=new Map<string,StudioSession>();

export async function POST(request:Request){
 try{
  const body=await request.json() as Partial<StudioSession>;
  if(!body.session||!body.agentId||!body.agentName||!body.date||!body.time)return Response.json({error:"Missing appointment details"},{status:400});
  const record:StudioSession={session:body.session,agentId:body.agentId,agentName:body.agentName,agentPhoto:body.agentPhoto,agentMobile:body.agentMobile,agentRenTag:body.agentRenTag,agentOfficePhone:body.agentOfficePhone,rating:body.rating,ratingLabel:body.ratingLabel,ratingMetrics:body.ratingMetrics,photoPreflight:body.photoPreflight,date:body.date,time:body.time,createdAt:new Date().toISOString(),status:"confirmed"};
  sessions.set(record.session,record);
  return Response.json(record,{status:201,headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Invalid appointment"},{status:400})}
}

export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get("session")||"",record=sessions.get(code);
 if(!record)return Response.json({error:"Appointment not found"},{status:404,headers:{"Cache-Control":"no-store"}});
 return Response.json(record,{headers:{"Cache-Control":"no-store"}});
}
```

### `app/api/codeformer/route.ts`

```ts
const MAX_IMAGE_BYTES=12*1024*1024;

function serviceHeaders():Record<string,string>{const token=process.env.CODEFORMER_SERVICE_TOKEN;return token?{Authorization:`Bearer ${token}`}:{}}

export async function GET(){
 const serviceUrl=process.env.CODEFORMER_SERVICE_URL?.trim();
 if(!serviceUrl)return Response.json({available:false,reason:"not_configured"},{headers:{"Cache-Control":"no-store"}});
 try{
  const healthUrl=new URL("health",serviceUrl.endsWith("/")?serviceUrl:`${serviceUrl}/`);
  const response=await fetch(healthUrl,{headers:serviceHeaders(),signal:AbortSignal.timeout(5000)});
  if(!response.ok)return Response.json({available:false,reason:"service_unavailable"},{headers:{"Cache-Control":"no-store"}});
  const health=await response.json() as {ready?:boolean;engine?:string};
  return Response.json({available:health.ready===true,engine:health.engine??"CodeFormer + Real-ESRGAN"},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({available:false,reason:"service_unavailable"},{headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request:Request){
 const serviceUrl=process.env.CODEFORMER_SERVICE_URL?.trim();
 if(!serviceUrl)return Response.json({error:"CodeFormer service is not configured. Start the restoration service and set CODEFORMER_SERVICE_URL."},{status:503,headers:{"Cache-Control":"no-store"}});
 const contentType=request.headers.get("content-type")?.split(";",1)[0].toLowerCase()??"";
 if(!["image/jpeg","image/png","image/webp"].includes(contentType))return Response.json({error:"Upload a JPG, PNG, or WebP image."},{status:415});
 const declaredSize=Number(request.headers.get("content-length")??0);
 if(declaredSize>MAX_IMAGE_BYTES)return Response.json({error:"Image must be 12 MB or smaller."},{status:413});
 const image=await request.arrayBuffer();
 if(!image.byteLength||image.byteLength>MAX_IMAGE_BYTES)return Response.json({error:"Image must be between 1 byte and 12 MB."},{status:413});
 const inputUrl=new URL(request.url),fidelity=Math.min(1,Math.max(0,Number(inputUrl.searchParams.get("fidelity")??.8)||.8)),upscale=inputUrl.searchParams.get("upscale")==="4"?4:2;
 try{
  const restoreUrl=new URL("restore",serviceUrl.endsWith("/")?serviceUrl:`${serviceUrl}/`);
  restoreUrl.searchParams.set("fidelity",fidelity.toFixed(2));
  restoreUrl.searchParams.set("upscale",String(upscale));
  const response=await fetch(restoreUrl,{method:"POST",headers:{...serviceHeaders(),"Content-Type":contentType},body:image,signal:AbortSignal.timeout(300000)});
  if(!response.ok){const detail=await response.json().catch(()=>null) as {detail?:string}|null;return Response.json({error:detail?.detail??"CodeFormer could not restore this photo."},{status:response.status,headers:{"Cache-Control":"no-store"}})}
  return new Response(response.body,{status:200,headers:{"Content-Type":"image/png","Cache-Control":"no-store","X-CodeFormer-Faces":response.headers.get("x-codeformer-faces")??"0","X-Restoration-Engine":"CodeFormer + Real-ESRGAN"}});
 }catch(error){const timedOut=error instanceof Error&&error.name==="TimeoutError";return Response.json({error:timedOut?"CodeFormer restoration timed out.":"Could not reach the CodeFormer service."},{status:timedOut?504:502,headers:{"Cache-Control":"no-store"}})}
}
```

### `app/globals.css`

```css
@import "tailwindcss";
:root{--ink:#111318;--ivory:#f7f4ee;--gold:#c6a15b;--blue:#3f76ff;--green:#487d5e;--line:#d8d3c9;--muted:#6c6a65}*{box-sizing:border-box}html,body{margin:0;background:var(--ivory);color:var(--ink);font:17px "Atkinson Hyperlegible","Avenir Next",Arial,sans-serif}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid var(--blue);outline-offset:3px}header{height:82px;padding:0 5vw;display:flex;align-items:center;gap:34px;border-bottom:1px solid var(--line);background:#f7f4eef5;position:relative;z-index:10}.logo{border:0;background:none;font-size:22px;font-weight:800;display:flex;align-items:center;gap:10px}.logo b{width:38px;height:38px;border:1px solid;border-radius:50%;display:grid;place-items:center;font-size:13px}.logo sup{color:var(--gold)}nav{display:flex;flex:1}nav button,.tools button{border:0;background:none;min-height:48px;padding:0 13px;color:#575650}nav .active{font-weight:800;border-bottom:2px solid var(--gold)}.tools{display:flex}.eyebrow{font-size:12px;letter-spacing:.16em;font-weight:800;color:#71633f}.pale{color:#dec58e}h1{font:500 clamp(46px,6vw,86px)/.99 Georgia,serif;letter-spacing:-.045em;margin:20px 0 24px}h1 em{color:var(--gold)}p{line-height:1.6;color:var(--muted)}.primary,.gold{border:0;min-height:56px;padding:0 27px;background:var(--blue);color:#fff;font-weight:800}.primary:disabled{opacity:.4}.link,.upload{min-height:50px;border:0;background:none;font-weight:800;padding:0 16px}.hero{display:grid;grid-template-columns:1.06fr .94fr;min-height:650px}.hero>div:first-child{padding:8vw 7vw}.hero p{max-width:620px;font-size:20px;margin-bottom:30px}.hero-photo{position:relative;min-height:630px;overflow:hidden;background:#222}.portrait{position:relative;background:url('/portraits-contact-sheet.png') 50% center/300% 100% no-repeat #888;min-height:200px}.p1{background-position:0 center}.p2{background-position:50% center}.p3{background-position:100% center}.hero-photo>.portrait{position:absolute;inset:0}.corners{position:absolute;inset:8%;border:1px solid #ffffff55}.corners:after{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:1px solid #c6a15b88}.id{position:absolute;left:9%;bottom:9%;background:#111318e8;color:white;padding:20px 26px;display:flex;flex-direction:column}.id small{color:var(--gold);letter-spacing:.13em}.id strong{font:27px Georgia;margin:7px 0}.id span{font-size:14px;color:#ccc}.cases{display:flex;border-block:1px solid var(--line);padding:0 5vw;min-height:115px}.cases>div{width:260px;display:flex;justify-content:center;flex-direction:column}.cases>div strong{margin-top:6px}.cases button{flex:1;border:0;border-left:1px solid var(--line);background:none;padding:15px;text-align:left;font-weight:700}.cases button i{display:block;font-style:normal;font-size:22px;color:var(--gold)}.cases .chosen{background:#fff;box-shadow:inset 0 -4px var(--gold)}.steps{display:flex;align-items:center;gap:18px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;max-width:1250px;margin:0 auto 34px}.steps>i{height:3px;background:#d5d0c7;flex:1}.steps b{display:block;height:100%;background:var(--gold)}.dark{background:var(--ink);color:white;min-height:calc(100vh - 82px);padding:34px 5vw 70px}.dark .steps>i{background:#383b43}.capture{display:grid;grid-template-columns:.7fr 1.3fr;gap:60px;max-width:1250px;margin:auto;align-items:center}.capture h1{font-size:clamp(46px,5vw,70px)}.capture p{color:#bbb;font-size:19px}.capture ul{list-style:none;padding:0;line-height:2}.gold{background:var(--gold);color:var(--ink);margin-top:15px}.upload{display:block;color:white}.viewfinder{height:min(67vh,650px);position:relative;overflow:hidden;background:radial-gradient(circle at 50% 35%,#62656a,#25282d 70%);border:1px solid #60636a;box-shadow:0 25px 70px #000}.vfhead,.vfmeta{position:absolute;left:0;right:0;display:flex;justify-content:space-between;padding:16px 20px;font:12px monospace;z-index:4}.vfhead{top:0}.vfmeta{bottom:0;background:#0007}.live{color:#ef7c77}.person{position:absolute;inset:17% 26% 0}.person i{position:absolute;width:45%;aspect-ratio:1;left:27%;top:4%;border-radius:50%;background:#b0b2b4}.person b{position:absolute;width:100%;height:58%;bottom:0;border-radius:50% 50% 0 0;background:#8e9195}.oval{position:absolute;inset:13% 24% 12%;border:2px solid #ffffffb5;border-radius:47%}.cross{position:absolute;background:#c6a15baa}.cross.x{height:1px;left:15%;right:15%;top:38%}.cross.y{width:1px;top:12%;bottom:12%;left:50%}.tip{position:absolute;bottom:12%;left:50%;translate:-50%;background:var(--ink);padding:7px 13px;font-size:13px;white-space:nowrap}.count{position:absolute;inset:0;background:#111318aa;display:grid;place-items:center;font:150px Georgia;z-index:6}.flow{padding:32px 6vw 110px;min-height:calc(100vh - 82px)}.review{display:grid;grid-template-columns:1fr 1fr;max-width:1200px;margin:auto;background:#fff}.photo-wrap{position:relative;min-height:650px}.photo-wrap>.portrait{position:absolute;inset:0}.blur{filter:blur(2px) saturate(.7)}.photo-wrap>span{position:absolute;top:20px;left:20px;background:var(--ink);color:white;padding:8px 12px;font-size:11px}.result{padding:52px}.status{margin:24px 0;display:flex;gap:10px;align-items:center;font-weight:800}.status i{font-style:normal;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#f2d4c3}.status.pass i{background:#d6e8dc;color:var(--green)}.score{display:flex;align-items:center;gap:12px}.score strong{font:68px Georgia}.score span{font-size:13px;color:var(--muted)}.result h2{font:32px/1.2 Georgia}.checks{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);margin:26px 0}.checks span{padding:14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;font-size:14px}.checks span:nth-child(odd){border-right:1px solid var(--line)}.checks b{color:var(--green)}.title{text-align:center;max-width:760px;margin:65px auto 35px}.title h1,.narrow h1,.success h1,.gallery h1{font-size:clamp(42px,5vw,68px)}.sheet{display:grid;grid-template-columns:1fr 1fr;gap:22px;max-width:880px;margin:auto}.sheet button{background:#fff;border:2px solid transparent;padding:0;text-align:left;position:relative}.sheet .selected{border-color:var(--blue)}.sheet .portrait{height:360px}.sheet button>span{display:flex;flex-direction:column;padding:18px}.sheet small{color:var(--muted)}.sheet button>i{position:absolute;right:18px;bottom:20px;width:27px;height:27px;border-radius:50%;background:var(--blue);color:#fff;text-align:center;font-style:normal}.center{display:block;margin:30px auto}.narrow{max-width:800px;margin:auto}.lead{font-size:20px}.consents{border-top:1px solid var(--line);margin:34px 0}.consents label{display:flex;align-items:center;padding:24px 4px;border-bottom:1px solid var(--line)}.consents label>span{display:flex;flex-direction:column;flex:1}.consents small{color:var(--muted);margin-top:6px}.consents input{position:absolute;opacity:0}.consents label>i{width:54px;height:30px;background:#c8c5be;border-radius:30px;position:relative}.consents label>i:after{content:"";position:absolute;width:22px;height:22px;border-radius:50%;background:#fff;left:4px;top:4px;transition:.2s}.consents input:checked+i{background:var(--green)}.consents input:checked+i:after{left:28px}.privacy{font-size:14px;background:#ece8df;padding:16px}.success{min-height:calc(100vh - 82px);text-align:center;display:flex;align-items:center;flex-direction:column;padding:85px 20px}.success>p{max-width:620px;font-size:20px}.tick{width:75px;height:75px;border-radius:50%;background:var(--green);color:white;display:grid;place-items:center;font-size:35px;margin-bottom:28px}.mini{display:flex;width:min(100%,500px);height:150px;background:#fff;text-align:left;margin:24px;box-shadow:0 12px 35px #0002}.mini .portrait{width:140px;min-height:0}.mini>div{display:flex;flex-direction:column;justify-content:center;padding:20px}.mini b{font:24px Georgia;margin:7px 0}.mini span{color:var(--green);font-size:13px}.gallery{padding:70px 6vw 120px;min-height:calc(100vh - 82px)}.gallery-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:42px}.gallery-head h1{margin:12px 0}.personal-grid,.assets{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}.personal-grid article,.assets article{background:#fff}.personal-grid .portrait{height:430px}.personal-grid article>div:last-child,.assets article>div:last-child{padding:21px;display:flex;gap:11px;align-items:center;flex-wrap:wrap}.personal-grid article b,.personal-grid article span{width:100%}.personal-grid article span{color:var(--muted)}.personal-grid button,.assets button,.devices button,.filters button{min-height:48px;border:1px solid var(--line);background:#fff;padding:0 15px;font-weight:700}.badge{position:absolute;top:15px;left:15px;padding:7px 10px;background:var(--green);color:white;font-size:12px}.search{font-size:13px;font-weight:700;display:flex;flex-direction:column;gap:8px}.search input{height:52px;width:310px;border:1px solid var(--line);padding:0 15px}.filters{display:flex;gap:10px;align-items:center;margin-bottom:24px}.filters span{margin-left:auto;color:var(--muted)}.assets{grid-template-columns:repeat(3,1fr)}.assets .portrait{height:360px}.assets h3{font:27px Georgia;margin:0}.assets p{margin:0;width:100%;font-size:14px}.console{background:#17191e;color:white;padding:65px 6vw 100px;min-height:calc(100vh - 82px)}.console-title{display:flex;justify-content:space-between}.console-title h1{font-size:58px}.console-title p{color:#aaa}.console-title>span{background:#2d302b;color:#d7bc7e;padding:10px 15px;height:max-content;font-size:12px}.devices{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:35px 0}.devices article{background:#22252b;border:1px solid #353840;padding:28px}.devices article>i{font-size:35px;color:var(--gold);font-style:normal}.devices small{display:block;color:#999;letter-spacing:.12em;margin-top:28px}.devices h2{font:26px Georgia}.devices b{display:block;color:#72a886}.devices b.offline{color:#eb8e7c}.devices p{color:#aaa;min-height:55px}.devices button{background:transparent;color:white;border-color:#555}.architecture{display:grid;grid-template-columns:1.2fr 1fr;gap:35px;background:var(--ivory);color:var(--ink);padding:34px}.architecture h2{font:32px Georgia;margin:9px 0}.architecture>div:nth-child(2){display:flex;align-items:center;justify-content:space-between;font-weight:800}.architecture>small{grid-column:1/-1;border-top:1px solid var(--line);padding-top:15px;color:var(--muted)}.help{position:fixed;right:20px;bottom:18px;z-index:30;min-height:50px;border:1px solid var(--line);background:#fff;padding:0 18px;font-weight:800;box-shadow:0 8px 25px #0002}.toast{position:fixed;left:50%;bottom:26px;translate:-50%;background:var(--ink);color:#fff;padding:16px 24px;z-index:40}.enter{animation:enter .35s ease both}@keyframes enter{from{opacity:0;transform:translateY(8px)}}@media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}}@media(max-width:900px){header{height:auto;min-height:76px;flex-wrap:wrap;padding:12px 20px;gap:8px}nav{order:3;width:100%;overflow:auto}.tools{margin-left:auto}.tools button:last-child{display:none}.hero,.capture,.review{grid-template-columns:1fr}.hero-photo{min-height:520px}.cases{overflow:auto;padding:0}.cases>div{display:none}.cases button{min-width:180px}.capture{gap:34px}.viewfinder{height:600px}.review .photo-wrap{min-height:520px}.devices,.assets{grid-template-columns:1fr 1fr}.architecture{grid-template-columns:1fr}.architecture>div:nth-child(2){grid-column:1}.personal-grid{grid-template-columns:1fr}}@media(max-width:620px){.logo{font-size:18px}.tools button:first-child{padding:0 5px}.hero>div:first-child{padding:55px 24px}.hero h1{font-size:49px}.hero-photo{min-height:480px}.id{right:9%}.dark,.flow,.gallery,.console{padding-left:18px;padding-right:18px}.capture h1{font-size:44px}.viewfinder{height:480px}.sheet,.devices,.assets{grid-template-columns:1fr}.sheet .portrait{height:330px}.result{padding:28px}.checks{grid-template-columns:1fr}.checks span:nth-child(odd){border-right:0}.gallery-head,.console-title{display:block}.search input{width:100%}.filters{overflow:auto}.filters button{white-space:nowrap}.assets .portrait{height:430px}.architecture>div:nth-child(2){display:grid;gap:8px}.help{right:8px;bottom:8px;font-size:13px}.steps{margin-bottom:22px}}
```

### `app/iq-theme.css`

```css
:root{--ink:#262626;--ivory:#fff;--gold:#ee6538;--blue:#e7552a;--green:#35966f;--line:#e7e7e7;--muted:#6f7378;--soft:#f6f7f8;--soft-orange:#fff1eb;--shadow:0 18px 50px rgba(30,35,40,.09)}
html{scroll-behavior:smooth;background:#fff}body{background:#fff;color:var(--ink);font-family:"Avenir Next","Helvetica Neue",Arial,sans-serif;letter-spacing:-.01em;overflow-x:hidden}button{touch-action:manipulation;-webkit-tap-highlight-color:rgba(231,85,42,.16);border-radius:10px;transition:background-color .18s ease,color .18s ease,border-color .18s ease,transform .18s ease,box-shadow .18s ease}button:active{transform:translateY(1px)}h1,h2,h3,.id strong,.score strong,.result h2,.mini b,.assets h3,.devices h2,.architecture h2{font-family:"Avenir Next","Helvetica Neue",Arial,sans-serif;text-wrap:balance}.skip-link{position:fixed;top:10px;left:10px;z-index:100;translate:0 -140%;background:#fff;color:var(--ink);padding:12px 16px;border-radius:8px;box-shadow:var(--shadow);font-weight:700}.skip-link:focus{translate:0}
header{height:76px;padding:0 clamp(20px,4.5vw,72px);gap:32px;border-bottom:1px solid #ededed;background:rgba(255,255,255,.95);backdrop-filter:blur(14px);position:sticky;top:0}.logo{font-size:18px;gap:10px;padding:0}.logo>span{display:flex;align-items:baseline;gap:6px;font-weight:500}.logo>span strong{font-size:26px;letter-spacing:-.06em}.logo b{position:relative;overflow:hidden;border:0;width:40px;height:40px;background:#f4f4f4}.logo b i{position:absolute;width:30px;height:18px;border-radius:50%;left:5px}.logo b i:nth-child(1){background:#ef4438;top:3px;rotate:-18deg}.logo b i:nth-child(2){background:#f4b52e;top:11px;rotate:28deg}.logo b i:nth-child(3){background:#68a83f;top:20px;rotate:-20deg}.logo sup{color:var(--gold);font-weight:800}.tools button,nav button{color:#4f5255;font-size:15px;border-radius:0}.tools button:hover,nav button:hover{color:var(--blue);background:transparent}nav .active{color:var(--blue);border-bottom:3px solid var(--blue)}
.eyebrow{color:var(--blue);font-size:12px;letter-spacing:.13em}.primary,.gold{background:var(--blue);border-radius:10px;box-shadow:0 8px 20px rgba(231,85,42,.2);padding-inline:28px}.primary:hover,.gold:hover{background:#ce431d;box-shadow:0 10px 24px rgba(231,85,42,.27);transform:translateY(-1px)}.link{color:#52565a;border-radius:10px}.link:hover{background:#f2f3f4;color:var(--blue)}
.hero{grid-template-columns:1fr 1fr;min-height:620px;background:linear-gradient(135deg,#fff 0%,#fff 52%,#f4f5f6 52%)}.hero>div:first-child{padding:clamp(64px,8vw,118px) clamp(32px,6vw,96px);display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.hero h1{font-size:clamp(50px,5.8vw,82px);font-weight:700;line-height:1.02;letter-spacing:-.055em;max-width:680px;margin:18px 0 22px}.hero h1 em{color:var(--blue);font-style:normal}.hero p{font-size:20px;max-width:550px;color:#686d72}.hero-actions{display:flex;align-items:center;gap:8px}.comfort-note{display:flex;gap:12px;align-items:center;margin-top:32px;padding:14px 18px;background:var(--soft-orange);border-radius:12px;color:var(--blue)}.comfort-note>span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#fff;font-weight:800}.comfort-note p{display:flex;flex-direction:column;margin:0;font-size:14px;line-height:1.4;color:#604d46}.comfort-note small{color:#7b6d67}.hero-photo{min-height:620px;margin:38px clamp(28px,5vw,72px) 38px 0;border-radius:22px;box-shadow:var(--shadow)}.corners{inset:6%;border-radius:15px;border-color:#ffffff88}.corners:after{border-left-color:#ee653899}.id{left:6%;right:6%;bottom:6%;border-radius:13px;background:rgba(34,34,34,.85);backdrop-filter:blur(12px);padding:18px 22px}.id small{color:#ff9a76}.id strong{font-size:24px;font-weight:700}.cases{background:var(--soft);border:0;padding:20px clamp(22px,5vw,76px);gap:10px;min-height:120px;align-items:stretch}.cases>div{padding-right:12px}.cases button{border:1px solid #e5e5e5;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 4px 14px rgba(30,35,40,.04)}.cases button:hover{border-color:#f0a78f;transform:translateY(-1px)}.cases .chosen{box-shadow:0 0 0 2px var(--blue);background:var(--soft-orange)}.cases button i{font-size:18px;color:var(--blue);margin-bottom:4px}
.dark{background:#252525;padding-top:30px}.capture{grid-template-columns:.72fr 1.28fr}.capture h1{font-weight:650;letter-spacing:-.045em}.capture p{color:#d0d0d0}.capture ul{display:grid;gap:10px}.capture li{display:flex;align-items:center;gap:11px;color:#e7e7e7}.capture li span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#ffffff12;color:#ff9570;font-size:13px;font-weight:800}.gold{background:#f36b3d;color:#fff}.upload{color:#fff;border:1px solid #ffffff30;margin-top:12px}.upload:hover{background:#ffffff10}.viewfinder{border-radius:20px;border-color:#4e4e4e;box-shadow:0 25px 70px #0007}.oval{border-color:#ffffffd0}.cross{background:#f36b3dcc}.tip{border-radius:8px;background:#f36b3d}.steps{letter-spacing:.03em;text-transform:none;font-size:14px}.steps>i{border-radius:20px;overflow:hidden}.steps b{background:var(--blue)}
.flow{background:var(--soft);padding-top:30px}.review{border-radius:20px;overflow:hidden;box-shadow:var(--shadow)}.photo-wrap>span{background:var(--blue);border-radius:8px}.result{padding:clamp(32px,5vw,58px)}.result h2{font-weight:650;letter-spacing:-.03em}.status i{background:#ffe0d6}.score strong{font-weight:750;letter-spacing:-.05em}.checks{border-radius:12px;overflow:hidden}.checks span{background:#fbfbfb}.title h1,.narrow h1,.success h1,.gallery h1{font-weight:700;letter-spacing:-.045em}.sheet{gap:18px}.sheet button{border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(30,35,40,.06)}.sheet button.selected{border-color:var(--blue);box-shadow:0 0 0 1px var(--blue),0 12px 28px rgba(231,85,42,.12)}.sheet button>i{background:var(--blue)}.narrow{background:#fff;margin-top:25px;margin-bottom:80px;min-height:auto;padding:40px clamp(25px,5vw,60px) 55px;border-radius:20px;box-shadow:var(--shadow)}.consents label{border:1px solid var(--line);padding:22px;border-radius:13px;margin-bottom:12px}.consents{border:0}.privacy{border-radius:10px;background:#f3f4f5}.consents input:checked+i{background:var(--blue)}
.success{background:linear-gradient(180deg,#fff 0%,#f5f6f7 100%)}.tick{background:var(--green);box-shadow:0 10px 26px rgba(53,150,111,.2)}.mini{border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}.gallery{background:var(--soft)}.gallery-head{align-items:center}.personal-grid article,.assets article{border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(30,35,40,.06)}.personal-grid button,.assets button,.devices button,.filters button{border-radius:9px}.assets button{background:var(--soft-orange);border-color:#ffd2c2;color:#b93e1c}.badge{background:var(--green);border-radius:8px}.search input{border-radius:10px;background:#fff}.search:focus-within input{border-color:var(--blue);box-shadow:0 0 0 3px rgba(231,85,42,.12)}.filters button:first-child{background:var(--ink);color:#fff;border-color:var(--ink)}
.console{background:#252525}.console-title h1{font-weight:700}.console-title>span{border-radius:9px;background:#3a302d;color:#ff9a76}.devices article{border-radius:14px;background:#303030;border-color:#414141}.devices button{border-radius:9px}.architecture{border-radius:16px;background:#fff}.help{border:0;border-radius:25px;background:var(--blue);color:#fff;box-shadow:0 8px 24px rgba(231,85,42,.28)}.help:hover{background:#ce431d}.toast{border-radius:11px;box-shadow:var(--shadow)}
@media(max-width:900px){.hero{background:#fff}.hero-photo{margin:0 24px 40px;min-height:560px}.cases{padding:14px;align-items:stretch}.capture{grid-template-columns:1fr;gap:34px}.narrow{margin:20px}.comfort-note{margin-top:24px}}
@media(max-width:620px){header{position:relative}.hero h1{font-size:48px}.hero>div:first-child{padding:52px 24px 38px}.hero-actions{align-items:stretch;flex-direction:column;width:100%}.hero-actions button{width:100%}.comfort-note{width:100%;align-items:flex-start}.hero-photo{margin:0 16px 28px;min-height:470px;border-radius:16px}.cases button{min-width:170px}.capture{display:flex;flex-direction:column}.capture>div:first-child{width:100%}.capture ul{margin-block:18px}.capture .gold,.capture .upload{width:100%}.viewfinder{width:100%;height:480px;border-radius:14px}.narrow{margin:12px}.gallery-head{align-items:flex-start}.help{max-width:205px}.logo>span{font-size:0}.logo>span strong{font-size:24px}}

.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.photo-media{position:relative;width:100%;height:100%;min-height:inherit;overflow:hidden}.user-photo{display:block;width:100%;height:100%;object-fit:cover;object-position:center}.hero-photo>.photo-media{position:absolute;inset:0}.photo-wrap>.photo-media{position:absolute;inset:0}.mini>.photo-media{width:140px;min-height:0;flex:none}.personal-grid .photo-media{height:430px}.assets .photo-media{height:360px}.selection-photo{height:360px;background:#ddd}.selection-photo .photo-media{height:100%}.enhanced-photo{filter:brightness(1.05) contrast(1.06) saturate(.96)}.camera-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:0}.viewfinder.has-video .camera-video{opacity:1}.viewfinder.has-video .person{display:none}.camera-error{margin:16px 0;padding:14px 16px;border-radius:10px;background:#4a2725;color:#ffd7cd;line-height:1.45}.empty-state{max-width:620px;margin:60px auto;padding:55px;text-align:center;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}.empty-state h2{font-size:28px;margin-top:0}.empty-state button{min-height:50px;border:1px solid var(--line);background:#fff;padding:0 20px;font-weight:700;border-radius:9px}.devices button:disabled{opacity:.4;cursor:not-allowed}.checking{opacity:.7;pointer-events:none}
.working-features{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:20px clamp(22px,5vw,76px);background:var(--soft)}.working-features span{display:flex;align-items:center;gap:12px;min-height:68px;padding:12px 18px;border-radius:12px;background:#fff;font-weight:700;box-shadow:0 4px 14px rgba(30,35,40,.04)}.working-features b{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:var(--soft-orange);color:var(--blue)}
@media(max-width:620px){.personal-grid .photo-media,.assets .photo-media{height:420px}.selection-photo{height:330px}.mini>.photo-media{width:120px}.empty-state{padding:34px 22px;margin:30px auto}.working-features{grid-template-columns:1fr;padding:16px}.working-features span{min-height:56px}}
```

### `app/app-ui.css`

```css
/* Tablet-first PhotoStudio application shell */
body{height:100dvh;overflow:hidden;background:#eef1f4}.app-shell{height:100dvh;display:grid;grid-template-columns:104px minmax(0,1fr);grid-template-rows:72px minmax(0,1fr);background:#eef1f4}.app-bar{grid-column:1/-1;grid-row:1;position:relative;top:auto;height:72px;padding:0 24px;border:0;border-bottom:1px solid #e4e7ea;background:rgba(255,255,255,.97);box-shadow:0 2px 12px rgba(30,35,40,.04);z-index:40}.app-bar .logo{margin-right:auto}.session-state{display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:20px;background:#f1f8f5;color:#2f765b;font-size:13px;font-weight:700}.session-state i{width:8px;height:8px;border-radius:50%;background:#43a47d;box-shadow:0 0 0 4px rgba(67,164,125,.12)}.app-bar .tools{margin-left:10px}.app-bar .tools button{border:1px solid #e4e7ea;border-radius:9px;min-height:42px;color:#606469}.app-bar .tools button:hover{border-color:#ef9b7f;background:#fff7f3}
button svg{flex:none}.primary,.gold,.upload,.link,.app-bar .tools button,.personal-grid button,.assets button,.devices button,.filters button,.help,.toast{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;line-height:1}.badge{display:inline-flex;align-items:center;gap:5px}.tick{display:grid;place-items:center}.sheet button>i{display:grid;place-items:center}.architecture>div:nth-child(2){gap:8px}.help span{display:inline}
.app-nav{grid-column:1;grid-row:2;display:flex;flex-direction:column;gap:8px;padding:18px 10px;border-right:1px solid #e3e6e9;background:#fff;z-index:30}.app-nav button{min-height:72px;padding:8px 4px;border:0;border-radius:13px;background:transparent;color:#72767b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-size:12px}.app-nav button>span{width:30px;height:26px;display:grid;place-items:center;font-size:21px;font-weight:500}.app-nav button>b{font-weight:650}.app-nav button:hover{background:#f6f7f8;color:#303236}.app-nav button.active{background:#fff0ea;color:#d84b23;box-shadow:inset 0 0 0 1px #ffd9cc}.app-nav button.active>span{transform:scale(1.04)}
.app-content{grid-column:2;grid-row:2;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;background:#eef1f4;padding:24px}.app-content>section{width:min(100%,1280px);min-height:calc(100dvh - 120px);margin:0 auto;border-radius:20px;overflow:hidden}.app-content .flow,.app-content .gallery{background:#f7f8f9}.app-content .dark,.app-content .console{box-shadow:0 12px 36px rgba(26,28,31,.14)}
.home-screen{background:transparent!important;overflow:visible!important}.welcome{display:flex;align-items:flex-end;justify-content:space-between;padding:4px 4px 22px}.welcome h1{margin:6px 0 2px;font-size:clamp(34px,4vw,50px);font-weight:720;line-height:1.05;letter-spacing:-.045em}.welcome p{margin:0;font-size:17px}.profile-chip{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #dfe5e2;border-radius:20px;background:#fff;color:#4c675c;font-size:13px;font-weight:700}.profile-chip i,.task-status i{width:8px;height:8px;border-radius:50%;background:#43a47d}.session-card{display:grid;grid-template-columns:minmax(0,.95fr) minmax(380px,.72fr);min-height:520px;border-radius:20px;background:#fff!important;box-shadow:0 12px 34px rgba(34,39,44,.08);overflow:hidden}.session-card>div:first-child{padding:clamp(38px,5vw,72px);display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.task-status{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:18px;background:#f1f8f5;color:#35785f;font-size:13px;font-weight:700}.session-card h2{max-width:580px;margin:20px 0 14px;font-size:clamp(34px,4vw,54px);line-height:1.05;letter-spacing:-.045em}.session-card p{max-width:580px;font-size:18px;margin:0 0 26px}.session-card .hero-photo{min-height:520px;margin:0;border-radius:0;box-shadow:none}.working-features{margin-top:16px;border-radius:16px;background:transparent;padding:0;gap:12px}.working-features span{min-height:74px;border:1px solid #e3e6e9;box-shadow:none}.working-features small{display:flex;flex-direction:column;gap:2px;color:#797d82;font-weight:500}.working-features small strong{color:#303236;font-size:15px}.working-features b{flex:none}
.app-content .dark{padding:28px clamp(28px,4vw,58px) 50px}.app-content .capture{max-width:1160px}.app-content .viewfinder{height:min(62vh,620px)}.app-content .flow{padding:28px clamp(26px,4vw,58px) 70px}.app-content .gallery{padding:50px clamp(26px,4vw,62px) 80px}.app-content .console{padding:48px clamp(26px,4vw,62px) 70px}.app-content .success{min-height:calc(100dvh - 120px);background:#fff}.app-content .narrow{min-height:auto;margin:20px auto 60px}.app-content .review{max-width:1120px}.app-content .photo-wrap{min-height:580px}.app-content .title{margin-top:40px}.app-content .sheet .portrait,.app-content .selection-photo{height:320px}.help{right:24px;bottom:24px;z-index:50}
@media(max-width:1024px){.app-shell{grid-template-columns:88px minmax(0,1fr)}.app-content{padding:18px}.app-nav button{min-height:68px}.session-state{display:none}.session-card{grid-template-columns:1fr .8fr;min-height:500px}.session-card>div:first-child{padding:38px}.session-card .hero-photo{min-height:500px}.app-content .capture{grid-template-columns:1fr;gap:28px}.app-content .viewfinder{height:560px}.app-content .devices{grid-template-columns:1fr}.app-content .architecture{grid-template-columns:1fr}.app-content .architecture>div:nth-child(2){grid-column:1}.help{bottom:20px}}
@media(max-width:700px){body{height:100dvh}.app-shell{grid-template-columns:1fr;grid-template-rows:64px minmax(0,1fr) 72px}.app-bar{grid-column:1;grid-row:1;height:64px;padding:0 16px}.app-bar .logo>span{font-size:0}.app-bar .logo>span strong{font-size:24px}.session-state{display:none}.app-bar .tools button{display:inline-flex!important;font-size:12px;padding:0 9px;min-height:38px}.app-nav{grid-column:1;grid-row:3;flex-direction:row;padding:6px 8px calc(6px + env(safe-area-inset-bottom));gap:4px;border:0;border-top:1px solid #dfe3e6}.app-nav button{flex:1;min-height:58px;gap:2px;border-radius:10px}.app-nav button>span{height:25px;font-size:19px}.app-nav button>b{font-size:11px}.app-content{grid-column:1;grid-row:2;padding:12px}.app-content>section{min-height:calc(100dvh - 160px);border-radius:16px}.welcome{align-items:flex-start;padding:8px 4px 16px}.welcome h1{font-size:34px}.welcome p{font-size:15px}.profile-chip{display:none}.session-card{grid-template-columns:1fr;min-height:0;border-radius:16px}.session-card>div:first-child{padding:28px 22px 26px}.session-card h2{font-size:35px}.session-card p{font-size:16px}.session-card .hero-actions{width:100%;flex-direction:column;align-items:stretch}.session-card .hero-actions button{width:100%}.session-card .hero-photo{min-height:370px;order:-1}.session-card .comfort-note{margin-top:20px}.working-features{display:flex;overflow-x:auto;padding-bottom:2px}.working-features span{min-width:240px}.app-content .dark{padding:20px 16px 42px}.app-content .capture{display:flex;flex-direction:column}.app-content .capture h1{font-size:40px}.app-content .viewfinder{height:440px}.app-content .flow{padding:18px 12px 48px}.app-content .review{grid-template-columns:1fr}.app-content .photo-wrap{min-height:430px}.app-content .gallery{padding:30px 16px 70px}.app-content .console{padding:30px 16px 60px}.app-content .console-title h1{font-size:42px}.app-content .success{min-height:calc(100dvh - 160px);padding-top:55px}.app-content .narrow{margin:0}.help{right:16px;bottom:86px;max-width:46px;width:46px;height:46px;overflow:hidden;white-space:nowrap;padding:0;font-size:inherit}.help span{display:none}.toast{bottom:92px;max-width:calc(100vw - 32px);white-space:nowrap}}
@media(min-width:701px) and (max-width:1100px) and (orientation:portrait){.session-card{grid-template-columns:1fr}.session-card .hero-photo{min-height:440px;order:-1}.session-card>div:first-child{padding:40px}.working-features{grid-template-columns:1fr 1fr 1fr}.app-content .capture{grid-template-columns:1fr}.app-content .viewfinder{height:620px}}

/* Compact native-app typography */
html,body,button,input{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif}body{font-size:16px;font-weight:400;letter-spacing:-.012em}.app-content h1,.app-content h2,.app-content h3{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;letter-spacing:-.035em}.welcome h1{font-size:clamp(34px,3vw,44px);font-weight:700}.session-card h2{font-size:clamp(32px,3.5vw,46px);font-weight:650}.app-content .capture h1{font-size:clamp(36px,4vw,52px)}.app-content .gallery h1,.app-content .title h1,.app-content .narrow h1{font-size:clamp(32px,3vw,42px)}.app-content .success h1{font-size:clamp(34px,3.5vw,46px)}.app-content .console-title h1{font-size:clamp(36px,4vw,50px)}.primary,.gold,.upload,.link,.app-nav button,.tools button{font-weight:650}.eyebrow{font-weight:700}.app-content p{line-height:1.5}

/* My Photos: compact library layout */
.photos-page{padding:38px clamp(24px,4vw,54px) 70px!important;background:#f7f8f9!important}.photos-toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}.photos-toolbar>div{display:flex;align-items:baseline;gap:12px}.photos-toolbar h1{margin:0!important;font-size:34px!important;font-weight:700}.photos-toolbar>div>span{color:#85898e;font-size:14px}.photos-toolbar .primary{min-height:46px;padding:0 18px}.photos-page .personal-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}.photo-card{border:1px solid #e3e6e9!important;border-radius:14px!important;box-shadow:0 5px 18px rgba(30,35,40,.05)!important;overflow:hidden;background:#fff}.photo-card .photo-media{height:320px}.photo-card-info{padding:14px!important;display:flex!important;align-items:center!important;justify-content:space-between;gap:12px!important;flex-wrap:nowrap!important}.photo-card-info>div:first-child{min-width:0;display:flex;flex-direction:column;gap:3px}.photo-card-info>div:first-child b{font-size:15px;font-weight:650}.photo-card-info>div:first-child span{font-size:12px;color:#85898e;white-space:nowrap}.photo-actions{display:flex;gap:6px;flex:none}.photo-actions button{width:40px;height:40px;min-height:40px!important;padding:0!important;border-radius:9px!important}.photo-actions button span{position:absolute;width:1px!important;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.photos-empty{min-height:390px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;border:1px dashed #d9dde1;border-radius:16px;background:#fff}.photos-empty>span{width:56px;height:56px;display:grid;place-items:center;border-radius:16px;background:#fff0ea;color:#dc542c}.photos-empty h2{margin:18px 0 4px;font-size:22px;font-weight:650}.photos-empty p{margin:0 0 20px;color:#81858a}.photos-empty .primary{min-height:46px;padding:0 18px;background:var(--blue)!important;color:#fff!important;border:0!important}
@media(max-width:700px){.photos-page{padding:22px 16px 74px!important}.photos-toolbar{margin-bottom:18px}.photos-toolbar h1{font-size:28px!important}.photos-toolbar>div>span{display:none}.photos-toolbar .primary{font-size:14px}.photos-page .personal-grid{grid-template-columns:1fr}.photo-card .photo-media{height:360px}.photos-empty{min-height:330px}.app-content .capture h1{font-size:36px}.app-content .gallery h1,.app-content .title h1,.app-content .narrow h1{font-size:30px}}

/* Keep Lucide icons and labels on one row */
.photos-toolbar .primary{min-width:138px;padding-inline:14px}.photos-empty .primary{min-width:128px}.hero-actions .primary{min-width:max-content}
@media(max-width:700px){.photos-toolbar .primary{min-width:116px;padding-inline:12px}.photos-empty .primary{min-width:120px}}

/* Photos capture and import actions */
.photos-toolbar .photos-heading{display:flex;align-items:baseline;gap:12px}
.photos-toolbar .photos-actions,.photos-empty .photos-actions{display:flex;align-items:center;gap:10px}
.photos-toolbar .photos-actions .primary,.photos-toolbar .take-photo,.photos-empty .photos-actions .primary,.photos-empty .take-photo{min-height:46px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:10px;font-size:14px;font-weight:700;white-space:nowrap}
.photos-toolbar .take-photo,.photos-empty .take-photo{border:1px solid #d8ddda;background:#fff;color:#26332d}
.photos-toolbar .take-photo:hover,.photos-empty .take-photo:hover{border-color:#aebbb5;background:#f2f5f3}
.photos-toolbar .photos-actions button:focus-visible,.photos-empty .photos-actions button:focus-visible{outline:3px solid #ef653d55;outline-offset:2px}
@media(max-width:700px){.photos-toolbar{align-items:stretch;flex-direction:column;gap:14px}.photos-toolbar .photos-actions,.photos-empty .photos-actions{width:100%}.photos-toolbar .photos-actions button,.photos-empty .photos-actions button{flex:1;min-width:0}.photos-empty .photos-actions{max-width:360px}}

/* Home: one-screen, low-copy task */
.home-screen{height:100%;min-height:0!important;display:flex;flex-direction:column}.home-screen .welcome{flex:none;padding:0 4px 16px}.home-screen .welcome h1{margin-top:4px}.home-screen .session-card{flex:1;min-height:0;max-height:calc(100dvh - 168px)}.home-screen .session-card>div:first-child{padding:clamp(30px,4vw,58px)}.home-screen .session-card h2{max-width:520px;margin:16px 0 10px;font-size:clamp(30px,3.2vw,43px)}.home-screen .session-card p{max-width:500px;margin:0 0 20px;font-size:17px}.home-screen .session-card .hero-photo{min-height:0;height:100%}.home-screen .hero-actions{margin-bottom:18px}.compact-privacy{display:inline-flex;align-items:center;gap:8px;color:#4d6f61;font-size:13px;font-weight:650}.compact-privacy svg{color:#35966f}.home-screen .id{padding:14px 18px}.home-screen .id strong{font-size:20px}.home-screen .id span{font-size:12px}
@media(max-width:1024px){.home-screen .session-card{max-height:calc(100dvh - 148px)}}
@media(min-width:701px) and (max-width:1100px) and (orientation:portrait){.home-screen .session-card{grid-template-columns:1fr 1fr}.home-screen .session-card .hero-photo{order:0;height:100%;min-height:0}.home-screen .session-card>div:first-child{padding:34px}}
@media(max-width:700px){.home-screen{height:auto;min-height:calc(100dvh - 160px)!important}.home-screen .welcome{padding:2px 4px 10px}.home-screen .welcome .eyebrow{display:none}.home-screen .welcome h1{font-size:28px;margin:0}.home-screen .session-card{flex:none;max-height:none}.home-screen .session-card .hero-photo{min-height:150px;height:150px;margin:14px 14px 0;border-radius:13px;order:-1}.home-screen .session-card>div:first-child{padding:18px 20px 20px}.home-screen .session-card h2{font-size:26px;margin:8px 0 6px}.home-screen .session-card p{font-size:14px;margin-bottom:12px;line-height:1.4}.home-screen .hero-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.home-screen .hero-actions button{min-height:44px;padding-inline:10px;font-size:14px}.home-screen .compact-privacy{font-size:12px}.home-screen .id{left:10px;right:10px;bottom:9px;padding:8px 10px;border-radius:9px}.home-screen .id small{display:none}.home-screen .id strong{font-size:15px;margin:0}.home-screen .id span{font-size:10px}.home-screen .corners{display:none}}

/* Compact profile preview: photo first, identity details below. */
.home-screen .session-card{grid-template-columns:minmax(0,1fr) minmax(250px,32%)}
.profile-preview{position:relative;align-self:center;width:calc(100% - 52px);max-width:260px;margin:26px;background:#f5f6f6;border:1px solid #dfe4e1;border-radius:18px;box-shadow:0 16px 34px rgba(41,49,45,.12);overflow:hidden}
.profile-preview:before{position:absolute;inset:0 0 auto;z-index:2;height:4px;background:linear-gradient(90deg,#e95f39 0 34%,#eca934 34% 67%,#72a858 67%);content:""}
.home-screen .profile-preview .hero-photo{position:relative;width:100%;height:auto;min-height:0;aspect-ratio:4/5;margin:0;border-radius:0;box-shadow:none}
.home-screen .profile-preview .user-photo{width:100%;height:100%;object-fit:cover;object-position:center 28%}
.profile-details{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;background:#fff}
.profile-details>div{display:flex;min-width:0;flex-direction:column;gap:2px}
.profile-details small{color:#777e7a;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.profile-details strong{overflow:hidden;color:#252a28;font-size:15px;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}
.profile-details>span{display:inline-flex;align-items:center;gap:6px;flex:none;color:#477360;font-size:11px;font-weight:700}
.profile-details>span i{width:7px;height:7px;border-radius:50%;background:#43a47d}
@media(max-width:700px){.home-screen .session-card{grid-template-columns:1fr}.home-screen .profile-preview{order:-1;width:132px;max-width:132px;margin:12px auto 0;border-radius:14px}.home-screen .profile-preview .hero-photo{height:auto;min-height:0;aspect-ratio:4/5}.home-screen .profile-details{display:block;padding:8px 9px;text-align:center}.home-screen .profile-details small{display:none}.home-screen .profile-details strong{font-size:13px}.home-screen .profile-details>span{justify-content:center;margin-top:3px;font-size:10px}}

/* Studio+ appointment check-in */
.qr-home{height:100%;min-height:0!important;display:grid;grid-template-columns:minmax(280px,.72fr) minmax(420px,1.1fr);grid-template-rows:1fr auto;gap:22px;padding:clamp(28px,4vw,56px)!important;background:linear-gradient(135deg,#fff 0 54%,#f4f7f5 54%)!important}
.qr-intro{align-self:center;max-width:440px}.qr-intro h1{margin:12px 0 12px;font-size:clamp(38px,4vw,56px);line-height:1.02}.qr-intro p{margin:0 0 24px;color:#68716d;font-size:17px;line-height:1.5}.qr-intro a{display:inline-flex;align-items:center;gap:7px;color:#bd4b2e;font-size:14px;font-weight:750;text-decoration:none}.qr-scanner{position:relative;grid-row:1/3;grid-column:2;min-height:0;overflow:hidden;border-radius:22px;background:#17201d;box-shadow:0 18px 44px rgba(28,38,34,.2)}.qr-scanner video{width:100%;height:100%;display:block;object-fit:cover}.qr-scanner:not(.live) video{opacity:.12}.scan-shade{position:absolute;inset:0;background:radial-gradient(circle at center,transparent 0 27%,rgba(10,16,14,.58) 28%)}.scan-frame{position:absolute;left:50%;top:50%;width:min(54%,310px);aspect-ratio:1;display:grid;place-items:center;translate:-50% -50%;color:#ffffffa0}.scan-frame i{position:absolute;width:45px;height:45px;border-color:#fff}.scan-frame i:nth-child(1){left:0;top:0;border-left:4px solid;border-top:4px solid;border-radius:12px 0 0}.scan-frame i:nth-child(2){right:0;top:0;border-right:4px solid;border-top:4px solid;border-radius:0 12px 0 0}.scan-frame i:nth-child(3){left:0;bottom:0;border-left:4px solid;border-bottom:4px solid;border-radius:0 0 0 12px}.scan-frame i:nth-child(4){right:0;bottom:0;border-right:4px solid;border-bottom:4px solid;border-radius:0 0 12px}.scan-frame span{position:absolute;bottom:-34px;color:#fff;font-size:13px;font-weight:700}.qr-scanner.live .scan-frame:after{position:absolute;left:8%;right:8%;top:10%;height:2px;background:#ef6843;box-shadow:0 0 14px #ef6843;content:"";animation:qr-scan 2.2s ease-in-out infinite}.scanner-start{position:absolute;left:50%;bottom:34px;min-height:50px;display:flex;align-items:center;gap:8px;translate:-50% 0;padding:0 20px;border:0;border-radius:12px;background:#e85d38;color:#fff;font-weight:750;box-shadow:0 10px 24px #0005}.manual-checkin{align-self:end;padding:17px;border:1px solid #e0e5e2;border-radius:15px;background:#fff}.manual-checkin>div{display:flex;align-items:center;gap:10px;margin-bottom:10px;color:#66706b}.manual-checkin>div span{display:flex;flex-direction:column;font-size:12px}.manual-checkin form{display:grid;grid-template-columns:1fr auto;gap:8px}.manual-checkin input{min-width:0;height:44px;padding:0 12px;border:1px solid #dce2df;border-radius:10px}.manual-checkin button{display:flex;align-items:center;gap:7px;padding:0 14px;border:0;border-radius:10px;background:#293a34;color:#fff;font-weight:700}.manual-checkin>p{margin:9px 0 0;color:#bc4b31;font-size:12px}.qr-scanner.error{box-shadow:0 0 0 2px #d95a3d}.qr-scanner.starting .scanner-start{opacity:.65;pointer-events:none}@keyframes qr-scan{0%,100%{top:10%}50%{top:88%}}
.qr-main-actions{display:flex;align-items:center;flex-wrap:wrap;gap:14px}.qr-main-actions .main-photo-action{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 18px;border:0;border-radius:10px;background:#293a34;color:#fff;font-size:14px;font-weight:750;box-shadow:0 8px 20px rgba(28,44,37,.16)}.qr-main-actions .main-photo-action:hover{background:#354b42;transform:translateY(-1px)}.qr-main-actions .main-photo-action:focus-visible{outline:3px solid #e85d3866;outline-offset:3px}
@media(max-width:900px){.qr-home{grid-template-columns:1fr 1.15fr;padding:26px!important}.qr-intro h1{font-size:40px}.qr-scanner{min-height:500px}}
@media(max-width:700px){.qr-home{height:auto;min-height:calc(100dvh - 160px)!important;display:flex;flex-direction:column;gap:12px;padding:16px!important}.qr-intro{text-align:center}.qr-intro .eyebrow{display:none}.qr-intro h1{margin:0 0 6px;font-size:27px}.qr-intro p{margin:0 auto 10px;max-width:330px;font-size:13px}.qr-main-actions{justify-content:center}.qr-main-actions .main-photo-action{min-height:44px;padding-inline:15px}.qr-intro a{font-size:12px}.qr-scanner{order:2;width:100%;min-height:300px;max-height:360px;border-radius:16px}.manual-checkin{order:3;padding:12px}.manual-checkin>div{display:none}.manual-checkin form{grid-template-columns:1fr}.manual-checkin button{justify-content:center;min-height:42px}}
@media(prefers-reduced-motion:reduce){.qr-scanner.live .scan-frame:after{animation:none;top:50%}}

.photo-card-category{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 14px 0}
.photo-category-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:#eef2f6;color:#4a5560;font-size:11px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}
.photo-card-category.awards .photo-category-tag{background:#fdf1dd;color:#8a5a12}
.photo-category-switch{display:flex;gap:4px;padding:3px;border-radius:9px;background:#f2f4f6}
.photo-category-switch button{min-height:26px!important;padding:0 9px!important;border:0!important;border-radius:6px!important;background:transparent!important;color:#6d757e!important;font-size:11px!important;font-weight:650}
.photo-category-switch button.active{background:#fff!important;color:#1f262c!important;box-shadow:0 1px 3px rgba(20,25,30,.14)}

.session-file{display:flex;align-items:center;gap:8px;margin:10px 0 0;font-size:12px;color:#8b9299}
.session-file span{padding:2px 7px;border-radius:999px;background:#2a322e;color:#c8d0cb;font-size:10px;font-weight:750;letter-spacing:.05em;text-transform:uppercase}
.final-quality .session-file{color:#7d858c}
.final-quality .session-file span{background:#eef1f4;color:#5b646c}

.rating-feedback .hard-gates{margin:8px 0 6px;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}
.rating-feedback .hard-gates li{padding:6px 10px;border-left:3px solid #d1553a;border-radius:0 7px 7px 0;background:#d1553a1a;color:#e8a493;font-size:12.5px;font-weight:600}
.final-quality .rating-feedback .hard-gates li{background:#fbeae6;color:#9d3a22}

.score-trace{margin-top:18px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.02)}
.score-trace b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.66}
.score-trace ol{margin:8px 0 0;padding-left:18px;display:grid;gap:5px}
.score-trace li{font-size:12.5px;line-height:1.5;opacity:.8}

/* A REVIEW verdict is the AI asking for a designer, so that path leads with the action rather than
   hiding it behind a dispute checkbox. */
.appeal.recommended .appeal-body{margin-top:9px}
.appeal-lead{display:flex;align-items:flex-start;gap:8px;margin:0;color:#e9c789;font-size:12px;line-height:1.45}
.appeal-lead svg{flex:none;margin-top:2px}
.final-quality .appeal-lead{color:#8a5a12}

/* Designer review appeal: the agent's right of reply to a judgement call. Deliberately quieter than the
   verdict above it — an option, not a second opinion competing with the first. */
.appeal{margin:12px 0 0;padding:11px 0 0;border-top:1px solid #ffffff14}
.appeal-toggle{display:flex;align-items:center;gap:9px;cursor:pointer}
.appeal-toggle input{width:16px;height:16px;flex:none;accent-color:#f57721;cursor:pointer}
.appeal-toggle span{color:#ffffffb0;font-size:12px;font-weight:650}
.appeal-toggle:hover span{color:#fff}
.appeal-body{margin:10px 0 0;padding:11px 12px;border-radius:10px;background:#ffffff0a}
.appeal-body>small{display:block;color:#ffffff62;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.appeal-body>ul{margin:7px 0 0;padding:0 0 0 16px;display:flex;flex-direction:column;gap:4px}
.appeal-body>ul li{color:#ffffffa8;font-size:12px}
.appeal-note{margin:11px 0 0;display:flex;flex-direction:column;gap:5px}
.appeal-note span{color:#ffffff7a;font-size:11px}
.appeal-note textarea{width:100%;padding:8px 10px;border:1px solid #ffffff1f;border-radius:8px;background:#0000002e;color:#fff;font:inherit;font-size:12px;resize:vertical}
.appeal-note textarea:focus{border-color:#f57721;outline:none}
.appeal-send{min-height:38px;width:100%;margin:11px 0 0;padding:0 14px;border:0;border-radius:9px;background:#f57721;color:#fff;font-size:11px;font-weight:800;cursor:pointer}
.appeal-send:hover{background:#ff8938}
.appeal-blocked,.appeal-sent{display:flex;align-items:flex-start;gap:8px;margin:12px 0 0;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.45}
.appeal-blocked{border-left:3px solid #d1553a;background:#d1553a1a;color:#e8a493}
.appeal-sent{border-left:3px solid #5ce493;background:#5ce4931a;color:#b9f8d0}
.appeal-blocked svg,.appeal-sent svg{flex:none;margin-top:2px}
.appeal-blocked small,.appeal-sent small{display:block;margin:4px 0 0;opacity:.72;font-size:11px}
/* The final-review card sits on white, so the same controls need the light treatment. */
.final-quality .appeal{border-top-color:#dfe5e2}
.final-quality .appeal-toggle span{color:#3d4a44}
.final-quality .appeal-body{background:#f4f7f5}
.final-quality .appeal-body>small{color:#77837c}
.final-quality .appeal-body>ul li{color:#41504a}
.final-quality .appeal-note span{color:#5d6b64}
.final-quality .appeal-note textarea{border-color:#d5ddd8;background:#fff;color:#17211d}
.final-quality .appeal-blocked{background:#fbeae6;color:#9d3a22}
.final-quality .appeal-sent{background:#e8f7ee;color:#1f6b3f}
```

### `app/studio-camera.css`

```css
.session-confirm{min-height:100dvh;display:grid;grid-template-columns:minmax(300px,430px) minmax(320px,520px);place-content:center;gap:54px;padding:40px;background:#f2f5f3}.session-agent-photo{height:540px;overflow:hidden;border-radius:24px;background:#29332f;box-shadow:0 20px 50px #26342d25}.session-confirm>div:last-child{align-self:center}.session-confirm h1{margin:12px 0 8px;font:700 48px/1.05 ui-sans-serif;letter-spacing:-.04em}.session-confirm p{margin:0 0 22px}.session-confirm code{display:block;margin:16px 0 24px;padding:12px;border-radius:10px;background:#e6ebe8}.agent-rating{display:flex;align-items:center;gap:12px;padding:13px 16px;border:1px solid #dbe2de;border-radius:12px;background:#fff}.agent-rating strong{font-size:25px}.agent-rating span{font-size:12px}.studio-camera{position:fixed;inset:0;z-index:200;background:#090c0b;color:#fff;overflow:hidden}.studio-camera>video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);transition:filter .12s linear}.camera-top{position:absolute;inset:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:20px 26px;background:linear-gradient(#000b,transparent)}.camera-top button{width:44px;height:44px;border:0;border-radius:50%;background:#ffffff20;color:#fff;font-size:28px}.camera-focus{position:absolute;left:50%;top:46%;width:min(43vw,430px);height:min(65vh,620px);translate:-50% -50%;border:2px solid #ffffff75;border-radius:48%}.camera-controls{position:absolute;left:22px;right:22px;bottom:20px;display:grid;grid-template-columns:1fr 1.4fr 100px;align-items:center;gap:18px;padding:16px 20px;border-radius:20px;background:#101513d9;backdrop-filter:blur(15px)}.shot-options,.beauty-control{display:flex;align-items:center;gap:8px}.shot-options button{width:38px;height:38px;border:0;border-radius:50%;background:#ffffff15;color:#fff}.shot-options button.active{background:#e45b36}.beauty-control button{height:40px;display:flex;align-items:center;gap:6px;border:0;border-radius:10px;background:#ffffff12;color:#fff}.beauty-control button.on{color:#ffb09a}.beauty-control input{flex:1}.shutter{width:70px;height:70px;display:grid;place-items:center;border:3px solid #fff;border-radius:50%;background:transparent}.shutter i{width:52px;height:52px;border-radius:50%;background:#fff}.studio-timer{position:absolute;inset:0;display:grid;place-content:center;text-align:center;background:#0004}.studio-timer strong{font-size:110px}.studio-timer span{font-size:18px}.camera-loading{position:absolute;inset:0;display:grid;place-items:center;background:#101513}.batch-review{min-height:100dvh;padding:34px;background:#f1f4f2}.batch-review header{height:auto;position:static;display:flex;justify-content:space-between;background:transparent;border:0;padding:0}.batch-review h1{margin:6px 0;font:700 42px ui-sans-serif}.batch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin:28px 0 90px}.batch-grid article{overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 8px 24px #24322b15}.batch-grid img{width:100%;height:360px;display:block;object-fit:cover}.batch-grid article>div,.batch-grid label{display:flex;align-items:center;gap:10px;padding:12px 14px}.batch-grid article>div{justify-content:space-between}.batch-grid label input{flex:1}.batch-grid button{display:flex;align-items:center;gap:5px}.batch-review footer{position:fixed;left:0;right:0;bottom:0;padding:16px;text-align:center;background:#fff;border-top:1px solid #ddd}@media(max-width:700px){.session-confirm{grid-template-columns:1fr;padding:20px}.session-agent-photo{height:330px}.camera-controls{grid-template-columns:1fr;right:12px;left:12px}.camera-controls .shutter{position:absolute;right:15px;bottom:110px}.beauty-control{order:2}.batch-grid img{height:320px}}
```

### `app/camera-pro.css`

```css
.beauty-preview{position:absolute;pointer-events:none;background:#ffe8dd10;mix-blend-mode:screen;z-index:1;border-radius:50%;opacity:.55;transition:opacity .18s ease,background-color .18s ease}.camera-top{z-index:5;padding:18px 24px}.camera-top>div{display:flex;flex-direction:column;text-align:center}.camera-top>div span{font-weight:700}.camera-top>div small{margin-top:2px;color:#ffffffa8;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.camera-stage{position:absolute;z-index:2;inset:0;border:1px solid #ffffff40;border-radius:28px;transition:border-color .25s,box-shadow .25s}.placement-ready .camera-stage{border-color:#62e79a;box-shadow:inset 0 0 0 2px #62e79a,0 0 34px #36d77d28}.ratio-label{position:absolute;top:12px;left:50%;translate:-50%;padding:5px 9px;border-radius:20px;background:#090c0b8f;color:#ffffffb5;font:700 10px/1 ui-sans-serif;letter-spacing:.14em}.crop-corners i{position:absolute;width:28px;height:28px;border-color:#fff;border-style:solid}.placement-ready .crop-corners i{border-color:#62e79a}.crop-corners i:nth-child(1){left:-2px;top:-2px;border-width:3px 0 0 3px;border-radius:23px 0 0}.crop-corners i:nth-child(2){right:-2px;top:-2px;border-width:3px 3px 0 0;border-radius:0 23px 0 0}.crop-corners i:nth-child(3){left:-2px;bottom:-2px;border-width:0 0 3px 3px;border-radius:0 0 0 23px}.crop-corners i:nth-child(4){right:-2px;bottom:-2px;border-width:0 3px 3px 0;border-radius:0 0 23px}.head-guide{position:absolute;left:50%;top:10%;width:38%;height:30%;translate:-50%;border:2px dashed #ffffff8a;border-radius:50%}.placement-ready .head-guide{border-color:#62e79a;border-style:solid;background:#45df8710;box-shadow:0 0 24px #39df7f40}.waist-guide{position:absolute;left:15%;right:15%;top:70%;border-top:1px dashed #ffffff75}.waist-guide span{position:absolute;right:0;top:6px;color:#ffffff9e;font:700 9px ui-sans-serif;letter-spacing:.12em}.studio-camera{overflow:auto;background:#101412}.camera-workspace{width:min(100%,1120px);min-height:100dvh;margin:auto;padding:18px 24px 22px;display:grid;grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto 1fr;gap:14px 24px}.camera-top{position:static;grid-column:1/-1;padding:0;background:none}.camera-top button{background:#202724;border:1px solid #ffffff18}.camera-viewport{position:relative;grid-row:2;justify-self:center;height:min(72dvh,720px);aspect-ratio:4/5;overflow:hidden;border-radius:28px;background:#050706;box-shadow:0 24px 70px #0009}.camera-viewport>video{display:block;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}.placement-status{position:static;grid-column:2;grid-row:2;align-self:start;justify-self:stretch;translate:none;margin-top:80px;display:flex;align-items:center;gap:8px;padding:14px;border:1px solid #ffffff22;border-radius:14px;background:#111715ca;font-size:13px;font-weight:650}.placement-status i{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#ffffff12}.placement-status.ready{color:#d9ffea;border-color:#56db8c66;background:#153c2dd9}.placement-status.ready i{background:#31c972;color:#071b10}.camera-controls{position:static;grid-column:2;grid-row:2;align-self:end;display:flex;flex-direction:column;align-items:stretch;padding:16px;gap:16px;border:1px solid #ffffff16;border-radius:18px;background:#0b100ee8}.shot-options,.beauty-control{display:flex;align-items:center;gap:8px}.shot-options>span{margin-right:auto;color:#ffffff8f;font-size:12px}.shot-options button{width:38px;height:38px;border:0;border-radius:50%;background:#ffffff15;color:#fff}.shot-options button.active{background:#ef653d}.beauty-control{display:grid;grid-template-columns:1fr auto}.beauty-control button{height:40px;border:0;border-radius:10px;background:#ffffff12;color:#fff}.beauty-control button.on{background:#ef653d24;color:#ffc1ae}.beauty-control input{grid-column:1/-1;width:100%;accent-color:#ef653d}.auto-capture{display:grid;grid-template-columns:32px 1fr;align-items:center;padding:12px;border-top:1px solid #ffffff12;color:#bfffd8}.auto-capture>svg{grid-row:1/3;width:28px;height:28px;padding:6px;border-radius:50%;background:#2dcc70;color:#07150d}.auto-capture span{font-weight:750}.auto-capture small{color:#ffffff83}.studio-timer{position:absolute;inset:0;z-index:4;display:grid;place-content:start center;padding-top:44%;background:transparent;backdrop-filter:none}.countdown-pulse{width:92px;height:92px;display:grid;place-items:center;border-radius:50%;background:#0b120ed9;box-shadow:0 0 0 5px #55e38e55,0 12px 35px #0008}.studio-timer strong{font:750 56px/1 ui-sans-serif}.camera-loading{z-index:20}@media(max-width:760px){.camera-workspace{display:flex;flex-direction:column;padding:12px}.camera-viewport{order:2;width:min(100%,56dvh);height:auto;max-height:62dvh;flex:none}.camera-top{order:1}.placement-status{order:3;margin:0;align-self:center;width:min(100%,500px)}.camera-controls{order:4;width:min(100%,500px);align-self:center}}
```

### `app/camera-v2.css`

```css
/* Centered full-preview camera with crop-safe controls. */
.camera-workspace {
  width: min(100%, 1040px);
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  justify-items: center;
  gap: 12px;
  padding: 16px 24px;
}
.camera-top { width: 100%; max-width: 900px; position: relative; z-index: 30; pointer-events: auto; }
.camera-top .camera-close {
  position: relative;
  z-index: 40;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #ffffff29;
  background: #262d2a;
  box-shadow: 0 7px 20px #0005;
  line-height: 1;
  touch-action: manipulation;
}
.camera-top .camera-close span { display: block; translate: 0 -1px; font-size: 30px; }
.camera-top .camera-close:hover { background: #39413e; border-color: #ffffff4d; }
.camera-top .camera-close:active { transform: scale(.94); }
.camera-viewport {
  grid-column: 1;
  grid-row: 2;
  width: min(100%, 900px);
  height: min(64dvh, 620px);
  aspect-ratio: 16 / 10;
  border-radius: 24px;
}
.camera-viewport > video { object-fit: contain; background: #050706; }
.camera-stage {
  top: 50%;
  right: auto;
  bottom: auto;
  left: 50%;
  translate: -50% -50%;
  height: 84%;
  width: auto;
  aspect-ratio: 4 / 5;
  border-radius: 18px;
  box-shadow: 0 0 0 100vmax #0508068a;
  transition: height 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}
.crop-square .camera-stage { top: 50%; right: auto; bottom: auto; height: 74%; aspect-ratio: 1 / 1; }
.placement-ready .camera-stage {
  box-shadow: 0 0 0 100vmax #05080673, inset 0 0 0 2px #62e79a, 0 0 32px #36d77d30;
}
.head-guide { top: 11%; width: 40%; height: 31%; }
.crop-square .head-guide { top: 10%; width: 34%; height: 34%; }
.placement-status {
  grid-column: 1;
  grid-row: 3;
  margin: 0;
  width: max-content;
  max-width: calc(100vw - 32px);
  justify-self: center;
  padding: 10px 16px;
  border-radius: 999px;
}
.camera-controls {
  grid-column: 1;
  grid-row: 4;
  position: static;
  width: min(100%, 900px);
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 18px;
}
.format-options { display: flex; gap: 5px; padding: 4px; border-radius: 12px; background: #ffffff0a; }
.format-options button {
  min-height: 38px;
  padding: 0 12px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #ffffffa5;
  font-size: 12px;
  font-weight: 750;
}
.format-options button.active { background: #fff; color: #121713; }
.beauty-control { grid-template-columns: minmax(145px, auto) 44px; min-width: 220px; }
.beauty-control button {
  justify-content: flex-start;
  padding: 0 11px;
  border: 1px solid #ffffff14;
  touch-action: manipulation;
}
.beauty-control button span { display: flex; align-items: center; gap: 6px; font-weight: 700; }
.beauty-control button small {
  padding: 3px 6px;
  border-radius: 999px;
  background: #ffffff14;
  color: #ffffff78;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.beauty-control button.on { border-color: #ef653d66; background: #ef653d2c; }
.beauty-control button.on small { background: #ef653d; color: #fff; }
.beauty-control input { grid-column: 1 / -1; }
.auto-capture { border: 0; padding: 5px 8px; }
.studio-timer { padding-top: 26%; }
.countdown-pulse { width: 78px; height: 78px; }
.studio-timer strong { font-size: 48px; }
.camera-flash {
  position: absolute;
  inset: 0;
  z-index: 18;
  pointer-events: none;
  background: #fff;
  animation: cameraFlash 420ms ease-out both;
}
.shot-preview {
  position: absolute;
  inset: 0;
  z-index: 17;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #050706;
  animation: previewSettle 260ms 100ms ease-out both;
}
.shot-preview-frame { position: relative; height: min(78%, 520px); overflow: hidden; border: 2px solid #ffffffba; border-radius: 16px; background: #101412; box-shadow: 0 20px 58px #000a; }
.shot-preview-frame.portrait { aspect-ratio: 4 / 5; }
.shot-preview-frame.square { height: min(74%, 500px); aspect-ratio: 1 / 1; }
.shot-preview-frame img { width: 100%; height: 100%; display: block; object-fit: cover; }
.preview-crop-label,.batch-crop-label { position: absolute; top: 10px; left: 10px; padding: 6px 8px; border: 1px solid #ffffff24; border-radius: 999px; background: #090d0bcf; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.shot-preview>.shot-confirmation {
  position: absolute;
  left: 50%;
  bottom: 18px;
  translate: -50%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 13px;
  border-radius: 999px;
  background: #102319e8;
  color: #caffdc;
  box-shadow: 0 8px 24px #0007;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}
.live-pose-card { width: min(220px, 32%); position: absolute; top: 14px; left: 14px; z-index: 6; padding: 11px 12px; border: 1px solid #ffffff20; border-radius: 14px; background: #0b100ed9; box-shadow: 0 12px 30px #0006; backdrop-filter: blur(14px); }
.live-pose-card>div { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
.live-pose-card>div>span { color: #ffffffa0; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.live-pose-card strong { color: #fff; font: 800 23px/1 ui-sans-serif; }
.live-pose-card strong small { margin-left: 2px; color: #ffffff72; font-size: 9px; }
.live-pose-card>i { height: 4px; display: block; overflow: hidden; margin: 8px 0; border-radius: 99px; background: #ffffff16; }
.live-pose-card>i>b { height: 100%; display: block; border-radius: inherit; background: #ef7656; transition: width 180ms ease, background-color 180ms ease; }
.live-pose-card.fair>i>b { background: #f3b44d; }
.live-pose-card.good>i>b { background: #5ce493; }
.live-pose-card p { margin: 0; color: #fff; font-size: 11px; font-weight: 650; line-height: 1.35; }
.live-pose-card>small { display: block; margin-top: 5px; color: #ffffff56; font-size: 8px; }
.camera-rating { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border: 1px solid #ffffff24; border-radius: 12px; background: #111714e8; color: #fff; box-shadow: 0 8px 24px #0007; }
.camera-rating>strong { width: 39px; height: 39px; display: grid; place-items: center; flex: none; border: 3px solid #ef7656; border-radius: 50%; font-size: 14px; }
.camera-rating.fair>strong { border-color: #f3b44d; }
.camera-rating.good>strong { border-color: #5ce493; }
.camera-rating>span { display: flex; flex-direction: column; gap: 2px; text-align: left; }
.camera-rating>span b { font-size: 10px; }
.camera-rating>span small { max-width: 120px; overflow: hidden; color: #ffffff8b; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.shot-preview>.camera-rating { position: absolute; top: 18px; right: 18px; }
.camera-rating.compact { position: absolute; top: 10px; right: 10px; z-index: 2; gap: 6px; padding: 6px 8px; border-radius: 10px; }
.camera-rating.compact>strong { width: 32px; height: 32px; border-width: 2px; font-size: 11px; }
.camera-rating.compact>span b { font-size: 8px; }
.camera-rating.compact>span small { max-width: 82px; font-size: 7px; }
.batch-crop-label { z-index: 2; }
@keyframes cameraFlash {
  0% { opacity: 0; }
  10% { opacity: 1; }
  38% { opacity: .82; }
  100% { opacity: 0; }
}
@keyframes previewSettle {
  from { opacity: 0; transform: scale(1.035); }
  to { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .camera-flash, .shot-preview { animation: none; }
  .camera-flash { opacity: 0; }
}

@media (max-width: 800px) {
  .camera-workspace { padding: 10px 12px; }
  .camera-viewport { width: 100%; height: min(58dvh, 560px); }
  .camera-controls { grid-template-columns: 1fr 1fr; justify-content: stretch; width: 100%; gap: 10px; }
  .format-options, .shot-options { width: 100%; }
  .beauty-control { min-width: 0; }
  .auto-capture { grid-column: 1 / -1; justify-self: stretch; }
  .camera-stage { top: 50%; right: auto; bottom: auto; height: 80%; }
  .crop-square .camera-stage { top: 50%; right: auto; bottom: auto; height: 68%; }
}

@media (max-width: 520px) {
  .camera-viewport { height: min(52dvh, 470px); border-radius: 18px; }
  .camera-controls { grid-template-columns: 1fr; }
  .format-options, .shot-options { justify-content: center; }
  .auto-capture { justify-self: stretch; }
  .placement-status { font-size: 12px; }
  .camera-top > div small { display: block; }
  .camera-stage { top: 50%; right: auto; bottom: auto; height: 78%; }
  .crop-square .camera-stage { top: 50%; right: auto; bottom: auto; height: 66%; }
  .live-pose-card { width: auto; right: 10px; top: 10px; left: 10px; padding: 8px 10px; }
  .live-pose-card>div>span { font-size: 8px; }
  .live-pose-card strong { font-size: 18px; }
  .live-pose-card p { font-size: 10px; }
  .live-pose-card>small { display: none; }
  .shot-preview>.camera-rating { top: 10px; right: 10px; }
  .shot-preview-frame { height: min(72%, 400px); }
}

/* Camera-style photo selection gallery. */
.batch-review {
  /* Same as .session-profile-check: top-level screen outside .app-shell, must scroll itself. */
  min-height: 100dvh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 28px max(20px, 4vw) 110px;
  background: #101412;
  color: #fff;
}
.batch-review > header {
  width: min(100%, 1040px);
  height: auto;
  margin: 0 auto;
  padding: 0 0 22px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  border: 0;
  background: transparent;
}
.batch-review header .eyebrow { color: #ef8a69; }
.batch-review h1 { margin: 5px 0 3px; color: #fff; font: 750 clamp(30px, 5vw, 44px)/1.08 ui-sans-serif; letter-spacing: -.035em; }
.batch-review header p { margin: 0; color: #ffffff9c; }
.batch-review .take-more {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid #ffffff22;
  border-radius: 11px;
  background: #ffffff0c;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
}
.batch-grid {
  width: min(100%, 1040px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 300px));
  justify-content: center;
  align-items: start;
  gap: 18px;
}
.batch-grid article {
  overflow: hidden;
  border: 1px solid #ffffff14;
  border-radius: 18px;
  background: #181e1b;
  box-shadow: 0 14px 38px #0004;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}
.batch-grid article.selected { border-color: #5ce493; box-shadow: 0 0 0 2px #5ce49342, 0 18px 46px #0007; transform: translateY(-2px); }
.batch-grid .photo-choice {
  position: relative;
  width: 100%;
  display: block;
  padding: 0;
  border: 0;
  background: #080b09;
  color: #fff;
}
.batch-grid img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  background: #080b09;
}
.batch-portrait .batch-grid img { aspect-ratio: 4 / 5; }
.batch-square .batch-grid img { aspect-ratio: 1 / 1; }
.batch-grid .selected-mark {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: 999px;
  background: #29bf68e8;
  color: #07140c;
  box-shadow: 0 5px 18px #0006;
  font-size: 11px;
  font-weight: 800;
}
.batch-grid .photo-meta {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}
.photo-meta > span { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.photo-meta small { overflow: hidden; color: #ffffff79; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.photo-meta .remove-shot {
  width: 38px;
  height: 38px;
  flex: none;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #ffffff13;
  border-radius: 10px;
  background: transparent;
  color: #ffffff8d;
}
.photo-meta .remove-shot:hover { border-color: #ef7656; background: #ef765618; color: #ffad97; }
.batch-review > footer {
  position: fixed;
  z-index: 20;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px 20px;
  border-top: 1px solid #ffffff12;
  background: #111714ed;
  backdrop-filter: blur(16px);
}
.batch-review > footer > span { color: #ffffff83; font-size: 12px; }
.batch-review > footer .primary { min-height: 50px; margin: 0; border-radius: 11px; background: #ef653d; }

@media (max-width: 600px) {
  .batch-review { padding: 20px 14px 105px; }
  .batch-review > header { align-items: flex-start; }
  .batch-review header p { max-width: 220px; }
  .batch-review .take-more { padding: 0 11px; }
  .batch-grid { grid-template-columns: minmax(0, 310px); }
  .batch-review > footer { justify-content: space-between; gap: 10px; }
}
```

### `app/studio-session.css`

```css
.session-profile-check {
  /* Rendered outside .app-shell, so <body>'s 100dvh overflow:hidden lock applies:
     this screen has to be its own scroll container or tall content is unreachable. */
  min-height: 100dvh;
  height: 100dvh;
  padding: 26px clamp(18px, 4vw, 56px) 44px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  background:
    radial-gradient(circle at 11% 6%, #26332e 0, transparent 25%),
    radial-gradient(circle at 92% 84%, #241d18 0, transparent 24%),
    #101412;
  color: #fff;
}
.session-profile-check button { font: inherit; cursor: pointer; }
.session-loaded-header {
  width: min(100%, 1120px);
  height: auto;
  position: static;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  padding: 0 0 24px;
  border: 0;
  background: transparent;
}
.session-loaded-title, .session-loaded-meta, .session-loaded-actions, .session-agent { display: flex; align-items: center; }
.session-loaded-title > div, .session-agent > div:last-child { display: flex; flex-direction: column; }
.session-loaded-title .eyebrow, .crop-workbench .eyebrow, .session-quality .eyebrow { color: #ef8968; }
.session-loaded-title b { margin-top: 4px; color: #f6faf7; font-size: 15px; }
.session-loaded-meta { gap: 10px; color: #ffffff78; font-size: 11px; }
.session-loaded-actions { gap: 12px; }
.session-loaded-meta code {
  padding: 9px 12px;
  border: 1px solid #ffffff14;
  border-radius: 9px;
  background: #ffffff0a;
  color: #ffffffb8;
  font-size: 11px;
}
.session-exit {
  width: 40px;
  height: 40px;
  display: grid;
  flex: none;
  place-items: center;
  padding: 0;
  border: 1px solid #ffffff18;
  border-radius: 50%;
  background: #ffffff0a;
  color: #ffffffa8;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
}
.session-exit:hover { border-color: #ef89686e; background: #ef765617; color: #ffad97; }
.session-exit:active { transform: scale(.94); }
.session-exit:focus-visible { outline: 3px solid #ef8968; outline-offset: 3px; }
.session-profile-grid {
  width: min(100%, 1120px);
  display: grid;
  grid-template-columns: minmax(430px, 1.12fr) minmax(370px, .88fr);
  align-items: start;
  gap: 18px;
  margin: auto;
}
.crop-workbench, .session-quality {
  border: 1px solid #ffffff12;
  border-radius: 22px;
  background: #181e1b;
  box-shadow: 0 24px 64px #0005;
}
.crop-workbench { padding: 18px; }
.crop-workbench-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}
.crop-workbench-head > div:first-child { display: flex; flex-direction: column; gap: 4px; }
.crop-workbench-head > div:first-child b { font-size: 17px; }
.format-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 0;
  padding: 4px;
  border: 1px solid #ffffff0b;
  border-radius: 12px;
  background: #0e1311;
}
.format-tabs button {
  min-height: 38px;
  padding: 0 11px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #ffffff7d;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}
.format-tabs button:hover { color: #fff; }
.format-tabs button.active { background: #fff; color: #171c19; box-shadow: 0 4px 16px #0005; }
.format-tabs button:focus-visible, .session-start:focus-visible { outline: 3px solid #ef8968; outline-offset: 3px; }
.crop-preview {
  position: relative;
  width: 100%;
  max-height: min(66dvh, 630px);
  margin: auto;
  overflow: hidden;
  border-radius: 17px;
  background: #070a08;
  transition: width 180ms ease, aspect-ratio 180ms ease;
}
.crop-preview.square { width: min(100%, 560px); aspect-ratio: 1; }
.crop-preview.portrait { width: min(76%, 440px); aspect-ratio: 4 / 5; }
.crop-preview img { width: 100%; height: 100%; display: block; object-fit: cover; }
.crop-preview:after { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg,#0005,transparent 18%,transparent 76%,#0008); content: ""; }
.preview-format {
  position: absolute;
  z-index: 4;
  top: 14px;
  left: 50%;
  translate: -50%;
  padding: 6px 9px;
  border-radius: 999px;
  background: #080c0ac7;
  color: #ffffffb5;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .14em;
}
.bleed-border {
  position: absolute;
  z-index: 3;
  inset: 7%;
  border: 1px dashed #ffffffa0;
  border-radius: 12px;
  box-shadow: 0 0 0 999px #00000018;
}
.bleed-border:before, .bleed-border:after {
  position: absolute;
  width: 25px;
  height: 25px;
  border-color: #fff;
  content: "";
}
.bleed-border:before { left: -2px; top: -2px; border-left: 3px solid; border-top: 3px solid; border-radius: 10px 0 0; }
.bleed-border:after { right: -2px; bottom: -2px; border-right: 3px solid; border-bottom: 3px solid; border-radius: 0 0 10px; }
.face-safe {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 14%;
  width: 43%;
  height: 54%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  translate: -50%;
  border: 1px solid #ffb392b0;
  border-radius: 48%;
  color: #fff;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: .13em;
  text-shadow: 0 1px 4px #000;
}
.crop-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 13px;
  padding: 12px 13px;
  border: 1px solid transparent;
  border-radius: 13px;
}
.crop-warning.warn { border-color: #ef76562e; background: #ef765612; color: #ffad97; }
.crop-warning.good { border-color: #5ce49327; background: #5ce4930e; color: #bfffd8; }
.crop-warning-icon { width: 28px; height: 28px; display: grid; flex: none; place-items: center; border-radius: 50%; background: currentColor; }
.crop-warning-icon svg { color: #151a17; }
.crop-warning div { display: flex; flex-direction: column; gap: 3px; }
.crop-warning b { font-size: 12px; }
.crop-warning span { color: #ffffff78; font-size: 10px; line-height: 1.45; }
.session-quality { align-self: stretch; padding: 24px; }
.session-agent { gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #ffffff0d; }
.session-agent-thumb { width: 52px; height: 60px; flex: none; overflow: hidden; border: 1px solid #ffffff1c; border-radius: 11px; background: #090c0b; }
.session-agent-thumb img { width: 100%; height: 100%; display: block; object-fit: cover; }
.session-quality h1 { margin: 3px 0 1px; color: #fff; font: 750 24px/1.08 ui-sans-serif; letter-spacing: -.035em; }
.session-quality p { margin: 0; color: #ffffff6d; font-size: 11px; }
.session-score { display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 16px; padding: 20px 0 16px; }
.session-score-ring { width: 96px; height: 96px; display: grid; place-items: center; border-radius: 50%; }
.session-score-ring > span { position: relative; width: 78px; height: 78px; display: grid; place-items: center; border-radius: 50%; background: #181e1b; box-shadow: inset 0 0 0 1px #ffffff0d; }
.session-score-ring strong { display: block; margin: 0; color: #fff; font-size: 36px; line-height: 1; letter-spacing: -.06em; text-align: center; }
.session-score-ring small { position: absolute; right: 0; bottom: 10px; left: 0; margin: 0; color: #ffffff5d; font-size: 9px; line-height: 1; text-align: center; }
.session-score > div:last-child { display: flex; flex-direction: column; gap: 4px; }
.session-score > div:last-child > span { color: #ffffff70; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.session-score > div:last-child > b { color: #f3b44d; font-size: 18px; }
.session-score.good > div:last-child > b { color: #5ce493; }
.session-score.low > div:last-child > b { color: #ef8b6f; }
.session-score > div:last-child > small { color: #ffffff59; font-size: 10px; }
.session-metrics { display: grid; gap: 12px; padding: 16px 0; border-block: 1px solid #ffffff0d; }
.session-metric > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.session-metric span { display: flex; align-items: baseline; gap: 7px; color: #f5f8f6; font-size: 12px; font-weight: 700; }
.session-metric span small { overflow: hidden; color: #ffffff54; font-size: 9px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.session-metric > div > b { color: #fff; font-size: 13px; }
.session-metric > i { height: 5px; display: block; margin-top: 6px; overflow: hidden; border-radius: 99px; background: #303835; }
.session-metric > i b { height: 100%; display: block; border-radius: inherit; background: linear-gradient(90deg,#ef7656,#f3b44d 52%,#5ce493); transition: width 400ms ease; }
.rating-feedback { display: grid; gap: 8px; margin-top: 12px; padding: 12px; border: 1px solid #ffffff10; border-radius: 10px; background: #ffffff08; }
.rating-feedback-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rating-feedback-meta span { padding: 4px 7px; border-radius: 5px; background: #ef765620; color: #ffb29d; font-size: 9px; font-weight: 850; letter-spacing: .08em; }
.rating-feedback.fair .rating-feedback-meta span { background: #f3b44d20; color: #ffd78e; }
.rating-feedback.good .rating-feedback-meta span { background: #5ce49320; color: #8df0b4; }
.rating-feedback-meta b { color: #ffffffa8; font-size: 9px; }
.rating-feedback ul { display: grid; gap: 5px; margin: 0; padding-left: 16px; color: #ffffffb0; font-size: 9px; line-height: 1.4; }
.rating-feedback > p { color: #ffffff9a; font-size: 9px; line-height: 1.45; }
.rating-feedback > strong { color: #fff; font-size: 10px; line-height: 1.45; }
.session-method { display: flex; align-items: flex-start; gap: 10px; margin: 14px 0; padding: 11px 12px; border-radius: 12px; background: #ffffff08; color: #8de9b1; }
.session-method svg { flex: none; }
.session-method p { display: flex; flex-direction: column; gap: 3px; }
.session-method p b { color: #c9f7dc; font-size: 10px; }
.session-method p span { color: #ffffff5f; font-size: 9px; line-height: 1.45; }
.session-quality > .session-start {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  border: 0;
  border-radius: 12px;
  background: #ef653d;
  color: #fff;
  box-shadow: 0 12px 28px #ef653d26;
  font-weight: 800;
}
.session-start:hover { background: #f17753; transform: translateY(-1px); }
.uploaded-photo-check .session-profile-grid { align-items: stretch; }
.uploaded-photo-check .crop-workbench { display: flex; flex-direction: column; }
.uploaded-photo-check .crop-preview { flex: 1; min-height: 360px; }
.uploaded-photo-check .crop-preview img { object-position: center 28%; }
.upload-review-actions { display: grid; gap: 9px; }
.upload-review-actions .session-start,
.upload-review-secondary {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  border-radius: 12px;
  font-weight: 800;
}
.upload-review-actions .session-start {
  border: 0;
  background: #ef653d;
  color: #fff;
  box-shadow: 0 12px 28px #ef653d26;
}
.upload-review-secondary {
  border: 1px solid #ffffff18;
  background: #ffffff08;
  color: #ffffffc7;
}
.upload-review-secondary:hover { border-color: #ffffff32; background: #ffffff10; color: #fff; }
.upload-review-secondary:focus-visible { outline: 3px solid #ef8968; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .crop-preview, .session-metric > i b, .session-start, .upload-review-secondary { transition: none; }
}
@media (max-width: 860px) {
  .session-profile-grid { grid-template-columns: 1fr; max-width: 640px; }
  .session-loaded-header { max-width: 640px; }
  .crop-preview.square { max-width: 500px; }
  .session-quality { width: 100%; }
}
@media (max-width: 580px) {
  .session-profile-check { padding: 16px 12px 28px; }
  .session-loaded-header { align-items: flex-start; }
  .session-loaded-actions { gap: 8px; }
  .session-loaded-meta { flex-direction: column; align-items: flex-end; }
  .session-loaded-meta > span { display: none; }
  .session-loaded-title b { max-width: 180px; font-size: 12px; }
  .crop-workbench, .session-quality { border-radius: 17px; }
  .crop-workbench { padding: 12px; }
  .crop-workbench-head { align-items: flex-start; flex-direction: column; }
  .format-tabs { width: 100%; }
  .crop-preview.portrait { width: 88%; }
  .session-quality { padding: 18px; }
  .session-score { grid-template-columns: 88px 1fr; }
  .session-score-ring { width: 84px; height: 84px; }
  .session-score-ring > span { width: 68px; height: 68px; }
  .session-score-ring strong { font-size: 31px; }
  .session-score-ring small { bottom: 8px; font-size: 8px; }
  .session-metric span small { max-width: 120px; }
  .uploaded-photo-check .crop-preview { min-height: 300px; }
}
```

### `app/polish.css`

```css
/* Final product-wide polish layer. Keep shared visual decisions here. */
:root {
  --ps-coral: #e75c35;
  --ps-coral-dark: #c94a27;
  --ps-green: #35966f;
  --ps-ink: #202522;
  --ps-canvas: #eef2f0;
  --ps-card: #ffffff;
  --ps-line: #dfe5e1;
  --ps-muted: #69736e;
  --ps-shadow-sm: 0 8px 24px rgba(28, 38, 33, 0.07);
  --ps-shadow-lg: 0 24px 70px rgba(21, 31, 26, 0.16);
}

/* Instrument shell: no top bar, text-only identity, one decisive rail. */
html,
body,
button,
input,
select {
  font-family: "Avenir Next", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app-content h1,
.app-content h2,
.app-content h3,
.session-profile-check h1,
.batch-review h1,
.atlas-app h1,
.atlas-app h2,
.devices h2,
.assets h3 {
  font-family: "DIN Alternate", "Avenir Next Condensed", "Helvetica Neue", sans-serif;
  font-weight: 700;
  letter-spacing: -0.045em;
}

.app-shell {
  grid-template-columns: 94px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  background: #e9eeeb;
}

.app-nav {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 0;
  height: 100dvh;
  padding: 18px 8px 12px;
  border: 0;
  background: #111713;
}

.app-wordmark {
  min-height: 56px !important;
  display: flex !important;
  flex-direction: column;
  gap: 1px !important;
  padding: 7px 4px !important;
  border: 0 !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: #fff !important;
  box-shadow: none !important;
}

.app-wordmark strong {
  font-family: "DIN Alternate", "Avenir Next Condensed", sans-serif;
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.06em;
}

.app-wordmark b {
  color: #fff;
  font-family: "DIN Alternate", "Avenir Next Condensed", sans-serif;
  font-size: 17px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.04em;
}

.app-wordmark sup {
  color: #f06a43;
}

.app-nav-main {
  display: grid;
  align-content: start;
  gap: 6px;
  margin-top: 22px;
}

.app-nav-main button,
.rail-reset {
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 3px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #8e9993;
  box-shadow: none;
  font-size: 10px;
}

.app-nav-main button:hover,
.rail-reset:hover {
  background: #1b231e;
  color: #fff;
}

.app-nav-main button.active,
.app-nav-main button[aria-current="page"] {
  background: #ef6843;
  color: #fff;
  box-shadow: none;
}

.app-nav-main button b,
.rail-reset b {
  font-weight: 650;
}

.rail-reset {
  width: 100%;
  min-height: 52px;
  align-self: end;
}

.app-content {
  grid-column: 2;
  grid-row: 1;
  padding: 14px;
  background: #e9eeeb;
}

.app-content > section {
  min-height: calc(100dvh - 28px);
  border-radius: 12px;
}

.qr-intro h1 {
  max-width: 360px;
  font-size: clamp(46px, 4.5vw, 64px);
  line-height: 0.98;
}

.app-content .gallery h1,
.app-content .title h1,
.app-content .narrow h1,
.app-content .console-title h1 {
  font-weight: 700;
}

/* Studio system readout. */
.console {
  background: #101512;
}

.console-title h1 {
  margin-block: 8px 4px;
  font-size: clamp(46px, 5vw, 64px) !important;
  line-height: 0.95;
}

.console-title > span {
  border: 1px solid #333c36;
  border-radius: 999px;
  background: transparent;
  color: #8dcbae;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.08em;
}

.devices article {
  border-color: #313a34;
  border-radius: 9px;
  background: #171d19;
}

.devices article > i {
  color: #ef6843;
}

.devices article h2 {
  font-size: 28px;
}

.devices article button {
  border-radius: 7px;
}

.architecture {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(360px, 1.35fr) auto;
  align-items: center;
  gap: 28px;
  padding: 22px 24px;
  border: 1px solid #313a34;
  border-radius: 9px;
  background: #171d19;
  color: #fff;
}

.architecture .system-summary h2 {
  margin: 6px 0 4px;
  color: #fff;
  font-size: 30px;
  line-height: 1;
}

.architecture .system-summary p {
  margin: 0;
  color: #89948e;
  font-size: 12px;
}

.architecture .system-path {
  display: grid;
  grid-template-columns: auto minmax(18px, 1fr) auto minmax(18px, 1fr) auto minmax(18px, 1fr) auto;
  grid-column: auto;
  align-items: center;
  gap: 9px;
  color: #c7cec9;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.system-path i {
  height: 1px;
  display: block;
  background: #465149;
}

.architecture .system-api {
  display: flex;
  grid-column: auto;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding-left: 22px;
  border-left: 1px solid #313a34;
}

.system-api > i {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: #69c99b;
  box-shadow: 0 0 0 5px rgba(105, 201, 155, 0.1);
}

.system-api > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.system-api small {
  color: #6f7b74;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.12em;
}

.system-api b {
  color: #e7eee9;
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .architecture {
    grid-template-columns: minmax(220px, 1fr) auto;
  }

  .architecture .system-path {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

@media (max-width: 700px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) 68px;
  }

  .app-nav {
    grid-column: 1;
    grid-row: 2;
    grid-template-columns: minmax(0, 1fr) 46px;
    grid-template-rows: 1fr;
    gap: 3px;
    width: 100%;
    height: 68px;
    padding: 5px 7px calc(5px + env(safe-area-inset-bottom));
  }

  .app-wordmark {
    display: none !important;
  }

  .app-nav-main {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-content: stretch;
    gap: 3px;
    margin: 0;
  }

  .app-nav-main button,
  .rail-reset {
    min-height: 54px;
    gap: 2px;
    border-radius: 6px;
    color: #a9b1ad;
  }

  .app-nav-main button b {
    font-size: 10px;
  }

  .rail-reset {
    min-width: 46px;
  }

  .rail-reset b {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .app-content {
    grid-column: 1;
    grid-row: 1;
    padding: 8px;
  }

  .app-content > section {
    min-height: calc(100dvh - 84px);
  }

  .qr-intro h1 {
    font-size: 42px;
  }

  .console-title h1 {
    font-size: 44px !important;
  }

  .architecture {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 20px;
  }

  .architecture .system-path,
  .architecture .system-api {
    grid-column: 1;
    grid-row: auto;
  }

  .architecture .system-api {
    padding: 16px 0 0;
    border-top: 1px solid #313a34;
    border-left: 0;
  }
}

.app-nav .rail-actions {
  display: grid;
  align-self: end;
  gap: 4px;
}

.app-nav .rail-help,
.app-nav .rail-reset {
  width: 100%;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 3px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #7f8a84;
  font-size: 9px;
}

.app-nav .rail-help:hover,
.app-nav .rail-reset:hover {
  background: #1b231e;
  color: #fff;
}

.app-nav button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: -3px;
}

.photo-card .badge {
  width: auto;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 700px) {
  .app-shell .app-nav {
    grid-template-columns: minmax(0, 1fr) 92px;
  }

  .app-nav .app-nav-main {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .app-nav .rail-actions {
    grid-template-columns: repeat(2, 44px);
    align-self: stretch;
    gap: 3px;
  }

  .app-nav .rail-help,
  .app-nav .rail-reset {
    min-width: 44px;
    min-height: 54px;
    color: #a9b1ad;
  }

  .app-nav .rail-help b,
  .app-nav .rail-reset b {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
}

::selection {
  background: #ffd7ca;
  color: #542112;
}

html {
  scroll-padding-top: 80px;
}

button,
a,
input,
select {
  -webkit-tap-highlight-color: rgba(231, 92, 53, 0.15);
}

button:disabled {
  cursor: not-allowed;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid rgba(231, 92, 53, 0.42);
  outline-offset: 3px;
}

.app-content h1,
.app-content h2,
.atlas-app h1,
.atlas-app h2 {
  text-wrap: balance;
}

.app-content p,
.atlas-app p {
  text-wrap: pretty;
}

.app-shell {
  background: var(--ps-canvas);
}

.app-bar {
  border-bottom-color: var(--ps-line);
  box-shadow: 0 1px 0 rgba(28, 38, 33, 0.02), 0 6px 20px rgba(28, 38, 33, 0.035);
}

.app-bar .logo {
  min-height: 48px;
}

.app-bar .tools button,
.app-nav button,
.help,
.scanner-start,
.manual-checkin button,
.sheet button,
.consents label,
.photo-card,
.assets article,
.devices article {
  transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.app-bar .tools button {
  border-color: var(--ps-line);
  background: #fff;
  color: #59625e;
}

.session-state {
  border: 1px solid #dcebe4;
  background: #f3faf6;
}

.app-nav {
  border-right-color: var(--ps-line);
}

.app-nav button {
  position: relative;
  color: #747c78;
}

.app-nav button.active,
.app-nav button[aria-current="page"] {
  background: #fff2ed;
  color: #c94a27;
  box-shadow: inset 3px 0 0 var(--ps-coral), inset 0 0 0 1px #ffded3;
}

.app-content {
  background-color: var(--ps-canvas);
  scrollbar-gutter: stable;
}

.app-content > section:not(.dark):not(.console) {
  border: 1px solid rgba(215, 223, 218, 0.78);
  box-shadow: 0 10px 35px rgba(28, 38, 33, 0.045);
}

.app-content .eyebrow {
  color: var(--ps-coral-dark);
}

.app-content .primary {
  background: var(--ps-coral);
  box-shadow: 0 9px 22px rgba(204, 72, 35, 0.2);
}

.app-content .primary:hover {
  background: var(--ps-coral-dark);
}

.app-content .primary:disabled {
  box-shadow: none;
  opacity: 0.45;
}

/* Check-in */
.qr-home {
  border-color: #dbe3df !important;
}

.qr-intro a {
  min-height: 44px;
  padding: 0 2px;
  text-underline-offset: 4px;
}

.qr-intro a:hover {
  color: #9f351a;
  text-decoration: underline;
}

.qr-scanner {
  isolation: isolate;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: var(--ps-shadow-lg);
}

.qr-scanner:after {
  position: absolute;
  inset: 14px;
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 15px;
  pointer-events: none;
  content: "";
}

.qr-scanner > * {
  z-index: 1;
}

.qr-scanner video,
.qr-scanner .scan-shade {
  z-index: 0;
}

.scanner-start:hover {
  background: #ce4b28;
  box-shadow: 0 13px 30px rgba(0, 0, 0, 0.42);
  transform: translateY(-1px);
}

.manual-checkin {
  border-color: var(--ps-line);
  box-shadow: var(--ps-shadow-sm);
}

.manual-checkin:focus-within {
  border-color: #eba18c;
  box-shadow: 0 0 0 4px rgba(231, 92, 53, 0.1), var(--ps-shadow-sm);
}

.manual-checkin input {
  color: var(--ps-ink);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.01em;
}

.manual-checkin input::placeholder,
.search input::placeholder {
  color: #949c98;
}

/* Photo flow */
.app-content .flow {
  background: #f7f9f8;
}

.app-content .steps {
  min-height: 48px;
  margin-bottom: 30px;
  padding: 0 15px;
  border: 1px solid var(--ps-line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  color: #5f6964;
}

.app-content .steps > i {
  height: 5px;
  background: #e5eae7;
}

.app-content .steps b {
  background: var(--ps-coral);
}

.review {
  border: 1px solid var(--ps-line);
  box-shadow: var(--ps-shadow-lg);
}

.photo-wrap > span {
  top: 18px;
  left: 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(26, 32, 29, 0.86);
  backdrop-filter: blur(10px);
}

.result .status {
  width: max-content;
  margin: 21px 0;
  padding: 6px 11px 6px 6px;
  border: 1px solid #f1d5cb;
  border-radius: 999px;
  background: #fff7f4;
  color: #9f4128;
}

.result .status.pass {
  border-color: #d7e8df;
  background: #f1f8f4;
  color: #2e7557;
}

.result .score {
  align-items: center;
  min-height: 88px;
}

.result .score strong,
.session-score strong,
.rating-ring,
.photo-score strong,
.metric strong {
  font-variant-numeric: tabular-nums;
}

.checks {
  border-color: var(--ps-line);
  background: #fbfcfb;
}

.checks span {
  min-height: 50px;
  align-items: center;
}

.sheet button {
  border-color: var(--ps-line);
  box-shadow: var(--ps-shadow-sm);
}

.sheet button:hover {
  border-color: #efb3a1;
  box-shadow: 0 13px 32px rgba(31, 40, 35, 0.1);
  transform: translateY(-2px);
}

.sheet button[aria-pressed="true"] {
  border-color: var(--ps-coral);
  box-shadow: 0 0 0 1px var(--ps-coral), 0 14px 35px rgba(201, 74, 39, 0.12);
}

.consents label {
  cursor: pointer;
}

.consents label:hover {
  border-color: #d5ddd8;
  background: #fbfcfb;
}

.consents label:has(input:focus-visible) {
  outline: 3px solid rgba(231, 92, 53, 0.34);
  outline-offset: 2px;
}

.consents label > i {
  flex: none;
  box-shadow: inset 0 0 0 1px rgba(28, 38, 33, 0.08);
}

.consents input:checked + i {
  background: var(--ps-green);
}

.privacy {
  border: 1px solid #e4e9e6;
  color: #5e6863;
}

.success {
  justify-content: center;
}

.success .tick {
  box-shadow: 0 0 0 9px rgba(53, 150, 111, 0.1), 0 13px 32px rgba(53, 150, 111, 0.18);
}

.success .mini {
  border: 1px solid var(--ps-line);
  box-shadow: var(--ps-shadow-sm);
}

/* Libraries and console */
.photos-toolbar,
.gallery-head {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ps-line);
}

.photos-empty,
.empty-state {
  border-color: #cfd9d4;
  box-shadow: none;
}

.photo-card,
.assets article {
  border: 1px solid var(--ps-line);
}

.photo-card:hover,
.assets article:hover {
  border-color: #cbd6d0 !important;
  box-shadow: 0 14px 34px rgba(28, 38, 33, 0.1) !important;
  transform: translateY(-2px);
}

.photo-actions button:hover,
.assets button:hover,
.devices button:hover {
  border-color: #d59c8b;
  color: var(--ps-coral-dark);
}

.photo-actions .remove-photo { color: #a54832; }
.photo-actions .remove-photo:hover { border-color: #d77761; background: #fff3ef; color: #9f351f; }

.photos-page .photo-card-info {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  align-items: start !important;
}

.photos-page .photo-card-info > div:first-child span {
  overflow-wrap: anywhere;
  white-space: normal;
  line-height: 1.45;
}

.photos-page .photo-actions {
  width: 100%;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid var(--ps-line);
}

.search input {
  border-color: var(--ps-line);
}

.filters button[aria-pressed="true"] {
  background: var(--ps-ink);
  color: #fff;
}

.console-title {
  align-items: flex-start;
}

.devices article {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.devices article:hover {
  border-color: #5c615e;
  transform: translateY(-2px);
}

.architecture {
  border: 1px solid #e2e6e3;
}

/* Compact persistent actions */
.help {
  right: 24px;
  bottom: 22px;
  min-height: 44px;
  padding: 0 15px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 13px;
}

.help:hover {
  box-shadow: 0 11px 28px rgba(191, 65, 30, 0.3);
  transform: translateY(-1px);
}

.toast {
  bottom: 22px;
  max-width: calc(100vw - 36px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #202622;
  box-shadow: 0 16px 40px rgba(20, 28, 24, 0.26);
  text-align: center;
}

/* Reset confirmation */
.reset-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(21, 29, 25, 0.68);
  backdrop-filter: blur(9px);
}

.reset-dialog {
  position: relative;
  width: min(100%, 440px);
  max-height: calc(100dvh - 32px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--ps-shadow-lg);
  text-align: center;
}

.reset-close {
  position: absolute;
  top: 13px;
  right: 13px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f1f4f2;
  color: #4e5752;
}

.reset-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin: 0 auto 15px;
  border-radius: 16px;
  background: #fff0eb;
  color: var(--ps-coral-dark);
}

.reset-icon.delete-icon { background: #fff0ed; color: #bd4025; }

.reset-dialog h2 {
  margin: 8px 0 7px;
  font-size: 28px;
  letter-spacing: -0.035em;
}

.reset-dialog p {
  margin: 0 auto 24px;
  max-width: 340px;
  color: var(--ps-muted);
  line-height: 1.5;
}

.reset-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.reset-actions button {
  min-height: 48px;
  padding: 0 13px;
  border: 1px solid var(--ps-line);
  border-radius: 10px;
  background: #fff;
  color: #3e4742;
  font-size: 13px;
  font-weight: 750;
}

.reset-actions .danger {
  border-color: #d85432;
  background: #d85432;
  color: #fff;
}

.reset-actions .danger:hover {
  border-color: #b93e22;
  background: #b93e22;
}

/* Dark session and camera surfaces */
.studio-camera,
.batch-review,
.session-profile-check,
.studio-session-page {
  color-scheme: dark;
}

.studio-camera button:focus-visible,
.batch-review button:focus-visible,
.studio-session-page button:focus-visible,
.console button:focus-visible {
  outline-color: rgba(255, 176, 149, 0.86);
}

.camera-close:hover,
.session-exit:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.13);
}

.batch-grid .photo-choice:focus-visible {
  outline-offset: -4px;
}

/* Atlas */
.atlas-app {
  height: 100dvh;
  overflow: auto;
  overscroll-behavior: contain;
  background: #f3f5f4;
  color: var(--ps-ink);
}

.atlas-app button,
.atlas-app input,
.atlas-app select {
  font: inherit;
}

.atlas-app .profile-card,
.atlas-app .details-card,
.atlas-app .quality-banner {
  border-color: #dce3df;
  box-shadow: var(--ps-shadow-sm);
}

.atlas-app .quality-banner {
  border-left: 4px solid var(--ps-coral);
}

.atlas-app .photo-score {
  border: 1px solid transparent;
}

.atlas-app .photo-score:hover {
  border-color: #dce7e1;
}

.atlas-app .rating-ring {
  box-shadow: 0 3px 10px rgba(24, 33, 28, 0.18);
}

.atlas-app .atlas-photo-actions button,
.atlas-app .quality-banner button,
.atlas-app .confirm {
  min-height: 46px;
}

.atlas-app .booking-backdrop {
  overscroll-behavior: contain;
}

.atlas-app .booking-card {
  scrollbar-gutter: stable;
  box-shadow: 0 28px 80px rgba(15, 24, 19, 0.3);
}

.atlas-app .close:hover {
  background: #e9eeeb;
  color: var(--ps-coral-dark);
}

.atlas-app .booking-fields input,
.atlas-app .booking-fields select {
  color: var(--ps-ink);
}

.atlas-app .booking-fields input:hover,
.atlas-app .booking-fields select:hover {
  border-color: #bdc9c3;
}

.atlas-app .qr-wrap img {
  display: block;
}

.atlas-app .session-code code {
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.atlas-app .metric > i b {
  background: var(--ps-green);
}

@media (hover: none) {
  .sheet button:hover,
  .photo-card:hover,
  .assets article:hover,
  .devices article:hover,
  .help:hover {
    transform: none;
  }
}

@media (max-width: 700px) {
  .app-nav button.active,
  .app-nav button[aria-current="page"] {
    box-shadow: inset 0 -3px 0 var(--ps-coral), inset 0 0 0 1px #ffded3;
  }

  .app-content {
    scrollbar-gutter: auto;
  }

  .app-content .steps {
    min-height: 42px;
    margin-bottom: 20px;
    padding-inline: 11px;
    gap: 10px;
    font-size: 11px;
  }

  .result .status {
    margin-block: 16px;
  }

  .result .score {
    min-height: 72px;
  }

  .sheet button:hover {
    transform: none;
  }

  .gallery-head,
  .photos-toolbar {
    padding-bottom: 15px;
  }

  .help {
    right: 14px;
    bottom: calc(84px + env(safe-area-inset-bottom));
    width: 46px;
    min-height: 46px;
    padding: 0;
  }

  .toast {
    bottom: calc(88px + env(safe-area-inset-bottom));
    white-space: normal;
  }

  .reset-backdrop {
    align-items: end;
    padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  }

  .reset-dialog {
    width: 100%;
    padding: 28px 20px 20px;
    border-radius: 20px;
  }

  .reset-actions {
    grid-template-columns: 1fr;
  }

  .reset-actions .danger {
    order: -1;
  }

  .atlas-app .booking-backdrop {
    align-items: end;
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom));
  }

  .atlas-app .booking-card {
    width: 100%;
    max-height: calc(100dvh - 20px);
    border-radius: 20px;
  }

  .atlas-app .booking-fields {
    grid-template-columns: 1fr;
  }

  .atlas-app .appointment-meta {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Minimal precision system */
:root {
  --ps-coral: #eb6038;
  --ps-coral-dark: #c94725;
  --ps-green: #32956e;
  --ps-ink: #171c19;
  --ps-canvas: #f1f4f2;
  --ps-card: #fff;
  --ps-line: #dce2de;
  --ps-muted: #68716c;
  --ps-shadow-sm: 0 2px 10px rgba(20, 29, 24, 0.045);
  --ps-shadow-lg: 0 10px 32px rgba(20, 29, 24, 0.09);
}

.eyebrow,
.app-content .eyebrow,
.atlas-app small,
.session-profile-check .eyebrow,
.batch-review .eyebrow {
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.app-shell {
  grid-template-columns: 88px minmax(0, 1fr);
  grid-template-rows: 64px minmax(0, 1fr);
}

.app-bar {
  height: 64px;
  padding-inline: 20px;
  box-shadow: none;
}

.app-bar .logo b {
  width: 34px;
  height: 34px;
}

.app-bar .logo > span {
  font-size: 16px;
}

.app-bar .logo > span strong {
  font-size: 23px;
}

.session-state {
  display: none;
}

.app-bar .tools button {
  min-height: 38px;
  padding-inline: 12px;
  border-radius: 8px;
  box-shadow: none;
  font-size: 13px;
}

.app-nav {
  gap: 4px;
  padding: 12px 8px;
}

.app-nav button {
  min-height: 64px;
  gap: 4px;
  border-radius: 9px;
  font-size: 11px;
}

.app-nav button.active,
.app-nav button[aria-current="page"] {
  background: #fff;
  color: var(--ps-coral-dark);
  box-shadow: inset 2px 0 0 var(--ps-coral), inset 0 0 0 1px var(--ps-line);
}

.app-content {
  padding: 16px;
}

.app-content > section {
  border-radius: 14px;
}

.app-content > section:not(.dark):not(.console) {
  border-color: var(--ps-line);
  box-shadow: none;
}

.app-content h1 {
  letter-spacing: -0.045em;
}

.app-content .primary,
.app-content .gold {
  min-height: 48px;
  border-radius: 8px;
  box-shadow: none;
}

.app-content .primary:hover,
.app-content .gold:hover {
  box-shadow: none;
}

/* Check-in: one instruction, one focal surface. */
.qr-home {
  grid-template-columns: minmax(250px, 0.62fr) minmax(430px, 1.2fr);
  gap: 18px;
  padding: clamp(24px, 3.5vw, 46px) !important;
  background: #fff !important;
}

.qr-intro {
  max-width: 360px;
}

.qr-intro h1 {
  max-width: 320px;
  margin: 10px 0 8px;
  font-size: clamp(36px, 3.4vw, 48px);
}

.qr-intro p {
  margin-bottom: 14px;
  font-size: 15px;
}

.qr-intro a {
  min-height: 38px;
  font-size: 13px;
}

.qr-scanner {
  border-radius: 14px;
  box-shadow: none;
}

.qr-scanner:after {
  inset: 10px;
  border-radius: 10px;
}

.scan-frame {
  width: min(48%, 280px);
}

.scanner-start {
  bottom: 26px;
  min-height: 46px;
  border-radius: 8px;
  box-shadow: none;
}

.manual-checkin {
  padding: 12px;
  border-radius: 10px;
  box-shadow: none;
}

.manual-checkin > div {
  margin-bottom: 7px;
}

.manual-checkin input,
.manual-checkin button {
  height: 42px;
  border-radius: 7px;
}

/* Flow */
.app-content .flow {
  padding: 18px clamp(20px, 3vw, 42px) 48px;
  background: #f7f9f8;
}

.app-content .steps {
  min-height: 40px;
  margin-bottom: 18px;
  padding: 0 12px;
  border-radius: 8px;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
}

.app-content .steps > i {
  height: 3px;
}

.review {
  max-width: 1060px;
  border-radius: 12px;
  box-shadow: none;
}

.app-content .photo-wrap {
  min-height: 540px;
}

.result {
  padding: clamp(28px, 4vw, 44px);
}

.result .status {
  margin-block: 16px;
  padding: 4px 10px 4px 4px;
  font-size: 13px;
}

.result .status i {
  width: 28px;
  height: 28px;
}

.result .score {
  min-height: 72px;
}

.result .score strong {
  font-size: 62px;
}

.result h2 {
  margin-block: 10px;
  font-size: 27px;
}

.result > p {
  margin-block: 0 18px;
  font-size: 13px;
}

.checks {
  margin-block: 18px;
  border-radius: 8px;
}

.checks span {
  min-height: 44px;
  padding: 11px 13px;
  font-size: 12px;
}

.app-content .title {
  margin: 30px auto 24px;
}

.app-content .title h1,
.app-content .narrow h1,
.app-content .gallery h1 {
  margin-block: 8px 10px;
  font-size: clamp(30px, 3vw, 38px);
}

.app-content .title p,
.app-content .narrow .lead {
  margin-block: 0;
  font-size: 15px;
}

.sheet {
  max-width: 820px;
  gap: 12px;
}

.sheet button {
  border-width: 1px;
  border-radius: 10px;
  box-shadow: none;
}

.sheet button:hover,
.sheet button[aria-pressed="true"] {
  box-shadow: none;
}

.sheet button > span {
  padding: 14px;
}

.app-content .sheet .portrait,
.app-content .selection-photo {
  height: 300px;
}

.app-content .narrow {
  max-width: 660px;
  margin: 12px auto 40px;
  padding: 28px 32px 34px;
  border-radius: 12px;
  box-shadow: none;
}

.consents {
  margin-block: 24px 16px;
}

.consents label {
  margin-bottom: 8px;
  padding: 17px;
  border-radius: 9px;
}

.consents small {
  margin-top: 3px;
  font-size: 12px;
}

.privacy {
  margin-block: 14px;
  padding: 12px;
  border-radius: 7px;
  font-size: 12px;
}

.app-content .final-review {
  max-width: 740px;
}

.final-quality {
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid #d8e4dc;
  border-radius: 12px;
  background: #f5faf6;
}

.final-quality.needs-work {
  border-color: #efd4c9;
  background: #fff8f5;
}

.final-quality-summary {
  display: grid;
  grid-template-columns: 42px 72px 1fr;
  align-items: center;
  gap: 12px;
  padding: 18px;
}

.final-quality-summary > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #dceee1;
  color: #477c58;
}

.final-quality.needs-work .final-quality-summary > span {
  background: #f8ded3;
  color: #b45539;
}

.final-quality-summary > strong {
  color: #1d2b24;
  font-size: 34px;
  letter-spacing: -.05em;
}

.final-quality-summary > strong small {
  color: #7b8880;
  font-size: 11px;
  letter-spacing: 0;
}

.final-quality-summary > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.final-quality-summary > div > small {
  color: #718078;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: .1em;
}

.final-quality-summary > div > b {
  color: #477c58;
  font-size: 17px;
}

.final-quality.needs-work .final-quality-summary > div > b {
  color: #b45539;
}

.final-quality-summary p {
  margin: 0;
  color: #6e7c74;
  font-size: 11px;
  line-height: 1.4;
}

.final-quality-metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-top: 1px solid #dfe8e2;
  background: #fff;
}

.final-quality-metrics span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 8px;
  border-right: 1px solid #e7ece9;
  text-align: center;
}

.final-quality-metrics span:last-child {
  border-right: 0;
}

.final-quality-metrics small {
  color: #7b8580;
  font-size: 9px;
}

.final-quality-metrics b {
  color: #25332b;
  font-size: 14px;
}

.final-quality > .rating-feedback {
  margin: 0;
  border: 0;
  border-top: 1px solid #e7ece9;
  border-radius: 0;
  background: #fff;
}

.final-quality > .rating-feedback .rating-feedback-meta b,
.final-quality > .rating-feedback > p,
.final-quality > .rating-feedback ul {
  color: #66736b;
}

.final-quality > .rating-feedback > strong {
  color: #26342c;
}

.quality-warning {
  color: #93452f;
  background: #fff0ea;
}

.final-review-actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: 16px;
}

.final-review-actions button {
  min-height: 52px;
}

.final-review-actions .review-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 17px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
  font-weight: 700;
}

@media (max-width: 620px) {
  .final-quality-summary {
    grid-template-columns: 38px 58px 1fr;
    gap: 9px;
    padding: 14px;
  }

  .final-quality-summary > span {
    width: 38px;
    height: 38px;
  }

  .final-quality-summary > strong {
    font-size: 28px;
  }

  .final-quality-metrics {
    grid-template-columns: repeat(3, 1fr);
  }

  .final-quality-metrics span:nth-child(3) {
    border-right: 0;
  }

  .final-quality-metrics span:nth-child(n+4) {
    border-top: 1px solid #e7ece9;
  }

  .final-review-actions {
    grid-template-columns: 1fr;
  }
}

.success {
  padding-block: 60px;
}

.success .tick {
  width: 62px;
  height: 62px;
  margin-bottom: 20px;
  box-shadow: none;
}

.app-content .success h1 {
  margin: 10px 0;
  font-size: clamp(34px, 3vw, 42px);
}

.success > p {
  max-width: 420px;
  margin-block: 0 14px;
  font-size: 16px;
}

.success .mini {
  margin: 18px;
  border-radius: 10px;
  box-shadow: none;
}

/* Libraries */
.app-content .gallery {
  padding: 34px clamp(22px, 3.5vw, 48px) 60px;
}

.gallery-head,
.photos-toolbar {
  margin-bottom: 20px;
  padding-bottom: 16px;
}

.gallery-head p {
  margin: 0;
  font-size: 14px;
}

.search {
  gap: 5px;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.search input {
  width: 260px;
  height: 44px;
  border-radius: 7px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  text-transform: none;
  letter-spacing: 0;
}

.filters {
  margin-bottom: 18px;
}

.filters button,
.assets button,
.photo-actions button {
  min-height: 42px;
  border-radius: 7px;
  box-shadow: none;
}

.photo-card,
.assets article {
  border-radius: 10px !important;
  box-shadow: none !important;
}

.photo-card:hover,
.assets article:hover {
  box-shadow: none !important;
  transform: none;
}

.photos-empty,
.empty-state {
  min-height: 320px;
  margin: 32px auto;
  padding: 38px;
  border-radius: 10px;
}

.photos-empty > span {
  border-radius: 10px;
}

/* Studio console */
.app-content .console {
  padding: 36px clamp(22px, 3.5vw, 48px) 54px;
  background: #151a17;
  box-shadow: none;
}

.console-title h1 {
  margin-block: 10px 6px;
  font-size: clamp(34px, 4vw, 46px);
}

.console-title p {
  margin: 0;
  font-size: 14px;
}

.console-title > span {
  border: 1px solid #3a423d;
  border-radius: 6px;
  background: transparent;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
}

.devices {
  gap: 10px;
  margin: 24px 0;
}

.devices article {
  min-height: 260px;
  padding: 22px;
  border-radius: 9px;
  background: #1c221e;
}

.devices article:hover {
  transform: none;
}

.devices article > i svg {
  width: 28px;
}

.devices small {
  margin-top: 20px;
}

.devices h2 {
  margin-block: 8px;
  font-size: 22px;
}

.devices p {
  min-height: 38px;
  margin-block: 8px 14px;
  font-size: 13px;
}

.architecture {
  padding: 24px;
  border-radius: 9px;
  box-shadow: none;
}

.architecture h2 {
  margin-block: 7px;
  font-size: 26px;
}

.architecture p {
  margin: 0;
  font-size: 13px;
}

/* Help stays available without competing with the page. */
.help {
  width: 42px;
  min-height: 42px;
  padding: 0;
  border-radius: 50%;
  box-shadow: none;
}

.help span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.toast {
  padding: 12px 17px;
  border-radius: 8px;
  box-shadow: none;
  font-size: 13px;
}

.reset-dialog {
  width: min(100%, 400px);
  padding: 28px;
  border-radius: 14px;
  box-shadow: none;
}

.reset-icon {
  width: 46px;
  height: 46px;
  margin-bottom: 12px;
  border-radius: 10px;
}

.reset-dialog h2 {
  font-size: 25px;
}

.reset-actions button {
  min-height: 44px;
  border-radius: 7px;
}

/* Loaded session */
.session-profile-check {
  background: #0f1411;
}

.session-loaded-header {
  min-height: 64px;
  padding: 12px 22px;
  border-bottom-color: #2b332e;
}

.session-profile-grid {
  width: min(100%, 1180px);
  gap: 12px;
  padding: 16px;
}

.crop-workbench,
.session-quality {
  border-radius: 12px;
  box-shadow: none;
}

.crop-workbench {
  padding: 16px;
}

.crop-workbench-head {
  margin-bottom: 12px;
}

.format-tabs,
.format-tabs button {
  border-radius: 7px;
}

.crop-preview {
  border-radius: 10px;
}

.crop-warning {
  margin-top: 10px;
  padding: 11px;
  border-radius: 8px;
}

.session-quality {
  padding: 18px;
}

.session-agent {
  padding-bottom: 14px;
}

.session-agent h1 {
  margin-block: 3px;
  font-size: 27px;
}

.session-score {
  padding-block: 16px;
}

.session-method {
  padding: 11px;
  border-radius: 8px;
}

.session-method p span {
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 9px;
}

.session-start {
  border-radius: 8px !important;
  box-shadow: none !important;
}

/* Atlas uses the same calm surface language. */
.atlas-app {
  background: #f1f4f2;
}

.atlas-app .profile-card,
.atlas-app .details-card,
.atlas-app .quality-banner {
  border-radius: 5px;
  box-shadow: none;
}

.atlas-app .quality-banner {
  border-left-width: 3px;
}

.atlas-app .quality-banner strong {
  font-size: 14px;
}

.atlas-app .quality-banner span {
  font-size: 11px;
}

.atlas-app .quality-banner button,
.atlas-app .atlas-photo-actions button,
.atlas-app .confirm {
  min-height: 44px;
  border-radius: 7px;
  box-shadow: none;
}

.atlas-app .photo-score {
  border-radius: 8px;
}

.atlas-app .photo-score p {
  font-size: 10px;
}

.atlas-app .booking-card {
  border-radius: 14px;
  box-shadow: none;
}

.atlas-app .booking-card h2 {
  font-size: 25px;
}

.atlas-app .modal-icon,
.atlas-app .qr-wrap,
.atlas-app .booking-location,
.atlas-app .appointment-meta,
.atlas-app .session-code,
.atlas-app .rating-method {
  border-radius: 8px;
}

.atlas-app .metric-list {
  gap: 12px 16px;
  padding-block: 18px;
}

@media (max-width: 700px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: 60px minmax(0, 1fr) 68px;
  }

  .app-bar {
    height: 60px;
    padding-inline: 12px;
  }

  .app-nav {
    padding-block: 4px calc(4px + env(safe-area-inset-bottom));
  }

  .app-nav button {
    min-height: 54px;
    border-radius: 7px;
  }

  .app-nav button.active,
  .app-nav button[aria-current="page"] {
    box-shadow: inset 0 -2px 0 var(--ps-coral), inset 0 0 0 1px var(--ps-line);
  }

  .app-content {
    padding: 8px;
  }

  .app-content > section {
    min-height: calc(100dvh - 144px);
    border-radius: 10px;
  }

  .qr-home {
    gap: 9px;
    padding: 14px !important;
  }

  .qr-intro h1 {
    font-size: 26px;
  }

  .qr-intro p {
    margin-bottom: 4px;
  }

  .qr-scanner {
    min-height: 290px;
    border-radius: 10px;
  }

  .manual-checkin {
    padding: 9px;
  }

  .app-content .flow {
    padding: 10px 8px 36px;
  }

  .app-content .steps {
    margin-bottom: 10px;
  }

  .app-content .photo-wrap {
    min-height: 410px;
  }

  .result {
    padding: 24px;
  }

  .result h2 {
    font-size: 25px;
  }

  .app-content .title {
    margin-top: 22px;
  }

  .app-content .sheet .portrait,
  .app-content .selection-photo {
    height: 290px;
  }

  .app-content .narrow {
    margin: 0;
    padding: 24px 18px 28px;
  }

  .app-content .gallery,
  .app-content .console {
    padding: 24px 16px 44px;
  }

  .gallery-head,
  .photos-toolbar {
    margin-bottom: 14px;
  }

  .search input {
    width: 100%;
  }

  .help {
    width: 40px;
    min-height: 40px;
    bottom: calc(76px + env(safe-area-inset-bottom));
  }

  .reset-dialog {
    padding: 24px 18px 18px;
    border-radius: 12px;
  }

  .session-loaded-header {
    min-height: 60px;
    padding: 10px 12px;
  }

  .session-profile-grid {
    gap: 8px;
    padding: 8px;
  }

  .crop-workbench,
  .session-quality {
    border-radius: 9px;
  }

  .atlas-app .booking-card {
    border-radius: 12px;
  }

  /* Atlas mobile: lead with the profile, not desktop placeholder chrome. */
  .atlas-app .atlas-top,
  .atlas-app .atlas-page-title,
  .atlas-app .atlas-tabs {
    display: none;
  }

  .atlas-app .atlas-content {
    padding-top: 12px;
  }

  .atlas-app .quality-banner {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .atlas-app .quality-banner button {
    grid-column: auto;
  }

  .atlas-app .atlas-photo-actions .studio-book {
    display: none;
  }
}

/* Final shell order: overrides earlier responsive compatibility layers. */
.app-shell {
  grid-template-columns: 94px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  background: #e9eeeb;
}

.app-nav {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 0;
  height: 100dvh;
  padding: 18px 8px 12px;
  border: 0;
  background: #111713;
}

.app-wordmark {
  min-height: 56px !important;
  display: flex !important;
  flex-direction: column;
  gap: 1px !important;
  padding: 7px 4px !important;
  border: 0 !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: #fff !important;
  box-shadow: none !important;
}

.app-wordmark strong {
  font-family: "DIN Alternate", "Avenir Next Condensed", sans-serif;
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.06em;
}

.app-wordmark b {
  color: #fff;
  font-family: "DIN Alternate", "Avenir Next Condensed", sans-serif;
  font-size: 17px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.04em;
}

.app-wordmark sup {
  color: #f06a43;
}

.app-nav-main {
  display: grid;
  align-content: start;
  gap: 6px;
  margin-top: 22px;
}

.app-nav-main button,
.rail-reset {
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 3px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #8e9993;
  box-shadow: none;
  font-size: 10px;
}

.app-nav-main button:hover,
.rail-reset:hover {
  background: #1b231e;
  color: #fff;
}

.app-nav-main button.active,
.app-nav-main button[aria-current="page"] {
  background: #ef6843;
  color: #fff;
  box-shadow: none;
}

.rail-reset {
  width: 100%;
  min-height: 52px;
  align-self: end;
}

.app-content {
  grid-column: 2;
  grid-row: 1;
  padding: 14px;
  background: #e9eeeb;
}

.app-content > section {
  min-height: calc(100dvh - 28px);
  border-radius: 12px;
}

.qr-intro h1 {
  max-width: 360px;
  font-family: "DIN Alternate", "Avenir Next Condensed", "Helvetica Neue", sans-serif;
  font-size: clamp(46px, 4.5vw, 64px);
  font-weight: 700;
  line-height: 0.98;
}

.console {
  background: #101512;
}

.console-title h1 {
  margin-block: 8px 4px;
  font-family: "DIN Alternate", "Avenir Next Condensed", "Helvetica Neue", sans-serif;
  font-size: clamp(46px, 5vw, 64px) !important;
  font-weight: 700;
  line-height: 0.95;
}

.console-title > span {
  border: 1px solid #333c36;
  border-radius: 999px;
  background: transparent;
  color: #8dcbae;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.08em;
}

.devices article {
  border-color: #313a34;
  border-radius: 9px;
  background: #171d19;
}

.devices article > i {
  color: #ef6843;
}

.devices article h2 {
  font-family: "DIN Alternate", "Avenir Next Condensed", sans-serif;
  font-size: 28px;
}

.architecture {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(360px, 1.35fr) auto;
  align-items: center;
  gap: 28px;
  padding: 22px 24px;
  border: 1px solid #313a34;
  border-radius: 9px;
  background: #171d19;
  color: #fff;
}

.architecture .system-summary h2 {
  margin: 6px 0 4px;
  color: #fff;
  font-family: "DIN Alternate", "Avenir Next Condensed", sans-serif;
  font-size: 30px;
  line-height: 1;
}

.architecture .system-summary p {
  margin: 0;
  color: #89948e;
  font-size: 12px;
}

.architecture .system-path {
  display: grid;
  grid-template-columns: auto minmax(18px, 1fr) auto minmax(18px, 1fr) auto minmax(18px, 1fr) auto;
  grid-column: auto;
  align-items: center;
  gap: 9px;
  color: #c7cec9;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.system-path i {
  height: 1px;
  display: block;
  background: #465149;
}

.architecture .system-api {
  display: flex;
  grid-column: auto;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding-left: 22px;
  border-left: 1px solid #313a34;
}

.system-api > i {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: #69c99b;
  box-shadow: 0 0 0 5px rgba(105, 201, 155, 0.1);
}

.system-api > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.system-api small {
  color: #6f7b74;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.12em;
}

.system-api b {
  color: #e7eee9;
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .architecture {
    grid-template-columns: minmax(220px, 1fr) auto;
  }

  .architecture .system-path {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

@media (max-width: 700px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) 68px;
  }

  .app-nav {
    grid-column: 1;
    grid-row: 2;
    grid-template-columns: minmax(0, 1fr) 46px;
    grid-template-rows: 1fr;
    gap: 3px;
    width: 100%;
    height: 68px;
    padding: 5px 7px calc(5px + env(safe-area-inset-bottom));
  }

  .app-wordmark {
    display: none !important;
  }

  .app-nav-main {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-content: stretch;
    gap: 3px;
    margin: 0;
  }

  .app-nav-main button,
  .rail-reset {
    min-height: 54px;
    gap: 2px;
    border-radius: 6px;
    color: #a9b1ad;
  }

  .app-nav-main button b {
    font-size: 10px;
  }

  .rail-reset {
    min-width: 46px;
  }

  .rail-reset b {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .app-content {
    grid-column: 1;
    grid-row: 1;
    padding: 8px;
  }

  .app-content > section {
    min-height: calc(100dvh - 84px);
  }

  .qr-intro h1 {
    font-size: 42px;
  }

  .console-title h1 {
    font-size: 44px !important;
  }

  .architecture {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 20px;
  }

  .architecture .system-path,
  .architecture .system-api {
    grid-column: 1;
    grid-row: auto;
  }

  .architecture .system-api {
    padding: 16px 0 0;
    border-top: 1px solid #313a34;
    border-left: 0;
  }
}
```

### `app/device-portability.css`

```css
/* Portable camera and printer setup */
.portable-devices{grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch}
.portable-devices article{display:flex;min-width:0;flex-direction:column}
.portable-devices article>p{min-height:88px;margin-bottom:18px}
.device-field{display:flex;flex-direction:column;gap:7px;margin-top:auto;color:#b7bab8;font-size:12px;font-weight:700}
.device-field select,.camera-picker select{width:100%;height:44px;padding:0 38px 0 12px;border:1px solid #535957;border-radius:10px;background:#202421;color:#fff;font:600 13px ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;text-overflow:ellipsis}
.device-field select:focus-visible,.camera-picker select:focus-visible{outline:3px solid #ff8b68;outline-offset:2px}
.device-buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.devices .device-buttons button{flex:1;min-width:128px}
.devices .device-buttons .device-primary{border-color:#ed6b45;background:#e75d37;color:#fff}
.devices .device-buttons button:disabled{cursor:not-allowed;opacity:.42}
.device-error{margin-top:10px;padding:10px;border-radius:8px;background:#5b2924;color:#ffd7ce;font-size:12px;line-height:1.35}

.camera-picker{display:flex;flex-direction:column;gap:7px;color:#fff}
.camera-picker>span{display:flex;align-items:center;gap:6px;color:#ffffff9e;font-size:12px;font-weight:700}
.camera-picker select{background:#171d1a;border-color:#ffffff24}
.camera-secondary-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.camera-secondary-actions button,.camera-loading button{min-height:40px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;border:1px solid #ffffff22;border-radius:9px;background:#ffffff0c;color:#fff;font-size:11px;font-weight:700}
.camera-secondary-actions button:disabled{opacity:.45}
.camera-loading{gap:12px;padding:24px;text-align:center}
.camera-loading>span{max-width:440px;color:#ffd8ce;line-height:1.45}
.camera-loading button{width:min(100%,280px);margin:0 auto;background:#29322e}
.camera-loading button:last-child{background:#e75d37;border-color:#e75d37}

@media(max-width:1050px){
 .portable-devices{grid-template-columns:1fr 1fr!important}
 .portable-devices article:last-child{grid-column:auto}
 .portable-devices article>p{min-height:0}
}
@media(max-width:760px){
 .portable-devices{grid-template-columns:1fr!important}
 .portable-devices article:last-child{grid-column:auto}
 .camera-secondary-actions{grid-template-columns:1fr}
}
```

### `app/studio-enhance.css`

```css
.enhance-editor {
  min-height: 100dvh;
  height: 100dvh;
  overflow: auto;
  padding: 22px clamp(16px, 3.5vw, 52px) 34px;
  background:
    radial-gradient(circle at 8% 0%, #27342e 0, transparent 24%),
    radial-gradient(circle at 96% 88%, #2b201b 0, transparent 25%),
    #0f1412;
  color: #fff;
  color-scheme: dark;
}
.enhance-header {
  width: min(100%, 1180px);
  height: auto;
  position: static;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  margin: 0 auto 18px;
  padding: 0;
  border: 0;
  background: transparent;
}
.enhance-header>div { display: flex; align-items: center; flex-direction: column; gap: 2px; }
.enhance-header .eyebrow { color: #ef8968; font-size: 9px; }
.enhance-header>div b { font-size: 15px; }
.enhance-back,.enhance-local { justify-self: start; }
.enhance-back {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid #ffffff18;
  border-radius: 10px;
  background: #ffffff08;
  color: #ffffffbd;
  font-weight: 700;
}
.enhance-back:hover { border-color: #ffffff30; background: #ffffff10; color: #fff; }
.enhance-local {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid #5ce49328;
  border-radius: 999px;
  background: #5ce4930d;
  color: #a8f6c6;
  font-size: 11px;
  font-weight: 700;
}
.enhance-layout {
  width: min(100%, 1180px);
  display: grid;
  grid-template-columns: minmax(430px, 1.12fr) minmax(360px, .88fr);
  align-items: stretch;
  gap: 18px;
  margin: auto;
}
.enhance-preview-panel,.enhance-controls {
  border: 1px solid #ffffff12;
  border-radius: 22px;
  background: #181e1b;
  box-shadow: 0 24px 64px #0005;
}
.enhance-preview-panel { display: flex; min-height: 0; flex-direction: column; padding: 16px; }
.enhance-preview {
  position: relative;
  min-height: 520px;
  flex: 1;
  overflow: hidden;
  border-radius: 17px;
  background: #070a08;
}
.enhance-preview img { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; }
.enhance-preview .compare-original-image { position: absolute; inset: 0; }
.enhance-preview-label {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 7px 10px;
  border: 1px solid #ffffff18;
  border-radius: 999px;
  background: #090d0bcf;
  color: #ffffffa8;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
}
.enhance-preview-label.active { border-color: #5ce49336; color: #b9f8d0; }
.enhance-preview-label.after { right: 14px; left: auto; }
.compare-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 4;
  width: 2px;
  background: #fff;
  box-shadow: 0 0 18px #000c;
  pointer-events: none;
  transform: translateX(-1px);
}
.compare-divider>span { width: 44px; height: 44px; position: absolute; top: 50%; left: 50%; display: grid; place-items: center; border: 2px solid #fff; border-radius: 50%; background: #111714e8; color: #fff; box-shadow: 0 8px 24px #0009; font: 800 18px/1 ui-sans-serif; transform: translate(-50%,-50%); }
.compare-slider { width: 100%; height: 100%; position: absolute; inset: 0; z-index: 5; margin: 0; opacity: 0; cursor: ew-resize; touch-action: none; }
.enhance-preview:focus-within .compare-divider>span { outline: 3px solid #ef8968; outline-offset: 3px; }
.compare-instruction { margin: 9px 0 -2px; color: #ffffff62; font-size: 9px; text-align: center; }
.enhance-trust { display: flex; align-items: center; gap: 10px; padding: 13px 4px 0; color: #82dca4; }
.enhance-trust>span { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.enhance-trust b { color: #c9f7dc; font-size: 11px; }
.enhance-trust small { color: #ffffff5e; font-size: 9px; }
.enhance-pipeline {
  display: grid;
  grid-template-columns: repeat(5,1fr);
  gap: 5px;
  margin-top: 12px;
}
.enhance-pipeline span {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px;
  border-radius: 9px;
  background: #ffffff05;
  color: #ffffff43;
}
.enhance-pipeline i { width: 18px; height: 18px; display: grid; flex: none; place-items: center; border: 1px solid #ffffff14; border-radius: 50%; font: 700 8px ui-monospace,monospace; font-style: normal; }
.enhance-pipeline b { overflow: hidden; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.enhance-pipeline span.active { background: #ef653d13; color: #ffab92; }
.enhance-pipeline span.done { background: #5ce4930a; color: #9aebba; }
.enhance-pipeline span.done i { border-color: #5ce49337; background: #5ce49313; }
.enhance-controls { padding: 22px; }
.enhance-title { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 17px; border-bottom: 1px solid #ffffff0d; }
.enhance-title>span { width: 38px; height: 38px; display: grid; flex: none; place-items: center; border-radius: 12px; background: #ef653d1b; color: #ff9d7f; }
.enhance-title h1 { margin: 0 0 5px; color: #fff; font: 750 25px/1.08 ui-sans-serif; letter-spacing: -.04em; }
.enhance-title p { margin: 0; color: #ffffff69; font-size: 11px; line-height: 1.5; }
.codeformer-card { margin-top: 14px; padding: 12px; border: 1px solid #6f8cff2c; border-radius: 14px; background: linear-gradient(145deg,#6685ff10,#0e1311); }
.codeformer-card.restored { border-color: #5ce49338; background: linear-gradient(145deg,#5ce4930e,#0e1311); }
.codeformer-heading { display: grid; grid-template-columns: 32px minmax(0,1fr) auto; align-items: center; gap: 9px; }
.codeformer-heading>span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; background: #708bff1c; color: #91a7ff; }
.codeformer-heading>div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.codeformer-heading b { font-size: 11px; }
.codeformer-heading small { overflow: hidden; color: #ffffff55; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.codeformer-heading>i { padding: 5px 7px; border-radius: 999px; background: #ffffff0a; color: #ffffff76; font-size: 8px; font-style: normal; font-weight: 800; }
.codeformer-card.restored .codeformer-heading>i { background: #5ce49318; color: #9aebba; }
.codeformer-fidelity { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 5px 10px; margin-top: 10px; }
.codeformer-fidelity>span { display: flex; flex-direction: column; gap: 2px; }
.codeformer-fidelity b { font-size: 9px; }
.codeformer-fidelity small { color: #ffffff49; font-size: 8px; }
.codeformer-fidelity output { color: #b9c5ff; font: 800 10px ui-monospace,monospace; }
.codeformer-fidelity input { grid-column: 1/3; width: 100%; margin: 0; accent-color: #708bff; }
.codeformer-action { width: 100%; min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 9px; border: 1px solid #7891ff50; border-radius: 10px; background: #708bff18; color: #d6ddff; font-size: 10px; font-weight: 800; }
.codeformer-action:hover:not(:disabled) { background: #708bff2a; }
.codeformer-action:disabled { cursor: not-allowed; opacity: .42; }
.codeformer-card p { margin: 8px 0 0; font-size: 8px; line-height: 1.45; }
.codeformer-caption { color: #ffffff58; }
.codeformer-error { color: #ff9a7c; }
.codeformer-card>a { display: inline-block; margin-top: 5px; color: #91a7ff; font-size: 8px; text-decoration: none; }
.codeformer-card>a:hover { text-decoration: underline; }
.spinning { animation: codeformer-spin 1s linear infinite; }
@keyframes codeformer-spin { to { transform: rotate(360deg); } }
.enhance-toggle {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 16px 0 11px;
  padding: 10px 12px;
  border: 1px solid #ffffff13;
  border-radius: 13px;
  background: #101512;
  color: #fff;
  text-align: left;
}
.enhance-toggle>span { display: flex; flex-direction: column; gap: 3px; }
.enhance-toggle b { font-size: 12px; }
.enhance-toggle small { color: #ffffff57; font-size: 9px; }
.enhance-toggle i { min-width: 40px; padding: 7px 9px; border-radius: 999px; background: #ffffff10; color: #ffffff70; font-size: 10px; font-style: normal; text-align: center; }
.enhance-toggle.on { border-color: #5ce4932d; background: #5ce4930a; }
.enhance-toggle.on i { background: #3dcf79; color: #07150d; font-weight: 800; }
.enhance-presets { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; margin-bottom: 14px; padding: 4px; border-radius: 12px; background: #0f1412; }
.enhance-presets button { min-height: 38px; border: 0; border-radius: 9px; background: transparent; color: #ffffff6f; font-size: 10px; font-weight: 750; }
.enhance-presets button:hover { color: #fff; }
.enhance-presets button.active { background: #fff; color: #161b18; box-shadow: 0 5px 15px #0005; }
.background-options { min-width: 0; margin: 0 0 12px; padding: 0; border: 0; transition: opacity 160ms ease; }
.background-options.disabled { opacity: .38; pointer-events: none; }
.background-options legend { margin-bottom: 7px; color: #ffffff72; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.background-options>div { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
.background-options button { min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 6px; border: 1px solid #ffffff0c; border-radius: 10px; background: #ffffff03; color: #ffffff82; text-align: left; }
.background-options button:hover:not(:disabled) { border-color: #ffffff26; color: #fff; }
.background-options button.active { border-color: #ef896864; background: #ef653d0d; color: #fff; }
.background-options button:disabled { cursor: not-allowed; opacity: .32; }
.background-options button>span { min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 0 2px 2px; }
.background-options button b { font-size: 9px; }
.background-options button small { overflow: hidden; color: #ffffff46; font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.background-swatch { width: 100%; height: 26px; border-radius: 6px; background: linear-gradient(135deg,#2b342f,#aeb9b3); }
.background-swatch.original { background: linear-gradient(135deg,#777 0 32%,#b8946a 32% 55%,#313b35 55%); }
.background-swatch.blur { background: linear-gradient(135deg,#59625e,#a58d77); filter: blur(1px); }
.background-swatch.gray { background: radial-gradient(circle at 45% 32%,#7a8781,#27302d 70%); }
.background-swatch.ivory { background: radial-gradient(circle at 45% 32%,#f1eadf,#a99c8b 70%); }
.enhance-sliders { display: grid; gap: 8px; transition: opacity 160ms ease; }
.enhance-sliders.disabled { opacity: .38; pointer-events: none; }
.enhance-slider {
  display: grid;
  grid-template-columns: 34px minmax(0,1fr) 32px;
  align-items: center;
  gap: 8px 10px;
  padding: 10px 11px;
  border: 1px solid #ffffff0c;
  border-radius: 12px;
  background: #ffffff04;
}
.enhance-slider-icon { width: 30px; height: 30px; display: grid; grid-row: 1/3; place-items: center; border-radius: 9px; background: #ffffff08; color: #ff9d7f; }
.enhance-slider-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.enhance-slider-copy b { font-size: 11px; }
.enhance-slider-copy small { overflow: hidden; color: #ffffff50; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.enhance-slider output { color: #ffffffb8; font: 700 11px ui-monospace,monospace; text-align: right; }
.enhance-slider input { grid-column: 2/4; width: 100%; height: 18px; margin: 0; accent-color: #ef653d; cursor: ew-resize; }
.enhance-note { display: flex; align-items: flex-start; gap: 9px; margin: 13px 0; padding: 10px 11px; border-radius: 11px; background: #ffffff06; color: #82dca4; }
.enhance-note svg { flex: none; }
.enhance-note p { display: flex; flex-direction: column; gap: 2px; margin: 0; }
.enhance-note b { color: #c9f7dc; font-size: 9px; }
.enhance-note span { color: #ffffff58; font-size: 8px; line-height: 1.4; }
.resolution-toggle {
  width: 100%;
  min-height: 49px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 8px 11px;
  border: 1px solid #ffffff0c;
  border-radius: 12px;
  background: #ffffff04;
  color: #fff;
  text-align: left;
}
.resolution-toggle>span { display: flex; flex-direction: column; gap: 2px; }
.resolution-toggle b { font-size: 10px; }
.resolution-toggle small { color: #ffffff4e; font-size: 8px; }
.resolution-toggle>i { width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid #ffffff15; border-radius: 7px; color: transparent; font-style: normal; }
.resolution-toggle.on { border-color: #5ce49324; background: #5ce49308; }
.resolution-toggle.on>i { border-color: #5ce49338; background: #3dcf79; color: #07150d; }
.resolution-toggle:disabled { cursor: not-allowed; opacity: .38; }
.enhance-continue {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: #ef653d;
  color: #fff;
  box-shadow: 0 12px 28px #ef653d25;
  font-weight: 800;
}
.enhance-continue:hover { background: #f17753; transform: translateY(-1px); }
.enhance-continue:disabled { cursor: wait; opacity: .48; transform: none; }
.enhance-editor button:focus-visible,.enhance-editor input:focus-visible { outline: 3px solid #ef8968; outline-offset: 3px; }
@media(max-width:860px){
 .enhance-editor{height:auto;min-height:100dvh}
 .enhance-layout{grid-template-columns:1fr;max-width:640px}
 .enhance-header{max-width:640px}
 .enhance-preview{min-height:560px}
}
@media(max-width:580px){
 .enhance-editor{padding:14px 10px 24px}
 .enhance-header{grid-template-columns:1fr auto;margin-bottom:12px}
 .enhance-header>div{align-items:flex-start;order:-1}
 .enhance-back{grid-row:2;min-height:38px;padding:0 10px}
 .enhance-local{grid-column:2;grid-row:1/3}
 .enhance-preview-panel,.enhance-controls{border-radius:17px}
 .enhance-preview-panel{padding:10px}
 .enhance-preview{min-height:430px;border-radius:13px}
 .enhance-controls{padding:16px}
 .enhance-title h1{font-size:22px}
 .enhance-slider-copy small{white-space:normal}
 .background-options>div{grid-template-columns:repeat(2,1fr)}
 .enhance-pipeline{grid-template-columns:repeat(5,minmax(54px,1fr));overflow:auto}
}
@media(prefers-reduced-motion:reduce){.enhance-sliders,.enhance-continue{transition:none}.spinning{animation:none}}
```

### `app/brand-assets.css`

```css
.asset-studio{min-height:calc(100dvh - 28px);overflow:clip;padding:36px clamp(22px,3.5vw,48px) 58px;background:#eef1ef;color:#17211d}
.asset-header{position:static;z-index:auto;width:100%;height:auto;min-height:0;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:24px;padding:0 0 20px;border:0;border-bottom:1px solid #d7ded9;background:transparent}
.asset-header>div{min-width:0}.asset-header h1{max-width:820px;margin:8px 0;font-size:clamp(34px,4vw,52px);line-height:1;letter-spacing:-.045em;text-wrap:balance}.asset-header p{max-width:730px;margin:0;color:#647069;font-size:16px;overflow-wrap:anywhere}
.asset-local{display:inline-flex;align-items:center;gap:7px;flex:none;padding:9px 12px;border:1px solid #cfd8d2;border-radius:999px;background:#f8faf9;color:#3d725b;font-size:11px;font-weight:750}
.asset-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:18px;align-items:start}.asset-layout>*{min-width:0}
.asset-controls{display:flex;flex-direction:column;gap:12px}
.asset-control-group{padding:16px;border:1px solid #d9dfdc;border-radius:14px;background:#fff;box-shadow:0 7px 22px rgba(28,37,32,.045)}
.asset-group-title{display:flex;align-items:center;gap:10px;margin-bottom:14px}.asset-group-title>span{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:#eff3f1;color:#718079;font:750 10px ui-monospace,monospace}.asset-group-title>div{display:flex;flex-direction:column;gap:2px}.asset-group-title b{font-size:13px}.asset-group-title small{color:#87908b;font-size:10px}
.asset-photo-list{display:flex;gap:8px;overflow-x:auto;padding:2px 1px 5px}.asset-photo-list button{position:relative;width:58px;height:72px;flex:none;overflow:hidden;padding:0;border:2px solid transparent;border-radius:10px;background:#e9eeeb}.asset-photo-list button.active{border-color:#f57721;box-shadow:0 0 0 3px #f577211b}.asset-photo-list img{width:100%;height:100%;display:block;object-fit:cover}.asset-photo-list em{position:absolute;left:0;right:0;top:0;padding:2px 0;font-size:8px;font-style:normal;font-weight:750;letter-spacing:.04em;text-align:center;text-transform:uppercase;color:#fff;background:#1f2a24cc}.asset-photo-list button.awards em{background:#8a5a12dd}.asset-photo-list i{position:absolute;right:3px;bottom:3px;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#f57721;color:#fff}
.asset-ai-button{width:100%;min-height:62px;display:flex;align-items:center;gap:11px;padding:10px 12px;border:1px solid #f5772140;border-radius:11px;background:#fff7ef;color:#b95617;text-align:left}.asset-ai-button>svg{flex:none}.asset-ai-button>span{display:flex;min-width:0;flex-direction:column;gap:2px}.asset-ai-button b{font-size:12px}.asset-ai-button small{color:#8b746d;font-size:10px}.asset-ai-button.done{border-color:#55aa7c45;background:#f0f9f4;color:#347a58}.asset-ai-button:disabled{cursor:wait;opacity:.62}.asset-use-original{display:flex;align-items:center;gap:6px;margin:10px auto 0;padding:5px;border:0;background:transparent;color:#707b75;font-size:10px;font-weight:700}
.asset-field{display:flex;flex-direction:column;gap:5px;margin-top:10px}.asset-field span{color:#65716a;font-size:10px;font-weight:750}.asset-field input,.asset-field select{width:100%;height:39px;padding:0 10px;border:1px solid #d9dfdc;border-radius:8px;background:#fbfcfb;color:#17211d;font-size:12px}.asset-field input:focus,.asset-field select:focus{border-color:#ed9b5c;outline:3px solid #f5772114}
.asset-template-note{margin:0;color:#727d77;font-size:11px;line-height:1.5}
.asset-atlas-info{display:grid;gap:5px;margin:12px 0 0}.asset-atlas-info>div{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;align-items:baseline;padding-bottom:5px;border-bottom:1px solid #edf0ee}.asset-atlas-info dt{color:#89918d;font-size:9px;font-weight:750;text-transform:uppercase}.asset-atlas-info dd{overflow:hidden;margin:0;color:#2f3934;font-size:10px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}
.asset-range{display:block;margin-top:14px}.asset-range>span{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;color:#647069;font-size:10px}.asset-range label{font-weight:700}.asset-range output{font:700 10px ui-monospace,monospace}.asset-range input{width:100%;accent-color:#f57721}
.asset-workbench{min-width:0;overflow:hidden;padding:16px;border-radius:18px;background:#101613;color:#fff;box-shadow:0 22px 60px rgba(15,22,18,.2)}
.asset-tabs{display:flex;gap:5px;margin-bottom:10px;padding:4px;border-radius:11px;background:#ffffff0a}.asset-tabs button{min-height:48px;display:flex;align-items:center;justify-content:center;gap:9px;flex:1;border:0;border-radius:8px;background:transparent;color:#ffffff70;text-align:left}.asset-tabs button>span{display:flex;flex-direction:column;gap:1px}.asset-tabs button b{font-size:11px}.asset-tabs button small{color:inherit;font-size:8px;font-weight:650}.asset-tabs button.active{background:#fff;color:#17211d}.asset-tabs button:focus-visible{outline:3px solid #f5772170;outline-offset:2px}
.designer-lock{display:flex;align-items:center;justify-content:center;gap:7px;margin:0 0 10px;color:#9eaaa4;font-size:9px}.designer-lock b{margin-right:4px;color:#d8dfdc;font-size:9px}
.asset-preview-shell{min-height:440px;display:grid;place-items:center;overflow:hidden;padding:28px;border:1px solid #ffffff0d;border-radius:13px;background:radial-gradient(circle at 50% 35%,#27322d,#080c0a 72%)}
.subsale-banner-preview{position:relative;width:min(100%,940px);aspect-ratio:2650/1786;container-type:inline-size;overflow:hidden;background:#fff;box-shadow:0 25px 70px #0009}.subsale-artwork{position:absolute;inset:0;z-index:1;width:100%;height:100%;display:block;object-fit:contain}.subsale-mobile,.subsale-agent-line,.subsale-office-phone{position:absolute;z-index:2;font-family:"DIN Alternate","Avenir Next Condensed","Arial Narrow",Arial,sans-serif;letter-spacing:-.035em;white-space:nowrap}.subsale-mobile{left:2.7%;top:calc(54.31% - .7665em);max-width:63.5%;overflow:hidden;color:#231f20;font-size:18cqw;font-weight:800;line-height:.84}.subsale-agent-line{left:2.7%;top:calc(70.55% - .7665em);max-width:63.5%;overflow:hidden;display:flex;align-items:baseline;gap:1.3cqw;color:#332f30;line-height:.9}.subsale-agent-line>strong{max-width:46cqw;overflow:hidden;font-weight:700;text-overflow:clip}.subsale-agent-line>span{font-size:3.2cqw;font-weight:700;letter-spacing:-.025em}.subsale-office-phone{left:15.47%;top:calc(94.29% - .7665em);max-width:37.7%;overflow:hidden;color:#fff;font-size:6.5cqw;font-weight:700;line-height:.86}.subsale-photo{position:absolute;z-index:3;inset:0;overflow:hidden;background:transparent}.subsale-photo img{position:absolute;display:block;object-fit:contain}.subsale-photo>span{position:absolute;left:72%;bottom:0;width:23.8%;height:38.7%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;border:1px dashed #d7ddd9;border-radius:14px;background:#f7f9f8;color:#78827d;font-size:10px;font-weight:750}.subsale-banner-preview.has-cutout .subsale-photo{background:transparent}
.asset-export-bar,.asset-preview-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:9px 2px 2px}.asset-export-bar>div,.asset-preview-bar>div{display:flex;flex-direction:column;gap:3px}.asset-export-bar span,.asset-preview-bar span{display:flex;align-items:center;gap:6px;color:#91d7ad;font-size:10px;font-weight:800}.asset-export-bar small,.asset-preview-bar small{color:#ffffff64;font-size:9px}.asset-export-bar button,.asset-preview-bar button{min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border:0;border-radius:9px;background:#f57721;color:#fff;font-size:10px;font-weight:800;white-space:nowrap}.asset-export-bar button:hover{background:#ff8938}.asset-export-bar button:disabled{cursor:wait;opacity:.55}.asset-preview-bar span{color:#d6b879}.asset-preview-bar button{border:1px solid #ffffff1f;background:transparent}.asset-preview-bar button:hover{background:#ffffff0d}
.asset-export-bar.mock-atlas span{color:#e9c789}.asset-export-bar button:disabled{cursor:not-allowed}
.awards-preview{position:relative;width:min(100%,980px);aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,#07130f,#10261e 55%,#050907);box-shadow:0 25px 70px #0009}.awards-preview:after{position:absolute;inset:0;background:radial-gradient(circle at 82% 34%,rgba(215,185,123,.14),transparent 32%);content:""}.awards-beam{position:absolute;top:-20%;bottom:-20%;width:1px;z-index:1;background:#d6b87966;rotate:-28deg}.awards-beam.one{left:26%;box-shadow:46px 0 #d6b8792e,92px 0 #d6b8791c}.awards-beam.two{left:42%;box-shadow:60px 0 #d6b87920}.awards-copy{position:absolute;z-index:4;left:6.2%;top:9%;width:47%;height:70%;display:flex;flex-direction:column;align-items:flex-start}.awards-copy>span{color:#d6b879;font-size:clamp(6px,1.25vw,13px);font-weight:800;letter-spacing:.18em}.awards-copy>svg{margin-top:auto;color:#d6b879}.awards-copy>small{margin:8px 0;color:#f5f0e6;font-size:clamp(7px,1.1vw,12px);font-weight:750;letter-spacing:.14em}.awards-copy h2{max-width:100%;margin:0;color:#fff;font-size:clamp(24px,5vw,62px);line-height:.95;letter-spacing:-.05em}.awards-copy p{margin:12px 0 0;color:#d6b879;font-size:clamp(10px,2vw,23px);font-weight:650}.awards-photo{position:absolute;z-index:2;inset:4% 2% 6% 50%;overflow:hidden}.awards-photo img{width:100%;height:100%;display:block;object-fit:cover;object-position:center top;transform-origin:center bottom}.awards-preview.has-cutout .awards-photo img{object-fit:contain;object-position:center bottom}.awards-footer{position:absolute;z-index:5;left:6.2%;right:6.2%;bottom:5.5%;display:flex;align-items:center;gap:14px;color:#d6b879}.awards-footer span{font-size:clamp(14px,2.5vw,29px);font-weight:900}.awards-footer i{width:13%;height:1px;background:#d6b879}.awards-footer b{color:#aebbb5;font-size:clamp(5px,.95vw,10px);letter-spacing:.16em}
.asset-preview-shell:fullscreen{width:100vw;height:100vh;padding:clamp(16px,4vw,64px);border:0;border-radius:0;background:#080c0a}.asset-preview-shell:fullscreen .awards-preview{width:min(100%,1600px)}
/* Print order sheet: mock checkout for sending the finished board to the print partner. */
.print-sheet{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;padding:0}
.print-scrim{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(9,14,11,.62);cursor:pointer}
.print-card{position:relative;width:min(100%,470px);max-height:min(92dvh,860px);display:flex;flex-direction:column;overflow:hidden;border-radius:20px 20px 0 0;background:#fff;color:#17211d;box-shadow:0 -18px 60px rgba(9,14,11,.4)}
.print-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 18px 12px;border-bottom:1px solid #e7ebe9}
.print-card header>div{display:flex;flex-direction:column;gap:3px}.print-card header span{color:#9aa39e;font-size:9px;font-weight:800;letter-spacing:.09em}.print-card header b{font-size:16px;letter-spacing:-.02em}
.print-card header button{width:32px;height:32px;flex:none;display:grid;place-items:center;padding:0;border:1px solid #e2e7e4;border-radius:9px;background:#fbfcfb;color:#5d6862}
.print-body,.print-done{display:flex;flex-direction:column;gap:14px;overflow-y:auto;padding:16px 18px 22px}
.print-proof{display:flex;flex-direction:column;gap:6px}.print-proof img{width:100%;height:auto;display:block;border:1px solid #e4e9e6;border-radius:10px;background:#fff}.print-proof small{color:#7c8681;font-size:10px;font-weight:700}
.print-group{display:flex;flex-direction:column;gap:7px;margin:0;padding:0;border:0}
.print-group legend{margin-bottom:6px;padding:0;color:#65716a;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
.print-option{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid #dde3e0;border-radius:11px;background:#fbfcfb;cursor:pointer}
.print-option.active{border-color:#f57721;background:#fff7ef;box-shadow:0 0 0 3px #f577211b}
.print-option input{width:15px;height:15px;flex:none;accent-color:#f57721}
.print-option>span{display:flex;min-width:0;flex-direction:column;gap:2px;flex:1}.print-option b{font-size:12px}.print-option small{color:#7f8a84;font-size:10px}
.print-option em{flex:none;color:#b95617;font-size:12px;font-style:normal;font-weight:800}.print-option em>svg{display:block;color:#a8b0ac}
.print-quantity{display:flex;align-items:center;justify-content:space-between;gap:12px}
.print-quantity>span{color:#65716a;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
.print-quantity>div{display:flex;align-items:center;gap:2px;padding:3px;border:1px solid #dde3e0;border-radius:10px;background:#fbfcfb}
.print-quantity button{width:32px;height:32px;display:grid;place-items:center;padding:0;border:0;border-radius:8px;background:#fff;color:#3b4640;font-size:15px;font-weight:800}
.print-quantity output{min-width:34px;font:800 13px ui-monospace,monospace;text-align:center}
.print-address{margin-top:0}
.print-summary{display:grid;gap:6px;margin:0;padding:13px;border-radius:12px;background:#f3f6f4}
.print-summary>div{display:flex;align-items:center;justify-content:space-between;gap:10px}
.print-summary dt{display:flex;align-items:center;gap:5px;color:#6c7772;font-size:11px;font-weight:700}
.print-summary dd{margin:0;font-size:12px;font-weight:800}
.print-summary .print-total dt{color:#17211d;font-size:12px}.print-summary .print-total dd{font-size:16px;letter-spacing:-.02em}
.print-pay{min-height:50px;display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;background:#f57721;color:#fff;font-size:14px;font-weight:800}
.print-pay:disabled{background:#e3c4ae;cursor:not-allowed}
.print-note{color:#8b948f;font-size:10px;line-height:1.5;text-align:center}
.print-done{align-items:center;padding-top:26px;text-align:center}
.print-done-tick{width:56px;height:56px;display:grid;place-items:center;border-radius:50%;background:#e8f6ed;color:#2f7d52}
.print-done>b{font:800 17px ui-monospace,monospace;letter-spacing:-.01em}
.print-done>p{max-width:330px;margin:0;color:#6c7772;font-size:12px;line-height:1.55}
.print-done .print-summary,.print-done .print-pay{width:100%}
@media(min-width:620px){.print-sheet{align-items:center;padding:24px}.print-card{border-radius:20px}}
.asset-empty{min-height:calc(100dvh - 28px);display:flex;align-items:center;justify-content:center;flex-direction:column;padding:32px;text-align:center;background:#f4f6f5}.asset-empty>span{width:58px;height:58px;display:grid;place-items:center;border-radius:15px;background:#fff0e5;color:#dc691c}.asset-empty h1{margin:18px 0 5px;font-size:34px}.asset-empty p{max-width:500px;margin:0 0 20px}.asset-empty button{min-height:46px;padding:0 18px;border:0;border-radius:9px;background:#293a34;color:#fff;font-weight:750}
@media(max-width:1180px){.asset-studio{padding:28px clamp(18px,3vw,32px) 52px}.asset-header{display:grid;gap:10px;margin-bottom:20px}.asset-header h1{max-width:680px;font-size:clamp(34px,5vw,46px)}.asset-header p{font-size:14px}.asset-local{width:max-content}.asset-layout{grid-template-columns:1fr}.asset-controls{display:grid;grid-template-columns:1fr 1fr;align-items:start}.asset-control-group:last-child{grid-column:1/-1}.asset-workbench{padding:14px}.asset-preview-shell{min-height:0;padding:18px}}
@media(max-width:700px){.asset-studio{padding:22px 14px 44px}.asset-header{padding-bottom:16px}.asset-header h1{font-size:34px}.asset-header p{font-size:14px}.asset-controls{display:flex}.asset-preview-shell{padding:10px}.asset-tabs button{min-height:46px}.asset-export-bar,.asset-preview-bar{align-items:stretch;flex-direction:column}.asset-export-bar button,.asset-preview-bar button{width:100%}.awards-copy>svg{width:18px}.asset-local{font-size:10px}.designer-lock{justify-content:flex-start;padding-left:5px}}
@media(max-width:420px){.asset-header h1{font-size:30px}.asset-preview-shell{padding:6px}.asset-workbench{padding:9px}.asset-tabs{margin-bottom:9px}.asset-tabs button{min-height:42px}.asset-tabs button small{display:none}.asset-group-title{margin-bottom:11px}.designer-lock span{font-size:8px}}
@media(prefers-reduced-motion:reduce){.asset-studio *{scroll-behavior:auto!important;transition:none!important}}
```

### `app/atlas/atlas.css`

```css
.atlas-app{--orange:#e45b36;--green:#619a5b;--gold:#e4a52f;--ink:#202624;--muted:#6f7773;--line:#e3e7e5;min-height:100vh;background:#f4f6f5;color:var(--ink);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.atlas-app *{box-sizing:border-box}.atlas-app button,.atlas-app input,.atlas-app select{font:inherit}.atlas-top{position:fixed;inset:0 0 auto;z-index:20;height:68px;display:flex;align-items:center;gap:32px;padding:0 26px;border-bottom:1px solid var(--line);background:#fff}.atlas-mark{display:flex;align-items:center;gap:11px;min-width:202px;color:var(--ink);text-decoration:none}.atlas-mark>b{position:relative;width:34px;height:36px}.atlas-mark i{position:absolute;left:4px;width:26px;height:16px;border-radius:50%;transform:rotate(-16deg)}.atlas-mark i:nth-child(1){top:1px;background:#e85d3b}.atlas-mark i:nth-child(2){top:10px;background:#e3ab35}.atlas-mark i:nth-child(3){top:19px;background:#6ca45f}.atlas-mark span{font-size:20px;font-weight:800;letter-spacing:-.04em}.atlas-mark em{color:#69706d;font-size:12px;font-style:normal;letter-spacing:.12em}.atlas-search{position:relative;flex:1;max-width:560px}.atlas-search:before{position:absolute;left:14px;top:12px;color:#89908c;content:"⌕"}.atlas-search input{width:100%;height:42px;padding:0 16px 0 38px;border:1px solid var(--line);border-radius:12px;background:#f7f8f8}.atlas-tools{display:flex;align-items:center;gap:10px;margin-left:auto}.atlas-tools button{border:1px solid var(--line);background:#fff}.atlas-tools>button:first-child{position:relative;width:42px;height:42px;border-radius:12px}.atlas-tools>button:first-child i{position:absolute;right:8px;top:7px;width:7px;height:7px;border:2px solid #fff;border-radius:50%;background:var(--orange)}.atlas-user{height:44px;display:flex;align-items:center;gap:9px;padding:0 10px;border-radius:13px}.atlas-user span{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:#edf5ed;color:#467c45;font-size:12px}.atlas-side{position:fixed;inset:68px auto 0 0;width:230px;display:flex;flex-direction:column;justify-content:space-between;padding:24px 14px;border-right:1px solid var(--line);background:#fff}.atlas-side nav{display:grid;gap:5px}.atlas-side button{height:48px;display:flex;align-items:center;gap:13px;padding:0 14px;border:0;border-radius:11px;background:transparent;color:#666e6a}.atlas-side button svg{width:20px}.atlas-side button.active{background:#fff1ec;color:#b84a2c;font-weight:750}.atlas-side>div{display:flex;gap:9px;align-items:center;padding:12px;color:#718078;font-size:12px}.atlas-side>div svg{width:17px;color:#5b9561}.atlas-content{padding:100px 34px 44px 264px;max-width:1500px;margin:auto}.atlas-heading{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.atlas-heading small,.booking-card>small{color:#b64b2e;font-size:11px;font-weight:800;letter-spacing:.14em}.atlas-heading h1{margin:5px 0 5px;font-size:34px;letter-spacing:-.04em}.atlas-heading p{margin:0;color:var(--muted)}.save{display:flex;align-items:center;gap:8px;height:42px;padding:0 14px;border:1px solid #dce7df;border-radius:11px;background:#f4faf5;color:#51805a;font-weight:700}.quality-banner{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;margin-bottom:20px;padding:16px 18px;border:1px solid #edcbbf;border-radius:15px;background:linear-gradient(90deg,#fff3ef,#fffaf8)}.banner-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#fff;color:var(--orange);box-shadow:0 4px 14px #b64a2720}.quality-banner>div:nth-child(2){display:flex;flex-direction:column;gap:3px}.quality-banner span{color:#735e57;font-size:13px}.quality-banner button,.confirm{height:44px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border:0;border-radius:10px;background:var(--orange);color:#fff;font-weight:750;box-shadow:0 8px 18px #d7553030}.profile-layout{display:grid;grid-template-columns:380px minmax(0,1fr);gap:20px}.profile-card,.details-card{border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 10px 28px #2331290a;overflow:hidden}.cover{height:88px;display:flex;align-items:flex-end;justify-content:flex-end;padding:12px 16px;background:linear-gradient(135deg,#263b37,#43665c);color:#ffffff70;font-size:10px;font-weight:800;letter-spacing:.14em}.identity{display:flex;align-items:flex-end;gap:15px;padding:0 22px}.agent-photo{position:relative;width:112px;height:136px;flex:none;margin-top:-48px;border:4px solid #fff;border-radius:16px;background-image:url('/portraits-contact-sheet.png');background-position:50% center;background-size:300% 100%;box-shadow:0 8px 20px #1e2c2730}.agent-photo.has-photo{background-position:center;background-size:cover}.rating-ring{position:absolute;right:-10px;bottom:-9px;width:42px;height:42px;display:grid;place-items:center;border:3px solid #fff;border-radius:50%;background:#e4a52f;color:#fff;font-size:13px;font-weight:800}.rating-ring.good{background:#59a269}.rating-ring.low{background:#db5337}.identity h2{margin:0 0 2px;font-size:23px;letter-spacing:-.03em}.identity p{margin:0 0 9px;color:#616a65;font-size:13px}.identity>div:last-child>span{display:flex;align-items:center;gap:5px;padding-bottom:5px;color:#818985;font-size:11px}.photo-score{margin:24px 22px 16px;padding:16px;border-radius:14px;background:#f6f8f7}.photo-score>div:first-child{display:flex;justify-content:space-between;align-items:flex-end}.photo-score small{color:#737c77;font-size:9px;font-weight:800;letter-spacing:.1em}.photo-score strong{font-size:27px}.photo-score strong span{color:#8b928e;font-size:12px}.score-track{height:7px;margin:10px 0 8px;border-radius:5px;background:#e1e5e3;overflow:hidden}.score-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#df6543,#e4aa37,#67a05e)}.photo-score>b{font-size:12px;color:#a66f19}.photo-score>b.good{color:#4e8c58}.photo-score>b.low{color:#c34c31}.photo-score p{margin:6px 0 0;color:#7a827e;font-size:11px;line-height:1.4}.photo-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 22px 22px}.photo-actions button{min-height:46px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--line);border-radius:11px;background:#fff;font-weight:700}.photo-actions .studio-book{border-color:#e4c8be;background:#fff5f1;color:#b5482c}.photo-actions input{display:none}.details-card{padding:24px}.details-title{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid var(--line)}.details-title h2{margin:0 0 4px;font-size:21px}.details-title p{margin:0;color:var(--muted);font-size:13px}.details-title button{height:38px;padding:0 13px;border:1px solid var(--line);border-radius:9px;background:#fff;font-weight:700}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;padding:22px 0}.detail-grid label{display:flex;align-items:center;gap:6px;color:#7b837f;font-size:11px;font-weight:700}.detail-grid label span{display:block;grid-column:1/-1;width:100%;margin-top:6px;padding:12px 13px;border:1px solid #e8ebe9;border-radius:10px;background:#fafbfa;color:#313733;font-size:13px;font-weight:600}.detail-grid label{flex-wrap:wrap}.profile-completion{margin-top:4px;padding:16px;border-radius:13px;background:#f5f8f6}.profile-completion>div{display:flex;justify-content:space-between;font-size:13px;font-weight:750}.profile-completion>i{height:7px;display:block;margin:10px 0;border-radius:6px;background:#dfe6e1}.profile-completion>i b{width:92%;height:100%;display:block;border-radius:inherit;background:#679d68}.profile-completion p{margin:0;color:#79827d;font-size:11px}.booking-backdrop{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:20px;background:#15221dc9;backdrop-filter:blur(8px)}.booking-card{position:relative;width:min(460px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:30px;border-radius:22px;background:#fff;box-shadow:0 28px 70px #10191555;text-align:center}.close{position:absolute;right:14px;top:14px;width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:50%;background:#f2f4f3}.modal-icon{width:54px;height:54px;display:grid;place-items:center;margin:0 auto 12px;border-radius:16px;background:#fff0eb;color:var(--orange)}.modal-icon.success{background:#edf7ef;color:#55945e}.booking-card h2{margin:6px 0 7px;font-size:27px;letter-spacing:-.035em}.booking-card>p{margin:0 auto 20px;max-width:340px;color:var(--muted);font-size:13px;line-height:1.5}.booking-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left}.booking-fields label{color:#69716d;font-size:11px;font-weight:750}.booking-fields input,.booking-fields select{width:100%;height:46px;margin-top:6px;padding:0 11px;border:1px solid var(--line);border-radius:10px;background:#fff}.booking-location{display:flex;align-items:center;gap:12px;margin:14px 0;padding:13px;border-radius:12px;background:#f5f7f6;text-align:left}.booking-location svg{color:var(--orange)}.booking-location div{display:flex;flex-direction:column;gap:2px}.booking-location span{color:#78807c;font-size:11px}.confirm{width:100%;margin-top:5px}.qr-wrap{width:220px;height:220px;display:grid;place-items:center;margin:0 auto 14px;padding:8px;border:1px solid var(--line);border-radius:16px;background:#fff}.qr-wrap img{width:100%;height:100%}.appointment-meta{display:grid;grid-template-columns:1fr 1fr;margin-bottom:12px;padding:12px;border-radius:12px;background:#f5f7f6;text-align:left}.appointment-meta div{display:flex;flex-direction:column;gap:3px}.appointment-meta small{color:#7d8581;font-size:9px;font-weight:800}.appointment-meta b{font-size:11px}
@media(max-width:900px){.atlas-side{width:76px}.atlas-side button{justify-content:center}.atlas-side button span,.atlas-side>div span{display:none}.atlas-content{padding-left:106px}.profile-layout{grid-template-columns:1fr}.profile-card{max-width:none}.atlas-search{display:none}}
@media(max-width:620px){.atlas-top{height:62px;padding:0 13px}.atlas-mark{min-width:0}.atlas-mark em{display:none}.atlas-user b,.atlas-user svg{display:none}.atlas-side{inset:auto 0 0;width:auto;height:68px;z-index:30;padding:6px 8px;border:0;border-top:1px solid var(--line)}.atlas-side nav{display:flex}.atlas-side button{width:70px;height:54px;flex-direction:column;gap:2px;font-size:10px}.atlas-side button span{display:block}.atlas-side>div{display:none}.atlas-content{padding:82px 12px 88px}.atlas-heading h1{font-size:27px}.atlas-heading p,.atlas-heading .save{display:none}.quality-banner{grid-template-columns:auto 1fr;padding:13px}.quality-banner button{grid-column:1/-1}.profile-layout{grid-template-columns:1fr}.detail-grid{grid-template-columns:1fr}.booking-card{padding:24px 18px}.photo-actions{grid-template-columns:1fr}.identity{padding-inline:16px}.photo-score{margin-inline:16px}}

/* The demo focuses on photo quality; surrounding Atlas chrome is intentionally skeletal. */
.atlas-heading p{max-width:520px}.photo-score{width:calc(100% - 44px);display:block;border:0;text-align:left;cursor:pointer;transition:background .18s ease,box-shadow .18s ease}.photo-score:hover{background:#eef4f0;box-shadow:0 0 0 2px #dce8df}.photo-score:focus-visible{outline:3px solid #e9a089;outline-offset:2px}.photo-score p{display:flex;justify-content:space-between}.photo-score p span{color:#b84a2c;font-size:16px}.photo-actions button{position:relative;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.photo-actions button:hover{transform:translateY(-1px);border-color:#cbd5d0;box-shadow:0 7px 16px #25352e14}.photo-actions .studio-book{background:#e55b36;color:#fff;border-color:#e55b36}.photo-actions .studio-book:hover{border-color:#cf4d2b;box-shadow:0 8px 18px #db56342c}.assessment-live{display:inline-flex;align-items:center;gap:7px;color:#53835d;font-size:11px;font-weight:750}.assessment-live i{width:8px;height:8px;border-radius:50%;background:#62a16a;box-shadow:0 0 0 4px #e8f3e9}.metric-list{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;padding:22px 0}.metric>div{display:grid;grid-template-columns:1fr auto;gap:2px 10px}.metric b{font-size:13px}.metric span{grid-column:1;color:#7c8580;font-size:10px}.metric strong{grid-column:2;grid-row:1/3;align-self:center;font-size:18px}.metric>i{height:7px;display:block;margin-top:8px;overflow:hidden;border-radius:6px;background:#e5e9e7}.metric>i b{height:100%;display:block;border-radius:inherit;background:linear-gradient(90deg,#e35b38,#e4a631,#65a062);transition:width .45s ease}.rating-method{display:flex;align-items:flex-start;gap:11px;padding:14px;border-radius:12px;background:#f3f7f4;color:#58705f}.rating-method svg{flex:none}.rating-method p{display:flex;flex-direction:column;gap:3px;margin:0}.rating-method b{font-size:12px}.rating-method span{color:#77827b;font-size:10px;line-height:1.4}.assessment-modal{text-align:left}.assessment-modal>small,.assessment-modal>h2,.assessment-modal>p{text-align:center}.atlas-skeleton{display:flex;flex-direction:column;gap:22px}.skeleton-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.skeleton-tabs i{height:72px;border-radius:11px;background:#edf0ef}.skeleton-title{display:flex;align-items:center;justify-content:space-between}.skeleton-title i:first-child{width:150px;height:22px}.skeleton-title i:last-child{width:88px;height:38px}.skeleton-title i,.skeleton-grid i,.skeleton-grid b,.skeleton-lines i{display:block;border-radius:7px;background:#e8ecea}.skeleton-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px 28px;padding:22px 0;border-block:1px solid #eef0ef}.skeleton-grid span{display:flex;flex-direction:column;gap:9px}.skeleton-grid i{width:42%;height:10px}.skeleton-grid b{width:82%;height:16px}.skeleton-lines{display:grid;gap:12px}.skeleton-lines i{height:13px}.skeleton-lines i:nth-child(2){width:92%}.skeleton-lines i:nth-child(3){width:64%}.qr-loading{color:#7a827e;font-size:13px}.qr-error{margin:-6px 0 10px!important;color:#a2573e!important;font-size:11px!important}.confirm:disabled{opacity:.5;cursor:not-allowed}
@media(max-width:620px){.metric-list{grid-template-columns:1fr}.assessment-modal{padding:18px}.skeleton-tabs{grid-template-columns:1fr 1fr}.skeleton-grid{grid-template-columns:1fr 1fr}}
.assessment-signals{display:grid;grid-template-columns:repeat(4,1fr);margin-top:16px;border-radius:8px;background:#f6f8f7;color:#69736d}.assessment-signals div{display:flex;flex-direction:column;gap:2px;padding:10px;border-right:1px solid #e5e9e7;text-align:center}.assessment-signals div:last-child{border-right:0}.assessment-signals span{font-size:9px}.assessment-signals strong{color:#25332b;font-size:16px}.requirement-panel{margin-bottom:14px;padding:13px;border:1px solid #e4e9e6;border-radius:8px}.requirement-panel>div:first-child{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.requirement-panel>div:first-child b{font-size:11px}.requirement-panel>div:first-child small{color:#7a847e;font-size:9px}.requirement-list{display:grid;gap:6px;margin-top:10px}.requirement-list article{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:8px;padding:7px 8px;border-radius:6px;background:#f5f8f6}.requirement-list article>span{color:#4e8c58;font-size:8px;font-weight:850;letter-spacing:.06em}.requirement-list article.fail{background:#fff2ed}.requirement-list article.fail>span{color:#c45134}.requirement-list article div{display:flex;min-width:0;flex-direction:column}.requirement-list article div b{font-size:10px}.requirement-list article div small{overflow:hidden;color:#78817c;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.requirement-list article>strong{font-size:11px}.assessment-feedback{margin-bottom:14px;padding:13px;border-left:3px solid #db5337;border-radius:8px;background:#fff5f1}.assessment-feedback.fair{border-color:#e4a52f;background:#fff9ed}.assessment-feedback.good{border-color:#59a269;background:#f1f8f3}.assessment-feedback>b,.assessment-feedback>strong{font-size:11px}.assessment-feedback>strong{display:block;margin-top:8px}.assessment-feedback p{margin:4px 0;color:#68736d;font-size:10px;line-height:1.45}.assessment-feedback ul{display:grid;gap:5px;margin:8px 0 0;padding-left:17px;color:#59645e;font-size:10px;line-height:1.4}@media(max-width:620px){.assessment-signals{grid-template-columns:1fr 1fr}.assessment-signals div:nth-child(2){border-right:0}.assessment-signals div:nth-child(-n+2){border-bottom:1px solid #e5e9e7}}

/* Atlas-specific actions must not inherit PhotoStudio gallery icon-button rules. */
.atlas-photo-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:0 22px 22px}
.atlas-photo-actions button{position:relative;width:100%;min-width:0;min-height:48px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 11px;border:1px solid var(--line);border-radius:11px;background:#fff;color:#303633;font-size:12px;font-weight:750;line-height:1.2;white-space:nowrap;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.atlas-photo-actions button svg{width:17px;flex:none}.atlas-photo-actions button:hover{transform:translateY(-1px);border-color:#cbd5d0;box-shadow:0 7px 16px #25352e14}
.atlas-photo-actions .studio-book{border-color:#e55b36;background:#e55b36;color:#fff}.atlas-photo-actions .studio-book:hover{border-color:#cf4d2b;box-shadow:0 8px 18px #db56342c}
.atlas-photo-actions input{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:620px){.atlas-photo-actions{grid-template-columns:1fr;padding-inline:16px}.atlas-photo-actions button{font-size:13px}}

/* Focused demo surface: no dashboard chrome. */
.atlas-content{max-width:1180px;min-height:100vh;padding:38px 28px 48px;margin:0 auto}
@media(max-width:620px){.atlas-content{padding:24px 12px 40px}.atlas-heading{margin-bottom:18px}}

/* Neutralize PhotoStudio's full-page .success state inside the Atlas booking modal. */
.booking-card .modal-icon.success{width:54px;height:54px;min-height:54px;padding:0;display:grid;place-items:center;flex-direction:initial;margin:0 auto 12px}

/* Atlas desktop shell based on the supplied profile reference. */
.atlas-top{position:fixed;inset:0 0 auto 252px;height:54px;padding:0 14px;border-bottom:1px solid #d7dce2;background:#fff}.menu-toggle{width:42px;height:42px;display:grid;place-items:center;border:0;background:transparent;color:#374151}.atlas-utilities{display:flex;align-items:center;gap:18px;margin-left:auto;color:#364152}.atlas-utilities svg{width:18px}.atlas-utilities b{font-size:15px}.notice{position:relative;display:flex}.notice i{position:absolute;right:-7px;top:-8px;width:16px;height:16px;display:grid;place-items:center;border-radius:50%;background:#ef622e;color:#fff;font-size:9px;font-style:normal}.user-dot{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#eceff1;font-size:10px}.atlas-side{position:fixed;inset:0 auto 0 0;width:252px;padding:15px 0;background:#292929;border:0;color:#d8dce1}.atlas-side .atlas-mark{height:48px;margin:0 46px 20px;color:#fff}.atlas-side .atlas-mark span{display:flex;flex-direction:column;font-size:23px;font-weight:500;letter-spacing:0}.atlas-side .atlas-mark em{color:#fff;font-size:9px;letter-spacing:0}.side-search{height:46px;margin:0 10px 18px;padding:14px 6px;border-bottom:1px solid #4b525a;color:#89919a;font-size:11px}.atlas-side>small{display:block;padding:0 9px 14px;color:#8d9399;font-size:10px}.atlas-side nav{display:grid;gap:0}.atlas-side nav button{height:40px;justify-content:flex-start;padding:0 14px;border-radius:0;color:#d6d9dd;font-size:13px}.atlas-side nav button:hover{background:#383838;color:#fff}.atlas-side nav button svg{width:17px;color:#f37a34}.atlas-side nav button svg:last-child{width:15px;margin-left:auto;color:#fff}.atlas-content{max-width:none;min-height:100vh;margin:0;padding:70px 12px 24px 270px;background:#f3f4f6}.atlas-page-title{height:62px;display:flex;align-items:center;gap:12px;margin:0 0 8px;background:#fff}.atlas-page-title span{width:40px;height:40px;display:grid;place-items:center;border-radius:11px;background:#fff0e5;color:#ef762d}.atlas-page-title h1{margin:0;font-size:22px}.atlas-tabs{height:46px;display:flex;align-items:end;gap:4px;margin-bottom:14px;border-bottom:1px solid #d8dde2}.atlas-tabs button{height:45px;padding:0 18px;border:0;background:transparent;color:#354052;font-size:12px}.atlas-tabs button.active{border-bottom:2px solid #f0662e;color:#ed652d}.atlas-heading{display:none}.profile-layout{grid-template-columns:398px minmax(0,1fr);gap:12px}.profile-card,.details-card{border-radius:7px;box-shadow:none}.quality-banner{margin-bottom:12px;border-radius:7px}.cover{height:74px}.atlas-skeleton{border-radius:7px}
@media(max-width:850px){.atlas-top{left:0}.atlas-side{display:none}.atlas-content{padding:70px 12px 24px}.profile-layout{grid-template-columns:1fr}.atlas-utilities b{display:none}}

/* Requested skeleton chrome: preserve the Atlas frame without mock content. */
.atlas-top>*{visibility:hidden}.atlas-top:before{width:28px;height:20px;margin-left:5px;border-radius:5px;background:#e5e8e7;content:""}.atlas-top:after{width:310px;height:18px;margin-left:auto;border-radius:8px;background:linear-gradient(90deg,#e8ebea 0 16%,transparent 16% 21%,#e8ebea 21% 38%,transparent 38% 43%,#e8ebea 43% 60%,transparent 60% 66%,#e8ebea 66% 100%);content:""}.atlas-side>*{visibility:hidden}.atlas-side:before{position:absolute;left:30px;top:20px;width:148px;height:34px;border-radius:8px;background:#444;content:""}.atlas-side:after{position:absolute;left:14px;right:14px;top:88px;height:430px;border-radius:7px;background:repeating-linear-gradient(to bottom,#383838 0 34px,transparent 34px 61px);content:""}.atlas-page-title>*{display:none}.atlas-page-title:before{width:40px;height:40px;border-radius:11px;background:#e5e8e7;content:""}.atlas-page-title:after{width:150px;height:22px;border-radius:7px;background:#e5e8e7;content:""}.atlas-tabs button{font-size:0;pointer-events:none}.atlas-tabs button:before{display:block;width:104px;height:13px;border-radius:6px;background:#e1e5e3;content:""}.atlas-tabs button.active{border-bottom-color:#d9dddb;color:transparent}
```

### `app/atlas/skeleton-fix.css`

```css
.atlas-page-title>*{display:none!important}
.session-code{display:flex;flex-direction:column;align-items:center;gap:4px;margin:-3px 0 12px;padding:10px 12px;border:1px dashed #d7ddda;border-radius:11px;background:#f7f9f8}.session-code small{color:#7b837f;font-size:9px;font-weight:800;letter-spacing:.12em}.session-code code{color:#25312c;font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.035em}.session-code span{color:#7c8580;font-size:10px}
```

### `tests/photo-score.test.mjs`

```mjs
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
```

### `tests/photo-decision.test.mjs`

```mjs
import assert from "node:assert/strict";
import test from "node:test";

import {applyPhotoDecision, scoreCaps} from "../app/photo-decision.ts";

// A relaxed, seated, smart-casual portrait that a designer can actually use.
const goodSignals={minimumDimension:1600,resolutionScore:100,sharpnessScore:88,focusScore:90,structureScore:86,fidelityScore:82,faceCount:1,faceClearance:.08,faceHeight:.2,faceHeightPixels:320,faceClarity:94,accessoryImpact:0,choppedLimbs:0,photoQuality:88,bodyCrop:92,faceVisibility:91,selfieProbability:.05,lightingScore:86,backgroundQuality:88,designerUsability:92,bodyExtent:"three_quarter",cropScore:95,hands:"complete",handScore:100,isScreenshot:false,letterboxed:false,contentCoverage:.95,backgroundTexture:4,frameAspect:.78,subjectCoverage:.5,torsoVisible:1.1,shoulderTilt:3,handAtFace:false};
const decide=(overrides={},rawScore=92)=>applyPhotoDecision(rawScore,{...goodSignals,...overrides});

test("approves a usable portrait regardless of formality of pose",()=>{
 const result=decide();
 assert.equal(result.status,"APPROVED");
 assert.equal(result.rawScore,92);
 assert.equal(result.score,92,"nothing is applicable, so the raw score is the final score");
 assert.equal(result.appliedCap,null);
});

test("approves a seated casual portrait with hands resting out of frame",()=>{
 const result=decide({hands:"absent",bodyExtent:"half_body"});
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,92,"hands outside the composition must cost nothing");
});

// --- the only arithmetic between raw and final is min(raw, cap) ---

test("no note ever deducts from the score",()=>{
 const noted=decide({letterboxed:true,contentCoverage:.28,lightingScore:52,backgroundQuality:48,designerUsability:52,cropScore:52,sharpnessScore:44,focusScore:46},72);
 assert.ok(noted.penalties.length>=4,"the notes are still reported");
 assert.ok(noted.penalties.every(penalty=>penalty.points===0),"a category score already carries each of these");
 assert.equal(noted.score,72,"the raw score survives untouched — no hidden penalties");
});

test("padding is a note, never a deduction and never a verdict",()=>{
 const result=decide({letterboxed:true,contentCoverage:.28},86);
 assert.equal(result.status,"APPROVED","a designer trims empty canvas in seconds");
 assert.equal(result.score,86);
 const padding=result.penalties.find(penalty=>penalty.id==="padded_export");
 assert.equal(padding.points,0);
 assert.equal(padding.cap,null);
 assert.equal(padding.forces_status,null);
});

test("a cap is a ceiling, not a value — a weak photo keeps its lower raw score",()=>{
 const weak=decide({isScreenshot:true},38);
 assert.equal(weak.score,38,`min(38, ${scoreCaps.screenshot}) is 38`);
 assert.equal(weak.appliedCap,null,"no cap was reached, so none is reported");
});

test("the lowest applicable cap wins when several gates fire",()=>{
 const result=decide({selfieProbability:.86,bodyExtent:"head_shoulders"},60);
 assert.equal(result.appliedCap.cap,scoreCaps.minimal_body);
 assert.equal(result.score,49,"close-up selfie plus insufficient body caps at 49");
});

// --- hard rejects: the photograph genuinely cannot be used ---

test("severe blur caps the score at 39",()=>{
 const result=decide({sharpnessScore:24,focusScore:22,structureScore:24,faceClarity:25},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.rawScore,95);
 assert.equal(result.score,scoreCaps.severe_blur);
 assert.ok(result.hardGates.includes("Severe blur — the subject cannot be edited"));
});

test("smooth studio processing is softness, not severe blur",()=>{
 // A low focus read with usable detail still on the face: soft studio processing, not an unusable image.
 const processed=decide({sharpnessScore:32,focusScore:30,structureScore:78,faceClarity:72},84);
 assert.ok(!processed.hardGates.some(gate=>gate.toLowerCase().includes("blur")),"retouched skin must not read as unusable");
 assert.equal(processed.status,"APPROVED");
 assert.equal(processed.score,84,"the softness already sits in the category scores");
 // Slight softness is a note only, and a strong portrait carrying it still clears 80.
 const slight=decide({sharpnessScore:48,focusScore:50,structureScore:55,faceClarity:62},85);
 assert.ok(slight.penalties.some(penalty=>penalty.id==="soft_image"));
 assert.equal(slight.status,"APPROVED");
 assert.equal(slight.score,85);
});

test("rejects a head-and-shoulders crop, and a chest-up crop caps higher",()=>{
 const minimal=decide({bodyExtent:"head_shoulders"},95);
 assert.equal(minimal.status,"REJECT");
 assert.equal(minimal.score,scoreCaps.minimal_body,"head and shoulders only caps at 49");
 // Half body means head to waist. A frame that stops at the chest is its own, less severe failure.
 const chest=decide({bodyExtent:"chest_up"},95);
 assert.equal(chest.status,"REJECT");
 assert.equal(chest.score,scoreCaps.insufficient_body,"chest-up caps at 59");
});

test("a phone screenshot caps at 55",()=>{
 const result=decide({isScreenshot:true},82);
 assert.equal(result.status,"REJECT");
 assert.equal(result.rawScore,82,"the underlying portrait may be fine — the file is the problem");
 assert.equal(result.score,55);
});

test("rejects an awkward crop that cuts the agent",()=>{
 const result=decide({cropScore:30},95);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,scoreCaps.awkward_crop);
});

test("an obvious selfie caps at 59",()=>{
 const result=decide({selfieProbability:.86},73);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,59);
});

// --- the snapshot gate: several agreeing cues, never one on its own ---

test("a lived-in room on its own is an acceptable portrait setting",()=>{
 const result=decide({backgroundTexture:14},86);
 assert.equal(result.status,"APPROVED","office, home and indoor backgrounds are allowed");
 assert.equal(result.hardGates.length,0);
 assert.equal(result.score,86);
});

test("a phone aspect ratio on its own changes nothing",()=>{
 assert.equal(decide({frameAspect:.56},86).status,"APPROVED");
});

test("a lived-in room plus phone framing plus a raised hand is a snapshot",()=>{
 const result=decide({backgroundTexture:18,frameAspect:.56,handAtFace:true},85);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,scoreCaps.casual_snapshot);
 assert.ok(result.hardGates.some(gate=>gate.toLowerCase().includes("snapshot")));
 assert.ok(result.snapshotSignals.length>=3);
});

test("a close-camera selfie in a room is a snapshot",()=>{
 assert.equal(decide({backgroundTexture:16,faceHeight:.34,frameAspect:.56},86).status,"REJECT");
});

test("an agent lost in a wide room shot is a snapshot",()=>{
 assert.equal(decide({backgroundTexture:21,subjectCoverage:.28},83).status,"REJECT");
});

test("a single snapshot cue changes nothing at all",()=>{
 const result=decide({backgroundTexture:14,frameAspect:.72},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,88);
});

test("cues that add up but fall short of the gate ask for human judgement",()=>{
 const result=decide({backgroundTexture:14,frameAspect:.56},88);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,79,"capped to review level so the number reads borderline, not ready");
 assert.equal(result.hardGates.length,0);
});

test("a studio cut-out never trips the snapshot gate",()=>{
 const result=decide({backgroundTexture:3,frameAspect:.78,subjectCoverage:.47,torsoVisible:1.1},93);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.snapshotSignals.length,0);
});

// --- review tier ---

test("one cut-off hand is a note, both chopped hands is a capped reject",()=>{
 const single=decide({hands:"partial",handScore:62},92);
 assert.ok(single.penalties.some(penalty=>penalty.id==="cut_hands"));
 assert.equal(single.status,"APPROVED","one hand at the edge is an edit, not a blocker");
 assert.equal(single.score,92);
 const both=decide({hands:"partial",handScore:34},92);
 assert.equal(both.status,"REJECT");
 assert.equal(both.score,scoreCaps.chopped_hands);
});

test("likely selfie framing caps at review level rather than retake",()=>{
 const result=decide({selfieProbability:.6},90);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,79);
 assert.equal(result.hardGates.length,0);
});

test("a busy background is a note; the editability score already carries it",()=>{
 const result=decide({backgroundQuality:48,designerUsability:58},72);
 assert.equal(result.status,"REVIEW");
 assert.equal(result.score,72);
 assert.ok(result.penalties.every(penalty=>penalty.points===0));
});

// --- the bands ---

test("the score bands are 80 approved, 65 review, below 65 retake",()=>{
 assert.equal(decide({},80).status,"APPROVED");
 assert.equal(decide({},79).status,"REVIEW");
 assert.equal(decide({},65).status,"REVIEW");
 assert.equal(decide({},64).status,"REJECT");
});

test("a hard failure overrides a high raw score",()=>{
 const result=decide({faceCount:0},89);
 assert.equal(result.status,"REJECT","a face nobody can see cannot be designed with");
 assert.equal(result.score,scoreCaps.face_missing);
});

test("the number and the verdict can never contradict each other",()=>{
 const gated=[decide({isScreenshot:true},98),decide({selfieProbability:.9},98),decide({choppedLimbs:1,hands:"partial",handScore:62},98),decide({photoQuality:60,faceVisibility:61,structureScore:19},98),decide({bodyExtent:"head_only"},98),decide({sharpnessScore:20,focusScore:20,structureScore:16,faceClarity:20},98),decide({cropScore:22},98),decide({faceCount:3},98),decide({lightingScore:20},98),decide({backgroundQuality:12},98)];
 for(const result of gated){
  assert.equal(result.status,"REJECT");
  assert.ok(result.score<65,`a retake must read below 65, got ${result.score}`);
 }
 for(const result of [decide({},95),decide({},81)])assert.ok(result.score>=80&&result.status==="APPROVED");
});

test("every gap between the raw score and the final score is attributable",()=>{
 const result=decide({isScreenshot:true},82);
 assert.ok(result.scoreTrace.some(step=>step.includes("Raw score 82")));
 assert.ok(result.scoreTrace.some(step=>step.includes("min(82, 55)")));
 const clean=decide({},88);
 assert.ok(clean.scoreTrace.some(step=>step.includes("no cap applied")));
});

// --- resolution is advisory at the file level; it reaches the score through the categories ---

test("a visually excellent photo keeps its score and approval when the file is small",()=>{
 const result=decide({minimumDimension:354,resolutionScore:41},95);
 assert.equal(result.score,95,"the decision layer never re-reads resolution; the categories already did");
 assert.equal(result.status,"APPROVED");
 assert.equal(result.fileStatus,"TOO_SMALL");
 assert.ok(!result.penalties.some(penalty=>penalty.id.includes("resolution")));
});

test("only a file too small to use anywhere becomes a re-upload request",()=>{
 const result=decide({minimumDimension:180,resolutionScore:21},95);
 assert.equal(result.status,"REUPLOAD");
 assert.equal(result.fileStatus,"UNUSABLE");
});

test("file suitability is reported on its own axis",()=>{
 assert.equal(decide({minimumDimension:1600,resolutionScore:100}).fileStatus,"OK");
 assert.equal(decide({minimumDimension:750,resolutionScore:81}).fileStatus,"LOW");
 assert.equal(decide({minimumDimension:400,resolutionScore:47}).fileStatus,"TOO_SMALL");
 assert.equal(decide({minimumDimension:180,resolutionScore:21}).fileStatus,"UNUSABLE");
});

test("a genuinely bad photo in a small file is a retake, not a re-upload",()=>{
 const result=decide({minimumDimension:354,resolutionScore:41,sharpnessScore:20,focusScore:18,structureScore:19,faceHeightPixels:118,faceClarity:21},95);
 assert.equal(result.status,"REJECT");
 assert.ok(result.hardGates.length>0);
});

// --- critical category floors: strong crop and background cannot rescue poor subject detail ---

test("a clean crop and background cannot carry a photo with poor facial detail",()=>{
 // Spec worked example: photo quality 60, body 84, face 61, background 82 — raw 73, floors fail.
 const result=decide({photoQuality:60,bodyCrop:84,faceVisibility:61,designerUsability:82,minimumDimension:354,resolutionScore:41,structureScore:26,faceHeightPixels:120},73);
 assert.equal(result.status,"REJECT");
 assert.ok(result.score>=55&&result.score<=64,`expected the 55-64 band, got ${result.score}`);
 assert.ok(result.hardGates.some(gate=>gate.toLowerCase().includes("subject detail")));
});

test("a category score is never a rejection trigger on its own",()=>{
 // Every one of these used to be an automatic retake. A sub-score is an estimate, and an estimate that
 // is a few points out must not be able to turn down an otherwise good portrait by itself.
 assert.notEqual(decide({photoQuality:62,faceVisibility:88},80).status,"REJECT","photo quality 62 with nothing visibly wrong");
 assert.notEqual(decide({photoQuality:88,faceVisibility:62},80).status,"REJECT","face visibility 62 with nothing visibly wrong");
 assert.notEqual(decide({photoQuality:68,faceVisibility:68},80).status,"REJECT","both in the 60s, still no confirmed defect");
 assert.notEqual(decide({photoQuality:63,faceVisibility:64},80).status,"REJECT","63/64 alone is not a defect");
 const borderline=decide({photoQuality:63,faceVisibility:64},80);
 assert.equal(borderline.status,"REVIEW","weak scores with no confirmed defect go to a designer, never to a retake");
 assert.equal(borderline.hardGates.length,0);
 assert.equal(borderline.qualityDefects.length,0);
});

test("weak subject scores reject only once a defect is visually confirmed",()=>{
 const weakOnly=decide({photoQuality:58,faceVisibility:59},72);
 assert.equal(weakOnly.status,"REVIEW","no defect found in the image, so the scores cannot reject alone");
 const confirmed=decide({photoQuality:58,faceVisibility:59,sharpnessScore:22,focusScore:20,structureScore:18},72);
 assert.equal(confirmed.status,"REJECT");
 assert.ok(confirmed.qualityDefects.some(item=>item.id==="severe_blur"));
 assert.ok(confirmed.scoreTrace.some(step=>step.startsWith("Validated quality defects:")&&!step.includes("none")));
});

test("the ready-for-design floor holds a photo at review rather than retake",()=>{
 const result=decide({photoQuality:80,faceVisibility:71,bodyCrop:88},84);
 assert.equal(result.status,"REVIEW","face visibility 71 is usable but below the ready minimum of 75");
 assert.equal(result.score,79);
 assert.equal(result.hardGates.length,0,"a floor is not a hard failure");
});

test("a photo clearing every floor is not touched by them",()=>{
 const result=decide({photoQuality:87,faceVisibility:88,bodyCrop:89},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,88);
 assert.ok(result.scoreTrace.some(step=>step.includes("Critical floors: PASS")));
});

// --- visible limbs ---

test("a visible arm running off the frame edge is a crop failure, hands or not",()=>{
 const result=decide({choppedLimbs:1,hands:"partial",handScore:62},88);
 assert.equal(result.status,"REJECT");
 assert.equal(result.score,scoreCaps.chopped_limbs);
 assert.ok(result.hardGates.some(gate=>gate.toLowerCase().includes("arm")));
 const hands=result.requirements.find(requirement=>requirement.id==="hands");
 assert.ok(!hands.detail.includes("nothing to crop badly"),"an arm the designer can see is never 'nothing to crop badly'");
});

test("hands and arms genuinely out of the composition still cost nothing",()=>{
 const result=decide({hands:"absent",handScore:100,choppedLimbs:0},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,88);
});

// --- accessories: judged on design impact, never on style ---

test("an ordinary accessory changes nothing",()=>{
 const result=decide({accessoryImpact:0},88);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.penalties.length,0);
});

test("an oversized accessory is a note about layout flexibility, not about taste",()=>{
 const result=decide({accessoryImpact:.7},84);
 assert.equal(result.status,"APPROVED","the accessory itself never forces a verdict");
 const noted=result.penalties.find(penalty=>penalty.id==="oversized_accessory");
 assert.ok(noted&&noted.points===0,"the body & crop score already carries the cost");
 const requirement=result.requirements.find(item=>item.id==="accessory_fit");
 assert.equal(requirement.status,"FAIL");
 assert.ok(/widens the silhouette|cropping and layout/.test(requirement.detail));
 assert.ok(!/inappropriate|unprofessional|beach/i.test(requirement.detail),"never a comment on style");
});

// --- mirror selfie caps below an ordinary close selfie ---

test("a mirror or arm's-length selfie caps lower than a merely close one",()=>{
 const mirror=decide({selfieProbability:.9,handAtFace:true},80);
 assert.equal(mirror.score,scoreCaps.mirror_selfie);
 const close=decide({selfieProbability:.8},80);
 assert.equal(close.score,scoreCaps.obvious_selfie);
 assert.ok(mirror.score<close.score);
});

// --- quality: softness, moderate blur and severe blur are three different findings ---

test("mild softness is not a defect and does not touch the verdict",()=>{
 // Beauty retouching, JPEG compression and soft studio lighting: the frame-wide average drops, the
 // structural edges — eyes, hairline, collar, silhouette — do not.
 const retouched=decide({sharpnessScore:46,focusScore:44,structureScore:82,photoQuality:81,faceVisibility:87,bodyCrop:89},85);
 assert.equal(retouched.qualityDefects.length,0,"smooth skin is not evidence of blur");
 assert.equal(retouched.status,"APPROVED");
 assert.equal(retouched.score,85);
 assert.ok(!retouched.penalties.some(penalty=>penalty.id==="soft_image"),"structural detail is intact, so it is not even noted as soft");
 const focus=retouched.requirements.find(item=>item.id==="focus");
 assert.equal(focus.status,"PASS");
 assert.ok(!/cannot be cleanly used/.test(focus.detail),"'slightly soft' and 'cannot be cleanly used' are different statements");
});

test("moderate blur reaches designer review, never a retake",()=>{
 const moderate=decide({sharpnessScore:40,focusScore:38,structureScore:44,photoQuality:66,faceVisibility:70,bodyCrop:84},74);
 assert.equal(moderate.qualityDefects.length,0,"detail is reduced, not gone");
 assert.equal(moderate.status,"REVIEW");
 assert.equal(moderate.hardGates.length,0);
});

test("severe blur needs the structural detail and the focus read to agree",()=>{
 const severe=decide({sharpnessScore:26,focusScore:24,structureScore:21,photoQuality:52,faceVisibility:54},70);
 assert.equal(severe.status,"REJECT");
 assert.ok(severe.qualityDefects.some(item=>item.id==="severe_blur"));
 // A low focus average on its own — the classic retouched portrait — is not enough.
 const softOnly=decide({sharpnessScore:26,focusScore:24,structureScore:72},84);
 assert.ok(!softOnly.qualityDefects.some(item=>item.id==="severe_blur"));
 assert.equal(softOnly.status,"APPROVED");
});

// --- resolution: small dimensions alone are never the defect ---

test("a large mildly soft portrait stays ready for design",()=>{
 // 1280 x 1600: face, eyes and edges are clear, the processing is soft. Spec expectation: 82-90+.
 const result=decide({minimumDimension:1280,resolutionScore:100,sharpnessScore:52,focusScore:54,structureScore:80,faceHeightPixels:340,photoQuality:82,faceVisibility:88,bodyCrop:90,designerUsability:92},86);
 assert.equal(result.qualityDefects.length,0);
 assert.equal(result.status,"APPROVED");
 assert.equal(result.score,86);
});

test("a small file only rejects when the facial detail is visibly gone",()=>{
 // 354 x 453 with detail still holding up: small, but not a defect.
 const intact=decide({minimumDimension:354,resolutionScore:41,faceHeightPixels:160,structureScore:74},88);
 assert.equal(intact.qualityDefects.length,0,"small dimensions are a file fact, not a visual defect");
 assert.equal(intact.status,"APPROVED");
 assert.equal(intact.fileStatus,"TOO_SMALL");
 // 354 x 453 where the face is pixelated away: low resolution confirmed by actual detail loss.
 const pixelated=decide({minimumDimension:354,resolutionScore:41,faceHeightPixels:112,structureScore:34,photoQuality:57,faceVisibility:55},68);
 assert.equal(pixelated.status,"REJECT");
 assert.ok(pixelated.qualityDefects.some(item=>item.id==="low_resolution_detail_loss"));
 assert.ok(pixelated.retakeAdvice.length>0);
});

test("severe compression is its own confirmed defect",()=>{
 const crushed=decide({fidelityScore:18,structureScore:31,photoQuality:54,faceVisibility:56},66);
 assert.equal(crushed.status,"REJECT");
 assert.ok(crushed.qualityDefects.some(item=>item.id==="severe_degradation"));
 // Ordinary JPEG compression on an otherwise good portrait is not.
 assert.equal(decide({fidelityScore:58,structureScore:80},87).qualityDefects.length,0);
});

test("a clean background and a good crop never rescue a genuinely degraded subject",()=>{
 const result=decide({photoQuality:55,faceVisibility:57,bodyCrop:92,designerUsability:94,backgroundQuality:95,sharpnessScore:24,focusScore:22,structureScore:17},76);
 assert.equal(result.status,"REJECT");
 assert.ok(result.score<65);
});

// --- Designer review eligibility ------------------------------------------------------------------
//
// Designer review exists to challenge AI *judgement*, never to rescue a genuinely bad file. Eligibility
// is therefore blocked only by defects measured on the pixels, plus a photo-quality floor and a file
// that is large enough to use at all. Everything driven by a derived score stays disputable, because a
// derived score is an estimate and an estimate is exactly what a human should be able to overrule.

test("a technically sound photo rejected on judgement can be disputed",()=>{
 // The reference case: a professional studio shoot mis-read as a snapshot.
 const result=decide({selfieProbability:.8},88);
 assert.equal(result.status,"REJECT","the AI rejects it on a judgement call");
 assert.equal(result.designerReviewEligible,true,"but nothing measured in the image is wrong with it");
 assert.ok(result.disputableGates.length>0,"the user is told exactly what they are challenging");
 assert.equal(result.reviewBlockReason,"","nothing blocks review");
});

test("an approved photo has nothing to dispute",()=>{
 const result=decide();
 assert.equal(result.status,"APPROVED");
 assert.equal(result.disputableGates.length,0);
});

test("photo quality below the floor blocks designer review",()=>{
 const result=decide({photoQuality:69},69);
 assert.equal(result.designerReviewEligible,false);
 assert.ok(result.reviewBlockReason,"the user is told why review is unavailable");
});

test("photo quality exactly at the floor is eligible",()=>{
 assert.equal(decide({photoQuality:70},70).designerReviewEligible,true,"70 is the floor, not the exclusive bound");
});

// Each measured defect independently blocks review. These are the objectively technical failures:
// no amount of designer judgement recovers detail the file does not carry.
for(const [name,overrides] of [
 ["severe blur",{structureScore:20,focusScore:30,sharpnessScore:30}],
 ["too little face detail",{faceHeightPixels:60}],
 ["pixelation or corruption",{structureScore:18,fidelityScore:25}],
 ["low resolution with visible detail loss",{minimumDimension:480,faceHeightPixels:120,structureScore:40}],
]) test(`${name} blocks designer review`,()=>{
 const result=decide(overrides,88);
 assert.ok(result.qualityDefects.length>0,"the defect is validated against the image");
 assert.equal(result.designerReviewEligible,false);
 assert.ok(result.reviewBlockReason,"the message names the defect rather than being generic");
});

test("a file too small to use anywhere blocks designer review",()=>{
 assert.equal(decide({minimumDimension:220,resolutionScore:20},88).designerReviewEligible,false);
});

test("a face the detector could not find is still disputable",()=>{
 // face_missing is a detector result, not a measurement of the pixels. Turned heads, hijabs, sunglasses
 // and hard lighting all defeat detection on photos a designer can see a face in perfectly well.
 const result=decide({faceCount:0},88);
 assert.equal(result.status,"REJECT");
 assert.equal(result.designerReviewEligible,true,"a detector miss is exactly what a human should overrule");
 assert.ok(result.disputableGates.some(gate=>/face/i.test(gate)));
});

// Every judgement gate stays disputable. These are estimates about composition and intent, not
// measurements of the file.
for(const [name,overrides] of [
 ["an awkward crop",{cropScore:32}],
 ["not enough body",{bodyExtent:"head_shoulders"}],
 ["an oversized accessory",{accessoryImpact:.7}],
 ["a suspected selfie",{selfieProbability:.8}],
 ["an unusable-for-design score",{designerUsability:30}],
 ["a difficult background",{backgroundQuality:25}],
]) test(`${name} remains disputable`,()=>{
 assert.equal(decide(overrides,88).designerReviewEligible,true);
});

// --- Snapshot cues must not fire on deliberate wide framing ---------------------------------------

test("a full-body studio portrait is not a lost subject",()=>{
 // bodyExtentScores.full_body is 100: the system rewards this framing. A standing figure in a 2:3 frame
 // occupies about a quarter of it, so penalising the same photo for low coverage contradicts that.
 const result=decide({bodyExtent:"full_body",subjectCoverage:.26,backgroundTexture:9},88);
 assert.ok(!result.snapshotSignals.some(cue=>cue.id==="subject_lost_in_scene"),"deliberate wide framing is not a snapshot cue");
 assert.equal(result.status,"APPROVED","a professional full-body shoot must not be called a selfie");
 assert.equal(result.score,88);
});

test("a genuinely tiny subject in a cluttered scene still reads as a snapshot",()=>{
 const result=decide({bodyExtent:"half_body",subjectCoverage:.15,backgroundTexture:14},88);
 assert.ok(result.snapshotSignals.some(cue=>cue.id==="subject_lost_in_scene"),"the cue must still work where it was meant to");
});
```

### `tests/photo-body.test.mjs`

```mjs
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
```

### `tests/rendered-html.test.mjs`

```mjs
import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const environment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

function request(path, init) {
  return worker.fetch(new Request(`http://localhost${path}`, init), environment, context);
}

test("renders the Studio+ check-in experience", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Studio\+<\/title>/i);
  assert.match(html, /Take a photo or scan QR/i);
  assert.match(html, /Open Atlas/i);
  assert.match(html, /Enter code/i);
  assert.match(html, /Photos/i);
  assert.match(html, /Assets/i);
  assert.match(html, /Studio/i);
  assert.doesNotMatch(html, /Building your site|codex-preview|react-loading-skeleton/i);
});

test("renders the Atlas profile and booking entry point", async () => {
  const response = await request("/atlas", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Atlas/i);
  assert.match(html, /Aaron Paul/i);
  assert.match(html, /Photo quality|Marketing photo preflight/i);
  assert.match(html, /Book studio/i);
});

test("creates and reloads a studio appointment", async () => {
  const session = `PS-TEST-${Date.now()}`;
  const payload = {
    session,
    agentId: "71502",
    agentName: "Demo Test Agent",
    agentMobile: "60122070021",
    agentRenTag: "REN01143",
    agentOfficePhone: "03-7453 5155",
    photoPreflight: {
      base_score: 91,
      overall_score: 91,
      status: "APPROVED",
      confidence: 0.91,
      designer_usability: 89,
      pose_appropriateness: 94,
      selfie_probability: 0.02,
      decision_reason: "All submission requirements passed.",
      requirements: [{ id: "resolution", status: "PASS" }],
      penalties: [],
      recommendation: "Ready for design.",
    },
    date: "2026-08-22",
    time: "10:30",
  };

  const created = await request("/api/studio-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(created.status, 201);
  assert.equal(created.headers.get("cache-control"), "no-store");

  const loaded = await request(`/api/studio-sessions?session=${encodeURIComponent(session)}`);
  assert.equal(loaded.status, 200);
  const record = await loaded.json();
  assert.equal(record.session, session);
  assert.equal(record.agentName, payload.agentName);
  assert.equal(record.agentMobile, payload.agentMobile);
  assert.equal(record.agentRenTag, payload.agentRenTag);
  assert.equal(record.agentOfficePhone, payload.agentOfficePhone);
  assert.deepEqual(record.photoPreflight, payload.photoPreflight);
  assert.equal(record.status, "confirmed");
});

test("rejects incomplete and unknown appointments", async () => {
  const incomplete = await request("/api/studio-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session: "PS-INCOMPLETE" }),
  });
  assert.equal(incomplete.status, 400);

  const missing = await request("/api/studio-sessions?session=PS-NOT-FOUND");
  assert.equal(missing.status, 404);
});

test("reports CodeFormer as optional when the private service is not configured", async () => {
  const response = await request("/api/codeformer");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { available: false, reason: "not_configured" });
});
```

### `services/codeformer/Dockerfile`

```dockerfile
FROM python:3.10-slim

ARG CODEFORMER_COMMIT=b33cc7d639d6545bfcccc7e0bc6ae51f24e79c2b
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CODEFORMER_ROOT=/opt/CodeFormer

RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN python -m pip install --no-cache-dir "setuptools<66" wheel cython
RUN python -m pip install --no-cache-dir torch==2.1.2 torchvision==0.16.2 --index-url ${TORCH_INDEX_URL}

WORKDIR /opt
RUN git clone https://github.com/sczhou/CodeFormer.git CodeFormer && cd CodeFormer && git checkout ${CODEFORMER_COMMIT}
WORKDIR /opt/CodeFormer
RUN grep -Ev '^(torch|torchvision|tb-nightly)' requirements.txt > /tmp/codeformer-requirements.txt && \
    python -m pip install --no-cache-dir -r /tmp/codeformer-requirements.txt fastapi "uvicorn[standard]" && \
    python basicsr/setup.py develop
RUN python scripts/download_pretrained_models.py CodeFormer && \
    python scripts/download_pretrained_models.py facelib && \
    python -c "from basicsr.utils.download_util import load_file_from_url; load_file_from_url('https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/RealESRGAN_x2plus.pth', model_dir='weights/realesrgan', progress=True)"

COPY app.py /opt/service/app.py
WORKDIR /opt/service
EXPOSE 7861
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7861/health', timeout=3)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7861", "--workers", "1"]
```

### `services/codeformer/compose.yaml`

```yaml
services:
  codeformer:
    build:
      context: .
      args:
        TORCH_INDEX_URL: ${TORCH_INDEX_URL:-https://download.pytorch.org/whl/cpu}
    ports:
      - "7861:7861"
    environment:
      CODEFORMER_SERVICE_TOKEN: ${CODEFORMER_SERVICE_TOKEN:-local-codeformer-demo}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost:3000,http://localhost:3001}
      CODEFORMER_TIMEOUT_SECONDS: ${CODEFORMER_TIMEOUT_SECONDS:-300}
    restart: unless-stopped
```

### `services/codeformer/app.py`

```python
from __future__ import annotations

import asyncio
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image


CODEFORMER_ROOT = Path(os.getenv("CODEFORMER_ROOT", "/opt/CodeFormer"))
SERVICE_TOKEN = os.getenv("CODEFORMER_SERVICE_TOKEN", "")
MAX_IMAGE_BYTES = 12 * 1024 * 1024
PROCESS_TIMEOUT_SECONDS = int(os.getenv("CODEFORMER_TIMEOUT_SECONDS", "300"))
FACE_COUNT_PATTERN = re.compile(r"detect\s+(\d+)\s+faces")
inference_lock = asyncio.Semaphore(1)

app = FastAPI(title="Studio+ CodeFormer service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["authorization", "content-type"],
)


def require_service_token(request: Request) -> None:
    if not SERVICE_TOKEN:
        return
    if request.headers.get("authorization") != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid service token")


def run_codeformer(input_path: Path, output_dir: Path, fidelity: float, upscale: int) -> tuple[bytes, int]:
    command = [
        sys.executable,
        "inference_codeformer.py",
        "--input_path",
        str(input_path),
        "--output_path",
        str(output_dir),
        "--fidelity_weight",
        str(fidelity),
        "--upscale",
        str(upscale),
        "--bg_upsampler",
        "realesrgan",
        "--face_upsample",
        "--bg_tile",
        "400",
        "--only_center_face",
    ]
    completed = subprocess.run(
        command,
        cwd=CODEFORMER_ROOT,
        capture_output=True,
        text=True,
        timeout=PROCESS_TIMEOUT_SECONDS,
        check=False,
    )
    if completed.returncode != 0:
        error = (completed.stderr or completed.stdout or "CodeFormer failed")[-2000:]
        raise RuntimeError(error)
    result_path = output_dir / "final_results" / f"{input_path.stem}.png"
    if not result_path.exists():
        raise RuntimeError("CodeFormer did not produce a final image")
    match = FACE_COUNT_PATTERN.search(completed.stdout)
    return result_path.read_bytes(), int(match.group(1)) if match else 0


@app.get("/health")
def health() -> dict[str, object]:
    weights = {
        "codeformer": CODEFORMER_ROOT / "weights/CodeFormer/codeformer.pth",
        "face_detection": CODEFORMER_ROOT / "weights/facelib/detection_Resnet50_Final.pth",
        "face_parsing": CODEFORMER_ROOT / "weights/facelib/parsing_parsenet.pth",
        "realesrgan": CODEFORMER_ROOT / "weights/realesrgan/RealESRGAN_x2plus.pth",
    }
    return {"ready": all(path.exists() for path in weights.values()), "engine": "CodeFormer + Real-ESRGAN", "weights": {name: path.exists() for name, path in weights.items()}}


@app.post("/restore")
async def restore(
    request: Request,
    fidelity: float = Query(default=0.8, ge=0.0, le=1.0),
    upscale: int = Query(default=2, ge=2, le=4),
) -> Response:
    require_service_token(request)
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WebP image")
    body = await request.body()
    if not body or len(body) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be between 1 byte and 12 MB")
    async with inference_lock:
        with tempfile.TemporaryDirectory(prefix="codeformer-") as temporary:
            work_dir = Path(temporary)
            source_path = work_dir / "source.png"
            try:
                from io import BytesIO

                with Image.open(BytesIO(body)) as source:
                    source.convert("RGB").save(source_path, format="PNG")
            except Exception as error:
                raise HTTPException(status_code=400, detail="The uploaded image could not be decoded") from error
            try:
                restored, faces = await asyncio.to_thread(run_codeformer, source_path, work_dir / "result", fidelity, upscale)
            except subprocess.TimeoutExpired as error:
                raise HTTPException(status_code=504, detail="Restoration timed out") from error
            except RuntimeError as error:
                raise HTTPException(status_code=502, detail=str(error)) from error
    return Response(
        content=restored,
        media_type="image/png",
        headers={
            "Cache-Control": "no-store",
            "X-CodeFormer-Faces": str(faces),
            "X-Model-License": "S-Lab-1.0-non-commercial",
        },
    )
```

### `services/codeformer/README.md`

````markdown
# CodeFormer restoration service

This service runs the official CodeFormer repository pinned to commit `b33cc7d639d6545bfcccc7e0bc6ae51f24e79c2b`, with Real-ESRGAN enabled for the non-face regions. Studio+ sends the original image to this service before applying its local background, relighting, and export stages.

## Start locally

```bash
cd services/codeformer
docker compose up --build
```

Then configure the web app server with:

```bash
CODEFORMER_SERVICE_URL=http://127.0.0.1:7861
CODEFORMER_SERVICE_TOKEN=local-codeformer-demo
```

The CPU image works everywhere but is slow. On an NVIDIA host, build with `TORCH_INDEX_URL=https://download.pytorch.org/whl/cu121` and give the container GPU access through the NVIDIA container runtime.

## API

- `GET /health` reports whether all four model weights are present.
- `POST /restore?fidelity=0.8&upscale=2` accepts a raw JPG, PNG, or WebP body and returns a restored PNG.
- Requests are capped at 12 MB and serialized so one model process cannot exhaust the machine.
- Set `CODEFORMER_SERVICE_TOKEN` and send it as a bearer token outside local development.

## License boundary

CodeFormer uses the S-Lab License 1.0, which permits non-commercial redistribution and use. Commercial use requires contacting the CodeFormer contributors. This service is therefore an experimental, non-commercial integration until the appropriate rights are obtained. Real-ESRGAN and other dependencies retain their own licenses.
````

### `CLAUDE.md`

````markdown
# Studio+ — instructions for AI coding agents

Studio+ is an offline-first, white-label AI portrait studio built for a live product demo.
The whole product journey — capture, scoring, enhancement, consent, galleries, banner
artwork, download and print — runs in the browser with no API keys and no network.

**Demo day is imminent. Read [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md) before touching
anything, and treat the repository as frozen unless the user explicitly asks for a change.**

## Commands

```bash
npm run dev          # vinext dev server, http://localhost:3000
npm run verify       # preflight + build + tests + lint — the gate for every change
npm run preflight    # Node version, lockfile sync, sha256 of the 7 frozen offline assets
npm run test         # build, then node --test over tests/*.test.mjs
npm run lint         # eslint (warnings are tolerated, errors are not)
npm run demo:setup   # npm ci + verify, for a clean machine
```

Last verified state: preflight passes, 86/86 tests pass, lint reports 17 warnings and 0
errors (`<img>` usage and two `react-hooks/exhaustive-deps`). Do not "fix" those warnings
during the freeze — `next/image` is not wired up and the effect deps are deliberate.

## Where things live

| Path | Job |
| --- | --- |
| `app/studio.tsx` | The whole studio flow: views `profile → session → capture → batch → review → select → consent → success → personal → assets → console` |
| `app/atlas/` | Atlas agent profile demo, booking, QR handoff |
| `app/photo-quality.ts` | Orchestrates the browser-side assessment and produces `PhotoRating` |
| `app/photo-decision.ts` | Verdict engine: thresholds, score caps, validated defects, gates, retake advice |
| `app/photo-score.ts` | The four category scores as pure functions |
| `app/photo-body.ts` | Pose/mask reading: body extent, crop, hands, accessories |
| `app/photo-artifacts.ts` | Source forensics: structure, focus, screenshot and letterbox detection |
| `app/image-enhancement.ts` | Segmentation, composition, relighting, retouch, export |
| `app/brand-assets.tsx` | Background removal, subsale banner composition, print ordering |
| `app/print-orders.ts`, `app/photo-review-requests.ts` | Local order book and designer review queue |
| `app/api/` | `atlas-agent`, `atlas-avatar`, `studio-sessions`, `codeformer` (server-only proxy) |
| `services/codeformer/` | Optional, self-hosted CodeFormer + Real-ESRGAN container |
| `tests/` | `node:test` suites in `.mjs`, importing `.ts` directly via `--experimental-strip-types` |
| `scripts/demo-preflight.mjs` | Frozen-asset and environment check |
| `.claude/skills/`, `.agents/skills/` | Project skills (same files, `.agents` symlinks into `.claude`) |

## Invariants — do not break these

1. **Offline-first.** The core journey must finish with no internet. Atlas data, CodeFormer
   and payments are adapters with local fallbacks; never make one a hard dependency.
2. **No new dependencies** during the freeze. `npm ci` from the committed lockfile must keep
   reproducing the demo.
3. **Frozen assets.** The seven files hashed in `scripts/demo-preflight.mjs` (portraits,
   MediaPipe models, WASM) must not be re-encoded or replaced.
4. **Enhancement is non-generative.** The local pipeline never invents or reshapes facial
   structure. Only the optional, clearly-labelled CodeFormer adapter reconstructs faces, and
   the original always stays available for comparison.
5. **Scoring rules.** See `.claude/skills/photo-scoring-invariants/SKILL.md`. In short: the
   only arithmetic between raw and final score is `min(rawScore, lowest applicable cap)`, a
   retake needs a validated visual defect, and a good attribute never cancels a critical one.
6. **localStorage never holds full-size images.** Print orders and review requests persist the
   case, not the file — a 2650×1786 PNG blows past the quota. Every read and write is wrapped
   so a full or unavailable store cannot block the agent.
7. **The app scores the photograph, not the person.** No beauty, attractiveness, formality or
   character judgements. Pose is reported and carries zero weight.

## Conventions

- App modules are written dense: single-space indent, no spaces around `:` in type literals,
  multiple `const` bindings per line. Match the file you are editing rather than reformatting it.
- Comments explain **why**, not what — the reasoning behind a threshold, or the failure the
  code is defending against. Keep that standard; the thresholds are unreadable without it.
- Tests are `node:test` + `node:assert/strict`, one behaviour per `test()`, with the assertion
  message stating the rule being protected. Scoring changes need a test.
- Commits are conventional (`feat:`, `fix:`, `docs:`, `refactor:`) with a lowercase subject
  describing user-visible behaviour, and a body explaining the reasoning.
- Run `npm run verify` before claiming anything works.

## Demo-day mode

- Prefer the smallest change that fixes the actual problem. No refactors, no renames, no
  dependency bumps, no new screens.
- If a change cannot be verified end to end, do not ship it — say so instead.
- After any change: `npm run verify`, then re-rehearse the affected step of the judge flow.
````

### `.claude/skills/studio-plus-demo/SKILL.md`

```markdown
---
name: studio-plus-demo
description: Operating rules for changing the Studio+ demo while it is frozen for the demo. Use before editing, debugging, rehearsing or presenting this repository — especially for "fix this before the demo", "the camera failed", "add X to the demo", or any request that touches the judge flow.
metadata:
  author: studio-plus
  version: "1.0.0"
---

# Studio+ demo mode

The repository is a validated demo build. Every change is a risk to a rehearsed
three-minute pitch, so the bar is "smallest verified fix", not "best refactor".

## Before changing anything

1. Read [DEMO_RUNBOOK.md](../../../DEMO_RUNBOOK.md) — the judge flow, the fallbacks
   and the freeze steps are defined there.
2. Confirm the baseline still passes: `npm run verify`.
3. Ask what breaks in the demo if the change is wrong. If the answer is "the pitch", propose
   the fallback instead of the code change.

## Rules during the freeze

- **No new dependencies, no version bumps.** `npm ci` from the lockfile must keep reproducing
  the build. `npm update` is forbidden during the event.
- **No renames, no refactors, no new screens.** Fix the defect that was reported.
- **Do not touch the frozen assets** hashed in `scripts/demo-preflight.mjs` (bundled
  portraits, MediaPipe face/segmentation models, WASM). Re-encoding them fails preflight.
- **Do not remove a fallback.** Camera blocked → import photo. QR blocked → manual code.
  Atlas down → bundled agent record. Printer missing → download or Save as PDF. CodeFormer
  offline → local enhancement. Every one of these is part of the pitch's safety net.
- **Do not clear lint warnings** as a side quest: 17 warnings (`<img>`, two deliberate
  `react-hooks/exhaustive-deps`) are the known-good state. 0 errors is the bar.
- Gate every change on `npm run verify`, then re-rehearse the affected step of the flow.

## Live-demo triage

When something fails on stage or in rehearsal, reach for the documented fallback first and
debug afterwards. If a live dependency takes more than five seconds, switch immediately:

| Symptom | Move |
| --- | --- |
| Camera permission or device error | **Import photo** with a prepared sample |
| QR scan fails once | Type the appointment code |
| Atlas request hangs | Continue on the bundled fallback record |
| Enhancement stalls | Continue with the original capture |
| Print dialog missing a printer | Download, or Save as PDF |
| Browser state confusing | **Reset**, then restart the flow |

## Product claims that must stay true

Judges are told this and the code has to match it:

- The check runs on device; the journey needs no internet and no API keys.
- It scores the photograph, never the person — no beauty, formality or character claims.
- Local enhancement is non-generative; only the labelled CodeFormer adapter reconstructs faces.
- Atlas-profile consent and brand-use consent are separate permissions on each photo.
- A portrait reaches Brand Assets only with brand consent.

## After the fix

Report what was changed, the verify output, and which rehearsal step needs to be repeated.
Never claim the demo works without having run it.
```

### `.claude/skills/photo-scoring-invariants/SKILL.md`

````markdown
---
name: photo-scoring-invariants
description: The rules the Studio+ photo verdict engine must keep. Use before editing app/photo-decision.ts, photo-score.ts, photo-quality.ts, photo-body.ts or photo-artifacts.ts, and when a photo is scored, approved, rejected, capped or sent to designer review in a way that looks wrong.
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
8. **A REVIEW verdict is agreement, not a dispute.** Sending a REVIEW photo to a designer
   needs no challenge checkbox; only REJECT does.
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
- Run `npm run verify` (86 tests at last check) before reporting the change.
- If a real photo is scored wrongly, find the signal that is wrong before moving a threshold.
  Thresholds are calibrated against designer decisions, not against one disappointing result.
````

### `DEMO_RUNBOOK.md`

````markdown
# Studio+ Demo Runbook

This is the repeatable operating plan for presenting the same validated Studio+ build on demo day. The app completes its core portrait journey locally; Atlas live data is an enhancement, not a dependency.

## The exact build

The reproducible baseline is defined by:

- Node.js `22.22.3` in `.nvmrc`
- npm `10.9.8` in `package.json`
- the committed `package-lock.json`, installed with `npm ci`
- bundled portrait, face-detection, segmentation, and WebAssembly assets
- one automated verification command: `npm run verify`

`npm run verify` must end with a passing preflight, 86 passing tests, and 0 lint errors
(17 lint warnings are the known-good state).

On a fresh computer, run:

```bash
nvm use
npm run demo:setup
npm run dev
```

If `nvm` is unavailable, install Node.js 22.13 or newer, then run the last two commands. Do not use `npm update` during the event; `npm ci` restores the locked dependency tree.

## Product flow

```text
Atlas profile
  → Low photo-quality prompt
  → Book studio appointment
  → QR code or manual appointment code
  → Studio+ session loaded
  → Guided camera or file import
  → On-device quality and crop check
      ├─ Not ready → clear corrections → retake
      └─ Ready
  → Select capture
  → Optional, on-device Studio Enhance
  → Separate Atlas-profile and brand-use consent
  → Save photo
  → Personal Photos gallery
  → Permissioned Brand Assets gallery
  → Download or system print
```

Demo (no appointment) fallback:

```text
Studio+ home → Take a photo → guided capture → enhance → consent → Photos
```

Hardware fallback:

```text
Camera blocked or unavailable → Import photo → local assessment → continue or retake
QR scanner blocked → Enter the appointment code → Load
Atlas API unavailable → bundled Aaron Paul fallback → mock-agent/photo flow still works
Printer unavailable → Download image or choose Save as PDF in the system print dialog
```

## Three-minute judge flow

| Time | Action | What to say |
| --- | --- | --- |
| 0:00–0:25 | Open `/atlas` and point to the low photo score. | “A weak profile photo affects trust and leaves the brand team without approved assets.” |
| 0:25–0:45 | Select **Book studio**, confirm, and show the QR plus manual code. | “Atlas creates a studio handoff without putting personal details in the QR.” |
| 0:45–1:05 | Select **Open studio** or load the code. | “The agent and appointment arrive in the studio with the current photo-quality breakdown.” |
| 1:05–1:35 | Start camera. If hardware is risky, import a prepared sample. | “The browser checks framing, light, size, contrast, and sharpness locally. It scores the photograph, not the person.” |
| 1:35–2:00 | Show a retake result, then capture/import the passing portrait. | “Feedback is limited to direct, fixable instructions.” |
| 2:00–2:20 | Show **Studio Enhance** and hold to compare. | “Enhancement is optional, non-generative, and runs on this device.” |
| 2:20–2:40 | Continue to consent and toggle brand use separately. | “Profile use and brand use are separate permissions attached to this photo.” |
| 2:40–3:00 | Save, open **Photos**, then **Assets**. | “The agent receives the portrait, while the brand team sees only approved assets ready to download or print.” |

## Day-before freeze

1. Stop feature work.
2. Run `npm run demo:setup` from a clean checkout.
3. Rehearse the judge flow once with a camera and once using file import only.
4. Rehearse QR scanning and the manual-code fallback.
5. Test at the actual laptop and display resolution.
6. Commit the passing state and create a clearly named tag, such as `demo-v2`.
7. Create two backups: a Git remote and an offline archive or USB copy of the tagged source.
8. Record a screen capture of the full three-minute flow.

Recommended freeze commands after the final commit:

```bash
git tag -a demo-v2 -m "Validated Studio+ demo build"
git archive --format=zip --output=photostudio-plus-demo.zip demo-v2
```

## Working with AI agents during the freeze

Claude Code, Codex and any other agent used on this repository must read
[CLAUDE.md](./CLAUDE.md) (served as `AGENTS.md`) first. Two project skills carry the rules:

- `studio-plus-demo` — smallest verified fix, no new dependencies, no touching the frozen
  assets, never remove a fallback, and gate every change on `npm run verify`.
- `photo-scoring-invariants` — the rules the verdict engine must keep before any threshold moves.

Both live in `.claude/skills/` and are symlinked into `.agents/skills/`.

## Event-day checklist

Thirty minutes before presenting:

1. Connect power and disable sleep, notifications, and automatic system updates.
2. Connect the camera/capture card and printer before opening the app.
3. Run `npm run preflight`.
4. Run `npm run dev` and leave that terminal open.
5. Open `/atlas` in one tab and `/` in another.
6. Grant camera permission and verify **Studio → Find cameras**.
7. Complete one reset-to-finish rehearsal.
8. Close unrelated tabs and place the backup video somewhere immediately reachable.

## Recovery rules during the pitch

- If any live dependency takes more than five seconds, use the documented local fallback immediately.
- Do not troubleshoot camera permissions on stage; switch to **Import photo**.
- Do not retry QR scanning more than once; enter the displayed code.
- If the browser state is unexpected, use **Reset**, then start the demo flow.
- If the live app cannot continue, play the backup recording and narrate the same product flow.

## Success criteria

The demo is ready only when all of these are true:

- `npm run verify` passes from the frozen source.
- The complete journey finishes without internet access.
- Camera-free and QR-free fallbacks have both been rehearsed.
- The final portrait appears in Photos.
- Brand Assets includes the portrait only when brand consent is enabled.
- A backup archive and backup video are available offline.
````

### `README.md`

````markdown
# Studio+

For the frozen setup, event-day checklist, recovery paths, and exact three-minute product flow, use [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md). For the rules AI coding agents must follow in this repository, use [CLAUDE.md](./CLAUDE.md) (also served as `AGENTS.md`).

Studio+ is a demo-ready, white-label AI portrait studio. It helps agents replace missing or weak profile photos, gives friendly technical retake guidance, lets an agent challenge a verdict they believe is wrong, records profile and brand-use consent separately, and turns approved high-resolution portraits into ready-to-print marketing artwork.

The app is deliberately offline-first. Browser camera capture, image upload, photo assessment, enhancement, background removal, banner composition, gallery storage, downloads, and printing work without external APIs. Atlas, IQPilot, n8n, hardware tethering, payments, and notifications remain clearly labelled integration adapters.

## What the demo proves

```text
Weak or missing profile photo
        ↓
Guided capture or sample upload
        ↓
On-device marketing-readiness check
        ↓
Retake guidance, designer review, or approval
        ↓
Original/enhanced selection + consent
        ↓
Mock Atlas update + personal gallery
        ↓
Permissioned Brand Asset Gallery
        ↓
Subsale banner artwork + mock print order
```

The on-device preflight answers one question: **can a designer use this file to make marketing artwork?** It is deliberately unrelated to festival relevance, beauty, attractiveness, or whether the agent uses a traditionally formal pose. The company standard is one clearly visible agent, sharp and well-exposed enough to edit, at least half the body in frame with nothing awkwardly cropped, hands either fully in frame or naturally out of it, a background clean enough to isolate the agent, and enough safe space for brand copy, logos, and CTA. Seated, leaning, smiling, relaxed posture and smart-casual clothing are all acceptable.

## Features

- Atlas-style profile prompt, photo preflight breakdown, booking, and QR handoff into Studio+
- Live browser camera discovery and switching with permission handling, viewfinder guidance, and countdown
- Built-in, USB, phone-webcam, and DSLR/mirrorless capture-card support through standard browser camera devices
- Camera/phone file import fallback for USB storage, AirDrop, cloud transfers, and memory-card readers
- JPG, PNG, and WebP upload with file-size validation and real preview
- Multi-shot capture with per-shot scoring, so the best frame can be chosen
- On-device assessment using bundled MediaPipe face detection, pose, and person segmentation
- Four verdicts — `APPROVED`, `REVIEW`, `REUPLOAD`, `REJECT` — with a transparent score trace
- Designer review requests: an agent can send a photo to a human, or challenge a rejection they disagree with
- No more than two friendly instructions for a retake
- Optional professional enhancement with person segmentation, studio background replacement, adaptive relighting, face-aware texture smoothing, definition controls, and up-to-2048px export
- Optional genuine CodeFormer face restoration with Real-ESRGAN whole-image upscaling through a private self-hosted service
- Separate consent for Atlas profile use and brand materials
- Local Atlas demo update, persistent personal gallery, real downloads, and system-printer output with photo-paper presets
- Brand Asset Gallery with visible consent status, AI background removal, and subsale banner composition
- Mock print shop: board sizes, delivery, FPX/card/e-wallet payment states, and a local order book
- Operator console for camera, printer, payment, and print systems
- Ready/offline equipment states with plain-language recovery guidance
- Large controls, keyboard focus, responsive layouts, and reduced-motion support
- Demo reset, local progress preservation, and bundled offline imagery

## Requirements and local setup

- Node.js 22.13 or newer
- npm

No API keys, external accounts, or internet connection are required after dependencies are installed. A webcam or phone camera is optional because file upload provides the same complete flow.

```bash
npm install
npm run dev
```

For a clean, lockfile-reproducible demo setup, use `npm run demo:setup`. To re-check an existing installation without reinstalling dependencies, use `npm run verify` — it runs the preflight, the build, 86 tests, and lint.

Open the local address printed in the terminal, normally [http://localhost:3000](http://localhost:3000).

### Atlas integration demo

The repository contains two separate demo surfaces:

- **Atlas agent profile:** [http://localhost:3000/atlas](http://localhost:3000/atlas)
- **Studio+ check-in:** [http://localhost:3000](http://localhost:3000)

Atlas also supports dynamic agent URLs using the source API slug: `http://localhost:3000/atlas/{agent}`. For example, Aaron Paul is available at [http://localhost:3000/atlas/aaron-paul](http://localhost:3000/atlas/aaron-paul). Agent slugs are validated before being passed to the source API.

The Atlas page demonstrates the agent profile, photo preflight, quality warning, local upload, appointment booking, and appointment QR generation. To demo the handoff, book an appointment in Atlas, display the generated QR, then scan it from the Studio+ first screen. A manual appointment-code field is included as a fallback.

The profile loads Aaron Paul from the public Atlas endpoint through the local `/api/atlas-agent` proxy. The proxy avoids browser CORS issues, caches briefly, and the interface retains an Aaron Paul fallback record if Atlas is temporarily unavailable.

Booking creates a session through `/api/studio-sessions` and also stores a browser-local fallback under `photostudio-session:<session-id>`. The generated QR contains only the Studio+ check-in URL and an opaque appointment ID. Studio+ validates that ID before opening the capture workflow. For production, replace the in-memory demo session store with authenticated Atlas appointment endpoints and short-lived, signed session IDs.

## How a photo is scored

Nothing is hard-coded. The browser combines pixel measurements with the bundled MediaPipe face-detection, pose, and person-segmentation models, then runs a transparent verdict engine.

**Four categories** (`app/photo-score.ts`), weighted:

| Category | Weight | What it reads |
| --- | --- | --- |
| Technical quality | 30% | Structural detail, focus, exposure, contrast, compression fidelity, resolution |
| Body usability | 30% | Body extent, crop safety, hands, usable area, accessory impact |
| Face visibility | 20% | Face count, face height in pixels, edge clearance, feature definition |
| Editability | 20% | Background quality, edge quality, crop, negative space for copy and logos |

**Then the decision engine** (`app/photo-decision.ts`) applies:

- **Score caps.** The only arithmetic between the raw score and the final score is `min(rawScore, lowest applicable cap)`. Caps are ceilings, not values: a weak photo that also trips a gate keeps its own lower score. Screenshots cap at 55, mirror selfies at 49, severe blur, missing or unusable faces, severe exposure and multiple people at 39, and review-level cues such as snapshot framing at 79.
- **Validated visual defects.** No score, and no combination of scores, rejects on its own. A quality-driven retake must point at something measured in the image: severe blur (structural detail and focus both gone), too little face detail (under ~90px of face height), low resolution with visible detail loss, or compression damage. Smooth skin, retouching and soft studio light are explicitly not evidence of blur.
- **Status.** ≥80 is ready for design, 65–79 goes to designer review, below 65 is rejected. A photograph that is fine but supplied in a file too small to use anywhere returns `REUPLOAD` rather than a low score — file suitability never lowers photo quality.
- **Designer review.** Available when photo quality is at least 70, no defect-backed gate fired, and the file is usable. A `REVIEW` verdict is simply sent to a designer; a `REJECT` can be challenged with the agent's own note. Objectively technical failures cannot be overruled, because no judgement recovers detail the file does not carry.

Pose is reported and carries zero weight, and there is no formal-pose requirement. Sitting, leaning, smiling and relaxed posture never trigger a penalty; only the resulting crop, camera angle, proximity, or lack of design usability can affect the decision. The local model makes no beauty judgements and does not claim to infer character. The 20–50-photo calibration set should include formal, seated, desk, phone-camera, low-light, blurry, cluttered, and lifestyle portraits and be tuned against actual designer decisions before production use.

### Enhancement and export

The enhancement screen uses the same on-device person and face models to separate the subject, create a shoulder-safe 4:5 or square composition, offer studio-style backgrounds, and constrain texture smoothing to the detected face region. Lighting, definition, compositing, and high-quality resizing up to 2048px are performed with the browser canvas. The professional export is rated again before permissions and approval are granted. **Facial structure is never generated or reshaped.**

The local 2048px export uses high-quality browser resampling and does not invent missing detail. The optional CodeFormer adapter is a separate generative restoration stage: it reconstructs detected faces and uses Real-ESRGAN for the rest of the image. The original remains available for comparison because extremely small or damaged faces can be plausible rather than identity-accurate.

### Brand assets and print ordering

Approved, brand-consented portraits appear in the Brand Asset Gallery. From there the demo removes the background on device, composes a subsale board with the agent's Atlas details, previews it full-screen, and places a mock print order — board size, collection or courier, and an FPX, card, or e-wallet payment state. No payment provider is contacted. Artwork stays in memory and only the order record is persisted, because a full-size PNG would exhaust the browser storage quota. The awards-night template is parked until its layout is ready.

The background-removal quality work is specified in [docs/superpowers/specs/2026-08-23-designer-grade-background-removal-design.md](./docs/superpowers/specs/2026-08-23-designer-grade-background-removal-design.md). Its governing principle: background removal is non-generative — remove the background without redesigning, reconstructing or changing the subject.

### CodeFormer restoration service

The AI model does not run in the browser or Cloudflare Worker. Start the pinned Python/PyTorch service on a GPU host (CPU also works, slowly), then configure the web server adapter:

```bash
cd services/codeformer
docker compose up --build
```

Copy `.env.example` to `.env.local`, or set `CODEFORMER_SERVICE_URL` and `CODEFORMER_SERVICE_TOKEN` in the hosting environment. The browser calls `/api/codeformer`; the service URL and bearer token are never exposed to client JavaScript. Requests are limited to 12 MB, inference is serialized, and the local enhancement path remains available when the service is offline. See [services/codeformer/README.md](./services/codeformer/README.md) for CPU/GPU setup and API details.

CodeFormer is released under the S-Lab License 1.0 for non-commercial use. Commercial use requires permission from the project contributors, so this integration must remain experimental/non-commercial until the required rights are obtained.

For a production check:

```bash
npm run build
npm run start
```

## Presenting the demo

The rehearsed, timed judge flow lives in [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md#three-minute-judge-flow). Prepare these sample files beforehand so every verdict can be shown without depending on the camera:

| Prepared sample | Expected verdict | Purpose |
| --- | --- | --- |
| No profile photo on the Atlas page | Missing-photo prompt | Establishes the problem |
| A small, soft phone snapshot | `REJECT` with two direct corrections | Shows friendly technical guidance |
| A borderline portrait | `REVIEW` sent to a designer | Shows the human-in-the-loop path |
| A good portrait exported small | `REUPLOAD` | Shows that the photograph is judged separately from the file |
| A studio-ready portrait | `APPROVED` | Drives the full approval, consent, and banner flow |

Use **Reset demo** at any time to return to the opening state. The current screen is otherwise preserved in browser storage if a participant pauses.

## Project structure

```text
app/
  page.tsx              Route entry
  studio.tsx            Camera, upload, assessment, review requests, consent, galleries, output
  atlas/                Atlas profile, photo preflight, booking, QR handoff
  photo-quality.ts      Assessment orchestration and the PhotoRating shape
  photo-decision.ts     Verdict engine: thresholds, caps, validated defects, retake advice
  photo-score.ts        The four category scores as pure functions
  photo-body.ts         Body extent, crop, hands, accessories
  photo-artifacts.ts    Structure, focus, screenshot and letterbox forensics
  image-enhancement.ts  Segmentation, composition, relighting, retouch, export
  brand-assets.tsx      Background removal, subsale banner, print ordering
  api/                  Atlas proxies, studio sessions, server-only CodeFormer proxy
services/codeformer/    Pinned CodeFormer + Real-ESRGAN FastAPI container
scripts/                Demo preflight
tests/                  node:test suites for the scoring engine and rendered HTML
public/                 Bundled fictional portraits, MediaPipe models and WASM
.claude/skills/         Project skills (mirrored into .agents/skills for other agents)
```

## Skills for Claude and other coding agents

Project-local skills in `.claude/skills`, symlinked into `.agents/skills` so Codex, Cursor and other tools that follow the `npx skills` layout pick up the same files:

- `studio-plus-demo` — how to change, debug and present the demo while it is frozen
- `photo-scoring-invariants` — the rules the verdict engine must keep, and where its thresholds live

Vendored third-party skills, tracked in `skills-lock.json`:

- `web-design-guidelines` — interface-quality review and common web-design issues
- `vercel-react-best-practices` — React performance and implementation quality
- `web-artifacts-builder` — focused Claude Artifact prototypes and visual second passes

To reinstall the vendored skills in another clone:

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/anthropics/skills --skill web-artifacts-builder
```

Suggested Claude visual-review prompt:

> Act as the design director for a premium, accessible physical photo studio product. Review Studio+. It must be easy for older and non-technical users, yet polished enough to sell to companies. Identify the five highest-impact visual and UX improvements. Preserve the screens and core flow. Give practical, screen-specific recommendations only.

Suggested Claude demo-review prompt:

> Act as a demo judge. Assess whether the demo proves the complete workflow: weak profile photo, AI guidance, approved portrait, consented brand asset, printable artwork. Identify unclear claims, unfinished handoffs, or unnecessary features, then rewrite the three-minute story in direct language.

## Mock integration architecture

| Adapter | Demo implementation | Future implementation |
| --- | --- | --- |
| Camera | Browser device picker for webcams, phone-webcam modes, USB capture cards, plus universal file import | Optional Local Studio Bridge for manufacturer-specific DSLR tethering |
| Printer | System print dialog for installed USB, Wi-Fi, network, AirPrint, and PDF destinations | Optional Local Studio Bridge for unattended event-printer automation |
| Payment | Mock FPX, card, and e-wallet states with a local order book | Approved payment provider |
| Profile system | Mock Atlas success state | Atlas profile API or approved workflow |
| Designer review | Local review queue in browser storage | Designer workflow or ticketing integration |
| Notifications | Local confirmation messages | IQPilot or messaging integration |

Future n8n workflow: approved asset → secure storage → Atlas sync → confirmation → Brand Asset Gallery → optional print job.

## Accessibility and reliability

- Primary controls are at least 48px high and every screen has one dominant next action.
- Controls use semantic buttons, inputs, and labels with visible keyboard focus.
- Motion is removed when the operating system requests reduced motion.
- Errors state what happened and what the participant should do next.
- Generated portraits depict fictional people and are stored locally.
- Multi-camera selection, file import, download, system printing, background removal, relighting, face-aware retouching, high-resolution export, banner composition, consent, and local galleries work now.
- Payments, remote Atlas updates, notifications, designer review handoff, DSLR tethering, and automatic event printers are integration adapters.

## Demo checklist

- Confirm Node.js and dependencies before the event: `npm run demo:setup`.
- Run `npm run verify` and expect a passing preflight, 86 passing tests, and 0 lint errors.
- Walk every verdict with the prepared samples above.
- Rehearse the full journey from a fresh reset in under three minutes, once with a camera and once with file import only.
- Rehearse the QR scan and the manual-code fallback.
- Check desktop, tablet, and portrait-kiosk sizes.
- Keep the app, sample portraits, this README, and the runbook available offline.
- Stop adding features before the final rehearsal, tag the build, and record a backup demo.
````

### `skills-lock.json`

```json
{
  "version": 1,
  "skills": {
    "vercel-react-best-practices": {
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "skillPath": "skills/react-best-practices/SKILL.md",
      "computedHash": "ca7b0c0c6e5f2750043f7f0cd72d16ac4e2abc48f9b5500d047a4b77a2506212"
    },
    "web-artifacts-builder": {
      "source": "anthropics/skills",
      "sourceType": "github",
      "skillPath": "skills/web-artifacts-builder/SKILL.md",
      "computedHash": "d52d422ead3fa26859a6af129609841a8536b230a2d649f86e61771d063e05e2"
    },
    "web-design-guidelines": {
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "skillPath": "skills/web-design-guidelines/SKILL.md",
      "computedHash": "f3bc47f890f42a44db1007ab390709ec368e4b8c089baee6b0007182236ac474"
    }
  }
}
```

### Symlinks

```bash
ln -s CLAUDE.md AGENTS.md
mkdir -p .agents/skills && cd .agents/skills && ln -s ../../.claude/skills/studio-plus-demo studio-plus-demo && ln -s ../../.claude/skills/photo-scoring-invariants photo-scoring-invariants
```

---

## Appendix 5 — what this project is built with (for the judges' "what did you use?")

### Runtime and framework
| Tool | Version | Role |
| --- | --- | --- |
| Node.js | 22.22.3 | Build/test runtime; `--experimental-strip-types` runs the TypeScript tests directly |
| npm | 10.9.8 | Dependency management, locked with `package-lock.json` |
| React + React DOM | 19.2.6 | UI; single-page kiosk with view state, no router library |
| Next.js App Router conventions | (via vinext) | `app/` layout/page/route files, `next/link`, route handlers |
| vinext | 1.0.0-beta.2 | Runs Next.js-style apps on Vite; dev server, build, Cloudflare worker entry |
| Vite | 8.0.13 | Bundler/dev server under vinext |
| @cloudflare/vite-plugin + wrangler | 1.37.1 / 4.92.0 | Local worker runtime (Miniflare); production target would be Cloudflare Workers |
| @openai/sites-vite-plugin | 0.1.0 | Hosting plugin from the starter template (no hosted storage used) |
| TypeScript | 5.9.3 | Types across app and routes |
| Tailwind CSS 4 (`@tailwindcss/postcss`) | 4.2.1 | Imported once; the design is hand-written CSS (11 files, ~170 KB) |
| ESLint 9 + typescript-eslint + react/react-hooks/jsx-a11y/next plugins | 9.39.4 | Lint gate (0 errors required) |
| node:test + node:assert | built-in | 86 tests: scoring engine, body analysis, rendered HTML of the built worker |
| drizzle-orm / drizzle-kit | 0.45.2 / 0.31.10 | Present from the starter template; no database is used in the demo |

### On-device AI (no API keys, runs in the browser)
| Component | Source | Role |
| --- | --- | --- |
| `@mediapipe/tasks-vision` | Google MediaPipe, 0.10.22 | WASM runtime for the three models, loaded from `public/mediapipe/` |
| `blaze_face_short_range.tflite` | MediaPipe Face Detector | Face count, face box, live viewfinder guidance |
| `selfie_segmenter.tflite` | MediaPipe Image Segmenter | Person mask: crop analysis, background quality, background replacement, banner cut-out |
| `pose_landmarker_lite.task` | MediaPipe Pose Landmarker | Body extent (waist/knees/ankles), hands, chopped limbs, shoulder tilt |
| Canvas 2D pixel forensics | own code (`photo-artifacts.ts`, `photo-quality.ts`) | Laplacian structure/focus reads, exposure, contrast, compression, letterbox and screenshot detection |
| Verdict engine | own code (`photo-score.ts`, `photo-decision.ts`) | Four weighted categories, transparent caps/gates, validated defects, designer-review eligibility |
| Enhancement pipeline | own code (`image-enhancement.ts`) | Non-generative: crop, relight, face-limited smoothing, background swap, ≤2048px resample |

### Browser APIs
`getUserMedia`/`enumerateDevices` (cameras, capture cards), `FileReader` (import), Canvas 2D
(analysis, enhancement, banner), `localStorage` (galleries and order books), `window.print`
(system printer / Save as PDF), `requestFullscreen` (banner preview), `crypto.randomUUID`.

### Other libraries
| Library | Role |
| --- | --- |
| `qrcode` 1.5.4 | Generates the appointment QR on the Atlas page (payload = session code only) |
| `@zxing/browser` 0.2.1 | Scans the QR on the studio home screen |
| `lucide-react` 1.33 | Icons |

### Integrations (adapters with local fallbacks)
| Adapter | Demo implementation | Fallback |
| --- | --- | --- |
| Atlas agent profile | `/api/atlas-agent` proxy to `https://api.iqiglobal.com/api/web/agents/{slug}` | Bundled Aaron Paul record |
| Studio sessions | `/api/studio-sessions` in-memory store | `localStorage` copy written at booking |
| CodeFormer face restoration (optional, generative, labelled) | `services/codeformer/` FastAPI + PyTorch container, CodeFormer commit `b33cc7d…`, Real-ESRGAN x2 | Local enhancement when the service is off |
| Payments | Mock FPX / card / e-wallet states, local order book | — |
| Designer review | Local review queue | — |
| n8n | `n8n/studio-plus-backup.workflow.json` reproduces the journey with forms, Google Sheets, Claude vision (`claude-opus-5`) + the same compiled engine | Plan B only |

### Development tooling
Claude Code (agent) with project skills in `.claude/skills/` (`studio-plus-demo`,
`photo-scoring-invariants`) and vendored skills tracked in `skills-lock.json`
(`vercel-labs/agent-skills` → `web-design-guidelines`, `vercel-react-best-practices`;
`anthropics/skills` → `web-artifacts-builder`); Git with conventional commits; GitHub private
repo `aldeentorres/studio-plus-demo`; Docker Compose for the optional CodeFormer service.

### What the app does **not** use
No cloud AI in the core path, no API keys, no database, no payment provider, no analytics,
no external fonts or CDNs; the whole journey works with Wi-Fi off.
