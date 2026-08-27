---
name: profile-lab-ai
description: Operating rules for changing Profile Lab AI. Use before editing, debugging, or presenting this repository — especially for capture, scoring, enhancement, designer review, galleries, or brand assets.
metadata:
  author: profile-lab-ai
  version: "2.0.0"
---

# Profile Lab AI

Profile Lab AI is the product in this repository. The name is Profile Lab AI everywhere a
person reads it — never Studio+, Studio Plus, or studio-plus.

The core journey (capture, scoring, enhancement, consent, galleries, banner artwork, download
and print) finishes in the browser with no API keys and no network. Atlas, CodeFormer, portrait
generation, SMTP, and payments are adapters with local fallbacks.

## Before changing anything

1. Confirm the baseline still passes: `npm run verify`.
2. Prefer the smallest change that fixes the actual problem. No drive-by refactors, renames, or
   dependency bumps.

## Product rules

- **No new dependencies** unless the user asks. `npm ci` from the committed lockfile must keep
  reproducing the build.
- **Do not touch the frozen assets** hashed in `scripts/demo-preflight.mjs` (bundled portraits,
  MediaPipe face/segmentation models, WASM). Re-encoding them fails preflight.
- **Do not remove a fallback.** Camera blocked → import photo. QR blocked → manual code. Atlas
  down → bundled agent record. Printer missing → download or Save as PDF. CodeFormer offline →
  local enhancement.
- **Do not clear lint warnings** as a side quest: 22 warnings (`<img>`, two deliberate
  `react-hooks/exhaustive-deps`) are the known-good state. 0 errors is the bar.
- Gate every change on `npm run verify`.

## Product claims that must stay true

- The check runs on device; the journey needs no internet and no API keys.
- It scores the photograph, never the person — no beauty, formality or character claims.
- Local enhancement is non-generative; only the labelled CodeFormer and "Generate AI Portrait"
  adapters reconstruct or generate faces. The original always stays available.
- The Atlas profile has one photo slot: saving a photo to it demotes the previous one.
  Demotion keeps an awards-night entry if the agent had also filed that photo for awards.
  An empty slot stays empty — it does not restore the bundled demo portrait.
- Designer approval does not assign Atlas. A review lands as Other until the agent files it
  for Atlas and/or awards night on Photos; one photo may be both.
- A designer-approved portrait reaches Brand Assets. The AI's `brandOK` flag at save time is
  not the gate on artwork.
- Deleting a photograph in Photos withdraws its designer case, approved asset, cutout, and
  history. A withdrawal is not a designer decision.

## Live recovery

If a live dependency takes more than five seconds, switch immediately:

| Symptom | Move |
| --- | --- |
| Camera permission or device error | **Import photo** with a prepared sample |
| QR scan fails once | Type the appointment code |
| Atlas request hangs | Continue on the bundled fallback record |
| Enhancement stalls | Continue with the original capture |
| Print dialog missing a printer | Download, or Save as PDF |
| Browser state confusing | **Reset**, then restart the flow |

## After the fix

Report what was changed and the `npm run verify` output. Never claim the product works without
having run it.
