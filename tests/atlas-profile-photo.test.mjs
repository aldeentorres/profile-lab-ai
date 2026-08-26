import assert from "node:assert/strict";
import test from "node:test";
import {withSingleAtlasPhoto} from "../app/atlas-profile-photo.ts";

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
 assert.equal(next[1].category,"atlas","a photo promoted to Atlas leaves its awards-night entry behind");
});

test("a photo with no category recorded is left alone, not filed under awards night",()=>{
 const next=withSingleAtlasPhoto([{id:"a",profileOK:false},{id:"b",profileOK:false}],"b");
 assert.equal(next[0].category,undefined,"a photo with no recorded category reads as other and is never rewritten to awards");
});

test("awards night holds as many photos as the agent picks",()=>{
 const photos=[{id:"a",profileOK:false,category:"awards"},{id:"b",profileOK:false,category:"awards"},{id:"c",profileOK:false,category:"other"}];
 const next=withSingleAtlasPhoto(photos,"c");
 assert.deepEqual(next.filter(item=>item.category==="awards").map(item=>item.id),["a","b"],
  "only the Atlas slot is exclusive — promoting a photo to Atlas never evicts an awards-night entry");
});
