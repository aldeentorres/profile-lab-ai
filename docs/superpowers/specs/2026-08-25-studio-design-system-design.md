# Studio design system — extraction and Tailwind adoption

Status: approved for planning, not started
Branch: `feat/design-system`, cut from `main` at `84d991e`
Date: 2026-08-25

## Why

`app/studio.tsx` is 108 KB carrying ten live views, ~15 inline components and 271
distinct class names. Its styling is spread across eleven CSS files loaded in a
fixed order by `app/layout.tsx`, with no `@layer`, so the cascade is positional:
`polish.css` (43 KB) loads eighth of the eleven and overrides everything before
it, including the brand layer in `iq-theme.css`. Only three narrowly scoped
files follow it.

That is workable for one product and hostile to three. `app/designer/` and
`app/atlas/` cannot reuse a single button, card or toolbar from the studio flow
without copying CSS, and every visual fix has to be applied in each place
separately.

The goal is a real component library — `app/ui/` — that studio, designer and
atlas can all consume, built on Tailwind v4, which is already installed
(`@tailwindcss/postcss` 4.2.1, `@import "tailwindcss"` in `app/globals.css`) and
currently unused.

## Constraints

These are non-negotiable and every step below is designed around them.

1. **The rendered pixels must not change.** Not the palette, not the type scale,
   not spacing, not shadows. This is a structural refactor with a visual output
   of exactly zero difference. Any visible change is a defect, not an
   improvement, and is reverted rather than debated.
2. **`main` stays presentable throughout.** The demo is imminent. `main` is at
   `84d991e` with `npm run verify` green, and the entire fallback is
   `git checkout main`.
3. **White-label must keep working.** Rebranding today means dropping in a theme
   file that redefines `:root` and overrides selectors. Both mechanisms survive.
4. **No new dependencies.** Tailwind is already in the lockfile. Nothing else
   gets added.
5. **The frozen assets stay frozen.** The seven files hashed in
   `scripts/demo-preflight.mjs` are not touched.

## Colour lock

The live palette comes from `app/iq-theme.css`, which loads after
`app/globals.css` and wins. Those two files hold the only `:root` blocks in the
project, so the active values are unambiguous:

```
--ink #262626   --ivory #fff        --gold #ee6538   --blue #e7552a
--green #35966f --line #e7e7e7      --muted #6f7378  --soft #f6f7f8
--soft-orange #fff1eb
--shadow 0 18px 50px rgba(30,35,40,.09)
```

`app/globals.css` keeps its own `:root` as the base brand. That block is not
edited — the only change to the file is the two `@import` lines added below.

**No literal colour value is introduced anywhere in `app/ui/`.** Tokens alias the
existing variables; they never restate their values. A hex code appearing in a
new file is a review failure, because it is the mechanism by which a palette
silently drifts.

## Decisions

**Theming carries in two layers.** Tailwind `@theme` tokens hold the structural
scale and point at the brand variables rather than duplicating them. Semantic
component classes are built from those tokens with `@apply`. Tokens handle the
common rebrand; selector overrides remain available for the long tail.

```css
/* app/ui/tokens.css */
@theme {
  --color-brand: var(--blue);   /* iq-theme.css swaps --blue; everything follows */
  --color-ink:   var(--ink);
  --color-line:  var(--line);
  --radius-card: 16px;
  --radius-control: 10px;
}
```

**Existing class names are the component API. Nothing is renamed.**
`iq-theme.css` overrides roughly 120 selectors by name. Renaming `.primary` to
`.ps-button` would silently disable the white-label layer — the page would still
render, just permanently unbranded, which is the worst kind of regression
because nothing fails. Keeping the names also makes the zero-diff contract in
pass 1 achievable by construction rather than by care.

**Entry order** in `app/globals.css`, all before any rule, since CSS requires
imports first:

```css
@import "tailwindcss";
@import "./ui/tokens.css";
@import "./ui/components.css";
```

## Component inventory

271 class names collapse to eleven primitives.

| Primitive | Absorbs |
| --- | --- |
| `Button` | `.primary` `.gold` `.link` `.upload` `.take-photo` `.device-primary` `.action-cta` `.remove-photo`, icon buttons |
| `Card` | `.photo-card` `.devices article` `.personal-grid article` `.assets article` `.sheet button` |
| `Badge` | `.badge` `.photo-type-tag` `.photo-category-tag` `.eyebrow` |
| `Panel` | `.photos-section` `.narrow` `.empty-state` `.privacy` |
| `Toolbar` | `.photos-toolbar` `.filters` `.gallery-head` `.console-title` |
| `StatTile` | `.camera-rating` `.checks span` `.final-quality-metrics span` `.live-pose-card` |
| `Field` | `.search input` `.device-field` `.manual-checkin form` |
| `PageHeader` | `.photos-heading` `.qr-intro` `.title` `.console-title` |
| `Toggle` | `.consents label` |
| `Stepper` | `.steps`, the existing `Step` component |
| `MediaFrame` | `.photo-media` `.user-photo`, the existing `PhotoView` and `Placeholder` |

