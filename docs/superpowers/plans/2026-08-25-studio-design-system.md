# Studio Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `app/studio.tsx`'s inline UI into a reusable `app/ui/` component library backed by Tailwind v4 tokens, without changing a single rendered pixel.

**Architecture:** Two passes. Pass 1 moves JSX into components that emit the *existing* class strings verbatim — no CSS touched, no class renamed, so the DOM output is byte-identical. Pass 2 swaps each component's internals to `@theme` tokens and `@apply`, one primitive at a time, deleting the old rules as it converts.

**Tech Stack:** React 19, vinext (Cloudflare worker SSR), Tailwind v4 via `@tailwindcss/postcss` (already installed, currently unused), `node:test`, ImageMagick (system tool, not a project dependency).

**Spec:** `docs/superpowers/specs/2026-08-25-studio-design-system-design.md`

## Global Constraints

- **The rendered pixels must not change.** Not the palette, not the type scale, not spacing, not shadows. Any visible change is a defect, not an improvement.
- **No literal colour value may appear anywhere in `app/ui/`.** Tokens alias existing variables; they never restate values. A hex code in a new file fails review.
- **Nothing is renamed.** `app/iq-theme.css` overrides ~120 selectors by name. A rename disables white-label silently.
- **No new dependencies.** Tailwind is already in the lockfile. Nothing is added to `package.json`.
- **Frozen assets stay frozen.** The seven files hashed in `scripts/demo-preflight.mjs` are not touched.
- **`main` stays presentable.** It sits at `84d991e`, verified. Rollback is `git checkout main`.
- Known-good gate: `npm run verify` green, **150/150 tests**, **22 lint warnings, 0 errors**.
- Active palette (from `app/iq-theme.css`, which wins the cascade): `--ink #262626`, `--ivory #fff`, `--gold #ee6538`, `--blue #e7552a`, `--green #35966f`, `--line #e7e7e7`, `--muted #6f7378`, `--soft #f6f7f8`, `--soft-orange #fff1eb`, `--shadow 0 18px 50px rgba(30,35,40,.09)`.
- Code style: app modules are dense — single-space indent, no spaces around `:` in type literals, multiple `const` per line. Match the file you are editing. Comments explain **why**, not what.

---

## On testing discipline

This is a refactor with zero intended behaviour change, so red-green TDD does not apply — there is no new behaviour to drive out. The correct technique is **characterization testing**: capture current output as an assertion *first*, while the code still produces it, then hold that assertion invariant through the change. A characterization test that passes before your edit and after it is doing its job.

Two gates, with different reach:

| Gate | Covers | Cost |
| --- | --- | --- |
| `tests/studio-markup.test.mjs` — SSR class-string lock | Whatever the server renders (the default view plus `/designer`, `/atlas`) | Seconds, runs inside `npm run verify` |
| Screenshot diff — MCP browser + `magick compare` | All ten views (15 frames, including scrolled variants) | Minutes, driven manually |

Neither is sufficient alone. The markup test is cheap and catches the common failure (a dropped or reordered class) on every run. The screenshot diff is the only thing that sees CSS-level regressions and the ten views SSR never renders.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `app/ui/index.ts` | Barrel export. The single import site for consumers. |
| `app/ui/button.tsx` | `Button` — recurring variants plus className pass-through |
| `app/ui/media-frame.tsx` | `MediaFrame`, `Placeholder` — moved from `studio.tsx` |
| `app/ui/badge.tsx` | `Badge` |
| `app/ui/stat-tile.tsx` | `StatTile`, `CameraRating` |
| `app/ui/card.tsx` | `Card` |
| `app/ui/panel.tsx` | `Panel` |
| `app/ui/toolbar.tsx` | `Toolbar` |
| `app/ui/page-header.tsx` | `PageHeader` |
| `app/ui/field.tsx` | `Field` |
| `app/ui/toggle.tsx` | `Toggle` |
| `app/ui/stepper.tsx` | `Stepper` — moved from `studio.tsx`'s `Step` |
| `app/ui/tokens.css` | `@theme` block. Structural scale, aliasing brand vars. Pass 2 only. |
| `app/ui/components.css` | `@layer components` with `@apply` bodies. Pass 2 only. |
| `tests/studio-markup.test.mjs` | Characterization lock on SSR class strings |
| `scripts/shoot-views.md` | The screenshot procedure, recorded so a second person can repeat it |

**Modified:**

- `app/studio.tsx` — inline JSX replaced by component calls
- `app/globals.css` — two `@import` lines added (pass 2). Its `:root` block is **not** edited.
- `app/polish.css`, `app/app-ui.css` — rules deleted as primitives convert (pass 2)
- `package.json` — `test` script gains `tests/studio-markup.test.mjs`

---

# PASS 0 — Gates

### Task 1: Characterization lock on rendered markup

Nothing else starts until this exists. It is what makes every later task's "did I break it" answerable.

