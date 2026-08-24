import {analyzePortraitComposition, confidentFace, prepareEnhancementAssets, type FaceRegion, type PersonMask} from "./image-enhancement";
import {analyzeBody, type BodyExtent, type HandState} from "./photo-body";
import {inspectSource, type SourceArtifacts} from "./photo-artifacts";
import {applyPhotoDecision, bodyExtentLabels, fileResolutionTargets, photoApprovalThresholds, categoryFloors, qualityDefectRules, scoreCaps, validateQualityDefects, type FileStatus, type QualityDefect, type PhotoPenalty, type PhotoRequirement, type PhotoStatus, type ScoreCap} from "./photo-decision";
import {backgroundQualityScore, contrastScore, exposureScore, fidelityScore, photoRatingWeights, scoreCategories} from "./photo-score";

export {applyPhotoDecision, backgroundQualityScore, bodyExtentLabels, categoryFloors, contrastScore, exposureScore, fidelityScore, fileResolutionTargets, photoApprovalThresholds, photoRatingWeights, qualityDefectRules, scoreCaps, scoreCategories, validateQualityDefects};
export type {FileStatus, PhotoPenalty, PhotoRequirement, PhotoStatus, QualityDefect, ScoreCap};

export type PhotoMetric = {name:string;score:number;note:string};
export type PhotoRating = {
 score:number;
 overall_score:number;
 base_score:number;
 raw_score:number;
 applied_cap:ScoreCap|null;
 score_trace:string[];
 status:PhotoStatus;
 label:string;
 tone:"good"|"fair"|"low";
 confidence:number;
 technical_quality:number;
 body_usability:number;
 face_visibility:number;
 editability:number;
 body_extent:BodyExtent;
 hands:HandState;
 file_suitability:number;
 file_status:FileStatus;
 file_reason:string;
 file_note:string;
 professionalism:number;
 composition:number;
 background_quality:number;
 face_quality:number;
 designer_usability:number;
 pose_appropriateness:number;
 selfie_probability:number;
 hard_gates:string[];
 designer_review_eligible:boolean;
 disputable_gates:string[];
 review_block_reason:string;
 quality_defects:QualityDefect[];
 snapshot_signals:{id:string;label:string;weight:number}[];
 issues:string[];
 strengths:string[];
 recommendation:string;
 decision_reason:string;
 requirements:PhotoRequirement[];
 penalties:PhotoPenalty[];
 metrics:PhotoMetric[];
};

// Usability weights live in ./photo-score alongside the category maths. Formality is deliberately
// absent: a relaxed, seated, smart-casual portrait that a designer can cut out and lay up scores
// exactly as well as a suited one.
export const companyProfessionalStandard=["One clearly visible agent, face unobstructed","Sharp and well exposed enough to edit","At least half the body in frame, nothing awkwardly cropped","Hands either fully in frame or naturally out of the composition","Background clean enough to isolate the agent","Sitting, leaning, relaxed posture and smart-casual clothing are all fine"] as const;

export function isPhotoApproved(rating:PhotoRating){return rating.status==="APPROVED"||(!rating.status&&rating.score>=photoApprovalThresholds.approved)}

