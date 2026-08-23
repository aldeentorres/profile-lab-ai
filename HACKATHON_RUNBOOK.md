# Studio+ Hackathon Runbook

This is the repeatable operating plan for presenting the same validated Studio+ build on hackathon day. The app completes its core portrait journey locally; Atlas live data is an enhancement, not a dependency.

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
npm run hackathon:setup
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
2. Run `npm run hackathon:setup` from a clean checkout.
3. Rehearse the judge flow once with a camera and once using file import only.
4. Rehearse QR scanning and the manual-code fallback.
5. Test at the actual laptop and display resolution.
6. Commit the passing state and create a clearly named tag, such as `hackathon-demo-v1`.
7. Create two backups: a Git remote and an offline archive or USB copy of the tagged source.
8. Record a screen capture of the full three-minute flow.

Recommended freeze commands after the final commit:

```bash
git tag -a hackathon-demo-v1 -m "Validated Studio+ hackathon demo"
git archive --format=zip --output=photostudio-plus-hackathon.zip hackathon-demo-v1
```

## Working with AI agents during the freeze

Claude Code, Codex and any other agent used on this repository must read
[CLAUDE.md](./CLAUDE.md) (served as `AGENTS.md`) first. Two project skills carry the rules:

- `studio-plus-hackathon` — smallest verified fix, no new dependencies, no touching the frozen
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
