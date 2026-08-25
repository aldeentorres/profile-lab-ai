# Screenshot harness for the studio views

Purpose: prove that a refactor which is supposed to move JSX around without changing a rendered
pixel really did not change one. `tests/studio-markup.test.mjs` locks the classes the server
renders, but SSR only ever renders the default view — every other view is client state and only a
screenshot can see it.

**Status: the determinism gate passes.** Three full runs against unmodified `main` — two in one
browser process, a third after restarting the browser — produced `0` differing pixels on every
frame at full precision. No fuzz threshold is used anywhere. Numbers in
[Determinism gate](#determinism-gate-the-numbers).

Playwright is deliberately **not** a project dependency. The harness runs through the Playwright
MCP browser channel, so nothing is added to `package.json` and `npm ci` keeps reproducing the demo
exactly. ImageMagick (`magick`) is a system tool, used only to compare the PNGs.

## Scope: ten views, not eleven

The `View` union in `app/studio.tsx:19` lists eleven names. `profile` was never built — no
`setView("profile")`, not in `navigableViews`, no render branch. The other ten are all reached and
all compared:

`session` · `capture` · `batch` · `review` · `select` · `consent` · `success` · `personal` ·
`assets` · `console`

That is **15 frames**: one per view, plus a second below-the-fold frame for the five views whose
scroll container overflows (`console`, `session`, `review`, `select`, `consent`).

## Running it

```bash
git checkout main                # or the branch under test
npm run build && npm run start   # http://localhost:3000, in the background
node <scratchpad>/shot-writer.mjs &   # the screenshot sidecar, see "The scripts"
```

Then run the recipe script through the MCP `browser_run_code_unsafe` tool, once per run, into a
different output directory each time. Compare:

```bash
for v in profile session capture batch review select consent success personal assets console; do
  for f in "$v" "$v-scrolled"; do
    [ -f "<scratchpad>/baseline/$f.png" ] || continue
    printf '%-18s: ' "$f"
    magick compare -metric AE "<scratchpad>/baseline/$f.png" "<scratchpad>/run2/$f.png" null: 2>&1
    echo
  done
done
```

Screenshots live in the scratchpad, **never** in the repository: they are 2880×1800 PNGs and
machine-specific.

### Fixed capture settings — all of these matter

| Setting | Value | Why |
| --- | --- | --- |
| viewport | 1440 × 900 | layout is `clamp()`-heavy; another width is a different design |
| `emulateMedia` | `reducedMotion: 'reduce'`, `colorScheme: 'light'` | the app's own `@media(prefers-reduced-motion:reduce){*{animation:none!important}}` kills `.enter` (`animation:enter .35s ease both`) through a path the app already ships, rather than an injected override |
| capture | CDP `Page.captureScreenshot` with **`fromSurface: false`**, `captureBeyondViewport: false` | see below — this one is the difference between a gate that works and one that does not |
| permissions | `camera` granted for `http://localhost:3000` | otherwise `getUserMedia` rejects and every camera view becomes an error panel |

**The capture path is the single most important setting.** Playwright's `page.screenshot()` — and
CDP's default `fromSurface: true` — reads the browser's *composited surface*. That path lands on
one of two GPU raster states depending on tile history: **47209 differing pixels on `console`
between two runs of identical code**, 99.9% of them at one part in 255, concentrated in large
low-contrast gradients. `fromSurface: false` reads the renderer's own compositor and was
byte-identical (same PNG length, same hash) across six reloads on which the surface path flipped.
`fullPage: true` is worse still, because it re-rasterises into an off-screen surface — and it buys
nothing here: `document.scrollHeight === innerHeight` on every view, since the app scrolls
`#app-content` (or the view's own `<main>`), not the document. Below-the-fold content is captured
by a second frame instead, named `<view>-scrolled.png`.

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

Found empirically. Items 1–6 live in an init script registered with `context.addInitScript`, so
they run **before any app JS** — a `Date` stub applied after the page has already formatted a
timestamp is worthless. Items 7–13 live in the recipe's `settle()`.

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
| 14 | **Gradient dither on `.enhance-editor`.** Its two decorative `radial-gradient`s (`circle at 8% 0%`, `circle at 96% 88%` in `app/studio-enhance.css`) dithered differently between page loads. | Screenshot-mode stylesheet flattens that one background to its own base colour `#0f1412`, applied identically to the baseline and every comparison run. | 24228 pixels on `select` under the old capture path. **See the note below — this may now be redundant.** |
| 15 | **Fonts.** No `@font-face`, no remote font; the app asks for `"Atkinson Hyperlegible","Avenir Next",Arial,sans-serif` and Georgia. | `document.fonts.ready` awaited. Not fully neutralisable — rendering depends on which faces are installed locally, so **baselines are only comparable on the same machine**. | |

### Note on item 14

The `.enhance-editor` flattening was ordered while the dither was believed to be the root cause.
It was not: the root cause was the `fromSurface: true` capture path (see "Fixed capture settings").
With `fromSurface: false` in place, one `main`-vs-`main` pair run **without** the flattening also
came back `0` on `select` and `select-scrolled`. The flattening is kept because it was an explicit
ruling and one pair is thin evidence, but it costs the harness its view of two real colour-carrying
rules, so it is a reasonable thing to drop later — the only change needed is setting `flatten` to
the empty string in the init script.

## Determinism gate: the numbers

Three runs of the harness against unmodified `main`, same server. Run 2 shares a browser process
with the baseline; run 3 was taken after closing and relaunching the browser. `magick compare
-metric AE`, no fuzz.

```
view                       run2         run3
profile             NOT COVERED  NOT COVERED
session                       0            0
session-scrolled              0            0
capture                       0            0
batch                         0            0
review                        0            0
review-scrolled               0            0
select                        0            0
select-scrolled               0            0
consent                       0            0
consent-scrolled              0            0
success                       0            0
personal                      0            0
assets                        0            0
console                       0            0
console-scrolled              0            0
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
2. **`.enhance-editor`'s two decorative radial gradients** are flattened for the screenshot, so a
   change to those two rules would not be caught on the `select` view. See the note on item 14.
3. **Overlay scrollbars** are hidden, so scrollbar styling is not compared.
4. **`<video>` content** is masked black and paused, so nothing about the live preview itself is
   compared — only the chrome around it.
5. **`profile`** does not exist and is not covered.
6. **Cross-machine comparison is meaningless.** The app relies on locally installed fonts, and the
   screenshots are 2880×1800 device pixels at this machine's DPR. Re-baseline on the machine you
   are testing on.

## The scripts

Three files. In this repo they live in `.playwright-mcp/` (already git-excluded through
`.git/info/exclude`) and are reproduced here in full so the document stands alone.

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
    // flatten: .enhance-editor's two decorative radial gradients dither differently per page
    //   load. Applied identically to baseline and comparison runs. See "Note on item 14".
    // noscrollbar: overlay scrollbars fade in on scroll and repaint under the scrolled frame.
    // video: masked opaque black rather than frozen -- layout untouched.
    const flatten = ".enhance-editor{background:#0f1412!important}";
    const noscrollbar = "::-webkit-scrollbar{width:0!important;height:0!important}";
    style.textContent = "*,*::before,*::after{transition:none!important}" + flatten + noscrollbar
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

Run through `browser_run_code_unsafe`. `OUT` is this run's output directory; `INIT` is the init
script above as a string.

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