const emptyMetrics=["Photo quality","Body & crop usability","Face & subject visibility","Background & editability"];
export const emptyPhotoRating:PhotoRating={score:0,overall_score:0,base_score:0,raw_score:0,applied_cap:null,score_trace:[],status:"REJECT",label:"Checking photo…",tone:"fair",confidence:0,technical_quality:0,body_usability:0,face_visibility:0,editability:0,body_extent:"unknown",hands:"absent",file_suitability:0,file_status:"OK",file_reason:"Waiting for image analysis.",file_note:"Waiting for image",professionalism:0,composition:0,background_quality:0,face_quality:0,designer_usability:0,pose_appropriateness:0,selfie_probability:0,hard_gates:[],designer_review_eligible:false,disputable_gates:[],review_block_reason:"",quality_defects:[],snapshot_signals:[],issues:[],strengths:[],recommendation:"Waiting for image analysis.",decision_reason:"Waiting for image analysis.",requirements:[],penalties:[],metrics:emptyMetrics.map(name=>({name,score:0,note:"Waiting for image"}))};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));
const faceEdgeClearance=(face:FaceRegion)=>Math.min(face.x,face.y,1-face.x-face.width,1-face.y-face.height);
// 1000px on the shortest edge is full marks; 600px still clears the pass bar for web-sized marketing use.
// Reads the source at up to 640px on the long edge: enough to see real focus, letterbox bars and
// screenshot chrome, cheap enough to run on every upload.
function inspectFullFrame(image:HTMLImageElement,personMask:PersonMask|null):SourceArtifacts{
 const longEdge=Math.max(image.naturalWidth,image.naturalHeight),scale=Math.min(1,640/Math.max(1,longEdge));
 const width=Math.max(8,Math.round(image.naturalWidth*scale)),height=Math.max(8,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
 canvas.width=width;canvas.height=height;
 if(!context)return {contentCoverage:1,deadCanvas:0,letterboxed:false,chromeRatio:0,isScreenshot:false,detailVariance:0,focusScore:100,subjectFocusScore:100,structureScore:100,note:"Source frame could not be inspected"};
 context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
 const pixels=context.getImageData(0,0,width,height).data,luminance=new Float32Array(width*height);
 for(let index=0;index<pixels.length;index+=4)luminance[index/4]=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
 return inspectSource(luminance,width,height,personMask?(nx,ny)=>maskValue(personMask,nx,ny):undefined);
}

const resolutionCurve=(minimumDimension:number)=>minimumDimension>=1000?100:minimumDimension>=600?70+(minimumDimension-600)/400*30:clamp(minimumDimension/600*70);
const rangeScore=(value:number,minimum:number,maximum:number,falloff:number)=>value>=minimum&&value<=maximum?100:clamp(100-Math.min(Math.abs(value-minimum),Math.abs(value-maximum))/falloff*100);

function maskCoverage(mask:PersonMask|null){
 if(!mask)return 0;
 let person=0;
 for(let index=0;index<mask.data.length;index+=1)if(mask.data[index]>.48)person+=1;
 return person/mask.data.length;
}

function maskValue(mask:PersonMask|null,x:number,y:number){
 if(!mask)return 0;
 const mx=Math.min(mask.width-1,Math.max(0,Math.floor(x*mask.width))),my=Math.min(mask.height-1,Math.max(0,Math.floor(y*mask.height)));
 return mask.data[my*mask.width+mx]??0;
}

function inferFileNote(src:string){
 const match=/^data:(image\/[a-z0-9.+-]+);base64,/i.exec(src);
 if(!match)return "Browser-supported image · file size unavailable";
 const bytes=Math.round((src.length-(match[0]?.length??0))*.75),megabytes=bytes/1024/1024;
 return `${match[1].replace("image/","").toUpperCase()} · ${megabytes.toFixed(megabytes<1?2:1)} MB`;
}

// The same problem reaches us from a requirement and from the source-frame note in slightly different
// words. Key on the opening of each sentence so it is stated once, in the issue list and in the advice.
function dedupeIssues(candidates:string[]){
 const seen=new Set<string>(),issues:string[]=[];
 for(const candidate of candidates){
  const text=candidate?.trim();
  if(!text)continue;
  const key=text.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim().slice(0,32);
  if(seen.has(key))continue;
  seen.add(key);issues.push(text);
 }
 return issues;
}

function buildRecommendation(status:PhotoStatus,issues:string[],fileReason="",hardGates:string[]=[],retakeAdvice="",designerReviewEligible=true){
 if(status==="APPROVED")return issues.length?`Ready for design. Noted, but not blocking: ${issues[0].toLowerCase()}.`:"Ready for design.";
 const fixes=issues.slice(0,3).map(issue=>issue.replace(/\.$/,"").toLowerCase());
 // A good photograph in a small file needs the same shot re-supplied, not a new shoot.
 if(status==="REUPLOAD")return `Keep this photo — re-upload the original at a higher resolution. ${fileReason}`;
 // Never offer a designer review the agent is not allowed to request: below the eligibility floor the
 // weakness is in the photograph itself, and a designer cannot add detail the file does not carry.
 if(status==="REVIEW")return designerReviewEligible
  ?`Potentially usable — send it for designer review${fixes.length?`; ${fixes.join(", ")}`:""}.`
  :`Not enough usable quality for a designer to work from — upload a clearer or higher-quality photo${fixes.length?`; ${fixes.join(", ")}`:""}.`;
 // The gate is the reason for the retake, so the advice has to answer the gate, not the smallest nit found.
 if(hardGates.length)return `Retake recommended because: ${hardGates[0].toLowerCase()}.${retakeAdvice?` ${retakeAdvice}`:""}`;
 return `Retake the photo${fixes.length?` with these changes: ${fixes.join(", ")}`:" from farther away with even lighting and a clean background"}.`;
}

export function evaluatePhoto(src:string,targetAspect=.8){
 return new Promise<PhotoRating>((resolve,reject)=>{
  const assetsPromise=prepareEnhancementAssets(src).catch(()=>({face:null,faces:[],personMask:null,pose:null}));
  const compositionPromise=analyzePortraitComposition(src,targetAspect).catch(()=>({score:0,note:"Could not verify portrait framing"}));
  const image=new Image();
  image.crossOrigin="anonymous";
  image.onload=async()=>{
   try{
    const sampleSize=128,canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
    canvas.width=sampleSize;canvas.height=sampleSize;
    if(!context)throw new Error("Canvas is unavailable");
    context.fillStyle="#fff";context.fillRect(0,0,sampleSize,sampleSize);context.drawImage(image,0,0,sampleSize,sampleSize);
    const pixels=context.getImageData(0,0,sampleSize,sampleSize).data,luminance=new Float32Array(sampleSize*sampleSize);
    for(let index=0;index<pixels.length;index+=4)luminance[index/4]=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
    // Focus, letterboxing and screenshot chrome all vanish at 128px, so inspect the source frame at
    // (capped) native resolution instead of the thumbnail used for the tonal statistics.
    const [assets,portraitComposition]=await Promise.all([assetsPromise,compositionPromise]),coverage=maskCoverage(assets.personMask);
    // Only confident detections count as agents, so a phantom face on folded arms cannot read as a second
    // person. A lone weak detection is still kept: one soft face is a soft photo, not a faceless one.
    const detectedFaces=assets.faces??(assets.face?[assets.face]:[]),confidentFaces=detectedFaces.filter(item=>(item.confidence??1)>=confidentFace),faces=confidentFaces.length?confidentFaces:detectedFaces.slice(0,1),face=faces[0]??null;
    const artifacts=inspectFullFrame(image,assets.personMask);
    const subjectLuminance:number[]=[],tonalLuminance:number[]=[];
    for(let y=0;y<sampleSize;y++)for(let x=0;x<sampleSize;x++){
     const nx=x/sampleSize,ny=y/sampleSize,value=luminance[y*sampleSize+x],isSubject=assets.personMask?maskValue(assets.personMask,nx,ny)>.42:(nx>.22&&nx<.78&&ny>.06&&ny<.72);
     if(isSubject)subjectLuminance.push(value);
     if(isSubject&&face&&nx>=face.x&&nx<=face.x+face.width&&ny>=face.y&&ny<=face.y+face.height)tonalLuminance.push(value);
    }
    const luminanceSample=subjectLuminance.length>80?subjectLuminance:Array.from(luminance),tonalSample=tonalLuminance.length>40?tonalLuminance:luminanceSample,mean=tonalSample.reduce((sum,value)=>sum+value,0)/tonalSample.length,deviation=Math.sqrt(tonalSample.reduce((sum,value)=>sum+(value-mean)**2,0)/tonalSample.length),blown=tonalSample.filter(value=>value>246).length/tonalSample.length,crushed=tonalSample.filter(value=>value<12).length/tonalSample.length;
    let backgroundEdgeTotal=0,backgroundEdgeCount=0,flatNoiseTotal=0,flatNoiseCount=0;
    const step=1/sampleSize,subjectAt=(x:number,y:number)=>maskValue(assets.personMask,x*step,y*step);
    for(let y=1;y<sampleSize-1;y++)for(let x=1;x<sampleSize-1;x++){
     const index=y*sampleSize+x,left=luminance[index-1],right=luminance[index+1],top=luminance[index-sampleSize],bottom=luminance[index+sampleSize],edge=Math.abs(4*luminance[index]-left-right-top-bottom);
     if(!assets.personMask||subjectAt(x,y)<.28){backgroundEdgeTotal+=edge;backgroundEdgeCount+=1}
     const range=Math.max(left,right,top,bottom)-Math.min(left,right,top,bottom);
     if(range<18){flatNoiseTotal+=edge;flatNoiseCount+=1}
    }
    const backgroundEdgeMean=backgroundEdgeTotal/Math.max(1,backgroundEdgeCount),flatNoise=flatNoiseTotal/Math.max(1,flatNoiseCount),minimumDimension=Math.min(image.naturalWidth,image.naturalHeight),resolutionScore=resolutionCurve(minimumDimension),sourceAspect=image.naturalWidth/image.naturalHeight,lightingScore=exposureScore(mean,blown,crushed),contrast=contrastScore(deviation),fidelity=fidelityScore(flatNoise);
    // Sharpness is read on the agent at source resolution, then held to the whole-frame focus read.
    // The 128px thumbnail below is for tone only: at that size a sharp portrait and a blurred one measure the same.
    const sharpnessScore=rounded(Math.min(artifacts.subjectFocusScore,artifacts.focusScore));
    // Structural detail is read separately from that average, and it is the one the categories and the
    // defect checks lean on: smooth skin, retouching and soft studio lighting flatten the average while
    // leaving eyes, hairline, glasses and clothing edges perfectly usable.
    const structureScore=rounded(artifacts.structureScore);
    const body=analyzeBody(assets.pose??null,assets.personMask,face,coverage);

    // How cleanly the agent sits against what is behind them. This feeds the Background & Editability
    // category rather than being one: on its own a plain backdrop proves nothing about masking.
    const backgroundQuality=backgroundQualityScore(backgroundEdgeMean,coverage,Boolean(assets.personMask),faces.length);
    const usableArea=coverage?clamp(coverage/.34*100):face?clamp(face.height/.16*100):0;
    const faceClearance=face?faceEdgeClearance(face):-1,faceScaleScore=face?rangeScore(face.height,.06,.36,.1):0,faceEdgeScore=face?clamp(faceClearance/.05*100):0;
    // The four category scores, weighted 30/30/20/20 into the raw score. Everything they need is above;
    // the maths itself lives in ./photo-score so the same numbers can be checked outside the browser.
    const faceHeightPixels=(face?.height??0)*image.naturalHeight;
    const categories=scoreCategories({sharpnessScore,structureScore,lightingScore,contrastScore:contrast,fidelityScore:fidelity,resolutionScore,faceCount:faces.length,faceHeightPixels,faceScaleScore,faceEdgeScore,bodyExtentScore:body.extentScore,cropScore:body.cropScore,handScore:body.handScore,usableArea,backgroundQuality,accessoryImpact:body.accessoryImpact});
    const technicalQuality=categories.photoQuality,bodyUsability=categories.bodyCrop,faceVisibility=categories.faceVisibility,editability=categories.backgroundEditability,faceQuality=faceVisibility;

    // Informational only — never rewards formality, never feeds the score.
    const closeFace=face?clamp((face.height-.34)/.28,0,1):0,croppedFace=face?clamp((.035-faceClearance)/.035,0,1):0;
    const selfieProbability=Number(clamp(.03+closeFace*.62+croppedFace*.2+(artifacts.isScreenshot?.45:0),0,1).toFixed(2));
    const poseAppropriateness=face?rounded(98-croppedFace*30-(faces.length>1?25:0)):25;
    const professionalism=rounded(technicalQuality*.3+bodyUsability*.3+faceVisibility*.2+editability*.2);
    const designerUsability=editability;
    const composition=rounded(portraitComposition.score*.4+body.cropScore*.35+usableArea*.25);
    const baseScore=categories.rawScore;
    const decision=applyPhotoDecision(baseScore,{minimumDimension,resolutionScore,sharpnessScore,structureScore,fidelityScore:rounded(fidelity),focusScore:artifacts.focusScore,faceCount:faces.length,faceClearance,faceHeight:face?.height??0,faceHeightPixels,faceClarity:categories.faceClarity,accessoryImpact:body.accessoryImpact,choppedLimbs:body.choppedLimbs,photoQuality:categories.photoQuality,bodyCrop:categories.bodyCrop,faceVisibility:categories.faceVisibility,selfieProbability,lightingScore,backgroundQuality,designerUsability:editability,bodyExtent:body.extent,cropScore:body.cropScore,hands:body.hands,handScore:body.handScore,backgroundTexture:backgroundEdgeMean,frameAspect:sourceAspect,subjectCoverage:coverage,torsoVisible:body.torsoVisible,shoulderTilt:body.shoulderTilt,handAtFace:body.handAtFace,isScreenshot:artifacts.isScreenshot,letterboxed:artifacts.letterboxed,contentCoverage:artifacts.contentCoverage});
    const score=decision.score,status=decision.status,tone=status==="APPROVED"?"good":status==="REJECT"?"low":"fair",label=status==="APPROVED"?"Ready for Design":status==="REUPLOAD"?"Re-upload at Higher Resolution":status==="REVIEW"?"Designer Review":"Retake Recommended",issues=dedupeIssues([...decision.requirements.filter(requirement=>requirement.status==="FAIL"&&requirement.id!=="resolution").map(requirement=>requirement.detail),...(body.croppedEdges.length?[body.note]:[])]),strengths:string[]=[];
    if(technicalQuality>=80&&sharpnessScore>=70)strengths.push("Sharp and cleanly exposed");
    if(sharpnessScore>=75)strengths.push("Sharp subject detail");
    if(body.extentScore>=90)strengths.push(`${bodyExtentLabels[body.extent]} in frame — plenty for a designer`);
    if(body.hands==="complete")strengths.push("Hands are fully in frame");
    if(body.cropScore>=85)strengths.push("Nothing important is cropped");
    if(faceVisibility>=80)strengths.push("One clear, unobstructed face");
    if(editability>=80)strengths.push("Agent can be isolated cleanly");
    if(backgroundQuality>=80)strengths.push("Clean background");
    const metrics:PhotoMetric[]=[
     {name:"Photo quality",score:technicalQuality,note:technicalQuality>=80?`Sharp, well exposed, clean · ${minimumDimension}px shortest edge`:technicalQuality>=65?`Usable, with visible softness or compression · ${minimumDimension}px shortest edge`:artifacts.note},
     {name:"Body & crop usability",score:bodyUsability,note:`${bodyExtentLabels[body.extent]} · ${body.handNote}`},
     {name:"Face & subject visibility",score:faceVisibility,note:faces.length!==1?(faces.length?`${faces.length} faces detected`:"No clear face detected"):faceVisibility>=80?"One agent, plenty of usable facial detail":faceVisibility>=65?"One agent, but facial detail is limited":"One agent, too little facial detail to work with"},
     {name:"Background & editability",score:editability,note:editability>=80?"Easy to isolate and lay up":editability>=65?"Workable, but the subject edge or crop limits masking":"Hard to isolate cleanly"},
    ];
    // Technical file facts are reported, never weighted: a valid JPEG is not a good photograph, and a
    // small file is not a bad one.
    const fileNote=`${inferFileNote(src)} · ${image.naturalWidth} × ${image.naturalHeight}`;
    resolve({score,overall_score:score,base_score:baseScore,raw_score:decision.rawScore,applied_cap:decision.appliedCap,score_trace:decision.scoreTrace,status,label,tone,confidence:decision.confidence,file_note:fileNote,hard_gates:decision.hardGates,designer_review_eligible:decision.designerReviewEligible,disputable_gates:decision.disputableGates,review_block_reason:decision.reviewBlockReason,quality_defects:decision.qualityDefects,snapshot_signals:decision.snapshotSignals,technical_quality:technicalQuality,body_usability:bodyUsability,face_visibility:faceVisibility,editability,body_extent:body.extent,hands:body.hands,file_suitability:decision.fileSuitability,file_status:decision.fileStatus,file_reason:decision.fileReason,professionalism,composition,background_quality:backgroundQuality,face_quality:faceQuality,designer_usability:designerUsability,pose_appropriateness:poseAppropriateness,selfie_probability:selfieProbability,issues,strengths,recommendation:buildRecommendation(status,issues,decision.fileReason,decision.hardGates,decision.retakeAdvice,decision.designerReviewEligible),decision_reason:decision.decisionReason,requirements:decision.requirements,penalties:decision.penalties,metrics});
   }catch(error){reject(error)}
  };
  image.onerror=reject;image.src=src;
 });
}
