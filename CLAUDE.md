# Profile Lab AI — instructions for AI coding agents

Profile Lab AI is an offline-first, white-label AI portrait studio. The name is **Profile Lab AI**
everywhere a person reads it — never Studio+, Studio Plus, or studio-plus.

The whole product journey — capture, scoring, enhancement, consent, galleries, banner
artwork, download and print — runs in the browser with no API keys and no network.

## Commands

```bash
npm run dev          # vinext dev server, http://localhost:3000
npm run verify       # preflight + build + tests + lint — the gate for every change
npm run preflight    # Node version, lockfile sync, sha256 of the 7 frozen offline assets
npm run test         # build, then node --test over tests/*.test.mjs
npm run lint         # eslint (warnings are tolerated, errors are not)
npm run demo:setup   # npm ci + verify, for a clean machine
```

Last verified state: preflight passes, 199/199 tests pass, lint reports 22 warnings and 0
errors (`<img>` usage and two `react-hooks/exhaustive-deps`). Do not "fix" those warnings —
`next/image` is not wired up and the effect deps are deliberate.

## Where things live

| Path | Job |
| --- | --- |
| `app/studio.tsx` | The whole studio flow: views `profile → session → capture → batch → review → select → consent → personal → assets → console` |
| `app/atlas/` | Atlas agent profile, booking, QR handoff |
| `app/designer/` | Internal designer desk: overview, review queue, approved assets, agent directory, history |
| `app/designer-records.ts`, `app/designer-store.ts`, `app/agent-directory.ts` | Designer domain rules, IndexedDB/local-memory persistence, IQI directory normalization and search |
| `app/photo-quality.ts` | Orchestrates the browser-side assessment and produces `PhotoRating` |
| `app/photo-decision.ts` | Verdict engine: thresholds, score caps, validated defects, gates, retake advice |
| `app/photo-score.ts` | The four category scores as pure functions |
| `app/photo-body.ts` | Pose/mask reading: body extent, crop, hands, accessories |
| `app/photo-artifacts.ts` | Source forensics: structure, focus, screenshot and letterbox detection |
| `app/ai-usability.ts` | AI usability: does the file carry enough identity detail for enhancement (separate axis, pure) |
| `app/portrait-generation.ts`, `app/portrait-prompt.ts` | "Generate AI Portrait" adapter — generative via `/api/portrait-generation` when `OPENAI_API_KEY` is set, on-device pipeline otherwise; identity signature and body-proportion reads |
| `app/portrait-checks.ts` | Automatic checks on an enhanced portrait: identity, face integrity, artefacts, hands, proportion (pure) |
| `app/image-enhancement.ts` | Segmentation, composition, relighting, retouch, export |
| `app/brand-assets.tsx` | Background removal, subsale banner composition, print ordering |
| `app/portrait-matting.ts` | Classical matting behind background removal: backdrop surface fit, cast-shadow removal, four-border hole fill, sampling alpha, decontamination (pure, no DOM) |
| `app/print-orders.ts`, `app/photo-review-requests.ts` | Local order book and designer review queue |
| `app/api/` | `atlas-agent`, `atlas-avatar`, `agents`, `designer-access`, `studio-sessions`, `codeformer`, `portrait-generation` (server-only proxies) |
| `services/codeformer/` | Optional, self-hosted CodeFormer + Real-ESRGAN container |
| `tests/` | `node:test` suites in `.mjs`, importing `.ts` directly via `--experimental-strip-types` |
| `scripts/demo-preflight.mjs` | Frozen-asset and environment check |
| `.claude/skills/`, `.agents/skills/` | Project skills (same files, `.agents` symlinks into `.claude`) |

The designer IndexedDB database is still named `studio-plus-designer`. That string is a
persistence key, not a product name — renaming it would drop the local library.

## Invariants — do not break these

1. **Offline-first.** The core journey must finish with no internet. Atlas data, CodeFormer
   and payments are adapters with local fallbacks; never make one a hard dependency.
2. **No new dependencies** unless the user asks. `npm ci` from the committed lockfile must keep
   reproducing the build.
3. **Frozen assets.** The seven files hashed in `scripts/demo-preflight.mjs` (portraits,
   MediaPipe models, WASM) must not be re-encoded or replaced.
4. **Local enhancement is non-generative.** The local pipeline never invents or reshapes facial
   structure. Generation happens only behind clearly-labelled optional adapters — CodeFormer
   (face restoration) and the portrait-generation adapter behind "Generate AI Portrait"
   (`app/api/portrait-generation`, prompt in `app/portrait-prompt.ts`, face locked by prompt and
   verified by `app/portrait-checks.ts`) — and the original always stays available for comparison.
5. **Scoring rules.** See `.claude/skills/photo-scoring-invariants/SKILL.md`. In short: the
   only arithmetic between raw and final score is `min(rawScore, lowest applicable cap)`, a
   retake needs a validated visual defect, and a good attribute never cancels a critical one.
6. **localStorage never holds full-size images.** Print orders and review requests persist the
   case, not the file — a 2650×1786 PNG blows past the quota. Every read and write is wrapped
   so a full or unavailable store cannot block the agent.
7. **The app scores the photograph, not the person.** No beauty, attractiveness, formality or
   character judgements. Pose is reported and carries zero weight.
8. **Keeping the original and AI enhancement are separate workflows.** A photo at `REVIEW`
   ("Designer Review") offers both: "Request Designer Approval" (original only, status
   `PENDING DESIGNER APPROVAL`) and "Review & Enhance" (only when `ai_enhancement_eligible`). An
   enhanced portrait is re-scored with the same engine, checked for identity/artefacts, and can
   always be sent to designer review with the original (`PENDING DESIGNER REVIEW`) instead of used.
9. **`REJECT` and `REUPLOAD` close the original photograph** (`isWorkflowHardStop` in
   `app/photo-decision.ts`). "Retake Recommended" and "Re-upload at Higher Resolution" mean the file
   cannot be approved as it is: no designer approval of the original, and the only control offered on
   a review screen is "Choose another file" — capture belongs to the guided studio flow, never to a
   review screen. `REUPLOAD` closes everything, AI enhancement included; a `REJECT` does not close AI
   enhancement, because a generation rebuilds the framing, background and body a retake is about. So a
   retake-recommended photo whose face still clears AI usability (≥70, single face, ≥150px, no defect)
   may be enhanced, and the generated portrait may go to designer review (`enhanced_review`) with the
   original attached for identity comparison only. Enforced in the engine (`designerReviewEligible`,
   `assessAiUsability`) and again at the queue (`reviewRequestBlockedBy`, `recordReviewRequest`,
   `ingestReviewRequest`), so a stale button or a direct call cannot open a case that is closed.
10. **Deleting a photograph withdraws the case.** Photos calls `withdrawPhoto`, which removes the
    review request, queue submission, approved asset, cutout, history, and blobs. A withdrawal is
    not a designer decision. Designer-approved portraits belong on Brand Assets even when the AI
    had not marked them `brandOK` at save time.

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

## Working on this product

- Prefer the smallest change that fixes the actual problem. No refactors, no renames, no
  dependency bumps, no new screens unless the user asks.
- If a change cannot be verified end to end, do not ship it — say so instead.
- After any change: `npm run verify`.
