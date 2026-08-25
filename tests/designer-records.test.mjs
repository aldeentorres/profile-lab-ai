import assert from "node:assert/strict";
import test from "node:test";
import {DesignerCaseStatus,PhotoSubmissionStatus,agentPhotoSummary,deriveReviewType,groupAgentsByTeam,isPhotoReminderEligible,matchesDesignerSearch,overviewCounts,photoReminderRecipient,sanitiseApprovedFilename,sortAgentsByPhotoState,transitionCase} from "../app/designer-records.ts";

test("review type keeps AI flags and user requests distinct",()=>{
 assert.equal(deriveReviewType({kind:"enhanced_review",concerns:["Identity unverified"]}),"AI FLAGGED");
 assert.equal(deriveReviewType({kind:"original_approval",note:"Please review"}),"USER REQUESTED");
 assert.equal(deriveReviewType({kind:"original_approval"}),"ORIGINAL APPROVAL");
});
test("final designer outcomes cannot transition again",()=>{
 assert.equal(transitionCase(DesignerCaseStatus.PENDING_DESIGNER_APPROVAL,"approve_original"),DesignerCaseStatus.APPROVED);
 assert.equal(transitionCase(DesignerCaseStatus.APPROVED,"retake"),DesignerCaseStatus.APPROVED,"a final approval is immutable");
 assert.equal(transitionCase(DesignerCaseStatus.AI_ENHANCED_REVIEW,"reupload"),DesignerCaseStatus.REUPLOAD_REQUIRED);
});
test("rejecting an enhancement is a terminal rework outcome, not an open review",()=>{
 assert.equal(transitionCase(DesignerCaseStatus.AI_ENHANCED_REVIEW,"reject_enhancement"),DesignerCaseStatus.RETAKE_REQUIRED,"a generic reject must leave the case, not strand it in DESIGNER_REVIEW_REQUESTED");
 assert.equal(transitionCase(DesignerCaseStatus.RETAKE_REQUIRED,"approve_enhanced"),DesignerCaseStatus.RETAKE_REQUIRED,"a rejected case is immutable like any other final outcome");
});
test("overview counts every operational state without changing scores",()=>{
 const base={submissionId:"1",agentId:"1",agentName:"Agent",imageId:"i",marketingReadiness:72,aiUsability:80,categories:{photoQuality:70,bodyCrop:70,faceVisibility:70,backgroundEditability:70},issues:[],disputedGates:[],note:"",reviewType:"ORIGINAL APPROVAL",createdAt:"2026-08-24T00:00:00Z"};
 const counts=overviewCounts([{...base,requestKind:"original_approval",status:DesignerCaseStatus.PENDING_DESIGNER_APPROVAL},{...base,submissionId:"2",requestKind:"enhanced_review",status:DesignerCaseStatus.AI_ENHANCED_REVIEW},{...base,submissionId:"3",status:DesignerCaseStatus.APPROVED}]);
 assert.deepEqual(counts,{total:3,pending:2,originalApprovals:1,enhancedReviews:1,approved:1,retakes:0,reuploads:0});
});
test("team grouping, search and approved filenames use real agent fields",()=>{
 const agents=[{agentId:"71502",name:"Niel Kingston",teamName:"Alpha",ren:"REN01143",avatarUrl:""},{agentId:"900",name:"Aina Rahman",teamName:"Beta",ren:"REN900",avatarUrl:""}];
 assert.deepEqual(groupAgentsByTeam(agents).map(group=>group.team),["Alpha","Beta"]);
 assert.equal(matchesDesignerSearch(agents[0],"01143"),true);
 assert.equal(matchesDesignerSearch(agents[1],"niel"),false);
 assert.equal(sanitiseApprovedFilename("Aina / Rahman","ID 900"),"Aina_Rahman_ID900_Approved.png");
});
test("agent photo state prioritises pending work, then approvals, images and none",()=>{
 const agents=[{agentId:"none",name:"No Photo",teamName:"A",ren:"",avatarUrl:""},{agentId:"approved",name:"Approved",teamName:"A",ren:"",avatarUrl:""},{agentId:"pending",name:"Pending",teamName:"A",ren:"",avatarUrl:""}],base={submissionId:"s",agentName:"Agent",imageId:"image",marketingReadiness:72,aiUsability:80,categories:{photoQuality:70,bodyCrop:70,faceVisibility:70,backgroundEditability:70},issues:[],disputedGates:[],note:"",reviewType:"ORIGINAL APPROVAL",createdAt:"2026-08-24T00:00:00Z"},submissions=[{...base,agentId:"pending",status:DesignerCaseStatus.PENDING_DESIGNER_APPROVAL}],assets=[{assetId:"a",agentId:"approved",sourceType:"original",imageId:"approved-image",approvedBy:"Designer",approvedAt:"2026-08-24T00:00:00Z"}];
 assert.deepEqual(agentPhotoSummary("pending",submissions,assets),{state:"pending",images:1,pending:1,approved:0});
 assert.deepEqual(sortAgentsByPhotoState(agents,submissions,assets).map(agent=>agent.agentId),["pending","approved","none"]);
});
test("reminder eligibility is centralised and excludes completed, pending, opted-out and missing-email agents",()=>{
 const agent={agentId:"none",name:"Needs Photo",teamName:"A",ren:"",avatarUrl:"",email:"agent@example.test"},empty={state:"none",images:0,pending:0,approved:0};
 assert.equal(isPhotoReminderEligible(agent,empty),true);
 assert.equal(isPhotoReminderEligible({...agent,email:undefined},empty),false,"a valid recipient is required");
 assert.equal(isPhotoReminderEligible(agent,{...empty,state:"approved",approved:1}),false,"approved agents are complete");
 assert.equal(isPhotoReminderEligible(agent,{...empty,state:"pending",pending:1}),false,"pending designer work is not an upload request");
 assert.equal(isPhotoReminderEligible({...agent,photoSubmissionStatus:PhotoSubmissionStatus.OPTED_OUT},{...empty,state:"opted_out"}),false,"agent-confirmed opt-out always wins");
});
test("one configured test inbox overrides every agent email without losing agent-level eligibility",()=>{
 const testRecipient="test-one@example.test",empty={state:"none",images:0,pending:0,approved:0},agents=[{agentId:"one",name:"First Agent",teamName:"A",ren:"",avatarUrl:"",email:"first@example.test"},{agentId:"two",name:"Second Agent",teamName:"A",ren:"",avatarUrl:""}];
 assert.deepEqual(agents.map(agent=>photoReminderRecipient(agent,testRecipient)),[testRecipient,testRecipient],"all mock reminders must route to the configured test inbox");
 assert.equal(isPhotoReminderEligible(agents[1],empty,testRecipient),true,"a missing directory email must not block local test routing");
});
test("retake, re-upload and opt-out are distinct filterable photo states",()=>{
 const base={submissionId:"s",agentId:"a",agentName:"Agent",imageId:"image",marketingReadiness:40,aiUsability:50,categories:{photoQuality:40,bodyCrop:40,faceVisibility:40,backgroundEditability:40},issues:[],disputedGates:[],note:"",reviewType:"ORIGINAL APPROVAL",createdAt:"2026-08-24T00:00:00Z"};
 assert.equal(agentPhotoSummary("a",[{...base,status:DesignerCaseStatus.RETAKE_REQUIRED}],[]).state,"retake");
 assert.equal(agentPhotoSummary("a",[{...base,status:DesignerCaseStatus.REUPLOAD_REQUIRED}],[]).state,"reupload");
 assert.equal(agentPhotoSummary("a",[],[],{agentId:"a",name:"Agent",teamName:"A",ren:"",avatarUrl:"",photoSubmissionStatus:PhotoSubmissionStatus.OPTED_OUT}).state,"opted_out");
 assert.equal(sanitiseApprovedFilename("A / B","ID 7","png","ai_enhanced"),"A_B_ID7_AIEnhanced.png");
 assert.equal(sanitiseApprovedFilename("A / B","ID 7","png","background_removed"),"A_B_ID7_Transparent.png");
});
