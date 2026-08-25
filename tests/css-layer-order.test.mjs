import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Characterization lock: app/entry.css (and its per-route siblings app/designer/entry.css,
// app/atlas/entry.css) put every legacy stylesheet in `@layer legacy` and app/ui/components.css
// in `@layer components`, which is declared to outrank it. That guarantee is carried entirely by
// `@layer theme, base, legacy, components, utilities;` at the top of app/entry.css -- nothing
// else in the emitted CSS spells the order out, deleting that one line still builds clean and
// screenshots byte-identical (app/ui/components.css is empty today, so an inverted order is
// invisible until Tasks 13-15 move a rule into it), which is exactly the failure mode that got
// the first pass-2 attempt reverted. These tests read the built CSS and fail loudly instead.

const cssDir = fileURLToPath(new URL("../dist/client/_next/static/css/", import.meta.url));
const files = readdirSync(cssDir);

function bundleFor(prefix) {
  const name = files.find(f => f.startsWith(prefix) && f.endsWith(".css"));
  assert.ok(name, `expected a ${prefix}*.css bundle in dist/client/_next/static/css/ -- run npm run build first`);
  return readFileSync(cssDir + name, "utf8");
}

// Finds the byte offset of the *opening* of a named layer -- either a bare declaration
// (`@layer name;` or as part of a `@layer a,b,name;` list) or a block (`@layer name{`). Lightning
// CSS emits either shape depending on whether the layer carries content at that point, and a
// name embedded in a larger list (`@layer components,utilities;`) still marks that layer's first
// mention, which is what fixes its position -- so the search has to match a bare name inside a
// comma list too, not just a block open.
function layerOffset(css, name) {
  // Matches a bare declaration inside a comma list (`@layer components,utilities;`, with or
  // without the spaces a non-minified build would keep) as well as a block open
  // (`@layer components{`), whichever shape lightningcss chose to emit at that layer's first
  // mention -- either one is what fixes the layer's position.
  const re = new RegExp(String.raw`@layer[a-zA-Z0-9_,\s-]*\b${name}\b[^{;]*[{;]`);
  const m = re.exec(css);
  assert.ok(m, `expected to find an "@layer ... ${name}" mention in the bundle`);
  return m.index;
}

test("app/entry.css: components outranks legacy, which outranks base and theme", () => {
  const css = bundleFor("index.");
  const theme = layerOffset(css, "theme");
  const base = layerOffset(css, "base");
  const legacy = layerOffset(css, "legacy");
  const components = layerOffset(css, "components");
  const utilities = layerOffset(css, "utilities");
  // This is the entire load-bearing claim of app/entry.css:10
  // (`@layer theme, base, legacy, components, utilities;`). Nothing else in the emitted CSS
  // states the order -- lightningcss reorders content to satisfy it and then drops the
  // declaration as redundant, so the order only shows up as *offset order*, never as a literal
  // statement to grep for. If a rule moved into app/ui/components.css during a later conversion
  // ever stops outranking every app/*.css legacy stylesheet, it silently stops painting and the
  // screenshot gate will not notice (a rule that already lost to `legacy` renders identically
  // whether it lives in `base` or in `components` -- the loss is invisible either way).
  assert.ok(
    theme < base && base < legacy && legacy < components && components < utilities,
    `expected layer order theme(${theme}) < base(${base}) < legacy(${legacy}) < components(${components}) < utilities(${utilities}) in the studio bundle -- ` +
    "a rule in app/ui/components.css must outrank every legacy stylesheet; if this fails, converted component styles are inert and the screenshot gate will not notice.",
  );
});

// The studio's own guarantee (above) only holds inside index.*.css. Two other route bundles ship
// unlayered by default -- app/designer/entry.css and app/atlas/entry.css exist specifically to
// put page.*.css and profile.*.css's content in `@layer legacy` too, the same layer name index.*.css
// already positioned relative to `components`. Unlayered CSS beats every layered CSS regardless
// of specificity or source order (see app/entry.css's own header comment), so if either route
// ever regresses to an unlayered `import "./foo.css";` the moment a shared app/ui/ component
// renders inside .designer-app or .atlas-app its styles would silently stop painting, exactly
// like the studio bug this task exists to prevent -- just one route later.
function assertWhollyLayered(css, layerName, bundleLabel) {
  const openTag = `@layer ${layerName}{`;
  assert.equal(
    css.indexOf(openTag), 0,
    `expected ${bundleLabel} to open with "${openTag}" at offset 0 -- if this fails, this route's ` +
    `CSS is loading unlayered again, which always beats every layered rule (including anything ` +
    `converted into app/ui/components.css) regardless of specificity or source order.`,
  );
  assert.equal(
    (css.match(/@layer\b/g) || []).length, 1,
    `expected exactly one "@layer" statement in ${bundleLabel} -- a second one (layered or not) ` +
    `means part of this route's CSS is escaping the "${layerName}" layer it is supposed to share ` +
    `with the studio bundle's declared order.`,
  );
  // Brace-match the single opening layer block and confirm it swallows the whole file -- proof
  // that no rule sits outside the layer, not just that the file happens to start with one.
  let depth = 0, i = openTag.length - 1, close = -1;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") { depth--; if (depth === 0) { close = i; break; } }
  }
  assert.ok(close !== -1, `expected a balanced "${openTag} ... }" block in ${bundleLabel}`);
  assert.equal(
    css.slice(close + 1).trim(), "",
    `expected nothing after the closing "${layerName}" layer brace in ${bundleLabel} -- trailing ` +
    `content there is CSS that escaped the layer and would beat it regardless of order.`,
  );
}

test("app/designer/entry.css: the whole designer bundle stays inside @layer legacy", () => {
  assertWhollyLayered(bundleFor("page."), "legacy", "the designer route's page.*.css bundle");
});

test("app/atlas/entry.css: the whole atlas bundle stays inside @layer legacy", () => {
  assertWhollyLayered(bundleFor("profile."), "legacy", "the atlas route's profile.*.css bundle");
});
