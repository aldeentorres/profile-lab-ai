import assert from "node:assert/strict";
import test from "node:test";
import {createPhotoZip,currentDownloadableAsset} from "../app/bulk-photo-actions.ts";

test("bulk download selects only the latest approved asset and uses its transparent image when available",()=>{
 const agent={agentId:"ID / 7",name:"Aina / Rahman",teamName:"A",ren:"",avatarUrl:""},assets=[{assetId:"old",agentId:agent.agentId,sourceType:"original",imageId:"old-image",approvedBy:"Designer",approvedAt:"2026-08-23T00:00:00Z"},{assetId:"new",agentId:agent.agentId,sourceType:"background_removed",imageId:"source-image",transparentImageId:"cutout-image",approvedBy:"Designer",approvedAt:"2026-08-24T00:00:00Z"}],selected=currentDownloadableAsset(agent,assets);
 assert.equal(selected.imageId,"cutout-image");assert.equal(selected.filename,"Aina_Rahman_ID7_Transparent.png");assert.equal(currentDownloadableAsset({...agent,agentId:"missing"},assets),null,"unapproved images are never substituted");
});

test("multiple approved files are packaged in a valid dependency-free ZIP",async()=>{
 const zip=createPhotoZip([{name:"A_1_Approved.png",data:new Uint8Array([1,2,3])},{name:"B_2_AIEnhanced.jpg",data:new Uint8Array([4,5])}],new Date("2026-08-24T12:00:00Z")),bytes=new Uint8Array(await zip.arrayBuffer()),text=new TextDecoder().decode(bytes);
 assert.deepEqual([...bytes.slice(0,4)],[0x50,0x4b,0x03,0x04]);assert.match(text,/A_1_Approved\.png/);assert.match(text,/B_2_AIEnhanced\.jpg/);assert.deepEqual([...bytes.slice(-22,-18)],[0x50,0x4b,0x05,0x06]);
});
