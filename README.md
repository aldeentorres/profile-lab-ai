# Profile Lab AI

For the frozen setup, event-day checklist, recovery paths, and exact three-minute product flow, use [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md). For the rules AI coding agents must follow in this repository, use [CLAUDE.md](./CLAUDE.md) (also served as `AGENTS.md`).

Profile Lab AI is a demo-ready, white-label AI portrait studio. It helps agents replace missing or weak profile photos, gives friendly technical retake guidance, lets an agent challenge a verdict they believe is wrong, records profile and brand-use consent separately, and turns approved high-resolution portraits into ready-to-print marketing artwork.

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

- Atlas-style profile prompt, photo preflight breakdown, booking, and QR handoff into Profile Lab AI
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

For a clean, lockfile-reproducible demo setup, use `npm run demo:setup`. To re-check an existing installation without reinstalling dependencies, use `npm run verify` — it runs the preflight, the build, 131 tests, and lint.

Open the local address printed in the terminal, normally [http://localhost:3000](http://localhost:3000).

### Atlas integration demo

The repository contains two separate demo surfaces:

- **Atlas agent profile:** [http://localhost:3000/atlas](http://localhost:3000/atlas)
- **Profile Lab AI check-in:** [http://localhost:3000](http://localhost:3000)
- **Designer desk:** [http://localhost:3000/designer](http://localhost:3000/designer)

Atlas also supports dynamic agent URLs using the source API slug: `http://localhost:3000/atlas/{agent}`. For example, Niel Kingston is available at [http://localhost:3000/atlas/niel-kingston](http://localhost:3000/atlas/niel-kingston). Agent slugs are validated before being passed to the source API.

The Atlas page demonstrates the agent profile, photo preflight, quality warning, local upload, appointment booking, and appointment QR generation. To demo the handoff, book an appointment in Atlas, display the generated QR, then scan it from the Profile Lab AI first screen. A manual appointment-code field is included as a fallback.

The profile loads Niel Kingston from the public Atlas endpoint through the local `/api/atlas-agent` proxy. The proxy avoids browser CORS issues, caches briefly, and the interface retains an Niel Kingston fallback record if Atlas is temporarily unavailable.

Booking creates a session through `/api/studio-sessions` and also stores a browser-local fallback under `photostudio-session:<session-id>`. The generated QR contains only the Profile Lab AI check-in URL and an opaque appointment ID. Profile Lab AI validates that ID before opening the capture workflow. For production, replace the in-memory demo session store with authenticated Atlas appointment endpoints and short-lived, signed session IDs.

### Designer desk

`/designer` is an unlisted internal workspace for original-photo approvals, AI-enhanced review, agent images, approved assets, IQI agent lookup, and the decision history. Its photo library can be grouped by team or individual and filtered by pending or approved status. The directory exposes the same photo state for every agent. Kiosk review requests, approved portraits, and background-removed assets flow into its browser-local IndexedDB library; full image Blobs are kept out of `localStorage`. Use **Load demo data** on a fresh browser to rehearse the complete desk without network access. Set `DESIGNER_ACCESS_CODE` to require a server-checked access code; leave it unset for the local demo.

#### SMTP reminder test

Photo reminders remain local mocks unless SMTP test delivery is explicitly enabled. To deliver every personalised reminder to one safe inbox, add the SMTP settings from `.env.example` to `.env.local`, set `EMAIL_TEST_MODE=true`, set `TEST_EMAIL_OVERRIDE` to the test inbox, and keep the app-specific SMTP password only in that ignored local file. Then run the two local processes in separate terminals:

```bash
npm run smtp:bridge
npm run dev
```

The bridge binds only to `127.0.0.1`, authenticates to the configured SMTP server with TLS, and ignores agent directory addresses. It sends one separate `[TEST]` email per agent to `TEST_EMAIL_OVERRIDE`; the original recipient is retained only as audit metadata. Port 587 uses `SMTP_SECURITY=starttls`; port 465 uses `SMTP_SECURITY=implicit`. If the bridge or SMTP service is unavailable, the dashboard records a failed attempt without creating a sent event. Set `EMAIL_TEST_MODE=false` to return to the network-free mock workflow.

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

**Generate AI Portrait** (Review & Enhance) is a second optional adapter: set `OPENAI_API_KEY` (and optionally `PORTRAIT_IMAGE_MODEL`, default `gpt-image-1`) and `/api/portrait-generation` sends the agent's photo as Image 1 with the two bundled references in `public/portrait-references/` and the identity-locked prompt in `app/portrait-prompt.ts`. Without a key the on-device studio pipeline runs instead; either way the result is re-scored and checked for identity, artefacts, hands and proportion before it can be used.

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
  designer/             Internal review queue, approved assets, agent directory, history
  designer-store.ts     IndexedDB persistence with an in-memory test implementation
  designer-records.ts   Designer domain records, status transitions, search and grouping
  agent-directory.ts    IQI directory normalization and slim-index search
  photo-quality.ts      Assessment orchestration and the PhotoRating shape
  photo-decision.ts     Verdict engine: thresholds, caps, validated defects, retake advice
  photo-score.ts        The four category scores as pure functions
  photo-body.ts         Body extent, crop, hands, accessories
  photo-artifacts.ts    Structure, focus, screenshot and letterbox forensics
  image-enhancement.ts  Segmentation, composition, relighting, retouch, export
  brand-assets.tsx      Background removal, subsale banner, print ordering
  api/                  Atlas, agent directory, designer access, sessions and model adapters
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

> Act as the design director for a premium, accessible physical photo studio product. Review Profile Lab AI. It must be easy for older and non-technical users, yet polished enough to sell to companies. Identify the five highest-impact visual and UX improvements. Preserve the screens and core flow. Give practical, screen-specific recommendations only.

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
