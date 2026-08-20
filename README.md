# PhotoStudio+

PhotoStudio+ is a demo-ready, white-label AI portrait studio for IQI. It helps agents replace missing or weak Atlas profile photos, gives friendly technical retake guidance, records profile and brand-use consent separately, and makes approved high-resolution portraits available to the IQI brand team.

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
- Live browser camera with permission handling, viewfinder guidance, and countdown
- JPG, PNG, and WebP upload with file-size validation and real preview
- Local lighting and resolution assessment using the uploaded or captured pixels
- Deterministic pass, retake, missing-photo, and face-detection cases
- No more than two friendly instructions for a retake
- Optional enhancement that is off by default
- Separate consent for Atlas profile use and IQI brand materials
- Local Atlas demo update, persistent personal gallery, real downloads, and printable output
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

Open the local address printed in the terminal, normally [http://localhost:3000](http://localhost:3000).

### Atlas integration demo

The repository contains two separate demo surfaces:

- **Atlas agent profile:** [http://localhost:3000/atlas](http://localhost:3000/atlas)
- **PhotoStudio+ check-in:** [http://localhost:3000](http://localhost:3000)

Atlas also supports dynamic agent URLs using the IQI API slug: `http://localhost:3000/atlas/{agent}`. For example, Aaron Paul is available at [http://localhost:3000/atlas/aaron-paul](http://localhost:3000/atlas/aaron-paul). Agent slugs are validated before being passed to the IQI API.

The Atlas page demonstrates the agent profile, professional-photo rating, photo-quality warning, local upload, appointment booking, and appointment QR generation. To demo the handoff, book an appointment in Atlas, display the generated QR, then scan it from the PhotoStudio+ first screen. A manual appointment-code field is included as a fallback.

The profile currently loads Aaron Paul from the public IQI Atlas endpoint through the local `/api/atlas-agent` proxy. The proxy avoids browser CORS issues, caches briefly, and the interface retains an Aaron Paul fallback record if Atlas is temporarily unavailable.

The demo photo score is no longer hard-coded. It measures source resolution, exposure, contrast, edge sharpness, and portrait aspect locally in the browser, then displays the weighted breakdown. The face component is deliberately shown as a browser visual check; production scoring should replace it with a validated face/pose model and calibrate all thresholds against IQI-approved and rejected portraits.

Booking creates a session through `/api/studio-sessions` and also stores a browser-local fallback under `photostudio-session:<session-id>`. The generated QR contains only the PhotoStudio+ check-in URL and opaque appointment ID. PhotoStudio+ validates that ID before opening the capture workflow. For production, replace the in-memory demo session store with authenticated Atlas appointment endpoints and short-lived, signed session IDs.

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
10. Finish in **Studio console**. Explain that webcams work in-browser, while DSLR/SLR cameras and event printers will connect through a Local Studio Bridge.

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
  globals.css    Responsive visual system and kiosk accessibility
  layout.tsx     App metadata and root document
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

> Act as the design director for a premium, accessible physical photo studio product. Review PhotoStudio+. It must be easy for older and non-technical users, yet polished enough to sell to companies. Identify the five highest-impact visual and UX improvements. Preserve the screens and core flow. Give practical, screen-specific recommendations only.

Suggested Claude demo-review prompt:

> Act as a hackathon judge. Assess whether the demo proves the complete workflow: weak profile photo, AI guidance, approved portrait, consented brand asset. Identify unclear claims, unfinished handoffs, or unnecessary features, then rewrite the three-minute story in direct language.

## Mock integration architecture

| Adapter | Demo implementation | Future implementation |
| --- | --- | --- |
| Camera | Working browser camera and countdown capture | Local Studio Bridge DSLR tethering |
| Printer | Working browser print page | Local Studio Bridge event-printer automation |
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
- Camera, upload, download, browser print, enhancement, consent, and local galleries work now.
- Payments, remote Atlas updates, notifications, DSLR tethering, and automatic event printers are integration adapters.

## Hackathon checklist

- Confirm Node.js and dependencies before the event.
- Run all four deterministic cases.
- Rehearse the full journey from a fresh reset in under three minutes.
- Check desktop, tablet, and portrait-kiosk sizes.
- Keep the app, sample portraits, and this README available offline.
- Stop adding features before the final rehearsal and record a backup demo.