**Files:**
- Create: `tests/studio-markup.test.mjs`
- Modify: `package.json` (the `test` script's file list)

**Interfaces:**
- Consumes: nothing
- Produces: a test that fails loudly if any locked class string stops appearing in SSR output

- [ ] **Step 1: Find out what SSR actually renders**

The studio's views are client-state-driven, so most never render server-side. Establish empirically which classes are in reach rather than assuming.

```bash
npm run build
node -e '
const w = await import("./dist/server/index.js");
const env = { ASSETS: { fetch: async () => new Response("", {status:404}) } };
const ctx = { waitUntil(){}, passThroughOnException(){} };
const html = await (await w.default.fetch(new Request("http://localhost/"), env, ctx)).text();
const classes = [...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));
console.log([...new Set(classes)].sort().join("\n"));
' --input-type=module
```

Record the output. Every class it lists is lockable; anything absent is screenshot-only territory.

- [ ] **Step 2: Write the characterization test**

Use the class list from Step 1. The point is not to assert every class — it is to assert the ones the extraction will touch, so the test fails when an extraction drops or reorders one.

Assert **exact occurrence counts**, not mere presence. A class that renders at three call sites and survives at one still satisfies a presence check, so a presence lock passes through a partial drop. Derive every expected count from observed output — a hand-written number is a guess, and a count tuned until the test goes green is weaker than the presence check it replaced while looking stronger.

```javascript
import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const environment = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };
const html = await (await worker.fetch(new Request("http://localhost/"), environment, context)).text();

// These class strings are the contract between the studio views and the CSS that styles them.
// The extraction moves the JSX that emits them; if a component drops one, reorders a pair, or
// invents a name, white-label styling silently stops applying to that element. Locking the
// exact strings turns that from an invisible regression into a failing test.
for (const locked of [
  "photos-toolbar",
  "photos-heading",
  "photos-actions",
  "photos-section",
  "photos-section-head",
  "personal-grid",
  "photo-card",
  "photo-card-info",
  "photo-actions",
  "primary",
  "take-photo",
]) {
  test(`SSR markup still emits .${locked}`, () => {
    // Do NOT match with \b — `-` is a non-word character, so `\bapp-nav\b` happily matches
    // `class="app-nav-main"`. Two affix pairs in this very list (app-nav / app-nav-main,
    // photos-section / photos-section-head) sit in nested JSX the extraction will split, so a
    // \b lock would stay green through exactly the drop it exists to catch. Split the attribute
    // and compare tokens exactly.
    const tokens = [...html.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/));
    assert.ok(tokens.includes(locked),
      `.${locked} vanished from the rendered page — a component dropped or renamed it, and the CSS that targets it no longer applies`);
  });
}

test("multi-class elements keep their exact class order", () => {
  // `class="primary session-start"` and `class="session-start primary"` are equivalent to the
  // browser but not to a reader or to a theme file's specificity assumptions. Order is part of
  // what a mechanical extraction must preserve, so it is asserted rather than hoped for.
  assert.match(html, /class="primary\b/,
    "the primary variant must lead its class list, as it does in the un-extracted markup");
});
```

- [ ] **Step 3: Register the test**

In `package.json`, append `tests/studio-markup.test.mjs` to the `test` script's file list.

- [ ] **Step 4: Confirm it passes on unmodified code**

Run: `npm run verify`
Expected: PASS. Test count rises from 150 to 150 + (number of locked classes + 1).

**A characterization test that fails here is telling you the lock list is wrong, not that the code is broken.** Remove any class Step 1 did not actually find, and re-run.

- [ ] **Step 5: Prove it can fail**

Temporarily change one `className="primary"` in `app/studio.tsx` to `className="primaryy"`, run `npm run test`, confirm the matching test fails with the written message, then revert.

A gate never observed failing is not known to be a gate.

- [ ] **Step 6: Commit**

```bash
git add tests/studio-markup.test.mjs package.json
git commit -m "test: lock the studio's rendered class strings before extraction"
```

### Task 2: Screenshot harness and the determinism gate

**Files:**
- Create: `scripts/shoot-views.md`

**Interfaces:**
- Consumes: nothing
- Produces: a baseline image set in the scratchpad, and a documented repeatable procedure

- [ ] **Step 1: Establish the ten view routes and how to reach each**

Views are `profile → session → capture → batch → review → select → consent → success → personal → assets → console`. Most are client state, not URLs. Known from prior rehearsals: sample files hit each verdict, the `DataTransfer` trick drives the file input headlessly, and Assets is reached via *Local finishing off → Use original*.

Write each route down in `scripts/shoot-views.md` as an ordered click path. This file exists so the check is reproducible by someone who is not you.

- [ ] **Step 2: Neutralise the three sources of nondeterminism**

The views render `Intl.DateTimeFormat(new Date())`, generated review-request ids, and a live camera feed. Two runs of *identical* code produce different pixels. Before the harness is worth anything, inject on each page load:

```javascript
// Freeze the clock so date-formatted captions ("Reviewed by our design team · 12 Aug 2026")
// render identically across runs. Without this a main-vs-main diff fails on wall-clock drift
// and the whole zero-diff contract reads as broken when nothing is.
const FIXED = new Date("2026-08-25T09:00:00Z").valueOf();
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) { return args.length ? new RealDate(...args) : new RealDate(FIXED); }
  static now() { return FIXED; }
};
```

Mask the `<video>` element with an opaque overlay rather than trying to freeze a camera feed.

- [ ] **Step 3: Capture the baseline from `main`**

```bash
git checkout main
npm run build && npm run start
```

Drive the ten views with the Playwright MCP browser tools, saving each as `<scratchpad>/baseline/<view>.png`.

Playwright is **not** a project dependency and must not become one — the MCP browser tooling is a separate channel that adds nothing to `package.json`.

- [ ] **Step 4: Run the determinism gate — `main` against `main`**

Capture the same ten views a second time, from the same unmodified `main`, into `<scratchpad>/baseline2/`. Then:

```bash
for v in profile session capture batch review select consent success personal assets console; do
  printf '%s: ' "$v"
  magick compare -metric AE "<scratchpad>/baseline/$v.png" "<scratchpad>/baseline2/$v.png" null: 2>&1
  echo
done
```

Expected: `0` for every view.

**This is a real stopping point.** A non-zero count means something still varies between runs of identical code. Find it and neutralise it. If it cannot be made zero, the zero-diff contract is decoration — stop, report which views are unstable and why, and do not proceed into Task 3 behind a check that does not check anything. Proceeding anyway produces a green harness that would not notice a genuine regression, which is worse than having no harness at all.

- [ ] **Step 5: Commit the procedure**

```bash
git checkout feat/design-system
git add scripts/shoot-views.md
git commit -m "docs: record the view screenshot procedure and its determinism gate"
```

Images stay in the scratchpad. They are large, machine-specific, and would bloat the repository.

---

# PASS 1 — Mechanical extraction

Every task in this pass obeys the same contract, restated in full because tasks are read out of order:

- Components emit the **exact existing class strings**. `<Button variant="primary">` renders `class="primary"`, nothing more.
- No CSS file is touched. No class name is invented. No Tailwind utility is used.
- Handlers, ARIA attributes, `type`, `disabled`, `title` and child order are preserved exactly.
- Each task ends with `npm run verify` green and the affected views screenshot-diffing to `0`.

### Task 3: `app/ui/` scaffold and `Button`

`Button` first because it is the largest single win — 120 CSS rules and 34 distinct class strings across the flow.

**Files:**
- Create: `app/ui/button.tsx`, `app/ui/index.ts`
- Modify: `app/studio.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `Button`, `ButtonVariant` from `app/ui`

- [ ] **Step 1: Write the component**

The 34 class strings are mostly one-offs owned by a single view. A seven-variant enum plus pass-through fits the real distribution; a 34-member enum would be a taxonomy nobody can hold in their head.

```tsx
import type {ButtonHTMLAttributes} from "react";

// The studio uses 34 distinct button class strings, and 27 of them appear exactly once —
// `scanner-start`, `reminder-home-optout`, `codeformer-action` and friends each belong to one
// view. Only the recurring seven become variants; everything else passes through `className`
// unchanged. Promoting the one-offs into an enum would grow a vocabulary that no caller can
// remember and that the CSS does not actually treat as a family.
export type ButtonVariant="primary"|"gold"|"link"|"upload"|"take-photo"|"remove-photo"|"danger";

type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:ButtonVariant};

