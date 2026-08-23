# Studio+ — instructions for AI coding agents

Studio+ is an offline-first, white-label AI portrait studio built for a hackathon demo.
The whole product journey — capture, scoring, enhancement, consent, galleries, banner
artwork, download and print — runs in the browser with no API keys and no network.

**Demo day is imminent. Read [HACKATHON_RUNBOOK.md](./HACKATHON_RUNBOOK.md) before touching
anything, and treat the repository as frozen unless the user explicitly asks for a change.**

## Commands

```bash
npm run dev          # vinext dev server, http://localhost:3000
npm run verify       # preflight + build + tests + lint — the gate for every change
npm run preflight    # Node version, lockfile sync, sha256 of the 7 frozen offline assets
npm run test         # build, then node --test over tests/*.test.mjs
npm run lint         # eslint (warnings are tolerated, errors are not)
npm run hackathon:setup   # npm ci + verify, for a clean machine
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
| `scripts/hackathon-preflight.mjs` | Frozen-asset and environment check |
| `.claude/skills/`, `.agents/skills/` | Project skills (same files, `.agents` symlinks into `.claude`) |

## Invariants — do not break these

1. **Offline-first.** The core journey must finish with no internet. Atlas data, CodeFormer
   and payments are adapters with local fallbacks; never make one a hard dependency.
2. **No new dependencies** during the freeze. `npm ci` from the committed lockfile must keep
   reproducing the demo.
3. **Frozen assets.** The seven files hashed in `scripts/hackathon-preflight.mjs` (portraits,
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
