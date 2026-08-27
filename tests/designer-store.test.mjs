import assert from "node:assert/strict";
import test from "node:test";
import {MemoryDesignerStore} from "../app/designer-store.ts";
import {listReviewRequests, recordReviewRequest} from "../app/photo-review-requests.ts";
import {withdrawPhoto} from "../app/designer-store.ts";

const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
const image="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
const scores={score:72,status:"REVIEW",categories:[{name:"Photo quality",score:74},{name:"Body & crop usability",score:68},{name:"Face & subject visibility",score:82},{name:"Background & editability",score:76}],issues:["Crop needs review"],recommendation:"Send to a designer."};
const request={id:"IQI-REV-STORE",createdAt:"2026-08-24T09:00:00Z",agentName:"Demo Agent",agentId:"71502",kind:"original_approval",workflowStatus:"PENDING DESIGNER APPROVAL",photo:image,original:scores,aiUsability:88,disputedGates:["Crop judgement"],concerns:[],note:"Please review",useOriginalRequested:true,designerDecision:"pending",state:"pending"};

test("memory store ingests images separately and moves approval into assets and history",async()=>{
 values.clear();const store=new MemoryDesignerStore();await store.ingestReviewRequest(request);let snapshot=await store.snapshot();
 assert.equal(snapshot.submissions.length,1);assert.equal(await store.image(snapshot.submissions[0].imageId) instanceof Blob,true);assert.equal("photo" in snapshot.submissions[0],false,"list records never decode or carry pixels");
 await store.applyDecision({submissionId:request.id,action:"approve_original",notes:"Crop is usable",actor:"Demo Designer"});snapshot=await store.snapshot();
 assert.equal(snapshot.submissions[0].status,"APPROVED");assert.equal(snapshot.assets[0].sourceType,"original");assert.equal(snapshot.reviews[0].designerNotes,"Crop is usable");assert.ok(snapshot.events.length>=2);
 await store.applyDecision({submissionId:request.id,action:"retake",notes:"change mind"});assert.equal((await store.snapshot()).submissions[0].status,"APPROVED","final decision stays final");
});
test("a designer rejection clears the agent-side pending status instead of leaving it stuck",async()=>{
 values.clear();
 const enhancedRequest={...request,id:"IQI-REV-REJECT",kind:"enhanced_review",workflowStatus:"PENDING DESIGNER REVIEW",enhancedPhoto:image,enhanced:{...scores,score:60},concerns:["Identity preservation: Face similarity 62% — the features have drifted from the original."]};
 recordReviewRequest({...enhancedRequest,designerDecision:"pending",state:"pending"});
 const store=new MemoryDesignerStore();await store.ingestReviewRequest(enhancedRequest);
 const decided=await store.applyDecision({submissionId:enhancedRequest.id,action:"reject_enhancement",notes:"AI-enhanced result does not preserve the source faithfully",actor:"Demo Designer"});
 assert.equal(decided.status,"RETAKE_REQUIRED","a generic reject must resolve to an existing rework status, not stay under review");
 const [stored]=listReviewRequests();
 assert.equal(stored.state,"decided","the shared record must stop being pending once the designer has decided");
 assert.equal(stored.designerDecision,"retake","the agent-facing Photos tab reads this decision, not the designer-side status");
 assert.equal(stored.designerFeedback,"AI-enhanced result does not preserve the source faithfully","the agent must see why the photo was rejected");
});
test("approved photos and cutouts enter the team library without blocking the kiosk",async()=>{
 const store=new MemoryDesignerStore();await store.recordApprovedPhoto({photoId:"photo-1",dataUrl:image,agentId:"7",agentName:"Maya",teamName:"North",marketingReadiness:91,aiUsability:90,enhanced:false,createdAt:"2026-08-24T10:00:00Z"});await store.recordCutoutAsset({photoId:"photo-1",agentId:"7",agentName:"Maya",dataUrl:image,cutoutDataUrl:image,marketingReadiness:91});
 const snapshot=await store.snapshot();assert.deepEqual(snapshot.assets.map(item=>item.sourceType).sort(),["background_removed","original"]);assert.equal(snapshot.agents[0].teamName,"North","the current team remains available after later asset ingest");
});
test("a photo the AI approved reaches the desk as its own case, with what it is for",async()=>{
 const store=new MemoryDesignerStore();await store.recordApprovedPhoto({photoId:"photo-9",dataUrl:image,agentId:"7",agentName:"Maya",teamName:"North",category:"atlas",marketingReadiness:88,aiUsability:84,enhanced:false,createdAt:"2026-08-26T09:00:00Z"});
 const snapshot=await store.snapshot(),[submission]=snapshot.submissions;
 assert.equal(submission.submissionId,"approved-photo-9","the desk case id is derived from the photo so a later category change finds it");
 assert.equal(submission.status,"READY_FOR_DESIGN","an AI-approved photo is on the desk as intake, not as a pending review");
 assert.equal(submission.photoCategory,"atlas","the desk must show what the agent wants the photo for");
 assert.equal(snapshot.assets[0].approvedBy,"Automatic preflight","approval came from the AI standard, not from a designer");
 await store.setPhotoCategory("approved-photo-9","other");
 assert.equal((await store.snapshot()).submissions[0].photoCategory,"other","changing the purpose updates the case rather than opening a second one");
});
test("demo data is local, visibly synthetic and clearable",async()=>{const store=new MemoryDesignerStore();await store.loadDemoData();let snapshot=await store.snapshot();assert.ok(snapshot.submissions.every(item=>item.demo));assert.ok(snapshot.agents.every(item=>item.agentId.startsWith("DEMO-")));assert.equal(snapshot.events.length,0,"demo cases stay out of decision history so the desk opens empty");await store.clearAllData();snapshot=await store.snapshot();assert.equal(snapshot.submissions.length,0);assert.equal(snapshot.assets.length,0)});
test("clearing the desk empties real records and their images, not only the demo rows",async()=>{
 values.clear();const store=new MemoryDesignerStore();await store.ingestReviewRequest(request);await store.applyDecision({submissionId:request.id,action:"approve_original",notes:"",actor:"Demo Designer"});
 await store.clearAllData();const snapshot=await store.snapshot();
 assert.deepEqual([snapshot.submissions.length,snapshot.assets.length,snapshot.events.length,snapshot.agents.length,snapshot.reviews.length],[0,0,0,0,0],"a desk reset before a presentation leaves nothing behind");
 assert.equal(await store.image(`image-original-${request.id}`),null,"the stored pixels go with the records");
});
test("a rework decision drops the stored photograph and keeps only the case",async()=>{
 values.clear();
 const enhancedRequest={...request,id:"IQI-REV-DROP",kind:"enhanced_review",workflowStatus:"PENDING DESIGNER REVIEW",enhancedPhoto:image,enhanced:{...scores,score:60},concerns:["Identity preservation: the features have drifted."]};
 const store=new MemoryDesignerStore();await store.ingestReviewRequest(enhancedRequest);
 await store.applyDecision({submissionId:enhancedRequest.id,action:"reject_enhancement",notes:"Not faithful to the original",actor:"Demo Designer"});
 assert.equal(await store.image(`image-original-${enhancedRequest.id}`),null,"a closed photograph is not kept on the desk");
 assert.equal(await store.image(`image-enhanced-${enhancedRequest.id}`),null,"the rejected enhancement goes with it");
 const snapshot=await store.snapshot();
 assert.equal(snapshot.submissions[0].status,"RETAKE_REQUIRED","the case and its reason survive the deleted pixels");
 assert.ok(snapshot.reviews.some(item=>item.designerNotes==="Not faithful to the original"));
});
test("the desk carries what the agent wants the photo for, and follows a later change",async()=>{
 values.clear();const store=new MemoryDesignerStore();await store.ingestReviewRequest({...request,id:"IQI-REV-CATEGORY",category:"atlas"});
 assert.equal((await store.snapshot()).submissions[0].photoCategory,"atlas","an Atlas profile photo must not read as an awards entry on the desk");
 await store.setPhotoCategory("IQI-REV-CATEGORY","awards");
 assert.equal((await store.snapshot()).submissions[0].photoCategory,"awards","re-filing the photo in Photos re-files it on the desk");
});
test("mock reminders are audited, use opaque links and require confirmation before opt-out",async()=>{
 const store=new MemoryDesignerStore();await store.loadDemoData();const snapshot=await store.snapshot(),agent=snapshot.agents[0],records=await store.sendPhotoReminders([{agentId:agent.agentId,agentName:agent.name,recipientEmail:agent.email,relatedPhotoStatus:"none",sentBy:"Test Designer",demo:true}]);
 assert.equal(records[0].deliveryStatus,"MOCK_DELIVERED");assert.equal(records[0].actualRecipientEmail,agent.email);assert.match(records[0].uploadUrl,/^\/?\?reminder=[a-zA-Z0-9]+$/);assert.doesNotMatch(records[0].uploadUrl,new RegExp(agent.agentId));
 assert.equal((await store.snapshot()).agents[0].photoSubmissionStatus,undefined,"opening or sending a reminder does not opt out the agent");
 const optedOut=await store.confirmPhotoOptOut(records[0].token);assert.equal(optedOut.photoSubmissionStatus,"PHOTO_SUBMISSION_OPTED_OUT");assert.equal(optedOut.photoOptOutSource,"agent_confirmed");let next=await store.snapshot();assert.ok(next.events.some(event=>event.action==="PHOTO_REMINDER_MOCKED"));assert.ok(next.events.some(event=>event.action==="PHOTO_SUBMISSION_OPTED_OUT"));
 await store.recordApprovedPhoto({photoId:"returning",dataUrl:image,agentId:agent.agentId,agentName:agent.name,marketingReadiness:90,aiUsability:90,enhanced:false,createdAt:"2026-08-24T12:00:00Z"});next=await store.snapshot();assert.equal(next.agents.find(item=>item.agentId===agent.agentId).photoSubmissionStatus,undefined,"a later valid upload reactivates the workflow");assert.ok(next.events.some(event=>event.action==="PHOTO_OPT_OUT_REVERSED"));
});
test("real test reminders become sent only after SMTP acceptance",async()=>{
 const store=new MemoryDesignerStore(),[pending]=await store.sendPhotoReminders([{agentId:"agent-1",agentName:"Joyce Yeoh",recipientEmail:"test-one@example.test",intendedRecipientEmail:"joyce@example.test",actualRecipientEmail:"test-one@example.test",relatedPhotoStatus:"none",subject:"[TEST] Reminder: Upload Your Profile Lab AI Profile Photo — Joyce Yeoh",testMode:true,sentBy:"Test Designer"}]);let snapshot=await store.snapshot();
 assert.equal(pending.deliveryStatus,"PENDING");assert.equal(pending.intendedRecipientEmail,"joyce@example.test");assert.equal(pending.actualRecipientEmail,"test-one@example.test");assert.equal(pending.testMode,true);assert.equal(snapshot.events.some(event=>event.action==="PHOTO_REMINDER_SENT"),false,"preparing a reminder must not claim it was sent");
 const [delivered]=await store.finalisePhotoReminders([{reminderId:pending.reminderId,deliveryStatus:"SMTP_DELIVERED"}]);snapshot=await store.snapshot();assert.equal(delivered.deliveryStatus,"SMTP_DELIVERED");assert.equal(snapshot.events.filter(event=>event.action==="PHOTO_REMINDER_SENT").length,1,"SMTP acceptance creates exactly one sent event");
});