// `type` defaults to "button". Every call site in studio.tsx passes it explicitly today, and a
// bare <button> inside the consent <form> would submit it instead of toggling a permission.
export function Button({variant,className,type="button",...rest}:ButtonProps){
 // Variant leads, caller classes follow — the order the un-extracted markup already emits
 // (`class="primary session-start"`), preserved because the markup test asserts it.
 const classes=[variant,className].filter(Boolean).join(" ");
 return <button type={type} className={classes||undefined} {...rest}/>;
}
```

`classes||undefined` matters: a `Button` with neither variant nor className must render `<button type="button">` with no `class` attribute at all, matching the un-extracted markup. `className=""` would emit `class=""` and fail the pixel diff on nothing.

- [ ] **Step 2: Create the barrel**

```ts
export {Button,type ButtonVariant} from "./button";
```

- [ ] **Step 3: Replace call sites in `app/studio.tsx`**

Import `{Button}` from `./ui`. Convert mechanically:

```tsx
// before
<button type="button" className="primary" onClick={()=>go("personal")}>View in Photos <ArrowRight size={18}/></button>
// after
<Button variant="primary" onClick={()=>go("personal")}>View in Photos <ArrowRight size={18}/></Button>

// before
<button type="button" className="primary session-start" onClick={onStart}>Start</button>
// after
<Button variant="primary" className="session-start" onClick={onStart}>Start</Button>

// before — one-off class, no variant
<button type="button" className="scanner-start" onClick={startScanner} disabled={scanStatus==="starting"}>…</button>
// after
<Button className="scanner-start" onClick={startScanner} disabled={scanStatus==="starting"}>…</Button>
```

Do not restructure children, reorder attributes, or "tidy" anything while you are in there. This task's only defensible diff is the substitution.

- [ ] **Step 4: Verify**

Run: `npm run verify`
Expected: PASS, 0 lint errors, warning count unchanged from 22.

- [ ] **Step 5: Screenshot-diff every view**

Every view has buttons, so all ten are affected.

Expected: `0` from `magick compare` for all 15 frames.

A non-zero result is a real regression — find the call site whose attributes or class order changed. Do not adjust the baseline to match.

- [ ] **Step 6: Commit**

```bash
git add app/ui/button.tsx app/ui/index.ts app/studio.tsx
git commit -m "refactor: extract Button, emitting the existing class strings unchanged"
```

### Task 4: `MediaFrame`

The easiest move — `PhotoView` and `Placeholder` are already standalone components at `app/studio.tsx:33-34`. This is relocation, not redesign.

**Files:**
- Create: `app/ui/media-frame.tsx`
- Modify: `app/studio.tsx`, `app/ui/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MediaFrame`, `Placeholder` from `app/ui`

- [ ] **Step 1: Move both components verbatim**

Cut from `app/studio.tsx` and paste into `app/ui/media-frame.tsx`, adding the `lucide-react` imports they need. Rename `PhotoView` to `MediaFrame`; keep `Placeholder` as-is.

```tsx
import {Check,HelpCircle} from "lucide-react";

