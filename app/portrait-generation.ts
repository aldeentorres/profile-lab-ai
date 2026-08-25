import {compositeOnWhite, computePortraitMatte, confidentFace, loadImage, prepareEnhancementAssets, renderProfessionalPhoto, type EnhanceSettings, type EnhancementAssets, type FaceRegion, type PoseLandmark, type RenderedPhoto} from "./image-enhancement";
import {generateWithPuter, puterEngineLabel, puterStatus} from "./puter-portrait";
import type {PhotoRating} from "./photo-quality";
import {identitySimilarity, type PortraitCheckSignals} from "./portrait-checks";

// "Generate AI Portrait" is an adapter with three implementations and one contract: the agent's photo is
// the sole identity reference, and whatever comes back is re-scored and checked in ./portrait-checks.
// Tried in this order:
//
//   puter        ./puter-portrait — Puter.js, entirely in the browser, no server key: the person signed
//                in on this device pays for their own generations. The natural first choice once a kiosk
//                has been connected once during setup. Takes only the identity photo, no reference image.
//   generative   /api/portrait-generation — the identity-locked prompt in ./portrait-prompt with the
//                photo as Image 1 and one gender-matched bundled reference as Image 2. Rebuilds wardrobe,
//                pose, camera perspective, background and lighting. Optional: needs a server-side key.
//   on-device    the local pipeline: framing, a studio backdrop, studio lighting, a light retouch, a
//                high-resolution export. The face, its features, skin, age and hair are the original
//                pixels, so identity is preserved by construction. Always available, and the fallback
//                the moment every generative option is missing, unconnected, slow or fails — the demo
//                never waits on any of them.
// White by construction: the same matting cutout the manual editor and the Assets subsale banner use,
// not a second processing pass over a rendered backdrop.
export const corporatePortraitSettings:EnhanceSettings={skin:22,light:36,definition:26,background:"white",highResolution:true};
export const localPortraitEngine="On-device studio pipeline · non-generative";
export type PortraitReference="female"|"male";
export const portraitReferenceLabels:Record<PortraitReference,string>={female:"Female presentation",male:"Male presentation"};
export type PortraitProvider="puter"|"remote"|"local";
// `available` gates whether Generate can run without a local-only fallback; `needsReference` is true only
// for the server-proxied path, which is the one that actually takes a reference image; `puterConnectable`
// tells the UI whether to offer the one-time "Connect" action even when Puter is not the active provider.
export type PortraitEngineStatus={available:boolean;engine:string;provider:PortraitProvider;needsReference:boolean;puterConnectable:boolean;puterSignedIn:boolean;reason?:string};
export type GeneratedPortrait=RenderedPhoto&{engine:string;generative:boolean;fallbackReason?:string};

let remoteStatus:Promise<{available:boolean;engine:string;reason?:string}>|null=null;
function remoteEngineStatus(){
 remoteStatus??=fetch("/api/portrait-generation",{cache:"no-store"}).then(async response=>{const result=await response.json() as {available?:boolean;engine?:string;reason?:string};return {available:Boolean(result.available),engine:result.available&&result.engine?result.engine:localPortraitEngine,reason:result.reason}}).catch(()=>({available:false,engine:localPortraitEngine,reason:"service_unavailable"}));
 return remoteStatus;
}

// Recomputed on every call, unlike the cached server check above: Puter's signed-in state can change
// live the moment the agent (or a staff member) clicks Connect, and the UI needs that reflected at once.
export async function portraitEngineStatus():Promise<PortraitEngineStatus>{
 const puter=await puterStatus();
 if(puter.signedIn)return {available:true,engine:puterEngineLabel,provider:"puter",needsReference:false,puterConnectable:true,puterSignedIn:true};
 const remote=await remoteEngineStatus();
 if(remote.available)return {available:true,engine:remote.engine,provider:"remote",needsReference:true,puterConnectable:puter.loaded,puterSignedIn:false};
 // Puter script present but isSignedIn() reads false: still route to Puter rather than silently going
 // local. That flag is unreliable immediately after the Connect popup (its token arrives through a
 // cross-origin frame), and the SDK signs in on demand inside the call anyway. A cancelled or failed
 // attempt falls through to the on-device pipeline exactly as before, so nothing becomes a hard dependency.
 if(puter.loaded)return {available:true,engine:puterEngineLabel,provider:"puter",needsReference:false,puterConnectable:true,puterSignedIn:false};
 return {available:false,engine:localPortraitEngine,provider:"local",needsReference:false,puterConnectable:false,puterSignedIn:false,reason:remote.reason};
}

const blobToDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});

// The dev server refuses request bodies over 1 MiB, so Image 1 is re-encoded under 900 KB before it is
// sent: long edge stepped down from 1600px, JPEG quality held high so the face keeps its detail. The
// references never travel from the browser — the route loads them from its own origin.
export const identityUploadLimit=900*1024;
async function prepareIdentityUpload(src:string):Promise<Blob>{
 const original=await fetch(src).then(response=>response.blob());
 if(original.size<=identityUploadLimit)return original;
 const image=await loadImage(src),canvas=document.createElement("canvas"),context=canvas.getContext("2d");
 if(!context)return original;
 for(let longEdge=1600;longEdge>=800;longEdge-=200){
  const scale=Math.min(1,longEdge/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.9));
  if(blob&&blob.size<=identityUploadLimit)return blob;
 }
 throw new Error("The photo is too large to send for generation.");
}

async function generateRemotePortrait(src:string,targetAspect:number,reference:PortraitReference):Promise<RenderedPhoto>{
 const photo=await prepareIdentityUpload(src);
 const form=new FormData();
 form.set("image",photo,"image-1.jpg");
 form.set("format",targetAspect===1?"square":"portrait");
 form.set("gender",reference);
 const response=await fetch("/api/portrait-generation",{method:"POST",body:form});
 if(!response.ok){const result=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(result?.error||"The portrait could not be generated.")}
 const dataUrl=await blobToDataUrl(await response.blob()),image=await loadImage(dataUrl);
 return {dataUrl,width:image.naturalWidth,height:image.naturalHeight};
}

async function generateLocalPortrait(src:string,targetAspect:number):Promise<RenderedPhoto>{
 const assets=await prepareEnhancementAssets(src);
 // Without a person mask there is nothing to cut out, so the scene is kept — the same rule the manual
 // editor applies. With one, the matte is computed once and threaded through the same crop pipeline.
 const matte=await computePortraitMatte(src,assets.personMask).catch(()=>null);
 const settings=matte?corporatePortraitSettings:{...corporatePortraitSettings,background:"original" as const};
 return renderProfessionalPhoto(src,settings,assets,false,targetAspect,matte);
}

// The generative provider is asked for a light studio backdrop, not a guaranteed one, so its result is
// still run through the same matting cutout as everything else — one pass, at the image's own framing,
// no re-crop. The local pipeline already produces white by construction (see generateLocalPortrait).
async function whiteBackgroundOf(rendered:RenderedPhoto):Promise<RenderedPhoto>{
 const assets=await prepareEnhancementAssets(rendered.dataUrl).catch(()=>({face:null,faces:[],personMask:null,pose:null}));
 return compositeOnWhite(rendered.dataUrl,assets.personMask).catch(()=>rendered);
}

// Thrown when a generative engine was actually reached and refused the job — an out-of-credit account,
// a rejected model, a dropped connection. It carries the provider's own words so the agent is told what
// happened instead of being handed a quietly-substituted on-device render that reads as success.
export class PortraitGenerationError extends Error{
 constructor(message:string,readonly engine:string){super(message);this.name="PortraitGenerationError"}
}

