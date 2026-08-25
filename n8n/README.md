# Profile Lab AI backup on n8n (no-code fallback)

If the code path cannot be built on the day, this workflow reproduces the Profile Lab AI product
journey with n8n forms and the **same verdict engine**. Import
`studio-plus-backup.workflow.json`, connect three credentials, fill one Config node, and you
have: portrait preflight → transparent verdict → designer review queue → separate consent →
personal gallery → brand asset gallery → subsale board → mock print order, plus the Atlas
booking handoff.

What is identical to the app: every threshold, cap, gate, floor, label and instruction. The
Code node "Score photograph" embeds `studio-engine.js`, which is `app/photo-score.ts` +
`app/photo-decision.ts` compiled verbatim with `tsc` — `min(rawScore, lowest cap)`,
validated defects, designer-review eligibility, the four verdicts and their copy.

What is different (be honest on stage): the browser app measures pixels with MediaPipe on
device and needs no internet. n8n cannot run MediaPipe, so the **measurement stage** is
Claude (`claude-opus-5`) reading the image through the Anthropic API and reporting the same
signal set via a strict tool call; the engine then decides exactly as in the app. That makes
this path online and key-dependent. Background removal uses remove.bg if a key is present and
otherwise falls back to the untouched portrait. Nothing is generative in either case.

## Files

| File | Purpose |
| --- | --- |
| `studio-plus-backup.workflow.json` | Importable workflow (34 nodes, three form entry points) |
| `studio-engine.js` | The compiled scoring engine, also embedded in the workflow's Code node |
| `README.md` | This guide |

## Setup (15 minutes)

1. **n8n** — cloud or self-hosted (`npx n8n`, v1.60+ recommended so the Form, Switch v3 and
   Google Sheets v4.5 nodes exist). Self-hosted is fine offline *except* for the Claude call.
2. **Import** — Workflows → Import from file → `studio-plus-backup.workflow.json`.
3. **Credentials** (names must match or re-select them in the nodes):
   - `Anthropic API key (x-api-key)` — Header Auth, name `x-api-key`, value your key. Used by
     "Claude reads signals".
   - `Google Sheets account` — OAuth2. Used by the five append nodes.
   - `remove.bg API key (X-Api-Key)` — Header Auth, optional. If missing, leave the node; it
     continues on error and the board uses the original portrait.
4. **Google Sheet** — create one spreadsheet with five tabs, header row free (auto-mapped):
   `review-requests`, `gallery`, `brand-assets`, `sessions`, `print-orders`.
5. **Config node** — set `sheetUrl` to that spreadsheet, `templateUrl` to a reachable URL of
   `public/subsale-banner-template.png` (the dev server `http://localhost:3000/...` works when
   n8n runs on the same machine; otherwise upload the PNG to Drive/S3 and use its direct link).
6. **Activate** the workflow. Three public URLs appear:
   - `/form/studio-plus` — Portrait preflight + consent (the core journey)
   - `/form/studio-plus-book` — Atlas booking → session code + QR link
   - `/form/studio-plus-print` — Print order with the same RM price table
7. Open the preflight form, upload `sample-approved.jpg`, expect "Ready for Design", tick both
   permissions, and check that `gallery` and `brand-assets` gained rows and the completion page
   names the agent and mobile.

Test each prepared sample: a soft phone snapshot → **Retake Recommended** with the gate's
instruction; a borderline portrait → **Designer Review** and a row in `review-requests`; a good
portrait at 240px → **Re-upload at Higher Resolution**.

## Node map

```
Profile Lab AI Form ─ Config ─ Portrait to base64 ─ Image information ─ Atlas agent ─ Resolve agent
  ─ Claude reads signals ─ Score photograph ─ Route verdict
        ├─ APPROVED / REUPLOAD ───────────────────────────────┐
        └─ REVIEW / REJECT ─ Review request row ─ Designer review queue ┤
                                                                      Consent page (Atlas profile · Brand use)
  ─ Gallery row ─ Personal gallery ─ Brand consent and approved?
        ├─ true  ─ Brand asset gallery ─ Banner details ─ Fetch board template + Remove background
        │          ─ Board + portrait ─ Size portrait ─ Compose subsale banner ─ Done (brand asset)
        └─ false ─ Done (profile only)

Booking form ─ Atlas agent (booking) ─ Create session ─ Sessions ─ Done (booking)
Print order form ─ Price order ─ Bank redirect (demo, 1.4 s) ─ Print order book ─ Done (print order)
```

## How the measurement stage maps to the app

| App source | n8n equivalent |
| --- | --- |
| `evaluatePhoto` pixel statistics + MediaPipe | Claude tool call `report_signals` (schema in "Resolve agent") + "Image information" for width/height |
| `resolutionCurve`, `rangeScore`, `bodyExtentScores`, hand scoring | Re-implemented in "Score photograph" with the same numbers |
| `scoreCategories` / `applyPhotoDecision` | `studio-engine.js`, unchanged |
| `buildRecommendation`, labels, tones | Re-implemented with the same strings |
| `photo-review-requests.ts` | "Review request row" → `review-requests` sheet (case only, never the file) |
| `Photo` gallery item with `brandOK = consent && approved` | "Gallery row" → `gallery` sheet |
| `brand-assets.tsx` phone/REN formatting and 80% portrait scale, flush right/bottom | "Banner details" + "Compose subsale banner" (GraphicsMagick text; font sizes approximate the canvas layout) |
| `print-orders.ts` | "Price order" (RM55/85/150, RM0/15 delivery, 1–20 boards, address required for courier) |
| `PS-{agentId}-{YYYYMMDD}-{HHMM}` session code, QR with code only | "Create session" + qrserver link |

## Demo-day notes

- Keep the real app as plan A; this is plan B. If both fail, play the recording.
- The Claude request is one image per run (~5–15 s). Set the HTTP node timeout higher on slow
  Wi-Fi; it is 120 s by default.
- The consent page shows the score, label, recommendation and the four category scores in its
  description, so the judge sees the transparent verdict before consenting.
- The form node parameters were authored against n8n 1.6x; if an imported node shows a
  parameter warning, open it once and re-save — n8n migrates the shape.
- Never put the API keys in the workflow JSON; they live only in n8n credentials.
