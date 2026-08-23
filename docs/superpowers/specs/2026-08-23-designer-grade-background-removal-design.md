# Designer-grade background removal

Status: approved for implementation
Date: 2026-08-23

## Problem

`createPortraitCutout` (`app/brand-assets.tsx:82`) produces a cutout that does not read
as designer work. Three separate causes:

1. **Mask resolution.** MediaPipe `selfie_segmenter.tflite` emits a 256x256 confidence
   mask, upscaled roughly 8x by a plain `drawImage`. Hair strands, glasses arms and
   finger gaps are averaged away before any refinement can see them.
2. **Alpha policy inverted.** The mask is remapped `(v - 0.04) / 0.78` and then passed
   through a smoothstep `c^2 * (3 - 2c)`, which *hardens* the transition. A hair pixel at
   probability 0.30 leaves at 0.26 alpha. Uncertainty currently resolves toward deleting
   the subject.
3. **The subject is cropped.** `cropCutoutToPerson` trims to the bounding box of pixels
   above 0.45 confidence. Soft hair below that threshold and outside the box is clipped.

Two further defects: no background colour decontamination, so semi-transparent edge
pixels keep the old background colour and leave a rim on the banner; and
`image-enhancement.ts:293` offsets the mask by 1.2% as a crude dilate to hide the same
bad edge.

## Principle

**Background removal is non-generative.** Remove the background without redesigning,
reconstructing or changing the subject.

Concretely, for every stage:

- Only the alpha channel is computed. Subject RGB is never synthesised.
- The single stage that writes RGB (spill removal) *subtracts a measured background
  contribution* from edge pixels. It never invents colour, and it leaves the pixel
  untouched when it cannot measure the background confidently.
- No shadow, outline, glow, border or edge effect is ever added.
- No beautification, retouching or regeneration of the person.
- Where the matte is uncertain, the subject is preserved. Bias always favours keeping.
- Facial features, body, pose, clothing, hair, hands, accessories and proportions are
  untouched by definition: nothing in this pipeline writes to them.

## Engine

`onnx-community/BiRefNet_lite-ONNX`, fp16, ~115 MB, run in the browser through
`@huggingface/transformers` with the WebGPU backend.

| Property | Value |
|---|---|
| Licence | MIT — commercial use permitted |
| Mask resolution | 1024 x 1024 (16x the current 256 x 256) |
| Output | soft alpha matte, not a binary mask |
| Hosting | fetched once from the Hugging Face CDN, browser-cached |
| Privacy | photos never leave the device; only the model is downloaded |

Rejected: RMBG-2.0 and RMBG-1.4 (non-commercial licence — the repo already carries one
non-commercial licence problem with CodeFormer); BiRefNet-portrait fp16 at 490 MB and
BEN2 at 219 MB (too large for a browser download, and BEN2's hair advantage does not
justify doubling it); a self-hosted service (breaks the offline demo).

MediaPipe is retained as a fallback: used while the model downloads, and permanently on
browsers without WebGPU. Both engines feed the same refinement pipeline, so the fallback
is a quality step down, never a behaviour change.

## Pipeline

New module `app/portrait-matte.ts`. Pure functions over typed arrays, no DOM, so they
unit-test under the existing `node --test` setup. A thin canvas orchestrator is the only
DOM-touching part.

```
refineMatte(mask, guideLuma, w, h, options) -> Float32Array
guidedFilter(guide, input, w, h, radius, epsilon) -> Float32Array
applyAlphaPolicy(alpha, options) -> Float32Array
decontaminate(rgba, alpha, w, h, radius) -> void
alphaBounds(alpha, w, h) -> {minX,minY,maxX,maxY} | null
```

### Stage 1 — preserve-biased alpha

Replaces the smoothstep:

```
n     = clamp((v - 0.02) / (0.80 - 0.02))   // 0.02 -> exactly 0, 0.80 -> exactly 1
alpha = n ^ 0.75                            // exponent < 1 lifts the uncertain middle
```

A probability of 0.30 now yields 0.46 alpha instead of 0.26. `v <= 0.02` still maps to
exact zero, so the background is genuinely transparent with no haze.

**The curve is per-engine.** The values above correct MediaPipe's poorly calibrated
confidence output. BiRefNet already emits a calibrated soft matte, so lifting it the same
way would add haze rather than recover hair. BiRefNet therefore uses a near-identity
policy — `noiseFloor 0.01`, `solidPoint 0.97`, exponent `0.95` — whose only jobs are
snapping true zero and true one, and clearing dark-background noise. `applyAlphaPolicy`
takes these as options; the engine supplies them. Both settings are covered by the
preservation-bias test.