export const Placeholder=({n=2,badge}:{n?:number;badge?:string})=><div className={`portrait p${n}`}>{badge?<span className="badge"><Check size={14}/> {badge}</span>:null}</div>;

export const MediaFrame=({src,className="",alt="Portrait",badge,badgeTone="approved"}:{src?:string;className?:string;alt?:string;badge?:string;badgeTone?:"approved"|"pending"})=>src?<div className="photo-media"><img className={`user-photo ${className}`} src={src} alt={alt} width={960} height={1200}/>{badge?<span className={`badge ${badgeTone==="pending"?"pending":""}`}>{badgeTone==="pending"?<HelpCircle size={14}/>:<Check size={14}/>} {badge}</span>:null}</div>:<Placeholder badge={badge}/>;
```

The `<img>` stays an `<img>`. `next/image` is not wired up, and swapping it here would add a lint warning and change the rendered markup — both out of scope.

- [ ] **Step 2: Update `app/studio.tsx`**

Import `{MediaFrame}` from `./ui`, and replace every `<PhotoView` with `<MediaFrame`. Props are unchanged.

- [ ] **Step 3: Export from the barrel**

```ts
export {MediaFrame,Placeholder} from "./media-frame";
```

- [ ] **Step 4: Verify**

Run: `npm run verify`
Expected: PASS. Lint warnings stay at 22 — the `<img>` warning moves from `studio.tsx` to `media-frame.tsx` but the total does not change. If the total changed, an `<img>` was duplicated rather than moved.

- [ ] **Step 5: Screenshot-diff**

Affected views: `review`, `select`, `success`, `personal`, `assets`. Expected `0` for each.

- [ ] **Step 6: Commit**

```bash
git add app/ui/media-frame.tsx app/ui/index.ts app/studio.tsx
git commit -m "refactor: move PhotoView and Placeholder into app/ui as MediaFrame"
```

### Task 5: `Badge` and `StatTile`

**Files:**
- Create: `app/ui/badge.tsx`, `app/ui/stat-tile.tsx`
- Modify: `app/studio.tsx`, `app/ui/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Badge`, `StatTile`, `CameraRating` from `app/ui`

- [ ] **Step 1: Write `Badge`**

Absorbs `.badge`, `.photo-type-tag`, `.photo-category-tag`, `.eyebrow`.

```tsx
import type {ReactNode} from "react";

// Four unrelated-looking classes with one shape: a small label, sometimes with a leading icon.
// `tone` names the CSS class rather than a colour, so a theme file that repaints `.badge` keeps
// working and no colour value has to be restated here.
export type BadgeTone="badge"|"photo-type-tag"|"photo-category-tag"|"eyebrow";

export function Badge({tone="badge",className,icon,children}:{tone?:BadgeTone;className?:string;icon?:ReactNode;children?:ReactNode}){
 const classes=[tone,className].filter(Boolean).join(" ");
 return <span className={classes}>{icon}{icon?" ":null}{children}</span>;
}
```

The `{icon?" ":null}` is not cosmetic — the un-extracted markup has a literal space between icon and text (`<Check size={14}/> {badge}`). Dropping it closes a gap the screenshot diff will catch.

`MediaFrame` (Task 4) also emits `.badge` markup inline. **Leave it inline.** Rewiring it through `Badge` would be a structural change in a pass whose whole guarantee is that no structure changes. Both sites converge in pass 2, where `.badge` is styled once in CSS and serves them equally.

- [ ] **Step 2: Write `StatTile`**

Absorbs `.final-quality-metrics span` **only**. Move `CameraRating` from `app/studio.tsx:40` verbatim into this file — co-located for pass 2, not because it shares `StatTile`'s shape.

The inventory originally claimed `StatTile` also absorbs `.camera-rating`, `.checks span` and `.live-pose-card`. Verified against the CSS, that is false, and acting on it would break the pass:

- `.camera-rating` and `.live-pose-card` (`app/camera-v2.css:156-171`) are structurally richer — a score ring, a progress bar (`<i><b/></i>`), several text nodes. A `<span><small/><b/></span>` cannot represent them without restructuring, and restructuring changes pixels.
- `.checks span` has rules in `app/globals.css` but **zero JSX call sites**. It is dead CSS, not a shape to absorb. Task 15's sweep owns it.

So `StatTile` fits one class family. Do not force the other three through it.

```tsx
import type {PhotoRating} from "../photo-quality";

export function CameraRating({rating,compact=false}:{rating:PhotoRating;compact?:boolean}){return <div className={`camera-rating ${rating.tone} ${compact?"compact":""}`} aria-label={`Photo rating ${rating.score} out of 100, ${rating.label}`}><strong>{rating.score}</strong><span><b>Photo rating</b><small>{rating.label}</small></span></div>}

