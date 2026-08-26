import type {PhotoCategory} from "./atlas-profile-photo.ts";
export const DesignerCaseStatus={READY_FOR_DESIGN:"READY_FOR_DESIGN",PENDING_DESIGNER_APPROVAL:"PENDING_DESIGNER_APPROVAL",AI_ENHANCED_REVIEW:"AI_ENHANCED_REVIEW",DESIGNER_REVIEW_REQUESTED:"DESIGNER_REVIEW_REQUESTED",APPROVED:"APPROVED",RETAKE_REQUIRED:"RETAKE_REQUIRED",REUPLOAD_REQUIRED:"REUPLOAD_REQUIRED"} as const;
export type DesignerCaseStatus=typeof DesignerCaseStatus[keyof typeof DesignerCaseStatus];
export type DesignerReviewType="ORIGINAL APPROVAL"|"AI ENHANCED"|"AI FLAGGED"|"USER REQUESTED";
export type DesignerAction="approve_original"|"approve_enhanced"|"reject_enhancement"|"retake"|"reupload"|"keep_review";
export type DesignerCategories={photoQuality:number;bodyCrop:number;faceVisibility:number;backgroundEditability:number};
export type DesignerSubmission={submissionId:string;agentId:string;agentName:string;teamNameAtSubmission?:string;imageId:string;photoCategory?:PhotoCategory;marketingReadiness:number;aiUsability:number;categories:DesignerCategories;issues:string[];disputedGates:string[];note:string;reviewType:DesignerReviewType;requestKind?:"original_approval"|"enhanced_review";status:DesignerCaseStatus;demo?:boolean;createdAt:string};
export type DesignerEnhancement={enhancementId:string;submissionId:string;agentId:string;imageId:string;enhancedMarketingReadiness:number;checks:{label:string;status:"PASS"|"FAIL"|"UNVERIFIED";detail:string}[];identityPreservationPass:boolean|null;artifactCheckPass:boolean|null;status:DesignerCaseStatus;createdAt:string};
export type DesignerReview={reviewId:string;submissionId:string;enhancementId?:string;agentId:string;reviewType:DesignerReviewType;designerDecision:DesignerAction;designerNotes:string;reviewedAt:string;status:DesignerCaseStatus};
export type DesignerAssetSource="original"|"ai_enhanced"|"background_removed";
export type DesignerAsset={assetId:string;agentId:string;submissionId?:string;enhancementId?:string;sourceType:DesignerAssetSource;imageId:string;transparentImageId?:string;approvedBy:string;approvedAt:string;marketingReadiness?:number;demo?:boolean};
export type DesignerEvent={eventId:string;agentId:string;action:string;actor?:string;at:string;refId:string;demo?:boolean};
export const PhotoSubmissionStatus={OPTED_OUT:"PHOTO_SUBMISSION_OPTED_OUT"} as const;
export type PhotoSubmissionStatus=typeof PhotoSubmissionStatus[keyof typeof PhotoSubmissionStatus];
export type DesignerAgent={agentId:string;name:string;gender?:"male"|"female";teamName:string;ren:string;avatarUrl:string;branch?:string;designation?:string;status?:string;email?:string;photoSubmissionStatus?:PhotoSubmissionStatus;photoOptedOutAt?:string;photoOptOutSource?:"agent_confirmed";demo?:boolean};
export type PhotoReminderDeliveryStatus="PENDING"|"MOCK_DELIVERED"|"SMTP_DELIVERED"|"FAILED";
export type PhotoReminder={reminderId:string;token:string;agentId:string;agentName:string;gender:"male"|"female";recipientEmail:string;intendedRecipientEmail?:string;actualRecipientEmail:string;sentAt:string;sentBy:string;reminderType:"PHOTO_UPLOAD";deliveryStatus:PhotoReminderDeliveryStatus;relatedPhotoStatus:AgentPhotoState;subject:string;uploadUrl:string;libraryUrl:string;optOutUrl:string;testMode:boolean;demo?:boolean};
export type DesignerCounts={total:number;pending:number;originalApprovals:number;enhancedReviews:number;approved:number;retakes:number;reuploads:number};
export type AgentPhotoState="pending"|"approved"|"has_images"|"none"|"retake"|"reupload"|"opted_out";
export type AgentPhotoSummary={state:AgentPhotoState;images:number;pending:number;approved:number};

export function deriveReviewType(input:{kind:"original_approval"|"enhanced_review";concerns?:string[];note?:string;disputedGates?:string[]}):DesignerReviewType{
 if(input.concerns?.length)return "AI FLAGGED";
 if(input.note?.trim()||input.disputedGates?.length)return "USER REQUESTED";
 return input.kind==="enhanced_review"?"AI ENHANCED":"ORIGINAL APPROVAL";
}

