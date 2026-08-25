"use client";

import {portraitPrompt} from "./portrait-prompt";

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
export const puterImageModel="gemini-2.5-flash-image";
export const puterEngineLabel=`${puterImageModel} via Puter`;

type PuterUser={username?:string;email?:string};
type PuterSDK={
 auth:{isSignedIn():boolean;signIn():Promise<unknown>;getUser():Promise<PuterUser>;signOut():Promise<unknown>};
 ai:{txt2img(prompt:string,options:Record<string,unknown>):Promise<HTMLImageElement>};
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

// Never triggers a sign-in popup — that only happens from the explicit "Connect" button below.
export async function puterStatus():Promise<PuterStatus>{
 try{
  const puter=await loadPuter(),signedIn=puter.auth.isSignedIn();
  return {loaded:true,signedIn,user:signedIn?await puter.auth.getUser().catch(()=>undefined):undefined};
 }catch{return {loaded:false,signedIn:false}}
}

export async function connectPuter():Promise<PuterUser|null>{
 const puter=await loadPuter();
 await puter.auth.signIn();
 return puter.auth.getUser().catch(()=>null);
}

export async function disconnectPuter():Promise<void>{
 const puter=await loadPuter().catch(()=>null);
 await puter?.auth.signOut().catch(()=>{});
}

const blobToDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});

// Nothing here goes through our own server, so the 1 MiB dev-server body cap that trims Image 1 for the
// OpenAI/Gemini path does not apply — the full-resolution photo goes straight to Puter.
export async function generateWithPuter(src:string):Promise<{dataUrl:string;width:number;height:number}>{
 const puter=await loadPuter();
 if(!puter.auth.isSignedIn())throw new Error("Sign in to Puter first.");
 const dataUrl=src.startsWith("data:")?src:await fetch(src).then(response=>response.blob()).then(blobToDataUrl);
 const mimeMatch=/^data:([^;]+);/.exec(dataUrl),comma=dataUrl.indexOf(",");
 const image=await puter.ai.txt2img(portraitPrompt,{model:puterImageModel,input_image:dataUrl.slice(comma+1),input_image_mime_type:mimeMatch?.[1]??"image/jpeg"});
 return new Promise((resolve,reject)=>{
  const probe=new Image();
  probe.onload=()=>resolve({dataUrl:image.src,width:probe.naturalWidth,height:probe.naturalHeight});
  probe.onerror=()=>reject(new Error("Puter returned an image this browser could not read."));
  probe.src=image.src;
 });
}