// The metric tiles in the final preflight and the `.checks` grid are the same element with
// different parents: a small label above a value. Kept as one component so pass 2 converts the
// styling once instead of three times.
export function StatTile({label,value,className}:{label:string;value:string|number;className?:string}){
 return <span className={className}><small>{label}</small><b>{value}</b></span>;
}
```

Note `CameraRating` emits a trailing space in its class string when `compact` is false (`camera-rating good `). That is what the current code does. Preserve it — "fixing" it changes the rendered attribute and the markup test will flag it.

- [ ] **Step 3: Replace call sites**

In `app/studio.tsx`, replace the `.final-quality-metrics` map body and the `CameraRating` definition with imports from `./ui`.

- [ ] **Step 4: Export from the barrel**

```ts
export {Badge,type BadgeTone} from "./badge";
export {StatTile,CameraRating} from "./stat-tile";
```

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: PASS, 22 warnings, 0 errors.

- [ ] **Step 6: Screenshot-diff**

Affected views: `capture`, `batch`, `review`, `consent`, `personal`. Expected `0`.

- [ ] **Step 7: Commit**

```bash
git add app/ui/badge.tsx app/ui/stat-tile.tsx app/ui/index.ts app/studio.tsx
git commit -m "refactor: extract Badge and StatTile with their exact class strings"
```

### Task 6: `Card` and `Panel`

**Files:**
- Create: `app/ui/card.tsx`, `app/ui/panel.tsx`
- Modify: `app/studio.tsx`, `app/ui/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Card`, `Panel` from `app/ui`

- [ ] **Step 1: Write `Card`**

Absorbs `.photo-card`, `.devices article`, `.personal-grid article`, `.assets article`, `.sheet button`.

```tsx
import type {ReactNode} from "react";

// Card renders <article> because four of its five absorbed call sites already do. The fifth
// (`.sheet button`) is an interactive choice tile and keeps its own element — a <button> inside
// an <article> would change both the accessibility tree and the rendered markup.
export function Card({className,children}:{className?:string;children?:ReactNode}){
 return <article className={className||undefined}>{children}</article>;
}
```

- [ ] **Step 2: Write `Panel`**

Absorbs `.photos-section`, `.narrow`, `.empty-state`, `.privacy`.

```tsx
import type {ReactNode} from "react";

export function Panel({className,children}:{className?:string;children?:ReactNode}){
 return <div className={className||undefined}>{children}</div>;
}
```

Both components are deliberately thin. In pass 1 they carry no styling opinion at all — they exist so pass 2 has one place to put it.

- [ ] **Step 3: Replace call sites**

`<article className="photo-card">` → `<Card className="photo-card">`, and so on.

One case needs a decision rather than a substitution. The batch grid's `<article className={selected?"selected":""}>` emits `class=""` when unselected, and `Card`'s `className||undefined` drops the attribute entirely. Use `className={selected?"selected":undefined}`.

`class=""` and no `class` attribute style identically — no selector can match either — so this cannot move a pixel, and the screenshot diff will confirm `0`. It does change the HTML string, so if a Task 1 lock ever covers this element, update the lock deliberately rather than reverting to the empty string.

- [ ] **Step 4: Export from the barrel**

```ts
export {Card} from "./card";
export {Panel} from "./panel";
```

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: PASS, 22 warnings, 0 errors.

- [ ] **Step 6: Screenshot-diff**

Affected views: `batch`, `select`, `consent`, `personal`, `assets`, `console`. Expected `0`.

- [ ] **Step 7: Commit**

```bash
git add app/ui/card.tsx app/ui/panel.tsx app/ui/index.ts app/studio.tsx
git commit -m "refactor: extract Card and Panel containers"
```

### Task 7: `Toolbar` and `PageHeader`

**Files:**
- Create: `app/ui/toolbar.tsx`, `app/ui/page-header.tsx`
- Modify: `app/studio.tsx`, `app/ui/index.ts`

**Interfaces:**
- Consumes: nothing. `PageHeader` emits `<span className="eyebrow">` directly rather than composing `Badge` — pass 1 preserves existing markup verbatim, and routing it through `Badge` would be a structural change wearing a refactor's clothes.
- Produces: `Toolbar`, `PageHeader` from `app/ui`

- [ ] **Step 1: Write `Toolbar`**

Absorbs `.photos-toolbar`, `.filters`, `.gallery-head`, `.console-title`.

```tsx
import type {ReactNode} from "react";

export function Toolbar({className,children}:{className?:string;children?:ReactNode}){
 return <div className={className||undefined}>{children}</div>;
}
```

- [ ] **Step 2: Write `PageHeader`**

Absorbs `.photos-heading`, `.qr-intro`, `.title`, `.console-title`.

```tsx
import type {ReactNode} from "react";

// eyebrow / title / lead is the shape every studio page header already has, in that order.
// Taking them as named props rather than children is what lets pass 2 restyle the three parts
// independently without every call site re-nesting its markup.
export function PageHeader({eyebrow,title,lead,className,children}:{eyebrow?:ReactNode;title?:ReactNode;lead?:ReactNode;className?:string;children?:ReactNode}){
 return <div className={className||undefined}>
  {eyebrow?<span className="eyebrow">{eyebrow}</span>:null}
  {title?<h1>{title}</h1>:null}
  {lead?<p>{lead}</p>:null}
  {children}
 </div>;
}
```

Check each call site's actual element order before converting. `.console-title` puts its eyebrow inside a nested `<div>` alongside a sibling `<span>`; if a header does not match the eyebrow/title/lead shape, pass its markup as `children` rather than bending the component to fit.

- [ ] **Step 3: Replace call sites**

- [ ] **Step 4: Export from the barrel**

```ts
export {Toolbar} from "./toolbar";
export {PageHeader} from "./page-header";
```

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: PASS, 22 warnings, 0 errors. The markup test's `photos-toolbar` and `photos-heading` locks cover this task directly — a failure here names the exact class that moved.

- [ ] **Step 6: Screenshot-diff**

Affected views: `personal`, `assets`, `console`, `capture`. Expected `0`.

- [ ] **Step 7: Commit**

```bash
git add app/ui/toolbar.tsx app/ui/page-header.tsx app/ui/index.ts app/studio.tsx
git commit -m "refactor: extract Toolbar and PageHeader"
```

### Task 8: `Field`, `Toggle`, `Stepper`

The three form-ish primitives. Grouped because each is small and they share one screenshot set.

**Files:**
- Create: `app/ui/field.tsx`, `app/ui/toggle.tsx`, `app/ui/stepper.tsx`
- Modify: `app/studio.tsx`, `app/ui/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Field`, `Toggle`, `Stepper` from `app/ui`

- [ ] **Step 1: Write `Field`**

Absorbs `.search input`, `.device-field`, `.manual-checkin form`.

```tsx
import type {InputHTMLAttributes,ReactNode} from "react";

