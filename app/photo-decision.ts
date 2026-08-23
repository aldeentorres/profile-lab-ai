import type {BodyExtent, HandState} from "./photo-body";

export type PhotoStatus = "APPROVED"|"REVIEW"|"REUPLOAD"|"REJECT";
// "Is this a good photograph?" and "can we ship this file?" are separate questions.
// FileStatus answers the second one and never drags down the photo-quality score.
export type FileStatus = "OK"|"LOW"|"TOO_SMALL"|"UNUSABLE";
export type PhotoRequirement = {id:string;label:string;status:"PASS"|"FAIL";score:number;confidence:number;severity:"none"|"warning"|"critical";detail:string};
export type PhotoPenalty = {id:string;label:string;points:number;cap:number|null;forces_status:"REVIEW"|"REJECT"|null};
export type GateSignals={minimumDimension:number;resolutionScore:number;sharpnessScore:number;focusScore:number;faceCount:number;faceClearance:number;faceHeight:number;selfieProbability:number;lightingScore:number;backgroundQuality:number;designerUsability:number;bodyExtent:BodyExtent;cropScore:number;hands:HandState;isScreenshot:boolean;letterboxed:boolean;contentCoverage:number};
export type PhotoDecision={score:number;status:PhotoStatus;fileSuitability:number;fileStatus:FileStatus;fileReason:string;confidence:number;decisionReason:string;requirements:PhotoRequirement[];penalties:PhotoPenalty[]};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
// Pixel dimensions the marketing outputs actually need on the shortest edge.
// A file only blocks submission when it is too small to use anywhere at all.
export const fileResolutionTargets={unusable:300,usable:600,recommended:1000} as const;
export const bodyExtentLabels:Record<BodyExtent,string>={full_body:"Full body",three_quarter:"Three-quarter",half_body:"Half body",head_shoulders:"Head & shoulders",head_only:"Head only",unknown:"Unverified"};
export const bodyExtentScores:Record<BodyExtent,number>={full_body:100,three_quarter:100,half_body:92,head_shoulders:38,head_only:14,unknown:0};
const rounded=(value:number)=>Math.round(clamp(value));
export const photoApprovalThresholds={approved:80,review:60,score:80} as const;

