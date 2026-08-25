import assert from "node:assert/strict";
import test from "node:test";

import {listReviewRequests, recordReviewRequest, resolveReviewRequest, workflowStatusFor} from "../app/photo-review-requests.ts";

// node has no localStorage; a tiny in-memory stand-in is enough to prove what the queue keeps.
const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};

const originalScores={score:72,status:"REVIEW",categories:[{name:"Photo quality",score:74}],issues:["Slightly awkward crop — leave a little more room"],recommendation:"Potentially usable — send it for designer review."};
const base={createdAt:"2026-08-24T09:00:00.000Z",agentName:"Demo Agent",agentId:"71502",photo:"data:image/jpeg;base64,"+"A".repeat(4000),original:originalScores,aiUsability:89,disputedGates:["Slightly awkward crop"],concerns:[],note:"",designerDecision:"pending",state:"pending"};

test("an original-photo approval request keeps the case and never the file",()=>{
 store.clear();
 recordReviewRequest({...base,id:"IQI-REV-ORIG01",kind:"original_approval",workflowStatus:workflowStatusFor.original_approval,useOriginalRequested:true});
 const [stored]=listReviewRequests();
 assert.equal(stored.workflowStatus,"PENDING DESIGNER APPROVAL");
 assert.equal(stored.useOriginalRequested,true,"the request records that the agent wants the original as-is");
 assert.equal(stored.original.score,72,"the AI rating is stored unchanged");
 assert.deepEqual(stored.original.issues,originalScores.issues);
 assert.equal("photo" in stored,false,"a full-size image never reaches localStorage");
 assert.ok(store.get("studio-review-requests").length<2000,"the persisted record is the case, not the picture");
});

test("an enhanced-review request carries both ratings and the generation concerns, no images",()=>{
 store.clear();
 recordReviewRequest({...base,id:"IQI-REV-ENH01",kind:"enhanced_review",workflowStatus:workflowStatusFor.enhanced_review,useOriginalRequested:false,enhancedPhoto:"data:image/jpeg;base64,"+"B".repeat(4000),enhanced:{...originalScores,score:77,status:"REVIEW"},concerns:["Identity preservation: Face similarity 62% against the original — the features have drifted from the original."]});
 const [stored]=listReviewRequests();
 assert.equal(stored.workflowStatus,"PENDING DESIGNER REVIEW");
 assert.equal(stored.original.score,72,"the original score is never overwritten by the enhanced one");
 assert.equal(stored.enhanced.score,77);
 assert.equal(stored.aiUsability,89);
 assert.equal(stored.concerns.length,1);
 assert.equal("enhancedPhoto" in stored,false);
});

test("the two workflows never share a status",()=>{
 assert.notEqual(workflowStatusFor.original_approval,workflowStatusFor.enhanced_review);
});

test("the designer's decision is recorded as final and nothing else changes",()=>{
 store.clear();
 recordReviewRequest({...base,id:"IQI-REV-ORIG02",kind:"original_approval",workflowStatus:workflowStatusFor.original_approval,useOriginalRequested:true});
 const decided=resolveReviewRequest("IQI-REV-ORIG02","retake");
 assert.equal(decided.designerDecision,"retake");
 assert.equal(decided.state,"decided");
 assert.equal(decided.original.score,72,"deciding does not re-score");
 assert.equal(resolveReviewRequest("IQI-REV-ORIG02","approved").designerDecision,"retake","a final designer decision cannot be overwritten");
 assert.equal(resolveReviewRequest("IQI-REV-MISSING","approved"),null);
});

test("a designer's decision carries an agent-facing feedback note and a review timestamp",()=>{
 store.clear();
 recordReviewRequest({...base,id:"IQI-REV-ENH02",kind:"enhanced_review",workflowStatus:workflowStatusFor.enhanced_review,useOriginalRequested:false,enhancedPhoto:"data:image/jpeg;base64,"+"B".repeat(4000),enhanced:{...originalScores,score:60,status:"REVIEW"},concerns:[]});
 const decided=resolveReviewRequest("IQI-REV-ENH02","retake","A larger original file is required");
 assert.equal(decided.designerDecision,"retake");
 assert.equal(decided.designerFeedback,"A larger original file is required");
 assert.ok(decided.reviewedAt,"the agent needs to know when the review happened");
});
test("a full or missing store never throws at the agent",()=>{
 const broken=globalThis.localStorage;
 globalThis.localStorage={getItem(){throw new Error("quota")},setItem(){throw new Error("quota")}};
 assert.doesNotThrow(()=>recordReviewRequest({...base,id:"IQI-REV-FULL",kind:"original_approval",workflowStatus:workflowStatusFor.original_approval,useOriginalRequested:true}));
 assert.deepEqual(listReviewRequests(),[]);
 globalThis.localStorage=broken;
});
