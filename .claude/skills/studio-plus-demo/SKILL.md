---
name: studio-plus-demo
description: Operating rules for changing the Profile Lab AI demo while it is frozen for the demo. Use before editing, debugging, rehearsing or presenting this repository — especially for "fix this before the demo", "the camera failed", "add X to the demo", or any request that touches the judge flow.
metadata:
  author: studio-plus
  version: "1.0.0"
---

# Profile Lab AI demo mode

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
- **Do not clear lint warnings** as a side quest: 22 warnings (`<img>`, two deliberate
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
