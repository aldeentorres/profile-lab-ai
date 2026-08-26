# Handoff: Profile Lab AI visual redesign

Written 2026-08-26. The previous agent (Claude Code) lost API access mid-run.
Nothing was lost — the working tree is clean and everything below is either
committed or precisely scoped. This file is self-contained: read it, do not
assume access to any other agent's memory or tool history.

## Where things stand

- **Repo:** `/Users/ARTOR/Desktop/studio-plus` (Profile Lab AI — offline-first
  AI portrait studio demo, React 19 + vinext/Cloudflare worker SSR, PostCSS +
  Tailwind v4)
- **Branch:** `feat/design-system`, currently at commit `0d14fc8`
- **`main` is untouched at `84d991e`.** It is the live demo fallback. Never
  check it out destructively, never force-push, never merge into it without
  the user's explicit go-ahead. If in doubt, `git worktree add` a scratch
  copy instead of touching the primary checkout's branch.
- **Read `CLAUDE.md` first.** It is the project's own instructions file and
  overrides defaults: commands, invariants, conventions, demo-day rules.
- **Read `.claude/skills/studio-plus-demo/SKILL.md`.** This repo is frozen
  for a live demo. Smallest verified fix over best refactor. No new
  dependencies. Don't touch the seven frozen assets hashed in
  `scripts/demo-preflight.mjs`.

## What already happened (all committed, do not redo)

A structural refactor extracted eleven reusable components into `app/ui/`
(`Button`, `Badge`, `Card`, `Panel`, `Toolbar`, `PageHeader`, `MediaFrame`,
`StatTile`/`CameraRating`, `Field`, `Toggle`, `Stepper`) and rebuilt the CSS
cascade so `app/ui/components.css` (the `components` layer) outranks all
fourteen legacy stylesheets, which live in an explicit `legacy` layer declared
in `app/entry.css` (plus per-route `app/designer/entry.css` and
`app/atlas/entry.css`). This was verified with 174/174 tests passing, 0 lint
errors, and a screenshot-diff harness proving zero unintended pixel change
across ten views.

Then, with the user's explicit go-ahead, a **visual redesign** began on top of
that foundation:

1. **Photos screen redesigned and approved** (`personal` view in
   `app/studio.tsx`): a summary strip of status counts near the title, tinted
   section washes distinguishing status, a new `badgeTone="action"`.
2. **Three follow-up defects found and fixed** (commit `0d14fc8`):
   - The Photos redesign's own grid painted an ugly empty box when a section
     had only 1-2 photos. Fixed with `:has()`-driven explicit column counts.
   - The before/after compare slider (`ComparePreview` in `app/studio.tsx`)
     compared two differently-cropped images, so the divider swept across two
     frames that didn't align. Fixed by pre-cropping the original through
     `cropSourceToAspect` in `app/image-enhancement.ts`.
   - A generated (not locally enhanced) portrait was wrongly using the same
     split-slider comparison, which is misleading for a generative image
     (different framing/pose/background, not a filtered version of the
     original). Replaced with a new `HoldToRevealPreview` component: press
     and hold to see the original, release to return. Pointer + touch +
     keyboard, `pointerleave`-safe, `aria-pressed`, plain-language label.
   - Bonus: fixed a dead-CSS bug forcing badges to full container width
     (badges should be `width: fit-content`), bumped `.photo-actions` buttons
     to 44×44px/8px-gap touch targets, confirmed no horizontal scroll at
     375px on touched screens.

Known-good gate as of `0d14fc8`: `npm run verify` → **174/174 tests pass, 0
lint errors, 24 warnings** (up from 22 — two new, both legitimate
`no-img-element` from the new hold-to-reveal component; `next/image` is not
wired up in this project, so raw `<img>` is the documented pattern).

## What was in progress when access broke

A third redesign pass had just started on the nine remaining **studio flow**
views (`app/studio.tsx`, switched on the `view` state:
`console`/`session`/`capture`/`batch`/`review`/`select`/`consent`/`success`,
plus `assets` which renders `app/brand-assets.tsx`). It got as far as manually
walking the flow to reach the `select` (enhancement workspace) screen and had
made **no edits** — the working tree is clean, nothing to salvage or revert.

## What is still fully unstarted

