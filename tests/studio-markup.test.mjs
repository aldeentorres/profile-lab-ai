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

// Class list established empirically (see task-1-report.md, Step 1) by rendering the default
// SSR page and collecting every class="..." token. The studio's views are client-state-driven,
// so only the always-mounted app shell and the default "personal" view (with an empty gallery)
// ever reach server-rendered markup — personal-grid, photo-card, photo-card-info and the
// singular photo-actions class from the brief's starting proposal never appear server-side and
// are deliberately not locked here; a screenshot test is the right tool for those.
const lockedClasses = [
  // App shell: container, nav/toolbar and button classes mounted on every view.
  "app-shell",
  "skip-link",
  "app-nav",
  "app-wordmark",
  "app-nav-main",
  "rail-actions",
  "rail-help",
  "rail-reset",
  "app-content",
  // Default "personal" (Photos) view: section, toolbar and card-adjacent classes.
  "gallery",
  "photos-page",
  "photos-toolbar",
  "photos-heading",
  "photos-actions",
  "photos-section",
  "photos-section-head",
  "photos-empty",
  "primary",
  "take-photo",
];

for (const locked of lockedClasses) {
  test(`SSR markup still emits .${locked}`, () => {
    assert.match(html, new RegExp(`class="[^"]*\\b${locked}\\b`),
      `.${locked} vanished from the rendered page — a component dropped or renamed it, and the CSS that targets it no longer applies`);
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