### Stage 2 — guided filter

The model matte is 1024 square; outputs are up to 2650 px. A guided filter (He et al.)
refits alpha to the full-resolution photo's own edges: per local window it solves
`alpha ~= a * luma + b`, so the matte boundary lands where the image boundary actually
is. Fast variant — box filters over integral images at quarter scale, coefficients
upsampled. Radius 8, epsilon 1e-4.

This is arithmetic over pixels that already exist. It cannot add a strand that is not in
the photograph; it recovers strands the low-resolution matte smeared over.

### Stage 3 — spill removal

Edge pixels satisfy `C = a * F + (1 - a) * B`. For `0.02 < a < 0.95`, sample the nearest
confident foreground and background neighbours within about 4 px and solve for `F`.
Where no confident background neighbour exists, leave the pixel unchanged.

### Stage 4 — framing

Matting produces a full-frame matte at source dimensions. What is returned is trimmed to
`alphaBounds` — the box containing every pixel with alpha strictly above zero, not the
current 0.45 threshold. Removing only fully transparent pixels is provably zero subject
loss, and it keeps `fitPortraitBottom` and the `object-fit: contain` CSS working
unchanged.

### Shared with the studio

`image-enhancement.ts:186` uses the same refined matte, and the 1.2% offset dilate at
`:293` is removed.

## Known limits

A guided filter needs a visible edge. White shirt on a white wall, clear lenses and soft
cast shadows have no edge to snap to; those stay weak and would need a trimap stage or a
higher-resolution matting model. Whether chairs, desks and held objects belong to the
"person" is decided by the model, not by this pipeline — changing that means changing
models. Deferred, to be revisited once the base quality lands.

## Tests

| Guarantee | Test |
|---|---|
| No crop loss | trim bounds include a pixel at alpha 0.004 |
| True transparency | probability 0 maps to alpha exactly 0 |
| Solid subject | interior stays at or above 0.99 — no washed-out skin |
| Preservation bias | new policy alpha >= old smoothstep alpha for every v |
| Edge snapping | synthetic step-edge guide plus blurred input — output edge aligns within 1 px |
| Spill correctness | known F, B, a composited, then F recovered within tolerance |
| Non-generative | RGB unchanged wherever alpha >= 0.95 |
| Fallback parity | MediaPipe and BiRefNet mattes both pass every guarantee above |

## Second workstream: comparison slider

`app/studio.tsx:85` layers two images that are not the same picture.

- After layer: `renderProfessionalPhoto(..., targetAspect)`, which re-crops through
  `portraitCrop(image, assets, targetAspect)` at `image-enhancement.ts:272`. Default
  aspect 0.8 (4:5).
- Original layer: raw `src`, at whatever aspect the camera produced.

Both carry `object-fit: contain` (`studio-enhance.css:79`), which letterboxes each image
to *its own* aspect. Different aspects mean different sizes and positions inside the
box, so the head and shoulders do not meet at the divider.

Compounding this, `.enhance-preview` has `flex: 1; min-height: 520px` and no
aspect-ratio, so a portrait photo sits pillarboxed in a wide box while the divider and
the invisible range input span the full container. Most of the slider's travel is over
black bars.

### Fix

1. Export `renderFramedOriginal(src, assets, targetAspect)` from `image-enhancement.ts`,
   reusing the existing `portraitCrop` and `frameSource` with no tone stages. Both layers
   then share identical framing and dimensions. This is safe because `applyFaceRetouch`
   (`:156`) and `addRelight` (`:255`) already early-return on zero strength, so the crop
   path alone is a clean passthrough.
2. Set `aspect-ratio` on `.enhance-preview` from `targetAspect`, with a `max-height` so
   it still fits the panel. The box then matches the photo and the divider travels only
   across the image.

## Files

| File | Change |
|---|---|
| `app/portrait-matte.ts` | new — refinement pipeline |
| `app/portrait-engine.ts` | new — BiRefNet loader, MediaPipe fallback, engine selection |
| `tests/portrait-matte.test.mjs` | new |
| `app/brand-assets.tsx` | `createPortraitCutout` delegates to the new modules |
| `app/image-enhancement.ts` | shared matte; drop the offset dilate; add `renderFramedOriginal` |
| `app/studio.tsx` | comparison uses the framed original |
| `app/studio-enhance.css` | preview box adopts the photo's aspect ratio |
| `package.json` | add `@huggingface/transformers`; register the new test file |