// The label wraps the control rather than pointing at it with htmlFor, which is what the
// existing `.device-field` markup does and what keeps the whole row a click target.
export function Field({label,className,children}:{label:ReactNode;className?:string;children:ReactNode}){
 return <label className={className||undefined}><span>{label}</span>{children}</label>;
}

export function TextField({label,className,...rest}:InputHTMLAttributes<HTMLInputElement>&{label:ReactNode;className?:string}){
 return <Field label={label} className={className}><input {...rest}/></Field>;
}
```

- [ ] **Step 2: Write `Toggle`**

Absorbs `.consents label` — the two consent switches.

```tsx
import type {ReactNode} from "react";

// The visual switch is the <i>, painted entirely by `.consents input:checked+i` in CSS. The
// real checkbox stays in the DOM and stays operable — it is positioned off-screen, not hidden —
// so the control remains keyboard-reachable and announces its own state. The <i> must stay the
// input's next sibling or the adjacent-sibling selector stops matching and the switch freezes
// in its unchecked appearance while the checkbox underneath still toggles.
export function Toggle({name,label,note,checked,onChange,ariaLabel}:{name:string;label:ReactNode;note?:ReactNode;checked:boolean;onChange:(value:boolean)=>void;ariaLabel:string}){
 return <label>
  <span><b>{label}</b>{note?<small>{note}</small>:null}</span>
  <input name={name} type="checkbox" aria-label={ariaLabel} checked={checked} onChange={event=>onChange(event.target.checked)}/>
  <i/>
 </label>;
}
```

- [ ] **Step 3: Write `Stepper`**

Move `Step` from `app/studio.tsx:38` verbatim, renamed.

```tsx
export function Stepper({n,label}:{n:number;label:string}){return <div className="steps" role="progressbar" aria-label={`${label}, step ${n} of 4`} aria-valuemin={1} aria-valuemax={4} aria-valuenow={n}><span>Step {n} of 4</span><i><b style={{width:`${n*25}%`}}/></i><span>{label}</span></div>}
```

The inline `style` stays inline. It is a computed percentage, not a themeable value, and moving it to CSS would need a custom property per step for no gain.

- [ ] **Step 4: Replace call sites and export from the barrel**

```ts
export {Field,TextField} from "./field";
export {Toggle} from "./toggle";
export {Stepper} from "./stepper";
```

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: PASS, 22 warnings, 0 errors.

- [ ] **Step 6: Screenshot-diff, and check the consent toggles by hand**

Affected views: `capture`, `consent`, `console`, `profile`. Expected `0`.

Then manually toggle both consent switches. The screenshot diff photographs one state; it cannot see that the *other* state broke. Confirm the switch animates, the checkbox state changes, and — per the product claims that must stay true — that Atlas-profile consent and brand-use consent remain two independent permissions.

- [ ] **Step 7: Commit**

```bash
git add app/ui/field.tsx app/ui/toggle.tsx app/ui/stepper.tsx app/ui/index.ts app/studio.tsx
git commit -m "refactor: extract Field, Toggle and Stepper"
```

### Task 9: Pass 1 close-out — full zero-diff proof

**Files:**
- Modify: none expected

**Interfaces:**
- Consumes: every component from Tasks 3-8
- Produces: a verified zero-diff state, and the go/no-go for pass 2

- [ ] **Step 1: Full ten-view screenshot diff against the Task 2 baseline**

```bash
for v in profile session capture batch review select consent success personal assets console; do
  printf '%s: ' "$v"
  magick compare -metric AE "<scratchpad>/baseline/$v.png" "<scratchpad>/pass1/$v.png" null: 2>&1
  echo
