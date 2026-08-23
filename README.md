# Studio+

For the frozen setup, event-day checklist, recovery paths, and exact three-minute product flow, use [HACKATHON_RUNBOOK.md](./HACKATHON_RUNBOOK.md).

Studio+ is a demo-ready, white-label AI portrait studio for IQI. It helps agents replace missing or weak Atlas profile photos, gives friendly technical retake guidance, records profile and brand-use consent separately, and makes approved high-resolution portraits available to the IQI brand team.

The app is deliberately offline-first. Browser camera capture, image upload, local photo assessment, enhancement, gallery storage, downloads, and printing work without external APIs. Atlas, IQPilot, n8n, hardware tethering, payments, and notifications remain clearly labelled integration adapters.

## What the demo proves

```text
Weak or missing profile photo
        ↓
Guided capture or sample upload
        ↓
Professional-readiness photo check
        ↓
Retake guidance or approval
        ↓
Original/enhanced selection + consent
        ↓
Mock Atlas update + personal gallery
        ↓
Permissioned Brand Asset Gallery
```

The current on-device readiness check evaluates measurable lighting and resolution from the actual image. The UI is structured to add face count, centring, headroom, sharpness, background, camera angle, and pose through a future vision adapter. It never evaluates beauty or attractiveness.

## Features

- Atlas-style profile prompt and guided portrait journey
- Live browser camera discovery and switching with permission handling, viewfinder guidance, and countdown
- Built-in, USB, phone-webcam, and DSLR/mirrorless capture-card support through standard browser camera devices
- Camera/phone file import fallback for USB storage, AirDrop, cloud transfers, and memory-card readers
- JPG, PNG, and WebP upload with file-size validation and real preview
- Local lighting and resolution assessment using the uploaded or captured pixels
- Deterministic pass, retake, missing-photo, and face-detection cases
- No more than two friendly instructions for a retake
- Optional professional enhancement with on-device person segmentation, studio background replacement, adaptive relighting, face-aware texture smoothing, definition controls, and up-to-2048px export
- Optional genuine CodeFormer face restoration with Real-ESRGAN whole-image upscaling through a private self-hosted service
- Separate consent for Atlas profile use and IQI brand materials
- Local Atlas demo update, persistent personal gallery, real downloads, and system-printer output with photo-paper presets
- Searchable Brand Asset Gallery with visible consent status
- Operator console for camera, printer, payment, and print systems
- Ready/offline equipment states with plain-language recovery guidance
- English/Bahasa Malaysia selector
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

For a clean, lockfile-reproducible hackathon setup, use `npm run hackathon:setup`. To re-check an existing installation without reinstalling dependencies, use `npm run verify`.