- All nine studio-flow views listed above.
- The **designer dashboard** (`app/designer/dashboard.tsx` +
  `app/designer/designer.css`) — five sections via `tab` state (`overview`,
  `queue`, `assets` i.e. "Photo library", `directory`, `history`), plus the
  `designer-access` gate screen and several modal sub-flows (bulk actions,
  reminder sending, email preview, a mock mailbox). ~98 distinct class
  strings. Note: an *earlier* session already bumped this dashboard's type
  from 7-9px to 10-14px for legibility (commit `f12c6f2`) — that part is
  done; the rest of the visual hierarchy work is not.
- The **Atlas profile page** (`app/atlas/profile.tsx` + `app/atlas/atlas.css`).

## The design language — apply it, do not reinvent it

Everything from here on inherits the decisions already made and approved on
the Photos screen. Look at it in the browser (`npm run dev`, navigate to the
Photos/personal library view) before starting anything else — it is the
reference.

- **Summary strip** of counts near the page title, wherever a screen has
  countable state.
- **Tinted section/status washes** reusing existing colour tints; the
  resolved/neutral state stays plain white, not tinted.
- **Badge tones** distinguish "you must act" from "waiting on us" —
  never colour alone. See the standing rules below.
- **Restrained weight.** The content (photo, form, camera feed) is the
  subject. Decoration that competes with it is a defect, not richness. Judge
  each screen by its own archetype (dashboard vs. form vs. focused-task vs.
  gallery) rather than flattening everything into one look.

## Standing requirements — apply to every remaining screen

These came directly from the user and are non-negotiable for all remaining
work:

1. **Use the UI/UX Pro Max skill's local database to check decisions**, not
   generate them. It's installed but not registered as a slash command —
   invoke by full path:
   ```bash
   python3 ~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.13.0/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
   ```
   Read that directory's `SKILL.md` for the query contract (one dominant
   intent, 2-5 terms, one constraint; domains include `ux`, `color`,
   `typography`, `icons`, `style`, `product`). If that path doesn't exist on
   whatever machine picks this up, skip it — it's a nice-to-have, not a
   blocker.
2. **Badges: colour, but never full width and never colour alone.** A badge
   sizes to its text (`width: fit-content`), never its container. Give it
   semantic tone within the existing palette (below) — and always pair with
   an icon or text, per the accessibility rule "don't convey information by
   color alone." A colourblind user must get the same information a sighted
   user does.
3. **Responsive.** No horizontal scroll on the body at any width. Touch
   targets ≥44×44px with ≥8px spacing (this runs on a tablet at a live demo).
   No fixed pixel container widths. Extend the existing
   `@media(max-width:900px)` / `@media(max-width:620px)` breakpoint pattern
   already used throughout the CSS rather than inventing a new system.
   Capture at least one narrow-viewport (375px) screenshot per screen
   changed.
4. **Plain language.** "Easy to understand by all people" — the user's
   words. These agents (users of the product) are not designers. Prefer
   plain wording over product jargon, make the next action obvious, put
   explanatory text where the decision is made rather than in a distant
   help panel. This is a judgement call per screen, not a mandate to rewrite
   every string.