// `allowLocalFallback` is the agent's explicit second choice after a failure has been shown, never the
// automatic consequence of one. The on-device pipeline stays the offline safety net it always was — it
// just no longer masks a generative failure the agent asked for and deserves to hear about.
export async function generateCorporatePortrait(src:string,targetAspect=.8,reference:PortraitReference="female",{allowLocalFallback=false}:{allowLocalFallback?:boolean}={}):Promise<GeneratedPortrait>{
 const status=await portraitEngineStatus();
 if(status.provider!=="local"&&!allowLocalFallback){
  const remote=status.provider==="puter"?await generateWithPuter(src).catch(error=>{throw new PortraitGenerationError(error instanceof Error?error.message:"Puter generation failed.",status.engine)}):await generateRemotePortrait(src,targetAspect,reference).catch(error=>{throw new PortraitGenerationError(error instanceof Error?error.message:"The portrait service failed.",status.engine)});
  return {...await whiteBackgroundOf(remote),engine:status.engine,generative:true};
 }
 // Nothing generative is reachable at all (offline, no Puter script, no server key), or the agent chose
 // the on-device pipeline after seeing why generation failed. Either way this is the documented
 // non-generative path, not a silent substitution.
 const fallbackReason=allowLocalFallback||status.provider!=="local"?undefined:status.reason==="not_configured"?"No AI engine is connected on this device (Puter or a server key).":status.reason?`AI engine unavailable: ${status.reason}.`:"No AI engine is connected on this device.";
 return {...await generateLocalPortrait(src,targetAspect),engine:localPortraitEngine,generative:false,fallbackReason};
}

export function primaryFace(assets:EnhancementAssets):FaceRegion|null{
 const faces=assets.faces??(assets.face?[assets.face]:[]),confident=faces.filter(item=>(item.confidence??1)>=confidentFace);
 return (confident.length?confident:faces)[0]??null;
}

// Shoulder span over face height, in pixels. A uniform crop and scale leaves it unchanged; a generator
// that stretched a torso or shrank a head moves it. Landmarks and the face box are normalised to their
// own image, so the frame aspect (width / height) converts both to the same unit — without it a square
// original against a 4:5 enhanced crop reads as a 20% "reshape" that never happened. Needs both
// shoulders tracked, otherwise unknown.
export function bodyProportion(pose:PoseLandmark[]|null,face:FaceRegion|null,frameAspect:number):number|null{
 const left=pose?.[11],right=pose?.[12];
 if(!face||!left||!right||left.visibility<.5||right.visibility<.5||face.height<=0||!(frameAspect>0))return null;
 return Math.abs(left.x-right.x)*frameAspect/face.height;
}

export function portraitCheckSignals(rating:PhotoRating,assets:EnhancementAssets,frameAspect:number):PortraitCheckSignals{
 return {faceCount:rating.face_count,faceHeightPixels:rating.face_height_pixels,hands:rating.hands,structureScore:rating.structure_score,fidelityScore:rating.fidelity_score,bodyProportion:bodyProportion(assets.pose,primaryFace(assets),frameAspect),qualityDefects:rating.quality_defects};
}

// The face region resampled to a small luminance grid: enough to tell one face from another and cheap
// enough to run twice per generation. Exposure is normalised later by the correlation itself.
const signatureSize=24;
export async function faceSignature(src:string,face:FaceRegion|null):Promise<Float32Array|null>{
 if(!face)return null;
 const image=await loadImage(src),canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
 if(!context)return null;
 canvas.width=signatureSize;canvas.height=signatureSize;
 context.drawImage(image,face.x*image.naturalWidth,face.y*image.naturalHeight,face.width*image.naturalWidth,face.height*image.naturalHeight,0,0,signatureSize,signatureSize);
 const pixels=context.getImageData(0,0,signatureSize,signatureSize).data,luminance=new Float32Array(signatureSize*signatureSize);
 for(let index=0;index<pixels.length;index+=4)luminance[index/4]=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
 return luminance;
}

export async function compareIdentity(originalSrc:string,originalAssets:EnhancementAssets,enhancedSrc:string,enhancedAssets:EnhancementAssets):Promise<number|null>{
 const [original,enhanced]=await Promise.all([faceSignature(originalSrc,primaryFace(originalAssets)),faceSignature(enhancedSrc,primaryFace(enhancedAssets))]);
 return original&&enhanced?identitySimilarity(original,enhanced):null;
}