Open the local address printed in the terminal, normally [http://localhost:3000](http://localhost:3000).

### Atlas integration demo

The repository contains two separate demo surfaces:

- **Atlas agent profile:** [http://localhost:3000/atlas](http://localhost:3000/atlas)
- **Studio+ check-in:** [http://localhost:3000](http://localhost:3000)

Atlas also supports dynamic agent URLs using the IQI API slug: `http://localhost:3000/atlas/{agent}`. For example, Aaron Paul is available at [http://localhost:3000/atlas/aaron-paul](http://localhost:3000/atlas/aaron-paul). Agent slugs are validated before being passed to the IQI API.

The Atlas page demonstrates the agent profile, professional-photo rating, photo-quality warning, local upload, appointment booking, and appointment QR generation. To demo the handoff, book an appointment in Atlas, display the generated QR, then scan it from the Studio+ first screen. A manual appointment-code field is included as a fallback.

The profile currently loads Aaron Paul from the public IQI Atlas endpoint through the local `/api/atlas-agent` proxy. The proxy avoids browser CORS issues, caches briefly, and the interface retains an Aaron Paul fallback record if Atlas is temporarily unavailable.

The demo photo score is no longer hard-coded. It measures source resolution, exposure, contrast, edge sharpness, and portrait aspect locally in the browser, then displays the weighted breakdown. The enhancement screen uses the bundled MediaPipe person-segmentation and face-detection models to separate the subject, offer studio-style backgrounds, and constrain texture smoothing to the detected face region. Lighting, definition, compositing, and high-quality resizing are performed with the browser canvas. Facial structure is never generated or reshaped.

The local 2048px export uses high-quality browser resampling and does not invent missing detail. The optional CodeFormer adapter is a separate generative restoration stage: it reconstructs detected faces and uses Real-ESRGAN for the rest of the image. The original remains available for comparison because extremely small or damaged faces can be plausible rather than identity-accurate.

### CodeFormer restoration service

The AI model does not run in the browser or Cloudflare Worker. Start the pinned Python/PyTorch service on a GPU host (CPU also works, slowly), then configure the web server adapter:

```bash
cd services/codeformer
docker compose up --build
```

Copy `.env.example` to `.env.local`, or set `CODEFORMER_SERVICE_URL` and `CODEFORMER_SERVICE_TOKEN` in the hosting environment. The browser calls `/api/codeformer`; the service URL and bearer token are never exposed to client JavaScript. Requests are limited to 12 MB, inference is serialized, and the local enhancement path remains available when the service is offline. See [services/codeformer/README.md](./services/codeformer/README.md) for CPU/GPU setup and API details.

CodeFormer is released under the S-Lab License 1.0 for non-commercial use. Commercial use requires permission from the project contributors, so this integration must remain experimental/non-commercial until the required rights are obtained.

Booking creates a session through `/api/studio-sessions` and also stores a browser-local fallback under `photostudio-session:<session-id>`. The generated QR contains only the Studio+ check-in URL and opaque appointment ID. Studio+ validates that ID before opening the capture workflow. For production, replace the in-memory demo session store with authenticated Atlas appointment endpoints and short-lived, signed session IDs.

For a production check:

```bash
npm run build
npm run start
```

## Three-minute presentation script

1. Start on **My profile** and explain that inconsistent or missing portraits reduce client trust and limit usable brand assets.
2. Choose **Low-quality selfie**, then select **Take my photo**.
3. On the capture screen, choose **upload a sample photo** to trigger the deterministic retake result.
4. Point out that the AI checks professional photo readiness—not attractiveness—and gives only two direct corrections.
5. Select **Try again**, then **Take photo**. The guided countdown produces the studio-ready sample.
6. Select the original portrait or turn on the optional light enhancement.
7. Show that Atlas profile consent and IQI brand-use consent are independent controls.
8. Confirm the local Atlas demo update and open **Your portraits**.
9. Open **Brand assets**, search for an agent, verify the approval badge, and download the real high-resolution image.
10. Finish in **Studio console**. Show camera discovery for webcams, phone-webcam modes, and DSLR capture cards; then show that printing uses any USB, Wi-Fi, network, or AirPrint printer installed in the operating system.

Use **Reset demo** at any time to return to the opening state. The current screen is otherwise preserved in browser storage if a participant pauses.

## Deterministic demo cases

| Scenario | Expected result | Purpose |
| --- | --- | --- |
| No profile photo | Missing-photo prompt | Establishes the initial problem |
| Low-quality selfie | Retake, score 58 | Demonstrates friendly technical guidance |
| Studio-ready portrait | Pass, score 92 | Drives the complete approval flow |
| Face detection check | Review error | Demonstrates a safe multi-face/no-face boundary |

## Project structure

```text
app/
  page.tsx       Route entry
  studio.tsx     Camera, upload, assessment, consent, galleries and output
  api/codeformer Server-only proxy for the private restoration service
  globals.css    Responsive visual system and kiosk accessibility
  layout.tsx     App metadata and root document
services/codeformer/  Pinned CodeFormer + Real-ESRGAN FastAPI container
public/
  portraits-contact-sheet.png  Bundled fictional portrait imagery
.agents/skills/                 Project-local agent skills
```

## Suggested skills for Claude and coding agents

These recommended skills are included in `.agents/skills`:

- `web-design-guidelines` — interface-quality review and common web-design issues
- `vercel-react-best-practices` — React performance and implementation quality
- `web-artifacts-builder` — focused Claude Artifact prototypes and visual second passes

To reinstall them in another clone:

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/anthropics/skills --skill web-artifacts-builder
```

Suggested Claude visual-review prompt:

> Act as the design director for a premium, accessible physical photo studio product. Review Studio+. It must be easy for older and non-technical users, yet polished enough to sell to companies. Identify the five highest-impact visual and UX improvements. Preserve the screens and core flow. Give practical, screen-specific recommendations only.

Suggested Claude demo-review prompt:

> Act as a hackathon judge. Assess whether the demo proves the complete workflow: weak profile photo, AI guidance, approved portrait, consented brand asset. Identify unclear claims, unfinished handoffs, or unnecessary features, then rewrite the three-minute story in direct language.

## Mock integration architecture

| Adapter | Demo implementation | Future implementation |
| --- | --- | --- |
| Camera | Browser device picker for webcams, phone-webcam modes, USB capture cards, plus universal file import | Optional Local Studio Bridge for manufacturer-specific DSLR tethering |
| Printer | System print dialog for installed USB, Wi-Fi, network, AirPrint, and PDF destinations | Optional Local Studio Bridge for unattended event-printer automation |
| Payment | Mock QR, card, and cash states | Approved payment provider |
| Profile system | Mock Atlas success state | Atlas profile API or approved workflow |
| Notifications | Local confirmation messages | IQPilot or messaging integration |

Future n8n workflow: approved asset → secure storage → Atlas sync → confirmation → Brand Asset Gallery → optional print job.

## Accessibility and reliability

- Primary controls are at least 48px high and every screen has one dominant next action.
- Controls use semantic buttons, inputs, and labels with visible keyboard focus.
- Motion is removed when the operating system requests reduced motion.
- Errors state what happened and what the participant should do next.
- Generated portraits depict fictional people and are stored locally.
- Multi-camera selection, file import, download, system printing, person-aware background cleanup, relighting, face-aware retouching, high-resolution export, consent, and local galleries work now.
- Payments, remote Atlas updates, notifications, DSLR tethering, and automatic event printers are integration adapters.

## Hackathon checklist

- Confirm Node.js and dependencies before the event.
- Run all four deterministic cases.
- Rehearse the full journey from a fresh reset in under three minutes.
- Check desktop, tablet, and portrait-kiosk sizes.
- Keep the app, sample portraits, and this README available offline.
- Stop adding features before the final rehearsal and record a backup demo.