5. **Palette is fixed. No new hue.** Live values, from `app/iq-theme.css`'s
   `:root` (this file loads after `app/globals.css` and wins — it's the
   actual brand palette, not `globals.css`'s):
   ```
   --ink #262626   --ivory #fff       --gold #ee6538   --blue #e7552a
   --green #35966f --line #e7e7e7     --muted #6f7378  --soft #f6f7f8
   --soft-orange #fff1eb              --shadow 0 18px 50px rgba(30,35,40,.09)
   ```
   Tints, shades, and opacity variations of these are fine and expected.
   Introducing a colour outside this family is not — check any new hex value
   against this list before using it.

## Hard constraints (apply everywhere, every screen)

- **Keep every function working.** This is a redesign, not a behaviour
  rewrite. Camera, QR scanning, code entry, upload, capture selection,
  enhancement controls, consent toggles, download, print, designer approve/
  reject/bulk actions, reminder sending — all of it must keep working
  exactly as before.
- **Accessibility must not regress.** Existing `aria-label`, `aria-pressed`,
  `role`, `title` attributes stay.
- **`.consents label`'s toggle switch is built from `input:checked + i`** —
  an adjacent-sibling CSS selector. The `<i>` element must stay the
  checkbox's immediate next sibling in the DOM, or the switch will freeze
  looking unchecked while the underlying checkbox still toggles correctly
  (a silent, hard-to-spot bug). If you touch this markup, verify both
  checked/unchecked states by hand in a browser, not just by reading the
  code.
- **Atlas-profile consent and brand-use consent are two separate,
  independent permissions.** Do not merge or couple them. A portrait reaches
  the Brand Assets gallery only if brand consent specifically was granted.
- **New CSS goes in `app/ui/components.css` (the `components` layer) or a
  file imported through `app/entry.css` (or the per-route entry files) with
  `layer(legacy)`.** Never add unlayered CSS to any file — an unlayered rule
  beats every layer regardless of specificity, and would silently break the
  cascade the earlier refactor built. If you add a new stylesheet, wire it
  through one of the three `entry.css` files with an explicit `layer(...)`
  annotation.
- **Do not rename existing CSS class names.** Fourteen legacy stylesheets
  target them by name; a rename silently breaks styling with no error.
- **Match the file's existing style.** `app/studio.tsx` and
  `app/designer/dashboard.tsx` are written dense: single-space indent, no
  spaces around `:` in type literals, multiple `const` per line. Don't
  reformat surrounding code. Comments explain **why**, not what.
- **No new npm dependencies.** The lockfile must keep reproducing the build
  via `npm ci`.
- **Do not touch the seven frozen assets** hashed in
  `scripts/demo-preflight.mjs` (bundled portraits, MediaPipe models, WASM).

## Gates — run these before considering any screen done

```bash
npm run verify   # preflight + build + tests + lint — the actual bar
```

Expected baseline right now: **174/174 tests pass, 0 lint errors, 24
warnings** (or more, if you add more legitimate `<img>` elements — that's
fine; 0 *errors* is the hard bar, not the warning count).

`tests/studio-markup.test.mjs` locks exact CSS-class occurrence counts in the
server-rendered HTML (only the `personal`/Photos view renders server-side
today). If your markup changes shift those counts, update the locked numbers
in that test **deliberately** and explain why in your commit message — do not
weaken the test's matching method (it uses exact string+count matching for a
reason: partial/substring matches previously caused false passes on classes
like `photos-section` vs `photos-section-head`).

There is a screenshot-diff harness documented in `scripts/shoot-views.md`
that was used throughout the earlier structural refactor to prove pixel-exact
equivalence. For *this* redesign phase, screenshots are **evidence for the
user to review, not a pass/fail gate** — the whole point is that pixels
change. Capture before/after pairs (and a narrow-viewport capture) for every
screen you touch and keep them somewhere the user can find, but don't block
on achieving zero diff.

**What the screenshot gate cannot see:** hover states, focus states, held
states (the new hold-to-reveal component), toggle states, keyboard
navigation, and anything behind an interaction. For those, drive an actual
browser (Playwright, or manually) and verify by observation, not by reading
the CSS and assuming it's correct.

## Commit discipline

Commit per screen or small logical group, so a regression can be bisected to
one change. Don't leave work uncommitted at a stopping point — the next
person (human or agent) picking this up needs `git log` / `git status` to be
the source of truth, not a chat transcript.

Conventional commit style, lowercase subject, body explaining the *why*:

```
feat: redesign the capture screen for camera framing clarity

<body explaining the specific problem this solves and the approach taken>
```

## What NOT to do

- Do not merge `feat/design-system` into `main`. That is the user's decision
  to make when they're ready, not an autonomous action.
- Do not force-push, rebase, or rewrite history on `feat/design-system` if
  anyone else might be working from it.
- Do not "finish" by declaring success without running `npm run verify` and
  actually reading its output.
- Do not silently drop a standing requirement (badge colour, responsiveness,
  plain language, palette lock) because a screen "didn't need it" — if you
  judge a requirement doesn't apply to a specific screen, say so explicitly
  in your commit message or a note, don't just skip it quietly.

## Suggested order

1. Studio flow, in user-journey order: `console` → `session` → `capture` →
   `batch` → `review` → `select` → `consent` → `success` → `assets`. Each
   inherits the Photos language; judge each against its own archetype.
2. Designer dashboard — larger surface (five sections + access gate + modal
   flows), matches the `office-web-ui-system` skill's target (internal/
   back-office, table-heavy, restrained weight) if that skill is available to
   whatever agent picks this up.
3. Atlas profile page — last, smallest surface.

Work through them one at a time, verify (`npm run verify` + manual browser
check), commit, move to the next. Do not parallelize multiple agents editing
`app/studio.tsx` simultaneously — it's one file and conflicts will corrupt
each other's work.
