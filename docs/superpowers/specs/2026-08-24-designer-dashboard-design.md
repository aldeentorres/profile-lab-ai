# Designer Dashboard + team-based agent photo library — design

Date: 2026-08-24. Approved in chat ("go with recommendations").

## Goal

Internal `/designer` area: review submitted photos (original approval + AI-enhanced), approve/reject,
browse approved assets by TEAM → AGENT → ASSETS, search agents by name/ID/REN against the live IQI
agent API, and keep a decision history. Extends the existing kiosk; changes nothing in the judge flow.

## Verified API facts (source of truth for integration)

`GET https://api.iqiglobal.com/api/web/agents` — public, pagy meta (`count` 65035, `page`, `per_page`
up to 100). No server-side search of any kind (`search|name|query|keyword|team|status|id` ignored,
`q` → 500). Detail at `/agents/{id}` and `/agents/{slug}`. Fields used: `id` (Agent ID),
`display_name`/`full_name`, `team_name` (no team id exists — team key is the name), `ren_tag`
(REN number when populated, sometimes "REN"/empty), `avatar_url`/`avatar_original_url` (absolute S3 or
relative missing.png), `status`, `branch_name`, `designation`. Email available but not displayed.

## Decisions

1. **Storage: IndexedDB** (`studio-plus-designer`) behind a `DesignerStore` interface with an
   in-memory implementation for node tests. Object stores: `submissions`, `enhancements`, `reviews`,
   `assets`, `events`, `images` (Blobs, separate store so lists never decode pixels), `agents`
   (lightweight cache: name/team/ren/avatar). Rationale: repo has no live DB (D1/R2 bindings null,
   schema empty); localStorage cannot hold images (invariant 6); server memory dies on restart.
   Limitation (accepted): library is per-browser; D1/R2 adapter can replace the interface later.
2. **Agent directory: full slim index.** Server proxy `app/api/agents` builds an in-memory index of
   all pages (per_page=100, concurrency 4) lazily on first name search; reports
   `{indexing, progress}` so the UI stays responsive; exact-ID lookup and local photo-record search
   work before/without the index. `?teams` derives team list + counts from the index.
3. **Access: unlisted route + optional `DESIGNER_ACCESS_CODE` env.** When set, the dashboard asks for
   the code and verifies server-side (`app/api/designer-access`); unset → open. No client-side secrets.
4. **Test mode.** Empty store offers "Load demo data": locally generated placeholder portraits
   (SVG/canvas data, no network, no frozen assets), records marked `demo:true`, one-click
   "Clear demo data". Demo agent IDs are clearly synthetic; nothing is written to the IQI API shape
   caches as if real.

## Modules