done
```

Expected: `0` for all 15 frames. This is the acceptance test for the entire pass.

- [ ] **Step 2: Full judge-flow rehearsal**

Walk the flow as the demo does: QR or code → capture → batch select → review → enhance → consent → success → Photos → Assets. Confirm each documented fallback still works — camera blocked falls back to import, QR failure falls back to the typed code, Atlas timeout falls back to the bundled record.

An extraction that passes every pixel diff can still have broken a handler. Only the walkthrough sees that.

- [ ] **Step 3: Confirm the gate numbers**

Run: `npm run verify`
Expected: PASS, 0 errors, 22 warnings, tests at 150 + the markup locks from Task 1.

- [ ] **Step 4: Report before proceeding**

State the diff results, the rehearsal outcome, and the verify numbers. Pass 2 begins only after this is green — it is the last point at which the branch is trivially abandonable.

---

# PASS 2 — Tokens and component classes

Two rules bind every task in this pass. Restated in full because tasks are read out of order.

**`app/iq-theme.css` is never edited.** Not one rule, in any task. It is the brand layer — the thing white-label swaps — and every class this pass touches has rules in it. Only the *base* definitions in `globals.css`, `polish.css`, `app-ui.css` and `camera-v2.css` move. Confirmed by inspection: `.badge`, `.eyebrow`, `.steps`, `.consents`, `.photo-media` and `.user-photo` all carry `iq-theme.css` rules that must survive untouched.

**Moving a rule into `@layer components` lowers its cascade priority.** Unlayered CSS beats layered CSS regardless of source order or specificity. That is *desirable* against `iq-theme.css` — the brand layer should keep winning, and it will. But it also means a converted rule now loses to every *other* unlayered rule that previously lost to it on source order. A rule that moves into the layer can therefore stop applying for reasons that have nothing to do with how it was rewritten.

This is exactly why conversion is one selector at a time with a screenshot diff after each. A batch of five conversions with one diff at the end tells you something broke; it does not tell you which of the five, and the cascade interaction is not visible by reading the rewritten rule.

### Task 10: The `color-mix()` spike

Throwaway investigation. Its output is an answer, not code.

**Files:**
- Create: a scratch CSS file, deleted afterwards

- [ ] **Step 1: Ask the question**

Tailwind v4 compiles opacity modifiers (`bg-brand/50`) to `color-mix()`. Does that resolve correctly when the token is a `var()` chain (`--color-brand: var(--blue)`) rather than a literal?

- [ ] **Step 2: Test it**

Add a temporary `@theme { --color-brand: var(--blue); }` and an element using `bg-brand/50`. Build, then read the computed background in the browser.

- [ ] **Step 3: Record the answer and act on it**

- **Resolves correctly:** proceed with Task 11 as written.
- **Does not resolve:** brand colours become literals in `@theme`, plus an override block keyed to the theme file. Uglier, still colour-locked, and Task 11's token file changes shape accordingly.

- [ ] **Step 4: Delete the scratch file**

Nothing from this spike is kept.

### Task 11: Token and component-class scaffold

**Files:**
- Create: `app/ui/tokens.css`, `app/ui/components.css`
- Modify: `app/globals.css` (imports only — the `:root` block is not touched)

**Interfaces:**
- Consumes: the Task 10 answer
- Produces: `--color-*` and `--radius-*` tokens available to every `@apply` body

- [ ] **Step 1: Write `app/ui/tokens.css`**

```css
/* Structural scale only. Every colour aliases the variable that already carries it, so the
   palette has exactly one definition (app/iq-theme.css) and rebranding stays a matter of
   swapping that file. Restating a hex here would create a second source of truth that drifts
   silently the first time someone edits only one of them. */
