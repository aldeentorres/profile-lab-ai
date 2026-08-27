"use client";

import {portraitPrompt} from "./portrait-prompt.ts";

// A third "Generate AI Portrait" backend, alongside the server-proxied OpenAI/Gemini adapters in
// ./portrait-generation: Puter.js (https://developer.puter.com) runs entirely in the browser and needs
// no server-side key — the person signed in on this device pays for their own generations through their
// own Puter account. That makes it the natural first choice on a kiosk that has been signed in once
// during setup: free for us to run, and no interactive login for the agent using the studio afterward.
// Same fallback discipline as every other adapter here: never a hard dependency, on-device pipeline
// underneath it always works.
//
// The script is loaded lazily, only when a caller actually asks for Puter's status, so an offline studio
// session never touches the network for this. Sign-in is a one-time, staff-only action (see the "Connect
// AI generation" control in Review & Enhance) — the resulting session lives in this browser's own storage
// for puter.com, the same as any other site login, and survives across studio sessions on this device.
// A staffed kiosk that cannot afford even that one click can set PUTER_AUTH_TOKEN instead — see
// applyConfiguredToken below and app/api/puter-auth for what that costs in exposure.

// Puter's txt2img default is gpt-image-1-mini at quality "low" (~$0.005 img2img). Gemini 2.5 Flash Image
// ("Nano Banana") is a premium bill: a new account's monthly allowance cannot cover it, and retrying the
// provider-prefixed alias reserved a second max-cost while the first was still in flight. The prefixed
// OpenAI id is only a fallback for a renamed catalog entry — never a second spend after 402.
export const puterImageModels=["gpt-image-1-mini","openai/gpt-image-1-mini"] as const;
export const puterImageModel=puterImageModels[0];
export const puterEngineLabel=`${puterImageModel} via Puter`;

export function isPuterCreditError(cause:unknown){
 const text=[cause instanceof Error?cause.message:"",typeof cause==="string"?cause:"",(()=>{try{return JSON.stringify(cause??"")}catch{return ""}})()].join(" ").toLowerCase();
 return /insufficient[_ ]?(funds|credit)|error_402|402_payment|available funding is insufficient/.test(text)
  || (typeof cause==="object"&&cause!==null&&"status" in cause&&(cause as {status?:number}).status===402);
}

export function shouldRetryPuterModel(cause:unknown){
 return !isPuterCreditError(cause);
}

export function puterTxt2ImgOptions(dataUrl:string,model:string){
 return {model,quality:/gemini/i.test(model)?"1K":"low",input_image:dataUrl};
}

type PuterUser={username?:string;email?:string};
type PuterSDK={
 auth:{isSignedIn():boolean;signIn():Promise<unknown>;getUser():Promise<PuterUser>;signOut():Promise<unknown>};
 ai:{txt2img(prompt:string,options:Record<string,unknown>):Promise<HTMLImageElement>};
 setAuthToken?(token:string):void;
};
declare global{interface Window{puter?:PuterSDK}}

const scriptSrc="https://js.puter.com/v2/";
let loadPromise:Promise<PuterSDK>|null=null;