Variant names are derived from what the CSS already calls things, not designed
fresh. `<Button variant="gold">` exists because `.gold` exists.

## Pass 1 — mechanical extraction

Move JSX into `app/ui/*.tsx` while emitting the **exact existing class strings**.
`<Button variant="primary">` renders `class="primary"` and nothing more.

- No CSS file is touched.
- No class name is invented.
- No Tailwind utility is used.
- Behaviour, handlers and DOM output are identical.

`app/studio.tsx` shrinks as inline JSX is replaced by component calls.

This pass carries the demo risk, and it is the pass with an objective pass/fail:
the screenshot harness below must report zero difference across all ten views.

## Pass 2 — tokens and component classes

Gated on a spike (below). Then, one primitive at a time:

1. Lift its rules out of `polish.css` / `globals.css` / `app-ui.css` into
   `components.css` as `@apply`.
2. Delete the originals.
3. `npm run verify`.
4. Screenshot-diff.

Eleven small reversible steps. View code does not change again in this pass, so
a regression is attributable to exactly one primitive.

### Spike, before writing any component

Tailwind v4 compiles opacity modifiers (`bg-brand/50`) to `color-mix()`. Confirm
that resolves correctly when the token is a `var()` chain rather than a literal.

- **If it works:** proceed as specified.
- **If it does not:** brand colours become literals in `@theme` plus a second
  override block keyed to the theme file. Uglier, works, keeps the colour lock.

Finding this out after eleven components are written against the wrong
assumption is the expensive version.

## Verification

Baseline screenshots are captured from `main` before pass 1 begins — all ten
views, stored in the session scratchpad, not committed.

Reachability is already established from prior rehearsals: sample files that hit
each verdict, the `DataTransfer` trick for driving the file input headlessly, and
Assets reached via *Local finishing off → Use original*.

**Ten views, not eleven.** `profile` appears in the `View` union at
`app/studio.tsx:19` and nowhere else — no `setView` call, no render branch, no
entry in `navigableViews`. It is a dead union member, discovered while building
the harness. It is deliberately **not** removed: dead-code removal is outside
this refactor's scope and the repo is frozen. The ten live views produce 15
captured frames, five of them scrolled variants.

The harness procedure, its load-bearing settings and its known gaps live in
`scripts/shoot-views.md`. The single most important of those settings is
`fromSurface: false` — `fullPage` capture reads the browser's composited surface
and lands on one of two GPU raster states, which is not a property of the app at
all. That one setting is the difference between a gate that means something and
a gate that reports noise.

### Determinism gate

The views render `Intl.DateTimeFormat(new Date())`, generated review-request ids,
and a live camera feed. These differ between two runs of identical code, so a
naive pixel diff fails `main` against `main`.

**Before any extraction work, the harness must prove a `main`-vs-`main` diff is
clean** — by stubbing `Date`, seeding ids, and masking the video element.

If that cannot be made green, the zero-diff contract is decoration. In that case
the work stops and is reported, rather than proceeding behind a check that does
not actually check anything.

### Per-step gates

- `npm run verify` after every primitive. Bar is 0 errors; known-good is
  150/150 tests and 22 lint warnings.
- Screenshot diff after every primitive.
- Full judge-flow rehearsal before any merge proposal.

## Rollback

`git checkout main` at any point. `main` is at `84d991e`, verified, and holds no
part of this work.

## Out of scope

- Visual redesign of any kind, including the office-web-ui archetype treatments
  (hero bands, stat strips, filter bars). This spec is structure only.
- Migrating `app/designer/` and `app/atlas/` onto the library. They are the
  reason it is being built, but adopting them is separate work.
- Clearing the 22 known lint warnings.
- `next/image` adoption.

## Risks

| Risk | Mitigation |
| --- | --- |
| Determinism gate cannot be made green | Work stops and is reported; the contract is not weakened to fit |
| `color-mix()` does not resolve through `var()` chains | Spike before implementation; documented fallback |
| A renamed class silently disables white-label | No renames, enforced by review |
| Interim duality — two styling systems live at once | Bounded to pass 2; each primitive's old rules are deleted as it converts |
| Palette drift | No literal colour values in `app/ui/`; a hex in a new file fails review |