test("deleting the photo in Photos withdraws the whole case from the designer desk",async()=>{
 values.clear();const store=new MemoryDesignerStore();
 await store.ingestReviewRequest(request);
 await store.applyDecision({submissionId:request.id,action:"approve_original",notes:"Usable",actor:"Demo Designer"});
 const before=await store.snapshot();
 assert.equal(before.assets.length,1,"the approval left an asset behind to be withdrawn");
 await store.withdrawPhoto({photoId:"gallery-1",reviewRequestId:request.id});
 const after=await store.snapshot();
 assert.deepEqual(after.submissions,[],"the queue case goes with the photograph");
 assert.deepEqual(after.assets,[],"an approved asset of a deleted photo must not stay in the library");
 assert.deepEqual(after.reviews,[],"the decision on a withdrawn photo is not a record of anything");
 assert.deepEqual(after.events,[],"history entries pointing at removed records would point at nothing");
 assert.equal(await store.image(before.submissions[0].imageId),null,"the blob goes with the record");
});
test("withdrawing one photo leaves every other agent's case untouched",async()=>{
 values.clear();const store=new MemoryDesignerStore();
 await store.ingestReviewRequest(request);
 await store.ingestReviewRequest({...request,id:"IQI-REV-OTHER",agentId:"90210",agentName:"Other Agent"});
 await store.recordApprovedPhoto({photoId:"photo-keep",dataUrl:image,agentId:"90210",agentName:"Other Agent",enhanced:false,createdAt:"2026-08-26T09:00:00Z"});
 await store.withdrawPhoto({photoId:"photo-gone",reviewRequestId:request.id});
 const after=await store.snapshot();
 assert.deepEqual(after.submissions.map(item=>item.submissionId).sort(),["IQI-REV-OTHER","approved-photo-keep"],"only the deleted photograph is withdrawn");
 assert.equal(after.assets.length,1,"the other agent's approved asset survives");
});
test("withdrawing a photo removes the cutout asset cut from it, and the agent's own queue record",async()=>{
 values.clear();const store=new MemoryDesignerStore();
 recordReviewRequest(request);
 await store.recordApprovedPhoto({photoId:"photo-2",dataUrl:image,agentId:"7",agentName:"Maya",enhanced:false,createdAt:"2026-08-26T09:00:00Z"});
 await store.recordCutoutAsset({photoId:"photo-2",agentId:"7",agentName:"Maya",dataUrl:image,cutoutDataUrl:image});
 await store.withdrawPhoto({photoId:"photo-2"});
 const after=await store.snapshot();
 assert.deepEqual(after.assets,[],"the transparent cutout is derived from the deleted photo, so it goes too");
 assert.equal(await store.image("image-cutout-photo-2"),null,"the cutout blob is released with it");
 assert.equal(listReviewRequests().length,1,"a store call alone never touches the agent-side queue record");
 await withdrawPhoto({photoId:"photo-2",reviewRequestId:request.id});
 assert.deepEqual(listReviewRequests(),[],"withdrawing through the module clears the agent's pending case as well");
});
