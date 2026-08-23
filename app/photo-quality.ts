import {analyzePortraitComposition, prepareEnhancementAssets, type FaceRegion, type PersonMask} from "./image-enhancement";
import {analyzeBody, type BodyExtent, type HandState} from "./photo-body";
import {inspectSource, type SourceArtifacts} from "./photo-artifacts";
import {applyPhotoDecision, bodyExtentLabels, fileResolutionTargets, photoApprovalThresholds, type FileStatus, type PhotoPenalty, type PhotoRequirement, type PhotoStatus} from "./photo-decision";

export {applyPhotoDecision, bodyExtentLabels, fileResolutionTargets, photoApprovalThresholds};
export type {FileStatus, PhotoPenalty, PhotoRequirement, PhotoStatus};

export type PhotoMetric = {name:string;score:number;note:string};
export type PhotoRating = {
 score:number;
 overall_score:number;
 base_score:number;
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
 professionalism:number;
 composition:number;
 background_quality:number;
 face_quality:number;
 designer_usability:number;
 pose_appropriateness:number;
 selfie_probability:number;
 issues:string[];
 strengths:string[];
 recommendation:string;
 decision_reason:string;
 requirements:PhotoRequirement[];
 penalties:PhotoPenalty[];
 metrics:PhotoMetric[];
};

// Usability weights. Formality is deliberately absent: a relaxed, seated, smart-casual portrait that a
// designer can cut out and lay up scores exactly as well as a suited one.
export const photoRatingWeights={technical_quality:.3,body_usability:.3,face_visibility:.2,editability:.2} as const;
export const companyProfessionalStandard=["One clearly visible agent, face unobstructed","Sharp and well exposed enough to edit","At least half the body in frame, nothing awkwardly cropped","Hands either fully in frame or naturally out of the composition","Background clean enough to isolate the agent","Sitting, leaning, relaxed posture and smart-casual clothing are all fine"] as const;

export function isPhotoApproved(rating:PhotoRating){return rating.status==="APPROVED"||(!rating.status&&rating.score>=photoApprovalThresholds.approved)}

