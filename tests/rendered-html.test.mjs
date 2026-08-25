import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const environment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

function request(path, init) {
  return worker.fetch(new Request(`http://localhost${path}`, init), environment, context);
}

test("renders the Profile Lab AI Photos landing page", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Profile Lab AI<\/title>/i);
  assert.match(html, /Approved Photos/i);
  assert.match(html, /Import photo/i);
  assert.match(html, /Photos/i);
  assert.match(html, /Assets/i);
  assert.match(html, /Profile Lab AI/i);
  assert.doesNotMatch(html, /Building your site|codex-preview|react-loading-skeleton/i);
});

test("renders the unlisted designer dashboard",async()=>{
 const response=await request("/designer",{headers:{accept:"text/html"}});
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/Profile Lab AI Designer/i);
 assert.match(html,/Preparing designer desk|Portrait desk/i);
});

test("renders the Atlas profile and booking entry point", async () => {
  const response = await request("/atlas", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Atlas/i);
  assert.match(html, /Nat Kingston/i);
  assert.match(html, /Photo quality|Marketing photo preflight/i);
  assert.match(html, /Book studio/i);
});

test("creates and reloads a studio appointment", async () => {
  const session = `PS-TEST-${Date.now()}`;
  const payload = {
    session,
    agentId: "71502",
    agentName: "Demo Test Agent",
    agentMobile: "60122070021",
    agentRenTag: "REN01143",
    agentOfficePhone: "03-7453 5155",
    photoPreflight: {
      base_score: 91,
      overall_score: 91,
      status: "APPROVED",
      confidence: 0.91,
      designer_usability: 89,
      pose_appropriateness: 94,
      selfie_probability: 0.02,
      decision_reason: "All submission requirements passed.",
      requirements: [{ id: "resolution", status: "PASS" }],
      penalties: [],
      recommendation: "Ready for design.",
    },
    date: "2026-08-22",
    time: "10:30",
  };

  const created = await request("/api/studio-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(created.status, 201);
  assert.equal(created.headers.get("cache-control"), "no-store");

  const loaded = await request(`/api/studio-sessions?session=${encodeURIComponent(session)}`);
  assert.equal(loaded.status, 200);
  const record = await loaded.json();
  assert.equal(record.session, session);
  assert.equal(record.agentName, payload.agentName);
  assert.equal(record.agentMobile, payload.agentMobile);
  assert.equal(record.agentRenTag, payload.agentRenTag);
  assert.equal(record.agentOfficePhone, payload.agentOfficePhone);
  assert.deepEqual(record.photoPreflight, payload.photoPreflight);
  assert.equal(record.status, "confirmed");
});

test("rejects incomplete and unknown appointments", async () => {
  const incomplete = await request("/api/studio-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session: "PS-INCOMPLETE" }),
  });
  assert.equal(incomplete.status, 400);

  const missing = await request("/api/studio-sessions?session=PS-NOT-FOUND");
  assert.equal(missing.status, 404);
});

test("reports CodeFormer as optional when the private service is not configured", async () => {
  const response = await request("/api/codeformer");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { available: false, reason: "not_configured" });
});

test("reports portrait generation as optional when no key is configured", async () => {
  const response = await request("/api/portrait-generation");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { available: false, reason: "not_configured" });
  const attempt = await request("/api/portrait-generation", { method: "POST", body: new FormData() });
  assert.equal(attempt.status, 503, "generation is refused, never attempted, without a key");
});
