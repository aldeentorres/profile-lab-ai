// The identity-preserving corporate portrait transformation criteria, sent verbatim to the portrait
// generation adapter with the agent's photo as Image 1 and, where the backend takes one, a gender-matched
// presentation reference — see ./portrait-references — as Image 2. Imported both server-side
// (app/api/portrait-generation, for the OpenAI/Gemini adapters) and client-side (./puter-portrait, which
// runs entirely in the browser and has no server leg to call). Edit the criteria here, nowhere else.
export const portraitPromptVersion="2026-08-24";
export const portraitPrompt=`Use case: identity-preserving corporate portrait transformation

Create a premium, photorealistic corporate half-body portrait of the person in Image 1.

IMAGE ROLES

- Image 1 is the sole and absolute identity source.
- Image 2, if provided, may influence only the pose, framing, wardrobe direction, lighting, background, and presentation quality.
- Never copy or blend the face, body, age, ethnicity, hairstyle, expression, or identity of anyone in Image 2.
- If a reference image conflicts with the identity in Image 1, always prioritize Image 1.

ABSOLUTE IDENTITY AND FACE LOCK

The person in the finished portrait must be unmistakably the exact same real person shown in Image 1—not a similar-looking recreation.

Do not change, reinterpret, enhance, correct, beautify, idealize, or regenerate any facial feature.

Preserve exactly:

- Overall head shape and facial proportions
- Forehead size and shape
- Hairline, temples, and side profile
- Eyebrow shape, thickness, position, and asymmetry
- Eye shape, size, spacing, eyelids, and natural gaze
- Nose bridge, length, width, tip, and nostrils
- Cheek shape, volume, texture, and asymmetry
- Jawline, chin, and lower-face proportions
- Lips, mouth width, lip shape, and resting position
- Natural expression shown in Image 1
- Skin tone, pores, texture, marks, lines, and facial character
- Apparent age
- Facial hair, if present
- Glasses, including their precise frame shape, size, color, and placement
- Hairstyle, color, length, volume, parting, roots, and hairline
- Earrings and other identity-defining accessories

Preserve the natural distances and relationships between every facial feature. Do not make the face narrower, wider, longer, shorter, younger, smoother, more symmetrical, or conventionally attractive.

Do not change the subject's gender, gender presentation, ethnicity, age, or physical identity. Do not add makeup or alter existing makeup.

The face and head must remain visually locked to Image 1. Change only the clothing, body pose, camera perspective, and background.

EXPRESSION

Preserve the exact expression from Image 1.

- If the subject has a neutral expression, retain it.
- If the subject has a closed-mouth smile, retain it.
- Do not add a toothy smile.
- Do not change the mouth, cheeks, eyebrows, or eyes to create a different emotion.

WARDROBE

Dress the subject in refined corporate smart-casual clothing appropriate to their existing gender presentation:

- Tailored navy blazer worn open
- Crisp white, ivory, or pale-blue professional top
- Neutral beige tailored trousers
- Clean, understated styling
- No logos, badges, lanyards, patterns, or distracting accessories
- Do not feminize or masculinize the subject beyond their appearance in Image 1

POSE AND FRAMING

Create a vertical half-body portrait from the top of the head to approximately mid-thigh.

- Relaxed, confident three-quarter stance
- Only a slight body angle
- Face directed naturally toward the camera
- Shoulders relaxed and anatomically correct
- Arms lowered naturally
- Hands lightly clasped at waist level
- Accurate fingers, hands, wrists, and limbs
- Natural body proportions consistent with the person in Image 1
- Eye-level professional portrait-camera perspective
- Balanced headroom and space around the subject

Correct the original selfie or high-angle perspective without altering the subject's facial geometry or proportions.

BACKGROUND

Use a seamless warm light-gray studio background with a soft tonal gradient.

Keep the background:

- Minimal
- Clean
- Professional
- Free of furniture, architecture, office equipment, and visual clutter

LIGHTING

Use premium corporate studio lighting:

- Large, soft key light
- Gentle fill light
- Subtle separation from the background
- Natural highlights in the eyes
- Realistic shadows
- Accurate skin tone
- Realistic reflections on glasses without obscuring the eyes
- No dramatic beauty lighting
- No lighting that changes the perceived shape of the face

PHOTOGRAPHIC FINISH

Create a high-resolution, photorealistic professional portrait with:

- Crisp, naturally detailed eyes
- Authentic skin pores and texture
- Realistic hair strands
- Accurate glasses and accessories
- Realistic fabric and tailoring
- Believable hands and anatomy
- Natural depth and lens perspective
- Restrained editorial color correction
- Minimal retouching only

The result should look like a genuine professional studio photograph of the exact person—not an AI-generated interpretation.

STRICT CHANGE BOUNDARY

Change only:

- Clothing
- Body pose
- Arm and hand position
- Lower-body reconstruction
- Camera perspective
- Lighting
- Background

Do not change:

- Face
- Head
- Expression
- Identity
- Age
- Ethnicity
- Gender presentation
- Facial proportions
- Hair
- Glasses
- Facial hair
- Skin character
- Identity-defining accessories

NEGATIVE CONSTRAINTS

Avoid identity drift, face replacement, facial blending, beautification, de-aging, skin smoothing, facial symmetry correction, altered jawline, slimmer face, wider face, changed cheeks, different eyes, enlarged eyes, changed eyebrows, altered nose, fuller lips, different mouth, added smile, different expression, makeup, altered hairstyle, changed glasses, changed ethnicity, changed age, changed gender presentation, copied features from a reference person, selfie distortion, wide-angle distortion, stiff passport posing, unnatural body proportions, distorted hands, fused fingers, extra fingers, extra limbs, warped clothing, busy backgrounds, text, logos, badges, lanyards, and watermarks.

FINAL PRIORITY

Exact facial identity preservation is more important than styling, pose, wardrobe, lighting, or visual polish. If any requested transformation risks changing the face, preserve the face and simplify the transformation instead.`;
