import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

const minimumNode = [22, 13, 0];
const expectedAssets = new Map([
  ["public/portraits-contact-sheet.png", "98145517c5df94136ff4338412a5b3dd1e663210696bed5e1f7b90a94dd37314"],
  ["public/blaze_face_short_range.tflite", "b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f"],
  ["public/selfie_segmenter.tflite", "191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b"],
  ["public/mediapipe/vision_wasm_internal.js", "4a97e2520ba506c680ecd6ba6acfb146888afa0e2746d57f205352bc6ebb82eb"],
  ["public/mediapipe/vision_wasm_internal.wasm", "f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7"],
  ["public/mediapipe/vision_wasm_nosimd_internal.js", "927def7b465c51b86e4b3060f93646aca4e27121f4b8fc0483786e407ea9cf1f"],
  ["public/mediapipe/vision_wasm_nosimd_internal.wasm", "3821ea9b1f7fb8c549ef2a064ef5c85750bf375c545a49fd6eea0df44a95f1f4"],
]);

const failures = [];
const notes = [];

function atLeast(actual, expected) {
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] > expected[index]) return true;
    if (actual[index] < expected[index]) return false;
  }
  return true;
}

const nodeVersion = process.versions.node.split(".").map(Number);
if (!atLeast(nodeVersion, minimumNode)) {
  failures.push(`Node ${minimumNode.join(".")} or newer is required; found ${process.versions.node}.`);
} else {
  notes.push(`Node ${process.versions.node}`);
}

try {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
  if (packageJson.name !== "photostudio-plus-demo") failures.push("package.json has the wrong app identity.");
  if (packageLock.name !== packageJson.name || packageLock.version !== packageJson.version) failures.push("package-lock.json is not synchronized with package.json.");
  notes.push(`lockfile v${packageLock.lockfileVersion}`);
} catch (error) {
  failures.push(`Package metadata could not be read: ${error.message}`);
}

for (const [path, expectedHash] of expectedAssets) {
  try {
    const contents = await readFile(path);
    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== expectedHash) failures.push(`${path} does not match the frozen demo asset.`);
  } catch {
    failures.push(`${path} is missing.`);
  }
}
notes.push(`${expectedAssets.size} offline demo assets verified`);

try {
  const hosting = JSON.parse(await readFile(".openai/hosting.json", "utf8"));
  if (hosting.d1 !== null || hosting.r2 !== null) failures.push("Unexpected hosted storage binding found.");
  notes.push("no API keys or hosted storage required");
} catch (error) {
  failures.push(`Hosting configuration could not be read: ${error.message}`);
}

if (failures.length) {
  console.error("\nDemo preflight failed:\n");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error("\nFix these items before relying on the demo.\n");
  process.exitCode = 1;
} else {
  console.log("\nProfile Lab AI demo preflight passed:\n");
  for (const note of notes) console.log(`  ✓ ${note}`);
  console.log("\nRun `npm run dev`, then open the address shown in the terminal.\n");
}
