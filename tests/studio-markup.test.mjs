import assert from "node:assert/strict";
import test from "node:test";

// Characterization lock: the coming extraction moves this JSX out of app/studio.tsx into
// app/ui/ components without changing a single rendered pixel. app/iq-theme.css and the base
// stylesheets (app-ui.css, polish.css, studio-session.css, camera-v2.css) target these classes
// by exact name — nothing throws if a component drops one, reorders a pair, or invents a new
// name, the page just renders permanently unbranded. This test converts that silent failure
// into a loud one, before the extraction exists.
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const environment = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };
const html = await (await worker.fetch(new Request("http://localhost/"), environment, context)).text();

// Exact class tokens, not a substring/regex match: split every class="..." attribute value on
// whitespace and compare tokens for equality. A `\b`-based regex treats "-" as a non-word
// character, so `\bapp-nav\b` also matches inside "app-nav-main" — a real false pass this
// project hit (app-nav sits inside "app-nav-main", photos-section inside "photos-section-head").
// Token equality has no such affix hole: "app-nav" only ever equals the token "app-nav".
const classTokens = [...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));

function occurrencesOf(name) {
  return classTokens.filter(token => token === name).length;
}

// Class list and counts established empirically (see task-1-report.md, Step 1) by rendering the
// default SSR page and counting every class="..." token. The studio's views are client-state
// driven, so only the always-mounted app shell and the default "personal" view (with an empty
// gallery) ever reach server-rendered markup — personal-grid, photo-card, photo-card-info and the
// singular photo-actions class from the brief's starting proposal never appear server-side and
// are deliberately not locked here; a screenshot test is the right tool for those.
//
// Counts matter as much as presence: photos-actions, primary and take-photo each render twice
// (once in the toolbar, once in the empty-gallery state), and a presence-only assertion is
// satisfied as long as one of the two survives — a refactor that drops a class from some but not
// all of its call sites would pass clean. Locking the exact count closes that hole.
const lockedClassCounts = {
  // App shell: container, nav/toolbar and button classes mounted on every view.
  "app-shell": 1,
  "skip-link": 1,
  "app-nav": 1,
  "app-wordmark": 1,
  "app-nav-main": 1,
  "rail-actions": 1,
  "rail-help": 1,
  "rail-reset": 1,
  "app-content": 1,
  // Default "personal" (Photos) view: section, toolbar and card-adjacent classes.
  "gallery": 1,
  "photos-page": 1,
  "photos-toolbar": 1,
  "photos-heading": 1,
  "photos-actions": 2,
  "photos-section": 1,
  "photos-section-head": 1,
  "photos-empty": 1,
  "primary": 2,
  "take-photo": 2,
};

for (const [locked, expected] of Object.entries(lockedClassCounts)) {
  test(`SSR markup emits .${locked} exactly ${expected} time${expected === 1 ? "" : "s"}`, () => {
    const actual = occurrencesOf(locked);
    const message = actual < expected
      ? `.${locked} appeared ${actual} of ${expected} expected times — a component dropped or renamed it at one of its call sites, so the CSS that targets it no longer applies there`
      : `.${locked} appeared ${actual} of ${expected} expected times — a new element started rendering this class; if intentional, update the expected count in lockedClassCounts`;
    assert.equal(actual, expected, message);
  });
}

test("the gallery section keeps its exact class order", () => {
  // `class="gallery photos-page enter"` and any reordering of those three tokens are equivalent
  // to the browser but not to a reader, and CSS selectors elsewhere in the stylesheets assume
  // this order. It is the only multi-class, app-authored combination SSR renders by default
  // (the other multi-class strings in the page, e.g. "lucide lucide-camera", come from the icon
  // library, not from studio.tsx), so it stands in for "order survives the extraction".
  assert.match(html, /class="gallery photos-page enter"/,
    "the gallery view must keep the exact class order \"gallery photos-page enter\", as it does in the un-extracted markup");
});
