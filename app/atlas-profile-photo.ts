import type {PhotoRating} from "./photo-quality.ts";
import {atlasPhotoSrc} from "./mock-agent.ts";

// "other" is a real bucket, not a missing value: a photo can be kept for the subsale banner or any
// other artwork without being the live Atlas profile photo or an awards-night entry.
export type PhotoCategory="atlas"|"awards"|"other";
export type AtlasSlotPhoto={src:string;verified:boolean;rating?:PhotoRating};
const storageKey="ps-atlas-profile";
export const atlasPhotoChanged="ps-atlas-profile";
const defaultSlot=():AtlasSlotPhoto=>({src:atlasPhotoSrc,verified:true});

export function readAtlasProfilePhoto():AtlasSlotPhoto{
 if(typeof window==="undefined")return defaultSlot();
 try{
  const raw=localStorage.getItem(storageKey);
  if(!raw)return defaultSlot();
  const parsed=JSON.parse(raw) as {src?:string;rating?:PhotoRating};
  if(parsed?.src)return{src:parsed.src,verified:true,rating:parsed.rating};
 }catch{/* a full or unavailable store must not block the profile */}
 return defaultSlot();
}

export function writeAtlasProfilePhoto(src:string,rating?:PhotoRating){
 try{localStorage.setItem(storageKey,JSON.stringify({src,verified:true,rating}))}catch{/* quota must not block saving the portrait */}
 if(typeof window!=="undefined")window.dispatchEvent(new Event(atlasPhotoChanged));
}

export function clearAtlasProfilePhoto(){
 try{localStorage.removeItem(storageKey)}catch{/* ignore */}
 if(typeof window!=="undefined")window.dispatchEvent(new Event(atlasPhotoChanged));
}

// Demoting the previous Atlas photo drops it back to "other" rather than filing it under awards
// night — the agent never asked for that, and an awards entry is a separate deliberate choice.
export function withSingleAtlasPhoto<T extends {id:string;profileOK:boolean;category?:PhotoCategory}>(photos:T[],atlasId:string):T[]{
 return photos.map(item=>item.id===atlasId?{...item,category:"atlas" as const,profileOK:true}:{...item,profileOK:false,category:item.category==="atlas"?"other" as const:item.category});
}