export function applyPhotoDecision(baseScore:number,signals:GateSignals):PhotoDecision{
 const requirement=(id:string,label:string,score:number,pass:boolean,confidence:number,severity:PhotoRequirement["severity"],detail:string):PhotoRequirement=>({id,label,status:pass?"PASS":"FAIL",score:rounded(score),confidence:Number(clamp(confidence,0,1).toFixed(2)),severity:pass?"none":severity,detail});
 const hasFace=signals.faceCount>0,singleAgent=signals.faceCount===1,severeCrop=hasFace&&signals.faceClearance<.005,moderateCrop=hasFace&&signals.faceClearance<.025;
 const thinBody=signals.bodyExtent==="head_only"||signals.bodyExtent==="head_shoulders",unknownBody=signals.bodyExtent==="unknown";
 const requirements:PhotoRequirement[]=[
  requirement("focus","Sharpness & focus",Math.min(signals.sharpnessScore,signals.focusScore),Math.min(signals.sharpnessScore,signals.focusScore)>=55,.85,Math.min(signals.sharpnessScore,signals.focusScore)<35?"critical":"warning",Math.min(signals.sharpnessScore,signals.focusScore)>=55?"Sharp enough to edit and print at size":Math.min(signals.sharpnessScore,signals.focusScore)<35?"The subject is noticeably out of focus and cannot be cleanly used":"Slightly soft — check focus on the eyes"),
  requirement("face_visibility","Face clearly visible",hasFace?100:0,hasFace,.9,"critical",hasFace?"The agent's face is clearly visible":"No clear face detected in this agent portrait"),
  requirement("single_agent","One agent",singleAgent?100:signals.faceCount?25:0,singleAgent,.9,"critical",singleAgent?"Exactly one agent detected":signals.faceCount>1?`${signals.faceCount} faces detected — submit one agent only`:"Cannot verify a single agent without a visible face"),
  requirement("body_visible","Enough body visible",bodyExtentScores[signals.bodyExtent],!thinBody&&!unknownBody,.8,thinBody?"critical":"warning",unknownBody?"Body framing could not be verified":thinBody?"Only the head and shoulders are in frame — a designer needs at least half the body":`${bodyExtentLabels[signals.bodyExtent]} in frame — enough area for marketing layouts`),
  requirement("crop_safety","Clean crop",signals.cropScore,signals.cropScore>=62,.8,signals.cropScore<40?"critical":"warning",signals.cropScore>=62?"Nothing important is cut off":signals.cropScore<40?"The agent is cropped in a way that limits editing":"Slightly awkward crop — leave a little more room"),
  requirement("hands","Hand framing",signals.hands==="partial"?55:100,signals.hands!=="partial",.7,"warning",signals.hands==="complete"?"Visible hands are fully in frame":signals.hands==="absent"?"Hands are outside the composition — nothing to crop badly":"A visible hand is cut off at the frame edge, which is awkward to mask"),
  requirement("selfie","Intentionally photographed",(1-signals.selfieProbability)*100,signals.selfieProbability<.5&&!signals.isScreenshot,Math.max(.62,Math.abs(signals.selfieProbability-.5)*1.6),signals.selfieProbability>=.75||signals.isScreenshot?"critical":"warning",signals.isScreenshot?"This is a phone screenshot, not a supplied photo file":signals.selfieProbability<.2?"Reads as an intentionally taken portrait":signals.selfieProbability<.5?"Some selfie cues — worth a quick look":"Reads as a casual or mirror selfie"),
  requirement("source_frame","Original photo file",Math.round(signals.contentCoverage*100),!signals.letterboxed,.78,signals.contentCoverage<.45?"critical":"warning",signals.letterboxed?"Padded with empty bars — supply the original photo rather than a boxed export":"Supplied as a full photo frame"),
  requirement("exposure","Exposure",signals.lightingScore,signals.lightingScore>=60,.9,signals.lightingScore<35?"critical":"warning",signals.lightingScore>=60?"Exposure is usable":"Lighting is too dark, bright, or uneven"),
  requirement("background","Background & editability",signals.backgroundQuality,signals.backgroundQuality>=60,.72,signals.backgroundQuality<30?"critical":"warning",signals.backgroundQuality>=60?"Clean enough to isolate the agent":"Background is distracting and makes editing harder"),
  requirement("designer_usability","Designer usability",signals.designerUsability,signals.designerUsability>=60,.78,signals.designerUsability<35?"critical":"warning",signals.designerUsability>=60?"Usable for profile and marketing layouts":"Not enough usable subject area for design work"),
  requirement("resolution","File resolution",signals.resolutionScore,signals.minimumDimension>=fileResolutionTargets.usable,1,"warning",signals.minimumDimension>=fileResolutionTargets.recommended?"Large enough for every marketing output":signals.minimumDimension>=fileResolutionTargets.usable?`${signals.minimumDimension}px shortest edge — fine for profile cards, tight for large banners`:`${signals.minimumDimension}px shortest edge — good photo, small file; re-supply the original if you need print size`),
 ];
  const penalties:PhotoPenalty[]=[],addPenalty=(id:string,label:string,points:number,cap:number|null,forces_status:PhotoPenalty["forces_status"])=>penalties.push({id,label,points,cap,forces_status});
 const focus=Math.min(signals.sharpnessScore,signals.focusScore);
 // REJECT: the photograph genuinely cannot be used.
 if(!hasFace)addPenalty("face_missing","Face not clearly visible",0,30,"REJECT");
 if(signals.faceCount>1)addPenalty("multiple_people","Multiple people detected",0,50,"REJECT");
 if(focus<35)addPenalty("severe_blur","Severe blur",0,40,"REJECT");
 else if(focus<55)addPenalty("soft_image","Slightly soft",10,69,"REVIEW");
 if(signals.isScreenshot)addPenalty("screenshot","Phone screenshot, not a photo file",0,35,"REJECT");
 if(signals.letterboxed)addPenalty(signals.contentCoverage<.45?"boxed_export":"padded_export",signals.contentCoverage<.45?"Photo is padded with empty bars":"Photo has padding around the frame",0,signals.contentCoverage<.45?40:65,signals.contentCoverage<.45?"REJECT":"REVIEW");
 if(thinBody)addPenalty("insufficient_body","Only head and shoulders in frame",0,45,"REJECT");
 if(signals.cropScore<40)addPenalty("awkward_crop","Awkward crop cuts the agent",0,50,"REJECT");
 else if(signals.cropScore<62)addPenalty("tight_crop","Slightly awkward crop",8,69,"REVIEW");
 if(signals.hands==="partial")addPenalty("cut_hands","A visible hand is cut off",8,69,"REVIEW");
 if(signals.selfieProbability>=.75)addPenalty("obvious_selfie","Obvious casual or mirror selfie",0,45,"REJECT");
 else if(signals.selfieProbability>=.5)addPenalty("likely_selfie","Likely selfie framing",20,null,"REVIEW");
 if(severeCrop)addPenalty("severe_face_crop","Face severely cropped",0,50,"REJECT");
 else if(moderateCrop)addPenalty("tight_face_crop","Face too close to edge",0,65,"REVIEW");
 if(signals.lightingScore<35)addPenalty("severe_exposure","Severe exposure problem",0,55,"REJECT");
 else if(signals.lightingScore<60)addPenalty("poor_exposure","Poor exposure",10,69,"REVIEW");
 if(signals.backgroundQuality<30)addPenalty("extreme_background","Background makes editing impossible",0,55,"REJECT");
 else if(signals.backgroundQuality<60)addPenalty("busy_background","Background is slightly distracting",10,69,"REVIEW");
 if(signals.designerUsability<35)addPenalty("unusable_for_design","Not usable for design",0,50,"REJECT");
 else if(signals.designerUsability<60)addPenalty("limited_design_use","Limited space for the designer",0,69,"REVIEW");
 // Score answers "is this a good photograph?" only — every capping penalty above is about what the
 // photograph shows, never about how many pixels the uploaded file happens to carry.
 const deduction=penalties.reduce((total,penalty)=>total+penalty.points,0),cap=penalties.reduce<number>((current,penalty)=>penalty.cap===null?current:Math.min(current,penalty.cap),100),score=rounded(Math.min(baseScore-deduction,cap)),forcedReject=penalties.some(penalty=>penalty.forces_status==="REJECT"),forcedReview=penalties.some(penalty=>penalty.forces_status==="REVIEW");
 // File suitability answers "can we ship this particular file?" and is tracked on its own axis.
 const fileSuitability=rounded(signals.resolutionScore),fileStatus:FileStatus=signals.minimumDimension>=fileResolutionTargets.recommended?"OK":signals.minimumDimension>=fileResolutionTargets.usable?"LOW":signals.minimumDimension>=fileResolutionTargets.unusable?"TOO_SMALL":"UNUSABLE",fileReason=fileStatus==="OK"?`${signals.minimumDimension}px shortest edge is large enough for every marketing output.`:fileStatus==="LOW"?`${signals.minimumDimension}px shortest edge works for profile cards but is tight for large banners and print.`:fileStatus==="TOO_SMALL"?`${signals.minimumDimension}px shortest edge is small — usable on screen, but re-supply the original for print or large banners.`:`${signals.minimumDimension}px shortest edge is too small to use anywhere — re-upload the original file.`;
 const photoIsUsable=!forcedReject&&score>=photoApprovalThresholds.review;
 // Resolution is advisory: a good photograph in a small file is still a good photograph. Only a file
 // too small to use anywhere becomes a re-upload request, and it never lowers the quality score.
 const status:PhotoStatus=forcedReject||score<photoApprovalThresholds.review?"REJECT":fileStatus==="UNUSABLE"?"REUPLOAD":forcedReview||score<photoApprovalThresholds.approved?"REVIEW":"APPROVED";
 const failed=requirements.filter(item=>item.status==="FAIL"),confidence=Number((requirements.reduce((total,item)=>total+item.confidence,0)/requirements.length).toFixed(2)),primaryPenalty=penalties.find(penalty=>penalty.forces_status==="REJECT")??penalties[0];
 const decisionReason=status==="REUPLOAD"?`${photoIsUsable&&!penalties.length?"The photograph itself is good":"The photograph is usable"} — only the file is too small. ${fileReason}`:primaryPenalty?`${primaryPenalty.label}. Good attributes cannot override this submission requirement.`:failed.find(item=>item.id!=="resolution")?.detail??(fileStatus==="LOW"?fileReason:"All submission requirements passed.");
 return {score,status,fileSuitability,fileStatus,fileReason,confidence,decisionReason,requirements,penalties};
}