const emptyMetrics=["Photo quality","Body & crop usability","Face & subject visibility","Background & editability","File suitability"];
export const emptyPhotoRating:PhotoRating={score:0,overall_score:0,base_score:0,status:"REJECT",label:"Checking photo…",tone:"fair",confidence:0,technical_quality:0,body_usability:0,face_visibility:0,editability:0,body_extent:"unknown",hands:"absent",file_suitability:0,file_status:"OK",file_reason:"Waiting for image analysis.",professionalism:0,composition:0,background_quality:0,face_quality:0,designer_usability:0,pose_appropriateness:0,selfie_probability:0,issues:[],strengths:[],recommendation:"Waiting for image analysis.",decision_reason:"Waiting for image analysis.",requirements:[],penalties:[],metrics:emptyMetrics.map(name=>({name,score:0,note:"Waiting for image"}))};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));
const faceEdgeClearance=(face:FaceRegion)=>Math.min(face.x,face.y,1-face.x-face.width,1-face.y-face.height);
// 1000px on the shortest edge is full marks; 600px still clears the pass bar for web-sized marketing use.
// Reads the source at up to 640px on the long edge: enough to see real focus, letterbox bars and
// screenshot chrome, cheap enough to run on every upload.
function inspectFullFrame(image:HTMLImageElement):SourceArtifacts{
 const longEdge=Math.max(image.naturalWidth,image.naturalHeight),scale=Math.min(1,640/Math.max(1,longEdge));
 const width=Math.max(8,Math.round(image.naturalWidth*scale)),height=Math.max(8,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
 canvas.width=width;canvas.height=height;
 if(!context)return {contentCoverage:1,deadCanvas:0,letterboxed:false,chromeRatio:0,isScreenshot:false,detailVariance:0,focusScore:100,note:"Source frame could not be inspected"};
 context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
 const pixels=context.getImageData(0,0,width,height).data,luminance=new Float32Array(width*height);
 for(let index=0;index<pixels.length;index+=4)luminance[index/4]=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
 return inspectSource(luminance,width,height);
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

function buildRecommendation(status:PhotoStatus,issues:string[],fileReason=""){
 if(status==="APPROVED")return issues.length?`Ready for design. Optional polish: ${issues[0].toLowerCase()}.`:"Ready for design.";
 const fixes=issues.slice(0,3).map(issue=>issue.replace(/\.$/,"").toLowerCase());
 // A good photograph in a small file needs the same shot re-supplied, not a new shoot.
 if(status==="REUPLOAD")return `Keep this photo — re-upload the original at a higher resolution. ${fileReason}`;
 if(status==="REVIEW")return `Review before design${fixes.length?`; ${fixes.join(", ")}`:""}.`;
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
    const artifacts=inspectFullFrame(image);
    const [assets,portraitComposition]=await Promise.all([assetsPromise,compositionPromise]),face=assets.face,faces=assets.faces??(face?[face]:[]),coverage=maskCoverage(assets.personMask);
    const subjectLuminance:number[]=[],tonalLuminance:number[]=[];
    for(let y=0;y<sampleSize;y++)for(let x=0;x<sampleSize;x++){
     const nx=x/sampleSize,ny=y/sampleSize,value=luminance[y*sampleSize+x],isSubject=assets.personMask?maskValue(assets.personMask,nx,ny)>.42:(nx>.22&&nx<.78&&ny>.06&&ny<.72);
     if(isSubject)subjectLuminance.push(value);
     if(isSubject&&face&&nx>=face.x&&nx<=face.x+face.width&&ny>=face.y&&ny<=face.y+face.height)tonalLuminance.push(value);
    }
    const luminanceSample=subjectLuminance.length>80?subjectLuminance:Array.from(luminance),tonalSample=tonalLuminance.length>40?tonalLuminance:luminanceSample,mean=tonalSample.reduce((sum,value)=>sum+value,0)/tonalSample.length,deviation=Math.sqrt(tonalSample.reduce((sum,value)=>sum+(value-mean)**2,0)/tonalSample.length),blown=tonalSample.filter(value=>value>246).length/tonalSample.length,crushed=tonalSample.filter(value=>value<12).length/tonalSample.length;
    let edgeTotal=0,edgeCount=0,backgroundEdgeTotal=0,backgroundEdgeCount=0,flatNoiseTotal=0,flatNoiseCount=0,subjectEdgeTotal=0,subjectEdgeCount=0;
    const step=1/sampleSize,subjectAt=(x:number,y:number)=>maskValue(assets.personMask,x*step,y*step);
    for(let y=1;y<sampleSize-1;y++)for(let x=1;x<sampleSize-1;x++){
     const index=y*sampleSize+x,left=luminance[index-1],right=luminance[index+1],top=luminance[index-sampleSize],bottom=luminance[index+sampleSize],edge=Math.abs(4*luminance[index]-left-right-top-bottom);
     edgeTotal+=edge;edgeCount+=1;
     if(!assets.personMask||subjectAt(x,y)<.28){backgroundEdgeTotal+=edge;backgroundEdgeCount+=1}
     // Sharpness must be read inside the subject only: flat background and the cut-out silhouette both distort a whole-frame average.
     if(assets.personMask&&subjectAt(x,y)>.6&&subjectAt(x-1,y)>.6&&subjectAt(x+1,y)>.6&&subjectAt(x,y-1)>.6&&subjectAt(x,y+1)>.6){subjectEdgeTotal+=edge;subjectEdgeCount+=1}
     const range=Math.max(left,right,top,bottom)-Math.min(left,right,top,bottom);
     if(range<18){flatNoiseTotal+=edge;flatNoiseCount+=1}
    }
    const edgeMean=edgeTotal/Math.max(1,edgeCount),backgroundEdgeMean=backgroundEdgeTotal/Math.max(1,backgroundEdgeCount),flatNoise=flatNoiseTotal/Math.max(1,flatNoiseCount),detailMean=subjectEdgeCount>400?subjectEdgeTotal/subjectEdgeCount:edgeMean,minimumDimension=Math.min(image.naturalWidth,image.naturalHeight),resolutionScore=resolutionCurve(minimumDimension),sourceAspect=image.naturalWidth/image.naturalHeight,aspectLoss=sourceAspect>targetAspect?1-targetAspect/sourceAspect:1-sourceAspect/targetAspect,aspectScore=clamp(100-aspectLoss*180),lightingScore=clamp(105-Math.abs(mean-145)*1.25-blown*260-crushed*90),contrastScore=clamp(100-Math.max(0,44-deviation)*2.4-Math.max(0,deviation-98)*1.2),fidelityScore=clamp(108-flatNoise*2.1);
    // Sharpness takes the harsher of the two reads: subject-interior edges, and native-resolution focus.
    const sharpnessScore=rounded(Math.min(clamp(detailMean/38*100),artifacts.focusScore));
    const body=analyzeBody(assets.pose??null,assets.personMask,face,coverage);

    // PHOTO QUALITY 30% — sharp, in focus, correctly exposed, clean pixels.
    const technicalQuality=rounded(sharpnessScore*.42+lightingScore*.24+contrastScore*.12+fidelityScore*.12+aspectScore*.1);

    // BODY & CROP USABILITY 30% — is there enough of the agent, cropped cleanly, hands intact?
    const usableArea=coverage?clamp(coverage/.34*100):face?clamp(face.height/.16*100):0;
    const bodyUsability=rounded(body.extentScore*.42+body.cropScore*.26+body.handScore*.18+usableArea*.14);

    // FACE & SUBJECT VISIBILITY 20% — one agent, clearly visible, well sized, not clipped.
    const faceClearance=face?faceEdgeClearance(face):-1,faceScaleScore=face?rangeScore(face.height,.06,.36,.1):0,faceEdgeScore=face?clamp(faceClearance/.05*100):0,singleAgentScore=faces.length===1?100:faces.length===0?0:20;
    const faceQuality=face?rounded(faceScaleScore*.24+faceEdgeScore*.2+sharpnessScore*.24+singleAgentScore*.32):0;
    const faceVisibility=faceQuality;

    // BACKGROUND & EDITABILITY 20% — can the agent be isolated and laid up?
    const backgroundClarity=assets.personMask?clamp(112-backgroundEdgeMean*2.45):45,backgroundSpace=coverage?clamp(118-Math.max(0,coverage-.55)*180):45,separation=assets.personMask?clamp(70+coverage*90):40;
    const backgroundQuality=rounded(backgroundClarity*.55+backgroundSpace*.2+separation*.15+(faces.length<=1?100:20)*.1);
    const editability=rounded(backgroundQuality*.6+body.cropScore*.2+usableArea*.2);

    // Informational only — never rewards formality, never feeds the score.
    const closeFace=face?clamp((face.height-.34)/.28,0,1):0,croppedFace=face?clamp((.035-faceClearance)/.035,0,1):0;
    const selfieProbability=Number(clamp(.03+closeFace*.62+croppedFace*.2+(artifacts.isScreenshot?.45:0),0,1).toFixed(2));
    const poseAppropriateness=face?rounded(98-croppedFace*30-(faces.length>1?25:0)):25;
    const professionalism=rounded(technicalQuality*.3+bodyUsability*.3+faceVisibility*.2+editability*.2);
    const designerUsability=editability;
    const composition=rounded(portraitComposition.score*.4+body.cropScore*.35+usableArea*.25);
    const baseScore=rounded(technicalQuality*photoRatingWeights.technical_quality+bodyUsability*photoRatingWeights.body_usability+faceVisibility*photoRatingWeights.face_visibility+editability*photoRatingWeights.editability);
    const decision=applyPhotoDecision(baseScore,{minimumDimension,resolutionScore,sharpnessScore,focusScore:artifacts.focusScore,faceCount:faces.length,faceClearance,faceHeight:face?.height??0,selfieProbability,lightingScore,backgroundQuality,designerUsability:editability,bodyExtent:body.extent,cropScore:body.cropScore,hands:body.hands,isScreenshot:artifacts.isScreenshot,letterboxed:artifacts.letterboxed,contentCoverage:artifacts.contentCoverage});
    const score=decision.score,status=decision.status,tone=status==="APPROVED"?"good":status==="REJECT"?"low":"fair",label=status==="APPROVED"?"Ready for Design":status==="REUPLOAD"?"Re-upload at Higher Resolution":status==="REVIEW"?"Designer Review":"Retake Recommended",issues=[...new Set(decision.requirements.filter(requirement=>requirement.status==="FAIL"&&requirement.id!=="resolution").map(requirement=>requirement.detail))],strengths:string[]=[];
    if(artifacts.note&&(artifacts.isScreenshot||artifacts.letterboxed))issues.push(artifacts.note);
    if(body.croppedEdges.length)issues.push(body.note);
    if(technicalQuality>=80)strengths.push("Sharp and cleanly exposed");
    if(sharpnessScore>=75)strengths.push("Sharp subject detail");
    if(body.extentScore>=90)strengths.push(`${bodyExtentLabels[body.extent]} in frame — plenty for a designer`);
    if(body.hands==="complete")strengths.push("Hands are fully in frame");
    if(body.cropScore>=85)strengths.push("Nothing important is cropped");
    if(faceVisibility>=80)strengths.push("One clear, unobstructed face");
    if(editability>=80)strengths.push("Agent can be isolated cleanly");
    if(backgroundQuality>=80)strengths.push("Clean background");
    const metrics:PhotoMetric[]=[
     {name:"Photo quality",score:technicalQuality,note:technicalQuality>=80?"Sharp, well exposed, clean":artifacts.note},
     {name:"Body & crop usability",score:bodyUsability,note:`${bodyExtentLabels[body.extent]} · ${body.handNote}`},
     {name:"Face & subject visibility",score:faceVisibility,note:faces.length===1?"One agent, face clearly visible":faces.length?`${faces.length} faces detected`:"No clear face detected"},
     {name:"Background & editability",score:editability,note:editability>=80?"Easy to isolate and lay up":"Background or crop limits editing"},
     {name:"File suitability",score:decision.fileSuitability,note:`${image.naturalWidth} × ${image.naturalHeight}px · ${inferFileNote(src)}`},
    ];
    resolve({score,overall_score:score,base_score:baseScore,status,label,tone,confidence:decision.confidence,technical_quality:technicalQuality,body_usability:bodyUsability,face_visibility:faceVisibility,editability,body_extent:body.extent,hands:body.hands,file_suitability:decision.fileSuitability,file_status:decision.fileStatus,file_reason:decision.fileReason,professionalism,composition,background_quality:backgroundQuality,face_quality:faceQuality,designer_usability:designerUsability,pose_appropriateness:poseAppropriateness,selfie_probability:selfieProbability,issues,strengths,recommendation:buildRecommendation(status,issues,decision.fileReason),decision_reason:decision.decisionReason,requirements:decision.requirements,penalties:decision.penalties,metrics});
   }catch(error){reject(error)}
  };
  image.onerror=reject;image.src=src;
 });
}