function loadPuter():Promise<PuterSDK>{
 loadPromise??=new Promise<PuterSDK>((resolve,reject)=>{
  if(typeof window==="undefined")return reject(new Error("Puter is a browser-only adapter."));
  if(window.puter){resolve(window.puter);return}
  const existing=document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`),script=existing??document.createElement("script");
  script.src=scriptSrc;
  script.addEventListener("load",()=>window.puter?resolve(window.puter):reject(new Error("Puter script loaded but did not initialise.")));
  script.addEventListener("error",()=>reject(new Error("Could not reach js.puter.com.")));
  if(!existing)document.head.appendChild(script);
 }).catch(error=>{loadPromise=null;throw error});
 return loadPromise;
}

export type PuterStatus={loaded:boolean;signedIn:boolean;user?:PuterUser};

// An optional pre-issued session, so a staffed kiosk can generate without anyone clicking Connect. The
// token necessarily reaches the browser to be usable by a browser-only SDK (see app/api/puter-auth), so
// it is opt-in and absent by default. Asked for once per page: a missing or rejected token simply leaves
// the interactive Connect button as the way in.
let tokenApplied:Promise<boolean>|null=null;
function applyConfiguredToken(puter:PuterSDK):Promise<boolean>{
 tokenApplied??=(async()=>{
  try{
   if(typeof puter.setAuthToken!=="function")return false;
   const response=await fetch("/api/puter-auth",{cache:"no-store"});
   if(!response.ok)return false;
   const result=await response.json() as {configured?:boolean;token?:string};
   if(!result.configured||!result.token)return false;
   puter.setAuthToken(result.token);
   return true;
  }catch{return false}
 })();
 return tokenApplied;
}

// The load step every caller goes through: script in place, and a configured token applied before anyone
// reads isSignedIn(), so a token-configured kiosk reports as connected without an interactive sign-in.
async function puterReady():Promise<PuterSDK>{
 const puter=await loadPuter();
 if(!puter.auth.isSignedIn())await applyConfiguredToken(puter);
 return puter;
}

// Never triggers a sign-in popup — that only happens from the explicit "Connect" button below.
export async function puterStatus():Promise<PuterStatus>{
 try{
  const puter=await puterReady(),signedIn=puter.auth.isSignedIn();
  return {loaded:true,signedIn,user:signedIn?await puter.auth.getUser().catch(()=>undefined):undefined};
 }catch{return {loaded:false,signedIn:false}}
}

export async function connectPuter():Promise<PuterUser|null>{
 // puterReady() would apply PUTER_AUTH_TOKEN first, after which signIn() is a no-op — Generate then
 // bills the kiosk account (often already drained) even when the person just created a new Puter login.
 const puter=await loadPuter();
 await puter.auth.signOut().catch(()=>{});
 tokenApplied=null;
 await puter.auth.signIn();
 return puter.auth.getUser().catch(()=>null);
}

export async function disconnectPuter():Promise<void>{
 const puter=await loadPuter().catch(()=>null);
 await puter?.auth.signOut().catch(()=>{});
 tokenApplied=null;
}

const blobToDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});

// Nothing here goes through our own server, so the 1 MiB dev-server body cap that trims Image 1 for the
// OpenAI/Gemini path does not apply. The reference is still downscaled to a 1024 long edge: a 2650×1786
// PNG as img2img input is a larger reservation than a new-account allowance can cover.
// Puter rejects with plain objects ({code,message} or {error:{message}}), not Error instances, so a
// bare `error instanceof Error ? error.message : "…"` upstream would replace every real reason with a
// generic one. Everything thrown from here is a real Error carrying Puter's own words.
function puterError(cause:unknown,fallback:string){
 const detail=cause as {message?:string;error?:{message?:string;code?:string};code?:string}|null|undefined;
 return new Error(detail?.error?.message||detail?.message||detail?.error?.code||detail?.code||fallback);
}

const probeGenerated=(source:string)=>new Promise<{dataUrl:string;width:number;height:number}>((resolve,reject)=>{
 if(!source)return reject(new Error("Puter returned no image data."));
 const probe=new Image();
 probe.onload=()=>resolve({dataUrl:source,width:probe.naturalWidth,height:probe.naturalHeight});
 probe.onerror=()=>reject(new Error("Puter returned an image this browser could not read."));
 probe.src=source;
});

const puterInputLongEdge=1024;
function downscalePortraitDataUrl(dataUrl:string):Promise<string>{
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
   const long=Math.max(image.naturalWidth,image.naturalHeight);
   if(!long||long<=puterInputLongEdge)return resolve(dataUrl);
   const scale=puterInputLongEdge/long,canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const ctx=canvas.getContext("2d");
   if(!ctx)return resolve(dataUrl);
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   resolve(canvas.toDataURL("image/jpeg",0.9));
  };
  image.onerror=()=>resolve(dataUrl);
  image.src=dataUrl;
 });
}

export async function generateWithPuter(src:string):Promise<{dataUrl:string;width:number;height:number}>{
 const puter=await puterReady();
 // No isSignedIn() gate. The SDK signs in on demand inside the call, and its token is read back through
 // a cross-origin frame that can still report false right after the Connect popup closes — gating here
 // turned a connected kiosk into a silent drop to the local pipeline instead of a generation.
 const dataUrl=await downscalePortraitDataUrl(src.startsWith("data:")?src:await fetch(src).then(response=>response.blob()).then(blobToDataUrl));
 let lastError:unknown=null;
 for(const model of puterImageModels){
  try{return await probeGenerated((await puter.ai.txt2img(portraitPrompt,puterTxt2ImgOptions(dataUrl,model)))?.src)}
  catch(error){lastError=error;if(!shouldRetryPuterModel(error))break}
 }
 throw puterError(lastError,"Puter generation failed.");
}
