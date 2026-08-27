import type {PhotoRating} from "./photo-quality.ts";

// "other" is a real bucket, not a missing value: a photo can be kept for the subsale banner or any
// other artwork without being the live Atlas profile photo or an awards-night entry. "both" is the
// one photo that is the live Atlas slot and an awards-night entry at the same time — Atlas stays
// exclusive; awards night does not.
export type PhotoCategory="atlas"|"awards"|"other"|"both";
export type PhotoUse="atlas"|"awards";
export type AtlasSlotPhoto={src:string;verified:boolean;rating?:PhotoRating};
const storageKey="ps-atlas-profile";
export const atlasPhotoChanged="ps-atlas-profile";
// Empty until the agent files a photo. Restoring the bundled demo portrait would put a face on Atlas
// that nobody chose — the same failure as auto-assigning Atlas on designer approval.
const defaultSlot=():AtlasSlotPhoto=>({src:"",verified:false});

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

export function photoUsesAtlas(category?:PhotoCategory){
 return category==="atlas"||category==="both";
}
export function photoUsesAwards(category?:PhotoCategory){
 return category==="awards"||category==="both";
}
export function categoryFromUses(atlas:boolean,awards:boolean):PhotoCategory{
 if(atlas&&awards)return"both";
 if(atlas)return"atlas";
 if(awards)return"awards";
 return"other";
}
// What the designer desk shows. "other" carries no badge: only the two slots a designer has to keep
// apart — the live Atlas profile photo and an awards-night entry — do.
export function photoCategoryBadge(category?:PhotoCategory|string){
 if(category==="both")return"Atlas photo · Awards night";
 if(category==="atlas")return"Atlas photo";
 if(category==="awards")return"Awards night";
}

// Demoting the previous Atlas photo drops Atlas-only photos back to "other". A photo that was also
// on awards night stays there — the agent asked for both, and losing the live slot is not a request
// to leave the event.
export function withSingleAtlasPhoto<T extends {id:string;profileOK:boolean;category?:PhotoCategory}>(photos:T[],atlasId:string):T[]{
 return photos.map(item=>{
  if(item.id===atlasId)return{...item,profileOK:true,category:categoryFromUses(true,photoUsesAwards(item.category))};
  if(photoUsesAtlas(item.category))return{...item,profileOK:false,category:categoryFromUses(false,photoUsesAwards(item.category))};
  return{...item,profileOK:false};
 });
}

export function withToggledPhotoUse<T extends {id:string;profileOK:boolean;category?:PhotoCategory}>(photos:T[],id:string,use:PhotoUse):T[]{
 const chosen=photos.find(item=>item.id===id);
 if(!chosen)return photos;
 if(use==="atlas"){
  if(photoUsesAtlas(chosen.category))return photos.map(item=>item.id===id?{...item,profileOK:false,category:categoryFromUses(false,photoUsesAwards(item.category))}:item);
  return withSingleAtlasPhoto(photos,id);
 }
 const awards=!photoUsesAwards(chosen.category);
 return photos.map(item=>item.id===id?{...item,category:categoryFromUses(photoUsesAtlas(item.category),awards)}:item);
}
