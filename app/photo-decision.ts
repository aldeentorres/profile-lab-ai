export type PhotoStatus = "APPROVED"|"REVIEW"|"REJECT";
export type PhotoRequirement = {id:string;label:string;status:"PASS"|"FAIL";score:number;confidence:number;severity:"none"|"warning"|"critical";detail:string};
export type PhotoPenalty = {id:string;label:string;points:number;cap:number|null;forces_status:"REVIEW"|"REJECT"|null};
export type GateSignals={minimumDimension:number;resolutionScore:number;sharpnessScore:number;faceCount:number;faceClearance:number;faceHeight:number;selfieProbability:number;lightingScore:number;backgroundQuality:number;designerUsability:number};
export type PhotoDecision={score:number;status:PhotoStatus;confidence:number;decisionReason:string;requirements:PhotoRequirement[];penalties:PhotoPenalty[]};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));
export const photoApprovalThresholds={approved:80,review:60,score:80} as const;

export function applyPhotoDecision(baseScore:number,signals:GateSignals):PhotoDecision{
 const requirement=(id:string,label:string,score:number,pass:boolean,confidence:number,severity:PhotoRequirement["severity"],detail:string):PhotoRequirement=>({id,label,status:pass?"PASS":"FAIL",score:rounded(score),confidence:Number(clamp(confidence,0,1).toFixed(2)),severity:pass?"none":severity,detail});
 const hasFace=signals.faceCount>0,singleAgent=signals.faceCount===1,severeCrop=hasFace&&signals.faceClearance<.005,moderateCrop=hasFace&&signals.faceClearance<.025,severeSmallSubject=hasFace&&signals.faceHeight<.055,smallSubject=hasFace&&signals.faceHeight<.08;
 const requirements:PhotoRequirement[]=[
  requirement("resolution","Resolution",signals.resolutionScore,signals.resolutionScore>=70,1,signals.minimumDimension<600?"critical":"warning",signals.resolutionScore>=70?"Sufficient resolution for marketing use":`${signals.minimumDimension}px shortest edge — use a larger original`),
  requirement("sharpness","Sharpness",signals.sharpnessScore,signals.sharpnessScore>=60,.82,signals.sharpnessScore<35?"critical":"warning",signals.sharpnessScore>=60?"Subject detail is sufficiently sharp":signals.sharpnessScore<35?"Severe blur prevents reliable design use":"Image looks soft; refocus on the eyes and hold the camera steady"),
  requirement("face_visibility","Face visibility",hasFace?100:0,hasFace,.9,"critical",hasFace?"A face is clearly detected":"No clear face detected in this agent portrait"),
  requirement("single_agent","One agent",singleAgent?100:signals.faceCount?25:0,singleAgent,.9,"critical",singleAgent?"Exactly one agent detected":signals.faceCount>1?`${signals.faceCount} faces detected — submit one agent only`:"Cannot verify a single agent without a visible face"),
  requirement("crop_safety","Crop safety",hasFace?clamp(signals.faceClearance/.05*100):0,hasFace&&!moderateCrop,.84,severeCrop?"critical":"warning",!hasFace?"Crop cannot be verified without a face":moderateCrop?"Face is too close to an image edge":"Face has safe space around it"),
  requirement("selfie","Non-selfie presentation",(1-signals.selfieProbability)*100,signals.selfieProbability<.5,Math.max(.62,Math.abs(signals.selfieProbability-.5)*1.6),signals.selfieProbability>=.75?"critical":"warning",signals.selfieProbability<.2?"Low selfie likelihood":signals.selfieProbability<.5?"Some selfie cues detected; review framing":signals.selfieProbability>=.75?"Strong selfie-style proximity or crop detected":"Likely selfie-style framing"),
  requirement("exposure","Exposure",signals.lightingScore,signals.lightingScore>=60,.9,signals.lightingScore<35?"critical":"warning",signals.lightingScore>=60?"Exposure is usable":"Lighting is too dark, bright, or uneven"),
  requirement("background","Background",signals.backgroundQuality,signals.backgroundQuality>=60,.72,signals.backgroundQuality<30?"critical":"warning",signals.backgroundQuality>=60?"Background is sufficiently clean":"Background is distracting; simplify the environment"),
  requirement("designer_usability","Designer usability",signals.designerUsability,signals.designerUsability>=60,.78,signals.designerUsability<35?"critical":"warning",signals.designerUsability>=60?"Usable for profile and marketing layouts":"Crop or available design space is not usable enough"),
 ];
 const penalties:PhotoPenalty[]=[],addPenalty=(id:string,label:string,points:number,cap:number|null,forces_status:PhotoPenalty["forces_status"])=>penalties.push({id,label,points,cap,forces_status});
 if(!hasFace)addPenalty("face_missing","No visible face",0,30,"REJECT");
 if(signals.faceCount>1)addPenalty("multiple_people","Multiple people detected",0,50,"REJECT");
 if(signals.sharpnessScore<35)addPenalty("severe_blur","Severe blur",0,40,"REJECT");
 else if(signals.sharpnessScore<60)addPenalty("soft_image","Soft image",12,69,"REVIEW");
 if(signals.selfieProbability>=.75)addPenalty("obvious_selfie","Strong selfie detection",0,45,"REJECT");
 else if(signals.selfieProbability>=.5)addPenalty("likely_selfie","Likely selfie",25,null,"REVIEW");
 else if(signals.selfieProbability>=.2)addPenalty("possible_selfie","Possible selfie cues",10,null,null);
 if(severeCrop)addPenalty("severe_face_crop","Face severely cropped",0,50,"REJECT");
 else if(moderateCrop)addPenalty("tight_face_crop","Face too close to edge",0,60,"REVIEW");
 if(severeSmallSubject)addPenalty("subject_too_small","Agent is extremely small",0,55,"REJECT");
 else if(smallSubject)addPenalty("small_subject","Agent is too small",8,69,"REVIEW");
 if(signals.minimumDimension<600)addPenalty("very_low_resolution","Very low resolution",0,50,"REJECT");
 else if(signals.resolutionScore<70)addPenalty("low_resolution","Low resolution",10,69,"REVIEW");
 if(signals.lightingScore<35)addPenalty("severe_exposure","Severe exposure problem",0,55,"REJECT");
 else if(signals.lightingScore<60)addPenalty("poor_exposure","Poor exposure",10,69,"REVIEW");
 if(signals.backgroundQuality<30)addPenalty("extreme_background","Extremely distracting background",0,55,"REJECT");
 else if(signals.backgroundQuality<60)addPenalty("busy_background","Distracting background",12,69,"REVIEW");
 if(signals.designerUsability<35)addPenalty("unusable_for_design","Not usable for design",0,50,"REJECT");
 else if(signals.designerUsability<60)addPenalty("limited_design_use","Limited designer usability",0,69,"REVIEW");
 const deduction=penalties.reduce((total,penalty)=>total+penalty.points,0),cap=penalties.reduce<number>((current,penalty)=>penalty.cap===null?current:Math.min(current,penalty.cap),100),score=rounded(Math.min(baseScore-deduction,cap)),forcedReject=penalties.some(penalty=>penalty.forces_status==="REJECT"),forcedReview=penalties.some(penalty=>penalty.forces_status==="REVIEW"),status:PhotoStatus=forcedReject||score<photoApprovalThresholds.review?"REJECT":forcedReview||score<photoApprovalThresholds.approved?"REVIEW":"APPROVED",failed=requirements.filter(item=>item.status==="FAIL"),confidence=Number((requirements.reduce((total,item)=>total+item.confidence,0)/requirements.length).toFixed(2)),primaryPenalty=penalties.find(penalty=>penalty.forces_status==="REJECT")??penalties[0],decisionReason=primaryPenalty?`${primaryPenalty.label}. Good attributes cannot override this submission requirement.`:failed[0]?.detail??"All submission requirements passed.";
 return {score,status,confidence,decisionReason,requirements,penalties};
}