@theme {
  --color-brand: var(--blue);
  --color-ink: var(--ink);
  --color-line: var(--line);
  --color-muted: var(--muted);
  --color-soft: var(--soft);
  --radius-card: 16px;
  --radius-control: 10px;
}
```

- [ ] **Step 2: Create an empty `app/ui/components.css`**

```css
@layer components {
}
```

- [ ] **Step 3: Wire the imports**

In `app/globals.css`, immediately after `@import "tailwindcss";` and before any rule — CSS requires all imports first:

```css
@import "tailwindcss";
@import "./ui/tokens.css";
@import "./ui/components.css";
```

- [ ] **Step 4: Verify nothing changed**

Run: `npm run verify`, then screenshot-diff all ten views.
Expected: PASS, and `0` everywhere. Adding tokens that nothing consumes yet must be visually inert. A non-zero diff here means Tailwind's preflight reset is now reaching elements it did not before — resolve that before any component converts.

**This step is load-bearing.** It separates "the token layer is wired correctly" from "a component's conversion broke something", which are otherwise impossible to tell apart later.

- [ ] **Step 5: Commit**

```bash
git add app/ui/tokens.css app/ui/components.css app/globals.css
git commit -m "feat: add the Tailwind token layer, aliasing the existing brand variables"
```

### Task 12: Convert `Button` and `Badge` internals

**Files:**
- Modify: `app/ui/components.css`, `app/polish.css`, `app/globals.css`, `app/app-ui.css`

**Interfaces:**
- Consumes: tokens from Task 11
- Produces: nothing new — internal change only. Component call sites are untouched.

- [ ] **Step 1: Locate the rules**

```bash
grep -n '\.primary\|\.gold\|\.link\|\.upload\|\.badge\|\.eyebrow' app/globals.css app/polish.css app/app-ui.css app/iq-theme.css
```

`app/iq-theme.css` matches are the **brand layer and must stay** — they are what makes white-label work. Only the base rules in `globals.css`, `polish.css` and `app-ui.css` move.

- [ ] **Step 2: Move one selector into `components.css` as `@apply`**

```css
@layer components {
  .primary {
    @apply min-h-14 px-7 font-extrabold text-white;
    background: var(--color-brand);
    border-radius: var(--radius-control);
  }
}
```

Colour and radius are set from tokens rather than utilities so `iq-theme.css`'s override still wins by specificity, exactly as it does now.

- [ ] **Step 3: Delete the original rule**

- [ ] **Step 4: Verify and diff**

Run: `npm run verify`, then screenshot-diff all ten views.
Expected: PASS, `0` everywhere.

- [ ] **Step 5: Repeat Steps 2-4 for each remaining selector, one at a time**

`.gold`, `.link`, `.upload`, `.badge`, `.eyebrow`. One selector, one diff, every time.

Converting several before diffing makes a regression unattributable, which costs more than the diffs save.

- [ ] **Step 6: Commit**

```bash
git add app/ui/components.css app/polish.css app/globals.css app/app-ui.css
git commit -m "refactor: rebuild Button and Badge styling on tokens"
```

### Task 13: Convert the container primitives

`Card`, `Panel`, `Toolbar`, `PageHeader`.

**Files:**
- Modify: `app/ui/components.css`, `app/polish.css`, `app/app-ui.css`

**Interfaces:**
- Consumes: tokens from Task 11
- Produces: internal change only

- [ ] **Step 1: Convert each selector, one at a time**

Same loop as Task 12, Steps 2-4, for `.photo-card`, `.photos-section`, `.narrow`, `.empty-state`, `.photos-toolbar`, `.gallery-head`, `.console-title`, `.photos-heading`.

- [ ] **Step 2: Verify and diff after each**

Expected: PASS and `0`, every time.

- [ ] **Step 3: Commit**

```bash
git add app/ui/components.css app/polish.css app/app-ui.css
git commit -m "refactor: rebuild the container primitives on tokens"
```

### Task 14: Convert the remaining primitives

`StatTile`, `Field`, `Toggle`, `Stepper`, `MediaFrame`.

**Files:**
- Modify: `app/ui/components.css`, `app/polish.css`, `app/app-ui.css`, `app/camera-v2.css`

**Interfaces:**
- Consumes: tokens from Task 11
- Produces: internal change only

- [ ] **Step 1: Convert each selector, one at a time**

`.camera-rating`, `.final-quality-metrics span`, `.device-field`, `.search input`, `.consents label`, `.steps`, `.photo-media`, `.user-photo`.

**`.camera-rating` is converted as `CameraRating`'s own markup, not through `StatTile`.** They do not share a shape — see Task 5 Step 2. Routing it through `StatTile` here would be a structural edit, and this pass permits none. `.checks span` is omitted deliberately: it has no call sites, so Task 15's dead-CSS sweep owns it rather than this task.

- [ ] **Step 2: Give `.consents label` extra attention**

Its switch is built from `input:checked + i`. Verify both toggle states by hand after converting, not just the default one — a sibling-selector break leaves the unchecked state looking perfect.

- [ ] **Step 3: Verify and diff after each**

Expected: PASS and `0`, every time.

- [ ] **Step 4: Commit**

```bash
git add app/ui/components.css app/polish.css app/app-ui.css app/camera-v2.css
git commit -m "refactor: rebuild the remaining primitives on tokens"
```

### Task 15: Dead CSS sweep and close-out

**Files:**
- Modify: `app/polish.css`, `app/app-ui.css`, `app/globals.css`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything
- Produces: the merge proposal

- [ ] **Step 1: Find rules nothing references any more**

```bash
for c in $(grep -oE '^\.[a-z][a-z0-9-]*' app/polish.css | sort -u | tr -d '.'); do
  grep -qr "\"$c\|'$c\| $c" app/*.tsx app/**/*.tsx app/ui/*.css || echo "unreferenced: $c"
done
```

Treat the output as a list to check, not a list to delete. The grep cannot see classes built by template literal — `` className={`camera-rating ${rating.tone}`} `` means `.good`, `.fair` and `.low` are all live despite never appearing as string literals. Confirm each candidate by hand.

- [ ] **Step 2: Delete confirmed-dead rules, then verify and diff**

Run: `npm run verify`, then screenshot-diff all ten views.
Expected: PASS, `0` everywhere.

- [ ] **Step 3: Update the recorded state**

`CLAUDE.md` gains `app/ui/` in the "Where things live" table, and its "Last verified state" line gets the true test and warning counts from the final run.

- [ ] **Step 4: Final full rehearsal**

The complete judge flow, every documented fallback, on the branch. Same walkthrough as Task 9 Step 2.

- [ ] **Step 5: Report, and propose the merge**

State: final diff results across all ten views, verify numbers, rehearsal outcome, and the net line change across `app/studio.tsx` and the CSS files.

**Do not merge.** `main` is the demo fallback and stays that way until the user decides otherwise.

- [ ] **Step 6: Commit**

```bash
git add app/polish.css app/app-ui.css app/globals.css CLAUDE.md
git commit -m "refactor: remove CSS rules superseded by the component layer"
```

---

## Self-review notes

Checked against the spec:

- Colour lock → Global Constraints, plus Task 11 Step 1's comment and Task 12 Step 2's token usage
- No renames → Global Constraints, enforced by Task 1's markup test
- Two-layer theming → Task 11 (tokens) and Tasks 12-14 (`@apply` bodies)
- Zero-diff contract → Task 1 (markup), Task 2 (determinism gate), Task 9 (full proof)
- `color-mix()` spike → Task 10, gating Task 11
- Determinism gate as a stopping point → Task 2 Step 4, stated as a stop rather than a warning
- No new dependencies → Task 2 Step 3 (MCP browser, not a `package.json` entry); ImageMagick is a system tool
- Out-of-scope items (visual redesign, designer/atlas adoption, lint warnings, `next/image`) → no task touches them; Task 4 Step 1 explicitly declines the `next/image` swap

Known limitation, recorded rather than smoothed over: the markup test in Task 1 only reaches what SSR renders. Nine of the ten views are client-state-only and are covered by screenshots alone — which is why Task 2's determinism gate is a hard stop rather than a nice-to-have.