| File | Job |
| --- | --- |
| `app/designer-records.ts` | Pure domain: `DesignerCaseStatus` enum (`READY_FOR_DESIGN`, `PENDING_DESIGNER_APPROVAL`, `AI_ENHANCED_REVIEW`, `DESIGNER_REVIEW_REQUESTED`, `APPROVED`, `RETAKE_REQUIRED`, `REUPLOAD_REQUIRED`), review-type derivation (`ORIGINAL APPROVAL`/`AI ENHANCED` primary; `AI FLAGGED` when automatic checks raised concerns; `USER REQUESTED` when the agent disputed/added a note), decision transitions, overview counts, team grouping (current team from API, `teamNameAtSubmission` preserved on the record), search matching, filename sanitising (`AgentName_AgentID_Approved.png`), history event constructors |
| `app/designer-store.ts` | `DesignerStore` interface + IndexedDB + memory impls; ingest hooks: `ingestReviewRequest(request)` (called at the two `recordReviewRequest` call sites — request still carries the images), `recordApprovedPhoto` (kiosk save-after-consent → `READY_FOR_DESIGN`/auto-approved asset), `recordCutoutAsset` (Brand Assets background removal → `background_removed`), `applyDecision` (writes the designer decision, moves asset in, appends history, and mirrors to the legacy localStorage queue via `resolveReviewRequest`) — every call wrapped, failure never blocks the kiosk |
| `app/agent-directory.ts` | Pure: normalise raw IQI record → `AgentSummary`, slim index record, name/ID/REN matcher |
| `app/api/agents/route.ts` | Proxy: `?id=` detail (server-cached), `?page&per_page` browse, `?search=` via slim index (lazy build + progress), `?teams` |
| `app/api/designer-access/route.ts` | POST `{code}` → `{ok}` when `DESIGNER_ACCESS_CODE` set |
| `app/designer/page.tsx`, `dashboard.tsx`, `designer.css` | Route + UI. Sidebar: Overview · Review Queue (count) · Approved Assets · Agent Directory · History. Global header search. Review screens per spec: original (large photo left; panel right with Marketing Readiness, AI Usability, four category scores, AI issues, user request/note; actions Approve Original / Request Retake or Re-upload with reason+note / Keep in Review); enhanced (side-by-side original vs enhanced with both scores; identity, artefact, hands, proportion checks from the stored verdict; actions Approve Enhanced / Reject Enhancement / Request Retake / Keep in Review). Approved Assets: team cards → agent list → asset cards (thumbnail, type badge ORIGINAL/AI ENHANCED/BACKGROUND REMOVED, approved by/at, readiness, downloads incl. transparent PNG). Agent Directory: API-backed search/browse, View Agent → profile page with sections (current approved, originals, enhanced, background removed, pending, history — only non-empty). History: event feed. Empty/loading/error/retry states per spec §25/§34; friendly copy, technical errors to console only |

## Existing-file edits (smallest possible)

- `app/photo-review-requests.ts`: `DesignerDecision` gains `"reupload"`. Nothing else changes.
- `app/studio.tsx`: 2× `ingestReviewRequest(...)` beside existing `recordReviewRequest` calls; 1×
  `recordApprovedPhoto(...)` at gallery save.
- `app/brand-assets.tsx`: export `createPortraitCutout`; 1× `recordCutoutAsset(...)` on cutout success.
- `package.json`: add new test files to the `test` script list.
- Docs: CLAUDE.md table + README section.

## Data model (records, images by reference)

Submission `{submissionId, agentId, agentName, teamNameAtSubmission?, imageId, marketingReadiness,
aiUsability, categories{photoQuality, bodyCrop, faceVisibility, backgroundEditability}, issues,
disputedGates, note, reviewType, status, demo?, createdAt}` · Enhancement `{enhancementId,
submissionId, agentId, imageId, enhancedMarketingReadiness, checks[], identityPreservationPass,
artifactCheckPass, status, createdAt}` · Review `{reviewId, submissionId, enhancementId?, agentId,
reviewType, designerDecision, designerNotes, reviewedAt, status}` · Asset `{assetId, agentId,
submissionId?, enhancementId?, sourceType original|ai_enhanced|background_removed, imageId,
transparentImageId?, approvedBy, approvedAt, marketingReadiness?, demo?}` · Event `{eventId, agentId,
action, actor?, at, refId}`. Agent metadata stays authoritative in the IQI API; local `agents` cache is
display-only and refreshed when reachable.

## Testing

Node suites: `designer-records` (status flow, review-type derivation, counts, grouping, filename
sanitising, search match), `designer-store` (memory impl: ingest → queue → decision → asset moves +
history, never-throws contract), `agent-directory` (normaliser incl. missing avatar/ren, matcher);
`rendered-html` gains `/designer`. IndexedDB impl exercised in the browser rehearsal (Playwright).
Gate: `npm run verify`, then rehearse the judge flow and the new dashboard flow.

## Out of scope

Real auth/roles, cross-device sync, D1/R2 persistence (interface left ready), download logging,
payments. No new dependencies; frozen assets untouched; kiosk flows and scoring logic unchanged.
