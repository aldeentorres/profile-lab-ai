import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryFromUses,
  photoCategoryBadge,
  photoUsesAwards,
  photoUsesAtlas,
  readAtlasProfilePhoto,
  withSingleAtlasPhoto,
  withToggledPhotoUse,
} from "../app/atlas-profile-photo.ts";

test("only one gallery photo can be the Atlas profile photo",()=>{
 const photos=[{id:"a",profileOK:true,category:"atlas"},{id:"b",profileOK:true,category:"atlas"},{id:"c",profileOK:false,category:"awards"}];
 const next=withSingleAtlasPhoto(photos,"b");
 assert.deepEqual(next.map(item=>({id:item.id,profileOK:item.profileOK,category:item.category})),[
  {id:"a",profileOK:false,category:"other"},
  {id:"b",profileOK:true,category:"atlas"},
  {id:"c",profileOK:false,category:"awards"},
 ],"marking a photo for Atlas replaces the previous Atlas slot instead of stacking another");
});

test("demoting the Atlas photo releases it rather than filing it under awards night",()=>{
 const photos=[{id:"a",profileOK:true,category:"atlas"},{id:"b",profileOK:false,category:"awards"}];
 const next=withSingleAtlasPhoto(photos,"b");
 assert.equal(next[0].category,"other","the photo that lost the Atlas slot drops back to other, not awards night");
});

test("a photo promoted to Atlas keeps its awards-night entry",()=>{
 const photos=[{id:"a",profileOK:true,category:"atlas"},{id:"b",profileOK:false,category:"awards"}];
 const next=withSingleAtlasPhoto(photos,"b");
 assert.equal(next[1].category,"both","Atlas and awards night are independent — promoting to Atlas must not clear awards");
 assert.equal(next[1].profileOK,true,"the promoted photo is the live Atlas slot");
});

test("demoting an Atlas photo that is also awards keeps the awards entry",()=>{
 const photos=[{id:"a",profileOK:true,category:"both"},{id:"b",profileOK:false,category:"other"}];
 const next=withSingleAtlasPhoto(photos,"b");
 assert.equal(next[0].category,"awards","losing the Atlas slot must not take the photo off awards night");
 assert.equal(next[0].profileOK,false,"only one photo stays the live Atlas slot");
});

test("a photo with no category recorded is left alone, not filed under awards night",()=>{
 const next=withSingleAtlasPhoto([{id:"a",profileOK:false},{id:"b",profileOK:false}],"b");
 assert.equal(next[0].category,undefined,"a photo with no recorded category reads as other and is never rewritten to awards");
});

test("awards night holds as many photos as the agent picks",()=>{
 const photos=[{id:"a",profileOK:false,category:"awards"},{id:"b",profileOK:false,category:"awards"},{id:"c",profileOK:false,category:"other"}];
 const next=withSingleAtlasPhoto(photos,"c");
 assert.deepEqual(next.filter(item=>photoUsesAwards(item.category)).map(item=>item.id),["a","b"],
  "only the Atlas slot is exclusive — promoting a photo to Atlas never evicts an awards-night entry");
});

test("toggling awards on the Atlas photo files it for both",()=>{
 const photos=[{id:"a",profileOK:true,category:"atlas"},{id:"b",profileOK:false,category:"other"}];
 const next=withToggledPhotoUse(photos,"a","awards");
 assert.equal(next[0].category,"both","the live Atlas photo can also be an awards-night entry");
 assert.equal(next[0].profileOK,true,"toggling awards must not vacate the Atlas slot");
 assert.equal(next[1].category,"other","other photos stay as they were");
});

test("toggling Atlas off a both photo leaves it on awards night",()=>{
 const photos=[{id:"a",profileOK:true,category:"both"}];
 const next=withToggledPhotoUse(photos,"a","atlas");
 assert.equal(next[0].category,"awards","turning Atlas off is not the same as leaving awards night");
 assert.equal(next[0].profileOK,false,"the gallery must not keep a live Atlas slot the agent took back");
});

test("toggling Atlas onto a second photo demotes the first without clearing its awards use",()=>{
 const photos=[{id:"a",profileOK:true,category:"both"},{id:"b",profileOK:false,category:"awards"}];
 const next=withToggledPhotoUse(photos,"b","atlas");
 assert.deepEqual(next.map(item=>({id:item.id,profileOK:item.profileOK,category:item.category})),[
  {id:"a",profileOK:false,category:"awards"},
  {id:"b",profileOK:true,category:"both"},
 ],"Atlas stays one live photo; awards stays on every photo the agent already picked");
});

test("categoryFromUses encodes Atlas and awards independently",()=>{
 assert.equal(categoryFromUses(true,true),"both");
 assert.equal(categoryFromUses(true,false),"atlas");
 assert.equal(categoryFromUses(false,true),"awards");
 assert.equal(categoryFromUses(false,false),"other");
});

test("photoUsesAtlas and photoUsesAwards read a both filing as both destinations",()=>{
 assert.equal(photoUsesAtlas("both"),true,"a both photo is the Atlas slot");
 assert.equal(photoUsesAwards("both"),true,"a both photo is also an awards-night entry");
 assert.equal(photoUsesAtlas("awards"),false);
 assert.equal(photoUsesAwards("atlas"),false);
});

test("the designer badge names both destinations when a photo is filed for both",()=>{
 assert.equal(photoCategoryBadge("both"),"Atlas photo · Awards night");
 assert.equal(photoCategoryBadge("atlas"),"Atlas photo");
 assert.equal(photoCategoryBadge("awards"),"Awards night");
 assert.equal(photoCategoryBadge("other"),undefined,"other is not a slot the desk has to keep apart");
});

test("an empty Atlas slot has no photo until the agent files one",()=>{
 assert.equal(readAtlasProfilePhoto().src,"","clearing Atlas must not restore the bundled demo portrait");
});
