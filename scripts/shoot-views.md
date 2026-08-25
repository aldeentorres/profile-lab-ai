# Screenshot harness for the studio views

Purpose: prove that a refactor which is supposed to move JSX around without changing a rendered
pixel really did not change one. `tests/studio-markup.test.mjs` locks the classes the server
renders, but SSR only ever renders the default view — every other view is client state and only a
screenshot can see it.

**Status: the determinism gate passes.** Three full runs against unmodified `main` — two in one
browser process, a third after restarting the browser — produced `0` differing pixels on every
frame at full precision. No fuzz threshold is used anywhere, and nothing about the app's own
rendering is suppressed. Numbers in [Determinism gate](#determinism-gate-the-numbers).

**Baselines are machine-specific and cannot be shared.** The app uses locally installed fonts
(`"Atkinson Hyperlegible"`, `"Avenir Next"`, Arial, Georgia) with no `@font-face` and no remote
font, and the screenshots are 2880×1800 device pixels at this machine's device pixel ratio of 2.
Whoever runs this gate has to capture their own baseline first, on the machine they are testing on.
That is a real constraint on who can run it: it is a local pre-merge check, not something to wire
into CI as-is.

Playwright is deliberately **not** a project dependency. The harness runs through the Playwright
MCP browser channel, so nothing is added to `package.json` and `npm ci` keeps reproducing the demo
exactly. ImageMagick (`magick`) is a system tool, used only to compare the PNGs.

## Scope: ten views, not eleven

The `View` union in `app/studio.tsx:19` lists eleven names. `profile` was never built — no
`setView("profile")`, not in `navigableViews`, no render branch. The other ten are all reached and
all compared:

`session` · `capture` · `batch` · `review` · `select` · `consent` · `success` · `personal` ·
`assets` · `console`

That is **15 frames**: one per view, named `<view>.png`, plus a second below-the-fold frame named
`<view>-scrolled.png` for the five views whose scroll container overflows (`console`, `session`,
`review`, `select`, `consent`). The scrolled frame exists because the app scrolls `#app-content`
rather than the document, so roughly half of `console` is below the fold and no full-page capture
was ever reaching it — see [`fromSurface: false`](#fromsurface-false-is-the-load-bearing-setting).

## Running it

Nothing here is installed. The three scripts are printed in full under
[The scripts](#the-scripts) — copy them out into a working directory of your own before you start.
A single capture run takes roughly two and a half minutes; a full baseline-plus-two-comparisons
protocol takes about eight.

**1. Serve the build you intend to photograph.**

```bash
git checkout main                # or the branch under test
npm run build
npm run start                    # http://localhost:3000, in the background
```

The server loads `dist/` at boot, so **if you rebuild while it is running you must restart it** —
otherwise you are photographing the previous build and every number below is meaningless. If a
server is already up from an earlier session, restart it rather than trusting it. Check with
`lsof -nP -iTCP:3000 -sTCP:LISTEN`, not `lsof -ti tcp:3000` — the latter also matches client
sockets, including the browser's own, and will report a dead server as alive.

Then **warm it before capturing**:

```bash
for i in 1 2 3; do curl -s -o /dev/null "http://localhost:3000/?view=console"; done
```

A cold server compiles on its first request, and the renderer competing with that compile is enough
to leave a frame's repaint unfinished. See [Reading the result](#reading-the-result) — this is the
one failure mode that fakes a catastrophic regression.

**2. Start the screenshot sidecar** (source in [section 2](#2-screenshot-writer-sidecar) — it is
not in the repo, and it is needed because the harness cannot write files itself):

```bash
node shot-writer.mjs &           # listens on 127.0.0.1:4321
```

**3. Capture.** Generate the recipe with the output directory baked in and run it through the MCP
`browser_run_code_unsafe` tool — see [section 3](#3-recipe-script) for exactly how `OUT` and `INIT`
get bound, because the tool passes no parameters. One run per output directory:

```bash
./gen.sh /path/to/scratchpad/accepted-baseline   # then invoke browser_run_code_unsafe
./gen.sh /path/to/scratchpad/run2                # again, and so on
```

**4. Compare**, at full precision, no fuzz:

```bash
BASE=/path/to/scratchpad/accepted-baseline
RUN=/path/to/scratchpad/run2
for v in profile session capture batch review select consent success personal assets console; do
  for f in "$v" "$v-scrolled"; do
    [ -f "$BASE/$f.png" ] || continue
    printf '%-18s: ' "$f"
    magick compare -metric AE "$BASE/$f.png" "$RUN/$f.png" null: 2>&1
    echo
  done
done
```

`profile` never produces a file — it is not a view. Everything else should print `0`.

Screenshots live outside the repository, **never** in it: they are 2880×1800 PNGs, about 9 MB a set,
and machine-specific.

### Reading the result

`magick compare -metric AE` prints the number of differing pixels, so `0 (0)` is the only passing
value. There is no tolerance and none should be added — see
[the note on fuzz](#determinism-gate-the-numbers).

A non-zero count means one of three things, in the order worth checking:

1. **You changed something visible.** Expected, if you meant to. Look at the diff
   (`magick compare -metric AE a.png b.png diff.png`) and confirm it is only where you worked.
2. **The harness is not fully applied.** By far the most common cause, and it does not look like
   one — it looks like the app misbehaving. Check the settings under
   [Fixed capture settings](#fixed-capture-settings--all-of-these-matter) first, especially the
   capture path, and read
   [If a browser API behaves impossibly](#if-a-browser-api-behaves-impossibly-suspect-your-own-stub-first).
3. **The baseline is stale** — captured from a different build, a different machine, or a different
   edition of the harness. Re-capture it and re-run.

**Always re-run a non-zero frame once before you believe it.** The capture is not hermetic against
a busy machine, and this has been observed: seconds after a server restart, `console-scrolled` came
back **3016720 (0.58193)** — 58% of the frame — against a baseline that was, and still is, correct.
`console` in the same run showed 7. Re-running the identical view twice more gave `0` both times.

The mechanism is the `-scrolled` frames: they set `scrollTop` and then wait a fixed 1500 ms plus two
animation frames for the repaint. That is generous on an idle machine and not always enough on a
loaded one, and a half-finished scroll repaint differs from the baseline across most of the image —
which looks like the worst regression you have ever caused and is nothing at all. The `1/255`
signature does **not** apply here: this failure produces large, high-contrast differences.

Two signals separate it from a real regression: it lands on a `-scrolled` frame while that view's
top frame is clean or nearly so, and **it does not reproduce**. A real change reproduces every time.

Do not try to fix this with a settle-until-identical capture loop. It was tried: capturing twice and
comparing hashes until two agree doubles the number of `Page.captureScreenshot` calls, `cdp.send`
has no timeout, and in this environment the run wedged for thirty minutes with no output. Warm the
server, keep the machine quiet during a capture, and re-run the odd frame.

A separate signature worth recognising: if nearly every differing pixel is off by exactly `1/255`
and they cluster in large low-contrast gradients, that is renderer noise, not the app. Do not reach
for a fuzz threshold; find which of the fourteen items in the table below has come loose.

### Fixed capture settings — all of these matter

| Setting | Value | Why |
| --- | --- | --- |
| viewport | 1440 × 900 | layout is `clamp()`-heavy; another width is a different design |
| `emulateMedia` | `reducedMotion: 'reduce'`, `colorScheme: 'light'` | the app's own `@media(prefers-reduced-motion:reduce){*{animation:none!important}}` kills `.enter` (`animation:enter .35s ease both`) through a path the app already ships, rather than an injected override |
| capture | CDP `Page.captureScreenshot` with **`fromSurface: false`**, `captureBeyondViewport: false` | see below — this one is the difference between a gate that works and one that does not |
| permissions | `camera` granted for `http://localhost:3000` | otherwise `getUserMedia` rejects and every camera view becomes an error panel |

### `fromSurface: false` is the load-bearing setting

Change nothing else here before you understand this one. Playwright's `page.screenshot()` — and
CDP's default `fromSurface: true` — reads the browser's *composited surface*. That path lands on
one of two GPU raster states depending on tile history, and which one you get is a coin flip per
page load: **47209 differing pixels on `console` between two runs of identical code**, 99.9% of
them at one part in 255, concentrated in large low-contrast gradients.

`fromSurface: false` reads the renderer's own compositor instead. Six fresh loads of the same view,
hashing the returned PNG:

```
i0 fromSurface=false 4db03a5f8a0bd24d:195372   fromSurface=true 6cc7d3c6e0c5ed32:217984
i1 fromSurface=false 4db03a5f8a0bd24d:195372   fromSurface=true 2debb4d9e3b236d3:218000
i2 fromSurface=false 4db03a5f8a0bd24d:195372   fromSurface=true 2debb4d9e3b236d3:218000
i3 fromSurface=false 4db03a5f8a0bd24d:195372   fromSurface=true 2debb4d9e3b236d3:218000
i4 fromSurface=false 4db03a5f8a0bd24d:195372   fromSurface=true 2debb4d9e3b236d3:218000
i5 fromSurface=false 4db03a5f8a0bd24d:195372   fromSurface=true 2debb4d9e3b236d3:218000
```

Byte-identical six times over, including on the load where the surface path flipped. This is what
lets the whole gate run at full precision with nothing suppressed. It cost a detour: `page.screenshot()`
has no `fromSurface` option, so the harness calls `Page.captureScreenshot` over CDP and POSTs the
base64 to a small sidecar, because the MCP code sandbox has no `fs`, no `Buffer` and no dynamic
`import`. That detour is the price of the only setting that makes the numbers mean anything.

`fullPage: true` is worse still, because it re-rasterises into an off-screen surface
(`captureBeyondViewport`) — eight reloads of `console` gave `0 0 47209 47209 0 47209 47209` against
the first. And it buys nothing here: `document.scrollHeight === innerHeight` on every view, since
the app scrolls `#app-content` (or the view's own `<main>`), not the document, so `fullPage` was
capturing the same 1440×900 region all along, just through a flakier path. Below-the-fold content
is captured by a second frame instead, named `<view>-scrolled.png`.

## The routes

`navigableViews` in `app/studio.tsx:31` is exactly `{personal, assets, console}`; everything else
is client state with no URL.

| View | Click path | Landing selector |
| --- | --- | --- |
| `profile` | **none — the view does not exist.** `"profile"` appears in the `View` union at `app/studio.tsx:19` and nowhere else: no `setView("profile")`, not in `navigableViews`, no render branch. If `view` were ever `"profile"` the render falls through to the app shell with an empty `#app-content`. It is a dead union member, left in place deliberately — dead-code removal is out of scope for the design-system work and the repo is frozen for the demo. Do not go looking for a view that was never built. | — |
| `session` | seed `localStorage["photostudio-session:HARNESS-DEMO"]` with a `SessionAgent` JSON → `GET /?session=HARNESS-DEMO`. `loadStudioSession` reads localStorage before falling back to `/api/studio-sessions`, so this needs no server state and stays offline. | `main.session-profile-check` |
| `capture` | `/?view=console` → **Take a photo** (`openGuidedCamera`), with the fake camera in `blank` mode. | `main.studio-camera` |
| `batch` | `/?view=console` → **Take a photo** with the fake camera in `face` mode, then let the auto-capture sequence finish. This is the only route: `shots` is written by `shootSequence()` alone, armed by the 700 ms auto-ready effect only while `placement === "ready"`. | `main.batch-review` |
| `review` | `/?view=personal` → `page.setInputFiles('input[type=file]', reference-1.png)`. The input is `.sr-only`; Playwright sets files on it directly, so no `DataTransfer` construction is needed. | `main.uploaded-photo-check` |
| `select` | from `review` → **Continue** (the sample scores 89 / APPROVED, so the CTA is Continue rather than the designer-review pair). Allow ~7 s for the local finishing pipeline. | `main.enhance-editor` |
| `consent` | from `select` → **Local finishing** (toggles off) → **Use original**. The documented rehearsal path; turning local finishing off changes the CTA from *Use professional version* to *Use original* and carries the untouched upload through. | `section.final-review` |
| `success` | from `consent` → **Save approved photo**. | `section.success` |
| `personal` | from `success` → **View in Photos** (also `/?view=personal`). Captured after the flow so the gallery holds one approved photo — the only way `personal-grid`, `photo-card`, `photo-card-info` and the card-level `photo-actions` render at all. | `section.photos-page` |
| `assets` | from `personal` → nav **Assets** (also `/?view=assets`). With a `brandOK` approved photo present this is `.asset-studio`; with an empty gallery it is `.asset-empty`, so the flow has to run first. | `.asset-studio` |
| `console` | `/?view=console`. Renders **two** sections stacked, `.qr-home` and `.console`, both gated on `view==="console"`. | `section.console` |

## Every source of nondeterminism, and what neutralises it

Found empirically, one break at a time. Items 1–7 and 13 live in an init script registered with
`context.addInitScript`, so they run **before any app JS** — a `Date` stub applied after the page
has already formatted a timestamp is worthless. Items 8–12 live in the recipe's `settle()`. Item 14
is not fully neutralisable and is the reason baselines cannot be shared between machines.

| # | Source | Neutralisation | Evidence it mattered |
| --- | --- | --- | --- |
| 1 | **Wall clock.** `personal` renders `new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(item.createdAt))`, and a `dateStyle+timeStyle` variant on pending cards. | `Date` frozen to `2026-08-25T09:00:00Z`. | The MediaPipe WASM logger prints `I0825 09:00:00.000000`, which is how you can tell the stub landed before app JS. |
| 2 | **Generated ids.** `crypto.randomUUID()` supplies photo ids and review-request ids; the request id is rendered in the `Designer approval requested · <id>` toast and in workflow status lines. | Monotonic counter `00000000-0000-4000-8000-<n>`. | |
| 3 | **`Math.random`.** No rendered use found; removed on principle. | Seeded mulberry32. | |
| 4 | **The machine's own webcam.** The Studio view prints the discovered device count and labels into a `<select>`. | `enumerateDevices` stubbed to one fixed fake device. | Without it the view reads `FaceTime HD Camera (3A71:F4B5)` — the pixels then depend on what is plugged into the machine. |
| 5 | **The live camera.** | `getUserMedia` returns a canvas `captureStream` painting one fixed still frame, so whatever the app *captures* from it is byte-identical. `blank` mode is flat grey (no face, so `placement` stays off `ready` and the auto-capture never arms); `face` mode draws the frozen reference portrait at `harness-face-scale` 1.35 / `harness-face-y` −0.06, which reaches `ready` and drives the batch sequence. | The detector's verdict tracks the stream content correctly: flat grey → `center`, portrait at 1.35× → `ready` → batch, portrait at 0.55× → `checking`. |
| 6 | **CSS transitions.** `prefers-reduced-motion` covers `animation` through the app's own `globals.css` media query, but not `transition` (`.consents label>i:after{transition:.2s}`). | Injected `*,*::before,*::after{transition:none!important}`. | |
| 7 | **`<video>` pixels.** | Masked opaque: `video{background:#000!important;filter:brightness(0)!important}` — `brightness(0)` flattens any frame that arrived, the background paints the box when none did, layout untouched. Verified the mask does **not** affect what MediaPipe reads: with it removed, `placement` was unchanged for every stream tested. | |
| 8 | **`<video>` as a live compositing layer.** Masking the pixels is not enough — the element still takes a new frame 10×/s, and the rounded clip over it resolved differently depending on which frame the capture landed between. | `settle()` calls `v.pause()` on every `<video>`; the element holds its last frame and the app never reads `.paused`. | 6 pixels of drift on the camera panel's bottom corners, in 1 of 4 observed run pairs. |
| 9 | **Pointer position → `:hover`.** Playwright leaves the virtual mouse wherever the last click put it, so whatever sat under it rendered hovered. | `settle()` parks the pointer at (1439, 899), which is inert on every view. | The two `.devices article` borders rendered `#5C615E` on one run and `#313A34` on the next — 8168 pixels on `console-scrolled`. |
| 10 | **Async image decode.** Chromium paints a fast, low-quality scale first and upgrades it asynchronously; a screenshot between the two catches the cheap one. | `settle()` awaits `img.decode()` on every image, then one more frame. | ~110000 pixels of the session portrait moving by one part in 255. |
| 11 | **Toasts.** `setToast` self-clears after 2600 ms. | Every shot waits for `.toast` to detach first. | |
| 12 | **Scroll position.** `go()` scrolls `#app-content` and `window` with `behavior:"smooth"`. | Both reset to 0 and settled before the shot; the scrolled frame then sets `scrollTop = scrollHeight` explicitly. | |
| 13 | **Overlay scrollbars.** They fade in on scroll and are still repainting when the scrolled frame is taken. | `::-webkit-scrollbar{width:0!important;height:0!important}`. They are overlay on this platform, so hiding them moves no layout. | 3145 pixels down the right edge of `console-scrolled`. |
| 14 | **Fonts.** No `@font-face`, no remote font; the app asks for `"Atkinson Hyperlegible","Avenir Next",Arial,sans-serif` and Georgia. | `document.fonts.ready` awaited. Not fully neutralisable — rendering depends on which faces are installed locally, so **baselines are only comparable on the same machine**. | |

### If a browser API behaves impossibly, suspect your own stub first

This one nearly cost the `batch` view its coverage. For several runs the face detector appeared to
report `ready` for a flat grey frame containing no face — an impossible result, and the conclusion
drawn from it was that the detector could not be trusted and `batch` should ship uncovered. The
detector was fine. An edit to the init script had silently dropped the
`navigator.mediaDevices.getUserMedia` override, so the harness had been running against the
machine's actual webcam, pointed at a real scene.

Two things let it pass unnoticed, both fixed here:

- The init script used to open with `if (globalThis.__harnessInit) return`. `addInitScript`
  **accumulates per browser context**, and every registration runs on every navigation — so the
  *oldest* one won and every later edition short-circuited itself out of existence. There is no
  guard now; the last registration wins.
- Nothing asserted the stub was in effect. The tell was in plain sight the whole time: the Studio
  view's device `<select>` read `FaceTime HD Camera (3A71:F4B5)` instead of `Harness Camera`. The
  run log now surfaces that label, and it is the first thing to check when a camera view misbehaves.

With the override restored the detector tracks stream content exactly as it should — flat grey →
`center`, the reference portrait at 1.35× → `ready` → `batch`, the same portrait at 0.55× →
`checking` — so `batch` is reachable, deterministic, and covered.

### Nothing about the app's rendering is suppressed

An earlier edition of this harness injected a screenshot-mode stylesheet that flattened
`.enhance-editor`'s two decorative `radial-gradient`s (`circle at 8% 0%`, `circle at 96% 88%` in
`app/studio-enhance.css`) to a flat `#0f1412`, because the dither looked like it came from them —
24228 pixels on `select`. It did not; it came from the capture path. Once `fromSurface: false` was
in place, the flattening was put through the **full three-run protocol with it disabled** — two
runs sharing a browser process, a third after relaunching the browser — and every one of the 15
frames came back `0`. So it was removed.

Two measurements were needed to justify that, not one, and the second is the one that is easy to
skip:

```
three runs, flattening disabled, main vs main    all 15 frames: 0
flattened select.png vs unflattened select.png   345720 (0.0666898)
```

The first says the gate does not *need* the flattening. The second says the flattening was
**suppressing something real**: 345720 pixels, 6.7% of the frame, change when it comes out. Without
that second number a reader cannot tell this case apart from the boring one — a CSS rule that was
dead all along, where removing a suppression restores nothing and the gate gains no coverage. It
was not dead. Those 345720 pixels are two colour-carrying declarations the gate can now see, and a
colour that moved is exactly the regression the design-system work exists to catch.

To reproduce: set the injected `flatten` string back to
`".enhance-editor{background:#0f1412!important}"`, capture the `select` frame, and diff it against
the current `accepted-baseline/select.png`.

The lesson generalises: if a view drifts, look for the harness's own contribution before reaching
for a stylesheet that suppresses part of the app. Every entry in the table above is a property of
the browser or the driver, not of the design.

## Determinism gate: the numbers

Three runs of the harness against unmodified `main`, same server. Run 2 shares a browser process
with the baseline; run 3 was taken after closing and relaunching the browser. `magick compare
-metric AE`, no fuzz.

```
view                     run2       run3
profile               NOT COV    NOT COV
session                     0          0
session-scrolled            0          0
capture                     0          0
batch                       0          0
review                      0          0
review-scrolled             0          0
select                      0          0
select-scrolled             0          0
consent                     0          0
consent-scrolled            0          0
success                     0          0
personal                    0          0
assets                      0          0
console                     0          0
console-scrolled            0          0
```

**No fuzz threshold is used.** For the record, `-fuzz 0.4%` would have collapsed the old `select`
count from 24228 to 19 — that is the sort of green gate that stops noticing a `#e7552a → #e7552b`
palette drift, which is exactly what the design-system work locks. The fix was to make the
renderer deterministic, not the comparison lenient.

## Known gaps

Things the gate does **not** see. None of them is a licence to skip the gate; they are the places
where the SSR class lock in `tests/studio-markup.test.mjs` and manual rehearsal have to carry the
weight instead.

1. **`capture` is captured in one placement state only.** The guide overlay is photographed with
   the blank stream, so `placement-center` is what the baseline holds. The `ready`, `close` and
   `far` variants are not covered: reaching `ready` starts a 5-second countdown 700 ms later, and
   no screenshot can catch a countdown at the same digit twice.
2. **Overlay scrollbars** are hidden, so scrollbar styling is not compared.
3. **`<video>` content** is masked black and paused, so nothing about the live preview itself is
   compared — only the chrome around it.
4. **`profile`** does not exist and is not covered.
5. **Cross-machine comparison is meaningless.** The app relies on locally installed fonts, and the
   screenshots are 2880×1800 device pixels at this machine's DPR of 2. Re-baseline on the machine
   you are testing on; a baseline captured elsewhere will differ on text everywhere.

## The shared scripts are a hazard if more than one run is live at once

`gen.sh`/`init.js`/`shoot.template.mjs`/`shoot.mjs` in `.playwright-mcp/` are shared files on
disk, and the Playwright MCP browser they drive is a single shared `page`. Task 3 hit this
directly: mid-run, `shoot.mjs`'s contents changed underneath it — another process had regenerated
it with a different `OUT` directory and an `ONLY` filter that were never asked for — and a
following capture attempt's `capture` view silently rendered the console DOM instead of the camera
view. **`magick compare -metric AE` did not catch it**: the corrupted frame was a real, fully-
rendered screenshot (just of the wrong view), not noise, so nothing about it looked like a failed
capture until it was compared to the wrong baseline frame.

What did catch it: hashing every captured PNG with `shasum -a 256` and comparing against the
baseline's hashes for the *same* view name. The corrupted run's `capture.png` was byte-identical to
the baseline's `console.png` — proof the wrong content had landed in the wrong file, something an
AE diff against `capture.png` alone would never surface (it would just report "very different,"
indistinguishable from an ordinary regression).

Two takeaways for whoever runs this harness next:

- **Don't run against the shared `.playwright-mcp/shoot.mjs` if anything else might be touching
  it.** Copy `init.js` and `shoot.template.mjs` to privately-named files (e.g.
  `.playwright-mcp/<task>-shoot.template.mjs`) before generating, and generate into a
  distinctly-named `.playwright-mcp/<task>-shoot.mjs`. The MCP code-execution tool restricts
  script files to `.playwright-mcp/` or the repo root, so the private copy still has to live under
  `.playwright-mcp/` — just not under the shared filename.
- **Hash every frame, not just the metric.** Run `shasum -a 256` over the new run's directory and
  the baseline directory and compare line-for-line, alongside (not instead of) `magick compare`.
  A clean `AE=0` on every frame plus matching SHA-256 on every frame is the only combination that
  rules out both a rendering regression and a corrupted capture.

## The scripts

Three files, none of them in the repository and none of them installed. On the machine this was
built on they sit in `.playwright-mcp/` (git-excluded through `.git/info/exclude`), but that
directory is scratch and may not exist for you — copy them out of this document into any working
directory. `gen.sh` from [section 3](#3-recipe-script) expects `init.js` and `shoot.template.mjs`
beside it.

They are reproduced here in full precisely so the document stands alone: the images are
uncommitted, the scratch directories are transient, and this file is the only committed artifact
of the whole harness.

### 1. Init script — registered with `context.addInitScript`

```javascript
(() => {
  // No early-return guard. addInitScript accumulates per browser context, so if an older
  // registration short-circuits the newer ones the harness silently runs a stale stub -- which is
  // exactly how an edition of this file that had lost its getUserMedia override kept passing the
  // real webcam through for several runs. Every registration runs; the last one wins.

  // Frozen clock -- date-formatted captions must not drift with the wall clock.
  const FIXED = new Date("2026-08-25T09:00:00Z").valueOf();
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) { return args.length ? new RealDate(...args) : new RealDate(FIXED); }
    static now() { return FIXED; }
  };
  // Deterministic ids -- review-request ids are rendered in toasts and status lines.
  let n = 0;
  const uuid = () => { n += 1; return "00000000-0000-4000-8000-" + String(n).padStart(12, "0"); };
  try { Object.defineProperty(crypto, "randomUUID", { value: uuid, configurable: true }); } catch { }
  // Seeded Math.random (mulberry32).
  let s = 0x9e3779b9;
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // Fixed device list -- the Studio view prints the machine's real camera labels otherwise.
  const fakeDevices = [{ deviceId: "harness-cam", kind: "videoinput", label: "Harness Camera", groupId: "harness" }];
  // Fake camera: one fixed still frame, so anything captured from it is byte-identical.
  // localStorage "harness-cam": "blank" (flat grey, no face -> placement never reaches "ready")
  // or "face" (the frozen reference portrait at "harness-face-scale" / "harness-face-y").
  const makeStream = () => {
    const mode = (() => { try { return localStorage.getItem("harness-cam") || "blank"; } catch { return "blank"; } })();
    const num = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : v; } catch { return d; } };
    const scale = num("harness-face-scale", 1.0), offy = num("harness-face-y", 0);
    const c = document.createElement("canvas"); c.width = 1280; c.height = 720;
    const cx = c.getContext("2d");
    const draw = () => {
      cx.fillStyle = "#8d8f94"; cx.fillRect(0, 0, 1280, 720);
      const img = globalThis.__harnessFace;
      if (mode === "face" && img && img.complete && img.naturalHeight) {
        const h = 720 * scale, w = h * (img.naturalWidth / img.naturalHeight);
        cx.drawImage(img, (1280 - w) / 2, 720 * offy, w, h);
      }
    };
    draw();
    const stream = c.captureStream(10);
    clearInterval(globalThis.__harnessPaint);
    globalThis.__harnessPaint = setInterval(draw, 100);
    return stream;
  };
  if (navigator.mediaDevices) {
    navigator.mediaDevices.enumerateDevices = async () => fakeDevices;
    navigator.mediaDevices.getUserMedia = async () => makeStream();
  }
  addEventListener("DOMContentLoaded", () => {
    const img = new Image(); img.src = "/portrait-references/reference-1.png"; globalThis.__harnessFace = img;
    document.getElementById("harness-style")?.remove();
    const style = document.createElement("style");
    style.id = "harness-style";
    // transition: prefers-reduced-motion (emulated by the harness) covers @keyframes through the
    //   app's own media query, but not transitions.
    // noscrollbar: overlay scrollbars fade in on scroll and repaint under the scrolled frame.
    // video: masked opaque black rather than frozen -- layout untouched.
    // Nothing here suppresses an app colour. See "Nothing about the app's rendering is suppressed".
    const noscrollbar = "::-webkit-scrollbar{width:0!important;height:0!important}";
    style.textContent = "*,*::before,*::after{transition:none!important}" + noscrollbar
      + "video{background:#000!important;filter:brightness(0)!important}";
    document.head.appendChild(style);
  });
})();
```

### 2. Screenshot writer sidecar

`page.screenshot()` cannot ask for `fromSurface: false`, and the MCP code sandbox has no `fs`, no
`Buffer` and no dynamic `import`. So the CDP screenshot's base64 is POSTed to a plain node process
that writes it. Nothing in the repository depends on this.

```javascript
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const path = decodeURIComponent(req.url.slice(1));
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, Buffer.from(body, 'base64'));
      res.writeHead(200, { 'access-control-allow-origin': '*' }).end('ok');
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
}).listen(4321, '127.0.0.1', () => console.log('shot-writer on 4321'));
```

### 3. Recipe script

**How it is invoked.** `browser_run_code_unsafe` takes a file containing *a single JavaScript
function expression* and calls it with one argument, `page` — a Playwright `Page`. That is the
whole calling convention: `(<the function in the file>)(page)`. There is no module system, no
`require`, no dynamic `import`, and no way to pass parameters in. So `OUT` and `INIT` are not
arguments; they must already be **literals inside the file** when the tool runs it. The file
executed for a run therefore starts like this:

```javascript
async (page) => {
  const OUT = "/abs/path/to/scratchpad/accepted-baseline";
  const INIT = "(() => {\n  const FIXED = new Date(\"2026-08-25T09:00:00Z\")\u2026";  // section 1, JSON-quoted
  // ... the rest of the script below ...
}
```

Hand-editing those two lines before every run is how mistakes get in, so generate the file. Keep
the recipe as `shoot.template.mjs` with `const OUT = "__OUT__", INIT = "__INIT__";` as its first
statement, and run this once per capture, changing only the output directory:

```bash
#!/bin/bash
# gen.sh <output-dir>   ->   writes shoot.mjs with OUT and INIT baked in
python3 -c '
import sys, json
out = sys.argv[1]
tpl  = open("shoot.template.mjs").read()
init = open("init.js").read()
open("shoot.mjs", "w").write(
    tpl.replace(chr(34) + "__OUT__" + chr(34), json.dumps(out))
       .replace(chr(34) + "__INIT__" + chr(34), json.dumps(init)))
' "$1"
```

Then point `browser_run_code_unsafe` at the generated `shoot.mjs`. Beyond convenience this buys two
things that matter: `json.dumps` escapes the init script correctly — it is full of quotes,
newlines and backslashes, and a hand-escaped copy will silently differ — and every run provably
drives the *same* recipe with only the destination changed, which is the entire premise of the
diff.

One caveat that has bitten this harness before: `context.addInitScript` **accumulates per browser
context**. Re-running the tool in the same browser registers the init script again rather than
replacing it, and every registration runs on every navigation. That is safe here only because the
init script carries no early-return guard, so the newest registration wins. See "If a browser API
behaves impossibly, suspect your own stub first" above for what happened when it did carry one.

```javascript
async (page) => {
  const SAMPLE = '<repo>/public/portrait-references/reference-1.png';
  const CODE = 'HARNESS-DEMO';
  const AGENT = { agentName: 'Aisha Rahman', agentId: 'IQI-000-DEMO', agentMobile: '+60 12-000 0000', agentRenTag: 'REN 00000', agentOfficePhone: '+60 3-0000 0000', date: '2026-08-26', time: '10:00' };
  const ctx = page.context();
  await ctx.grantPermissions(['camera'], { origin: 'http://localhost:3000' });
  await ctx.addInitScript(INIT);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const cdp = await ctx.newCDPSession(page);

  // A clean origin, then seed only what this recipe needs, then the real navigation.
  const fresh = async (url, seed) => {
    await page.goto('http://localhost:3000/?view=console', { waitUntil: 'domcontentloaded' });
    await page.evaluate((s) => { try { localStorage.clear(); sessionStorage.clear(); for (const k in (s || {})) localStorage.setItem(k, s[k]); } catch { } }, seed || {});
    await page.goto(url, { waitUntil: 'networkidle' });
  };
  const settle = async () => {
    await page.mouse.move(1439, 899);                                   // no stray :hover
    await page.evaluate(() => document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch { } }));
    await page.waitForSelector('.toast', { state: 'detached', timeout: 8000 }).catch(() => { });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.scrollTo(0, 0); const el = document.getElementById('app-content') || document.querySelector('main'); if (el) el.scrollTop = 0; });
    await page.waitForTimeout(400);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => { }))));
    await page.waitForTimeout(600);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  };
  const capture = async (file) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: false, captureBeyondViewport: false });
    await page.request.post('http://127.0.0.1:4321/' + encodeURIComponent(file), { data: r.data, headers: { 'content-type': 'text/plain' } });
  };
  const shoot = async (name) => {
    await settle();
    await capture(OUT + '/' + name + '.png');
    const tall = await page.evaluate(() => {
      const el = document.getElementById('app-content') || document.querySelector('main');
      if (!el || el.scrollHeight <= el.clientHeight + 4) return 0;
      el.scrollTop = el.scrollHeight;
      return el.scrollHeight;
    });
    if (tall) {
      await page.waitForTimeout(1500);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await capture(OUT + '/' + name + '-scrolled.png');
    }
  };
  const click = (re) => page.getByRole('button', { name: re }).first().click();

  await fresh('http://localhost:3000/?view=console');
  await shoot('console');

  await fresh('http://localhost:3000/?session=' + CODE, { ['photostudio-session:' + CODE]: JSON.stringify(AGENT) });
  await page.waitForSelector('main.session-profile-check', { timeout: 20000 });
  await shoot('session');

  // capture: blank stream, no face, so the detector never reaches "ready" and the 700ms
  // auto-capture never arms. The guide overlay holds still indefinitely.
  await fresh('http://localhost:3000/?view=console', { 'harness-cam': 'blank' });
  await click(/Take a photo/);
  await page.waitForSelector('main.studio-camera', { timeout: 20000 });
  await page.waitForTimeout(6000);
  await shoot('capture');

  // batch: face stream sized so the detector reaches "ready"; the auto-capture sequence then
  // runs to completion (shotCount 1). The frame is a fixed still, so the captured JPEG and its
  // rating are identical every run.
  await fresh('http://localhost:3000/?view=console', { 'harness-cam': 'face', 'harness-face-scale': '1.35', 'harness-face-y': '-0.06' });
  await click(/Take a photo/);
  await page.waitForSelector('main.batch-review', { timeout: 90000 });
  await page.waitForTimeout(3000);
  await shoot('batch');

  // The upload flow: review -> select -> consent -> success -> personal -> assets.
  await fresh('http://localhost:3000/?view=personal');
  await page.setInputFiles('input[type=file]', SAMPLE);
  await page.waitForSelector('main.uploaded-photo-check', { timeout: 60000 });
  await page.waitForTimeout(4000);
  await shoot('review');
  await click(/Continue/);
  await page.waitForSelector('main.enhance-editor', { timeout: 60000 });
  await page.waitForTimeout(7000);
  await shoot('select');
  await click(/Local finishing/);
  await page.waitForTimeout(3000);
  await click(/Use original/);
  await page.waitForSelector('section.final-review', { timeout: 60000 });
  await page.waitForTimeout(2500);
  await shoot('consent');
  await click(/Save approved photo|Save pending designer review/);
  await page.waitForSelector('section.success', { timeout: 30000 });
  await shoot('success');
  await click(/View in Photos/);
  await page.waitForSelector('section.photos-page', { timeout: 30000 });
  await shoot('personal');
  await page.getByRole('button', { name: /^Assets$/ }).first().click();
  await page.waitForSelector('.asset-studio', { timeout: 30000 });
  await page.waitForTimeout(6000);
  await shoot('assets');
}
```