export function initialCaseStatus(kind:"original_approval"|"enhanced_review"){return kind==="enhanced_review"?DesignerCaseStatus.AI_ENHANCED_REVIEW:DesignerCaseStatus.PENDING_DESIGNER_APPROVAL}
export function transitionCase(status:DesignerCaseStatus,action:DesignerAction){
 if([DesignerCaseStatus.APPROVED,DesignerCaseStatus.RETAKE_REQUIRED,DesignerCaseStatus.REUPLOAD_REQUIRED].includes(status as never))return status;
 if(action==="approve_original"||action==="approve_enhanced")return DesignerCaseStatus.APPROVED;
 // A generic "reject enhancement" has no reason to distinguish it from a retake — it is a rework
 // outcome, not a distinct terminal status, so it reuses RETAKE_REQUIRED rather than stranding the
 // case in DESIGNER_REVIEW_REQUESTED where nothing downstream ever clears it.
 if(action==="retake"||action==="reject_enhancement")return DesignerCaseStatus.RETAKE_REQUIRED;
 if(action==="reupload")return DesignerCaseStatus.REUPLOAD_REQUIRED;
 return DesignerCaseStatus.DESIGNER_REVIEW_REQUESTED;
}
export function overviewCounts(submissions:DesignerSubmission[]):DesignerCounts{return submissions.reduce<DesignerCounts>((counts,item)=>{counts.total+=1;if([DesignerCaseStatus.PENDING_DESIGNER_APPROVAL,DesignerCaseStatus.AI_ENHANCED_REVIEW,DesignerCaseStatus.DESIGNER_REVIEW_REQUESTED].includes(item.status as never))counts.pending+=1;if(item.requestKind==="original_approval")counts.originalApprovals+=1;if(item.requestKind==="enhanced_review")counts.enhancedReviews+=1;if(item.status===DesignerCaseStatus.APPROVED)counts.approved+=1;if(item.status===DesignerCaseStatus.RETAKE_REQUIRED)counts.retakes+=1;if(item.status===DesignerCaseStatus.REUPLOAD_REQUIRED)counts.reuploads+=1;return counts},{total:0,pending:0,originalApprovals:0,enhancedReviews:0,approved:0,retakes:0,reuploads:0})}
export function groupAgentsByTeam(agents:DesignerAgent[]){const groups=new Map<string,DesignerAgent[]>();for(const agent of agents){const team=agent.teamName.trim()||"Unassigned";groups.set(team,[...(groups.get(team)??[]),agent])}return [...groups].map(([team,items])=>({team,agents:items.sort((a,b)=>a.name.localeCompare(b.name))})).sort((a,b)=>a.team.localeCompare(b.team))}
export function matchesDesignerSearch(agent:Pick<DesignerAgent,"agentId"|"name"|"ren"|"teamName">,query:string){const needle=query.trim().toLocaleLowerCase();return !needle||[agent.agentId,agent.name,agent.ren,agent.teamName].some(value=>value.toLocaleLowerCase().includes(needle))}
export function agentPhotoSummary(agentId:string,submissions:DesignerSubmission[],assets:DesignerAsset[],agent?:DesignerAgent):AgentPhotoSummary{const agentSubmissions=submissions.filter(item=>item.agentId===agentId),pending=agentSubmissions.filter(item=>[DesignerCaseStatus.PENDING_DESIGNER_APPROVAL,DesignerCaseStatus.AI_ENHANCED_REVIEW,DesignerCaseStatus.DESIGNER_REVIEW_REQUESTED].includes(item.status as never)).length,approved=assets.filter(item=>item.agentId===agentId).length,images=new Set([...agentSubmissions.map(item=>item.imageId),...assets.filter(item=>item.agentId===agentId).map(item=>item.imageId)]).size,latest=agentSubmissions.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0],state:AgentPhotoState=agent?.photoSubmissionStatus===PhotoSubmissionStatus.OPTED_OUT?"opted_out":pending?"pending":latest?.status===DesignerCaseStatus.RETAKE_REQUIRED?"retake":latest?.status===DesignerCaseStatus.REUPLOAD_REQUIRED?"reupload":approved?"approved":images?"has_images":"none";return{state,images,pending,approved}}
export function sortAgentsByPhotoState(agents:DesignerAgent[],submissions:DesignerSubmission[],assets:DesignerAsset[]){const priority:Record<AgentPhotoState,number>={pending:0,retake:1,reupload:2,approved:3,none:4,has_images:5,opted_out:6};return [...agents].sort((a,b)=>{const left=agentPhotoSummary(a.agentId,submissions,assets,a),right=agentPhotoSummary(b.agentId,submissions,assets,b);return priority[left.state]-priority[right.state]||right.images-left.images||a.name.localeCompare(b.name)})}
export function photoReminderRecipient(agent:DesignerAgent,testRecipient=""){return testRecipient.trim()||agent.email?.trim()||""}
export function isPhotoReminderEligible(agent:DesignerAgent,summary:AgentPhotoSummary,testRecipient=""){return agent.photoSubmissionStatus!==PhotoSubmissionStatus.OPTED_OUT&&Boolean(photoReminderRecipient(agent,testRecipient))&&["none","retake","reupload"].includes(summary.state)}
export function sanitiseApprovedFilename(agentName:string,agentId:string,extension="png",source:DesignerAssetSource="original"){const safe=agentName.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"Agent",id=agentId.replace(/[^a-zA-Z0-9-]+/g,"")||"Unknown",ext=extension.replace(/[^a-z0-9]/gi,"").toLowerCase()||"png",suffix={original:"Approved",ai_enhanced:"AIEnhanced",background_removed:"Transparent"}[source];return `${safe}_${id}_${suffix}.${ext}`}
export function historyEvent(agentId:string,action:string,refId:string,actor="Profile Lab AI designer",demo=false,at=new Date().toISOString()):DesignerEvent{return{eventId:`event-${cryptoId()}`,agentId,action,actor,at,refId,demo}}
export function cryptoId(){return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}
