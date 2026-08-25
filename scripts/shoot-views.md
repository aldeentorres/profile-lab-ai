# Screenshot harness for the eleven studio views

Purpose: prove that a refactor which is supposed to move JSX around without changing a rendered
pixel really did not change one. `tests/studio-markup.test.mjs` locks the classes the server
renders, but SSR only ever renders the default view — every other view is client state and only a
screenshot can see it.

**Status: the determinism gate does NOT currently pass on this machine.** Nine of the ten
reachable views diff to exactly `0` between two runs of identical code; `select` did not, and a
third run showed `session` and `success` drifting too once the browser process was restarted. One
view (`batch`) became unreachable partway through the session. See
[Determinism gate](#determinism-gate-the-numbers) and [Blockers](#blockers) below. Do not treat a
green run of this harness as a passing check until the blockers are resolved.

Playwright is deliberately **not** a project dependency. The harness runs through the Playwright
MCP browser channel, so nothing is added to `package.json` and `npm ci` keeps reproducing the demo
exactly. ImageMagick (`magick`) is a system tool, used only to compare the PNGs.

## Running it

```bash
git checkout main            # or the branch under test
npm run build && npm run start   # http://localhost:3000, run in the background
```

Then drive the browser with the two scripts below (`init.js` injected via
`context.addInitScript`, the recipe file run through the MCP `browser_run_code_unsafe` tool with
`page`). Screenshots go to a scratchpad directory — **never** into the repository; they are large
and machine-specific.

```bash
for v in profile session capture batch review select consent success personal assets console; do
  printf '%s: ' "$v"
  magick compare -metric AE "<scratchpad>/baseline/$v.png" "<scratchpad>/baseline2/$v.png" null: 2>&1
  echo
done
```

Fixed capture settings, all of which matter:

| Setting | Value | Why |
| --- | --- | --- |
| viewport | 1440 × 900 | layout is `clamp()`-heavy; any other width is a different design |
| `emulateMedia` | `reducedMotion: 'reduce'`, `colorScheme: 'light'` | the app's own `@media(prefers-reduced-motion:reduce){*{animation:none!important}}` kills `.enter` (`animation:enter .35s ease both`) through a path the app already ships, rather than an injected override |
| `screenshot` | `fullPage: true, animations: 'disabled', caret: 'hide'` | `console` and several others are taller than the viewport |
| permissions | `camera` granted for `http://localhost:3000` | otherwise `getUserMedia` rejects and every camera view becomes an error panel |

## The eleven views and how to reach each

`profile → session → capture → batch → review → select → consent → success → personal → assets → console`

Three of them have URL routes (`navigableViews` in `app/studio.tsx` is exactly
`{personal, assets, console}`); the rest are client state only.

| View | Route in | Notes |
| --- | --- | --- |
| `profile` | **none — dead view** | `"profile"` appears in the `View` union at `app/studio.tsx:19` and nowhere else. No `setView("profile")` exists, it is not in `navigableViews`, and no branch renders it. It is unreachable and uncapturable without changing app source. |
| `session` | seed `localStorage["photostudio-session:HARNESS-DEMO"]` with a `SessionAgent` JSON, then `GET /?session=HARNESS-DEMO` | `loadStudioSession` reads localStorage before it falls back to `/api/studio-sessions`, so seeding keeps this offline and free of server state. Wait for `main.session-profile-check`. |
| `capture` | `/?view=console` → click **Take a photo** | `openGuidedCamera()`. See the camera notes below — the model request must be blocked or this view will not hold still. |
| `batch` | `/?view=console` → **Take a photo** → let the auto-capture sequence finish | The only route. `shots` is written by `shootSequence()` alone, which the 700 ms auto-ready effect arms only while `placement === "ready"`. Currently unreachable — see [Blockers](#blockers). |
| `review` | `/?view=personal` → `setInputFiles` on the `input[type=file]` (it is `.sr-only`, Playwright sets files on it directly — no `DataTransfer` construction needed) | Wait for `main.uploaded-photo-check`. `public/portrait-references/reference-1.png` scores 89 / APPROVED, so the CTA is **Continue**. |
| `select` | from `review` → **Continue** | `main.enhance-editor`. The local finishing pipeline runs on entry; allow ~6 s. |
| `consent` | from `select` → **Local finishing** (toggles off) → **Use original** | This is the documented rehearsal path. Turning local finishing off changes the CTA from *Use professional version* to *Use original* and carries the untouched upload through, which keeps the enhancement pipeline's output out of the later screenshots. Wait for `section.final-review`. |
| `success` | from `consent` → **Save approved photo** | Needs an approved assessment and `profileOK` (default on). Wait for `section.success`. |
| `personal` | from `success` → **View in Photos**, or directly `/?view=personal` | Captured after the flow so the gallery holds one approved photo — that renders `personal-grid`, `photo-card`, `photo-card-info` and the card-level `photo-actions`, none of which SSR ever shows. |
| `assets` | from `personal` → nav **Assets**, or directly `/?view=assets` | With a `brandOK` approved photo present this renders `.asset-studio`; with an empty gallery it renders `.asset-empty` instead, so the upload flow has to run first. |
| `console` | `/?view=console` | Renders **two** sections stacked, `.qr-home` and `.console` — both are gated on `view==="console"`. |

## Sources of nondeterminism, and what each is neutralised with

Found empirically, not assumed. The first four are in the injected init script, which is added with
`context.addInitScript` so it runs **before any app JS** — a `Date` stub applied after the page has
already formatted a timestamp is worthless.

1. **Wall clock.** `personal` renders
   `new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(item.createdAt))` and
   `…{dateStyle:"medium",timeStyle:"short"}` for pending photos. Frozen to
   `2026-08-25T09:00:00Z` (this also freezes the MediaPipe WASM log timestamps, a useful signal
   that the stub landed before app JS).
2. **Generated ids.** `crypto.randomUUID()` produces photo ids and review-request ids; the request
   id is rendered in the `Designer approval requested · <id>` toast and in workflow status lines.
   Replaced with a monotonic counter.
3. **`Math.random`.** Seeded mulberry32, on principle — no rendered use was found, but it costs
   nothing and removes the class of failure.
4. **The machine's own webcam.** The Studio view prints the discovered device count and the device
   labels into a `<select>`. `enumerateDevices` is stubbed to one fixed fake device so the pixels
   do not depend on what is plugged into the machine.
5. **The live `<video>` element.** Masked opaque rather than frozen, per the brief:
   `video{background:#000!important;filter:brightness(0)!important}` — `brightness(0)` flattens any
   frame that did arrive, the background paints the box when none did, and layout is untouched.
   `getUserMedia` itself returns a canvas `captureStream` painting one fixed still frame, so
   anything the app *captures* from it is byte-identical between runs.
6. **CSS transitions.** `prefers-reduced-motion` only covers `animation` in this codebase
   (`globals.css`), not `transition` (`.consents label>i:after{transition:.2s}`), so the harness
   injects `*,*::before,*::after{transition:none!important}`.
7. **Toasts.** `setToast` auto-clears after 2600 ms. Every screenshot first waits for `.toast` to
   detach; a toast caught mid-life is pure wall-clock noise.
8. **Scroll position.** `go()` scrolls `#app-content` and `window` with `behavior:"smooth"`; both
   are reset to 0 and settled before the shot.
9. **Fonts.** `document.fonts.ready` is awaited. The app uses no `@font-face` and no remote font —
   it asks for `"Atkinson Hyperlegible","Avenir Next",Arial,sans-serif` and Georgia, so **the
   rendering depends on which of those are installed locally**. Baselines are only comparable on
   the same machine.
10. **The auto-capture countdown.** `capture` cannot be photographed while the camera is live and
    `placement === "ready"`: a 700 ms timer arms `shootSequence()` and a 5-second countdown starts.
    The harness aborts the `**/blaze_face_short_range.tflite` request for the `capture` recipe only,
    which drives the detector effect's catch path and pins `placement` to `checking`. Documented
    coverage gap: the `ready` / `close` / `far` / `center` variants of the guide overlay are not
    screenshot-covered.

### Not neutralised — Chromium's rasterisation of an identical DOM

`select` differed between two runs by 24228 pixels. The app's output was proved identical across
three fresh loads by hashing the DOM instead of the pixels:

```
r1 :: Face retouch=24,Adaptive light=32,Definition=24 || img:119991:f3a5364cc7e2 compare-original-image:120955:201f2a5bbd76 || 147.000x616.719,834.719x439.281,877.719x397.281,…
r2 :: (identical)
r3 :: (identical)
```

Same slider values, same enhanced-image data URL length and SHA-256 prefix, same layout rects to
three decimals. The difference is entirely in how Chromium rasterised that identical DOM:

- 9228 of the differing greyscale pixels differ by exactly **1/255**, concentrated in the two large
  decorative radial gradients on `.enhance-editor`
  (`radial-gradient(circle at 8% 0%, #27342e 0, transparent 24%)` and
  `radial-gradient(circle at 96% 88%, #2b201b 0, transparent 25%)` in `app/studio-enhance.css`) —
  gradient dither phase.
- 13 pixels differ by more (2, 9, 10, 24): antialiasing on two range-input thumb edges and one
  diagonal glyph stroke.
- A pure-text region of the same view (`300x40+870+480`) diffs to `0`, so text rendering is stable.

The same signature appeared in `session` (2904 pixels at ±1, 11 larger) and `success` (11 pixels)
once the browser process was restarted.

This was **not** papered over with a fuzz threshold. `magick compare -metric AE -fuzz 0.4%` reduces
the `select` count from 24228 to 19, which is exactly the kind of "green gate" the plan forbids.

## Determinism gate: the numbers

Two full runs of the harness against unmodified `main`, same server, same browser process:

```
profile  : NOT CAPTURED   (dead view — see the table above)
session  : 0 (0)
capture  : 0 (0)
batch    : 0 (0)
review   : 0 (0)
select   : 24228 (0.0186944)
consent  : 0 (0)
success  : 0 (0)
personal : 0 (0)
assets   : 0 (0)
console  : 0 (0)
```

A third run, after restarting the browser process, against the same unmodified `main`:

```
profile  : NOT CAPTURED
session  : 7082 (0.00546451)
capture  : 0 (0)
batch    : NOT CAPTURED   (view could no longer be reached)
review   : 0 (0)
select   : 0 (0)
consent  : 0 (0)
success  : 12 (9.25926e-06)
personal : 0 (0)
assets   : 0 (0)
console  : 0 (0)
```

## Blockers

1. **`select`, `session`, `success` — raster dither on an identical DOM.** Root cause established
   (above): Chromium's dither phase for large low-contrast radial gradients is not stable across
   page loads or browser restarts. Observed on roughly 2 of 50 `select` renders within one browser
   process, and on every browser restart for `session`/`success`. Any fix has to make the renderer
   deterministic, not the comparison lenient. The options identified, none of them free:
   - neutralise the decorative gradients with a harness style, the same way `<video>` is masked —
     costs screenshot coverage of exactly those background rules, which pass 2 of the plan rewrites;
   - run the browser with GPU rasterisation disabled — not reachable through the MCP browser
     channel, which does not expose launch flags;
   - accept the flake and re-run — a gate that cries wolf gets ignored, which is the failure the
     plan is trying to avoid.
2. **`batch` — not reliably reachable.** The view depends on `placement === "ready"`, which depends
   on MediaPipe's `FaceDetector` reading the fake camera stream. In this environment it does not:
   with the *same* synthetic stream it returned a ready-geometry detection for every input early in
   the session (including a flat grey frame with no face in it, which is plainly a false positive),
   and later returned no detection at all for the same portrait frame (`placement-center`) or threw
   on every call (`placement-checking`). The detector loads cleanly either way
   (`Graph successfully started running`), so this is the WebGL texture upload from a canvas
   `captureStream` video, not a model-loading failure. There is no second route into `batch`:
   `shots` is written only by `shootSequence()`.
3. **`profile` — dead view.** Not a harness problem. Worth a separate decision: either the union
   member is removed, or a route to it is added. Until then, ten views, not eleven.

## The scripts

### Init script (`context.addInitScript`)

```javascript
(() => {
  if (globalThis.__harnessInit) return; globalThis.__harnessInit = 1;
  // Frozen clock — date-formatted captions must not drift with the wall clock.
  const FIXED = new Date("2026-08-25T09:00:00Z").valueOf();
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) { return args.length ? new RealDate(...args) : new RealDate(FIXED); }
    static now() { return FIXED; }
  };
  // Deterministic ids — review-request ids are rendered in toasts and status lines.
  let n = 0;
  const uuid = () => { n += 1; return "00000000-0000-4000-8000-" + String(n).padStart(12, "0"); };
  try { Object.defineProperty(crypto, "randomUUID", { value: uuid, configurable: true }); } catch { }
  // Seeded Math.random (mulberry32).
  let s = 0x9e3779b9;
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // Fixed device list — the Studio view prints the machine's real camera labels otherwise.
  const fakeDevices = [{ deviceId: "harness-cam", kind: "videoinput", label: "Harness Camera", groupId: "harness" }];
  // Fake camera: one fixed still frame, so anything captured from it is byte-identical.
  // localStorage "harness-cam": "blank" (flat grey) or "face" (the frozen reference portrait,
  // sized by "harness-face-scale" / "harness-face-y").
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
    const style = document.createElement("style");
    // prefers-reduced-motion (emulated by the harness) covers @keyframes through the app's own
    // media query; transitions are not covered by it. <video> is masked opaque, not frozen.
    style.textContent = "*,*::before,*::after{transition:none!important}video{background:#000!important;filter:brightness(0)!important}";
    document.head.appendChild(style);
  });
})();
```

### Recipe script

`OUT` is the scratchpad directory for this run; `INIT` is the script above as a string.

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

  // A clean origin, then seed only what this recipe needs, then the real navigation.
  const fresh = async (url, seed) => {
    await page.goto('http://localhost:3000/?view=console', { waitUntil: 'domcontentloaded' });
    await page.evaluate((s) => { try { localStorage.clear(); sessionStorage.clear(); for (const k in (s || {})) localStorage.setItem(k, s[k]); } catch { } }, seed || {});
    await page.goto(url, { waitUntil: 'networkidle' });
  };
  const settle = async () => {
    await page.waitForSelector('.toast', { state: 'detached', timeout: 8000 }).catch(() => { });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById('app-content')?.scrollTo(0, 0); });
    await page.waitForTimeout(200);
  };
  const shoot = async (name) => {
    await settle();
    await page.screenshot({ path: OUT + '/' + name + '.png', fullPage: true, animations: 'disabled', caret: 'hide' });
  };
  const click = (re) => page.getByRole('button', { name: re }).first().click();

  await fresh('http://localhost:3000/?view=console');
  await shoot('console');

  await fresh('http://localhost:3000/?session=' + CODE, { ['photostudio-session:' + CODE]: JSON.stringify(AGENT) });
  await page.waitForSelector('main.session-profile-check', { timeout: 20000 });
  await shoot('session');

  // Blocking the face model pins `placement` to "checking" so the 700ms auto-capture never arms.
  await page.route('**/blaze_face_short_range.tflite', r => r.abort());
  await fresh('http://localhost:3000/?view=console', { 'harness-cam': 'blank' });
  await click(/Take a photo/);
  await page.waitForSelector('main.studio-camera', { timeout: 20000 });
  await page.waitForTimeout(5000);
  await shoot('capture');
  await page.unrouteAll();

  // batch: only reachable by letting the auto-capture sequence run to completion.
  await fresh('http://localhost:3000/?view=console', { 'harness-cam': 'face', 'harness-face-scale': '1.35', 'harness-face-y': '-0.06' });
  await click(/Take a photo/);
  await page.waitForSelector('main.batch-review', { timeout: 90000 });
  await page.waitForTimeout(2500);
  await shoot('batch');

  // The upload flow: review -> select -> consent -> success -> personal -> assets.
  await fresh('http://localhost:3000/?view=personal');
  await page.setInputFiles('input[type=file]', SAMPLE);
  await page.waitForSelector('main.uploaded-photo-check', { timeout: 60000 });
  await page.waitForTimeout(4000);
  await shoot('review');
  await click(/Continue/);
  await page.waitForSelector('main.enhance-editor', { timeout: 60000 });
  await page.waitForTimeout(6000);
  await shoot('select');
  await click(/Local finishing/);
  await page.waitForTimeout(3000);
  await click(/Use original/);
  await page.waitForSelector('section.final-review', { timeout: 60000 });
  await page.waitForTimeout(2000);
  await shoot('consent');
  await click(/Save approved photo|Save pending designer review/);
  await page.waitForSelector('section.success', { timeout: 30000 });
  await shoot('success');
  await click(/View in Photos/);
  await page.waitForSelector('section.photos-page', { timeout: 30000 });
  await shoot('personal');
  await page.getByRole('button', { name: /^Assets$/ }).first().click();
  await page.waitForSelector('.asset-studio', { timeout: 30000 });
  await page.waitForTimeout(5000);
  await shoot('assets');
}
```
