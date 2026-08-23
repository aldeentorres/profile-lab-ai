import {analyzePortraitComposition, prepareEnhancementAssets, type FaceRegion, type PersonMask} from "./image-enhancement";
import {applyPhotoDecision, photoApprovalThresholds, type PhotoPenalty, type PhotoRequirement, type PhotoStatus} from "./photo-decision";

export {applyPhotoDecision, photoApprovalThresholds};
export type {PhotoPenalty, PhotoRequirement, PhotoStatus};

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

export const photoRatingWeights={technical_quality:.25,composition:.25,background_quality:.15,professionalism:.15,designer_usability:.2} as const;
export const companyProfessionalStandard=["One clearly visible agent","Clean, company-appropriate clothing and environment","Even lighting and a distraction-free setting","Enough safe space for brand copy, logos and CTA","Seated, standing, relaxed and lifestyle poses are equally acceptable"] as const;

export function isPhotoApproved(rating:PhotoRating){return rating.status==="APPROVED"||(!rating.status&&rating.score>=photoApprovalThresholds.approved)}

const emptyMetrics=["Technical quality","Framing & composition","Background","Professional presentation","Designer usability"];
export const emptyPhotoRating:PhotoRating={score:0,overall_score:0,base_score:0,status:"REJECT",label:"Checking photo…",tone:"fair",confidence:0,technical_quality:0,professionalism:0,composition:0,background_quality:0,face_quality:0,designer_usability:0,pose_appropriateness:0,selfie_probability:0,issues:[],strengths:[],recommendation:"Waiting for image analysis.",decision_reason:"Waiting for image analysis.",requirements:[],penalties:[],metrics:emptyMetrics.map(name=>({name,score:0,note:"Waiting for image"}))};

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=(value:number)=>Math.round(clamp(value));
const faceEdgeClearance=(face:FaceRegion)=>Math.min(face.x,face.y,1-face.x-face.width,1-face.y-face.height);
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

function buildRecommendation(status:PhotoStatus,issues:string[]){
 if(status==="APPROVED")return issues.length?`Ready for design. Optional polish: ${issues[0].toLowerCase()}.`:"Ready for design.";
 const fixes=issues.slice(0,3).map(issue=>issue.replace(/\.$/,"").toLowerCase());
 if(status==="REVIEW")return `Review before design${fixes.length?`; ${fixes.join(", ")}`:""}.`;
 return `Retake the photo${fixes.length?` with these changes: ${fixes.join(", ")}`:" from farther away with even lighting and a clean background"}.`;
}

export function evaluatePhoto(src:string,targetAspect=.8){
 return new Promise<PhotoRating>((resolve,reject)=>{
  const assetsPromise=prepareEnhancementAssets(src).catch(()=>({face:null,faces:[],personMask:null}));
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
    const [assets,portraitComposition]=await Promise.all([assetsPromise,compositionPromise]),face=assets.face,faces=assets.faces??(face?[face]:[]),coverage=maskCoverage(assets.personMask);
    const subjectLuminance:number[]=[];
    for(let y=0;y<sampleSize;y++)for(let x=0;x<sampleSize;x++){
     const nx=x/sampleSize,ny=y/sampleSize,isSubject=assets.personMask?maskValue(assets.personMask,nx,ny)>.42:(nx>.22&&nx<.78&&ny>.06&&ny<.72);
     if(isSubject)subjectLuminance.push(luminance[y*sampleSize+x]);
    }
    const luminanceSample=subjectLuminance.length>80?subjectLuminance:Array.from(luminance),mean=luminanceSample.reduce((sum,value)=>sum+value,0)/luminanceSample.length,deviation=Math.sqrt(luminanceSample.reduce((sum,value)=>sum+(value-mean)**2,0)/luminanceSample.length),clipped=luminanceSample.filter(value=>value<18||value>240).length/luminanceSample.length;
    let edgeTotal=0,edgeCount=0,backgroundEdgeTotal=0,backgroundEdgeCount=0,flatNoiseTotal=0,flatNoiseCount=0;
    for(let y=1;y<sampleSize-1;y++)for(let x=1;x<sampleSize-1;x++){
     const index=y*sampleSize+x,left=luminance[index-1],right=luminance[index+1],top=luminance[index-sampleSize],bottom=luminance[index+sampleSize],edge=Math.abs(4*luminance[index]-left-right-top-bottom);
     edgeTotal+=edge;edgeCount+=1;
     if(!assets.personMask||maskValue(assets.personMask,x/sampleSize,y/sampleSize)<.28){backgroundEdgeTotal+=edge;backgroundEdgeCount+=1}
     const range=Math.max(left,right,top,bottom)-Math.min(left,right,top,bottom);
     if(range<18){flatNoiseTotal+=edge;flatNoiseCount+=1}
    }
    const edgeMean=edgeTotal/Math.max(1,edgeCount),backgroundEdgeMean=backgroundEdgeTotal/Math.max(1,backgroundEdgeCount),flatNoise=flatNoiseTotal/Math.max(1,flatNoiseCount),minimumDimension=Math.min(image.naturalWidth,image.naturalHeight),resolutionScore=clamp(minimumDimension/12),sourceAspect=image.naturalWidth/image.naturalHeight,aspectLoss=sourceAspect>targetAspect?1-targetAspect/sourceAspect:1-sourceAspect/targetAspect,aspectScore=clamp(100-aspectLoss*180),lightingScore=clamp(105-Math.abs(mean-145)*1.25-clipped*120),contrastScore=clamp(100-Math.abs(deviation-52)*1.7),sharpnessScore=clamp(edgeMean/38*100),fidelityScore=clamp(108-flatNoise*2.1),technicalQuality=rounded(resolutionScore*.25+aspectScore*.1+lightingScore*.2+contrastScore*.1+sharpnessScore*.25+fidelityScore*.1);
    const faceClearance=face?faceEdgeClearance(face):-1,faceScaleScore=face?rangeScore(face.height,.1,.36,.1):0,faceEdgeScore=face?clamp(faceClearance/.05*100):0,singleAgentScore=faces.length===1?100:faces.length===0?0:20,faceQuality=face?rounded(faceScaleScore*.3+faceEdgeScore*.25+sharpnessScore*.2+singleAgentScore*.25):0,faceCenter=face?face.x+face.width/2:.5,centerOffset=face?Math.abs(faceCenter-.5):.5,centerScore=face?(centerOffset<=.2?100:clamp(100-(centerOffset-.2)*420)):0,headroomScore=face?rangeScore(face.y,.035,.24,.12):0,negativeSpaceScore=face?clamp((1-face.width)*125):coverage?clamp((1-coverage)*120):20,composition=face?rounded(portraitComposition.score*.6+centerScore*.12+headroomScore*.08+aspectScore*.08+negativeSpaceScore*.12):0;
    const backgroundClarity=assets.personMask?clamp(112-backgroundEdgeMean*2.45):45,backgroundSpace=coverage?clamp(118-Math.max(0,coverage-.42)*180):45,backgroundQuality=rounded(backgroundClarity*.65+backgroundSpace*.25+(faces.length<=1?100:20)*.1),closeFace=face?clamp((face.height-.3)/.28,0,1):0,croppedFace=face?clamp((.035-faceClearance)/.035,0,1):0,selfieProbability=Number(clamp(.04+closeFace*.78+croppedFace*.18,0,1).toFixed(2)),poseAppropriateness=face?rounded(96-croppedFace*32-selfieProbability*24-(faces.length>1?25:0)):25,professionalism=rounded(faceQuality*.25+composition*.2+backgroundQuality*.3+technicalQuality*.25),designerUsability=rounded(composition*.35+backgroundQuality*.28+technicalQuality*.2+negativeSpaceScore*.12+faceQuality*.05),baseScore=rounded(technicalQuality*photoRatingWeights.technical_quality+composition*photoRatingWeights.composition+backgroundQuality*photoRatingWeights.background_quality+professionalism*photoRatingWeights.professionalism+designerUsability*photoRatingWeights.designer_usability),decision=applyPhotoDecision(baseScore,{minimumDimension,resolutionScore,sharpnessScore,faceCount:faces.length,faceClearance,faceHeight:face?.height??0,selfieProbability,lightingScore,backgroundQuality,designerUsability}),score=decision.score,status=decision.status,tone=status==="APPROVED"?"good":status==="REVIEW"?"fair":"low",label=status==="APPROVED"?"Ready for Design":status==="REVIEW"?"Designer Review":"Retake Recommended",issues=[...new Set(decision.requirements.filter(requirement=>requirement.status==="FAIL").map(requirement=>requirement.detail))],strengths:string[]=[];
    if(selfieProbability>=.2&&selfieProbability<.5)issues.push("Possible selfie cues detected — verify that another person or a tripod captured the portrait");
    if(composition<60&&!issues.some(issue=>issue.toLowerCase().includes("crop")))issues.push("Framing limits layout options — leave intentional space around the agent and avoid accidental cropping");
    if(technicalQuality>=80)strengths.push("High technical quality");
    if(lightingScore>=75)strengths.push("Balanced lighting");
    if(sharpnessScore>=75)strengths.push("Sharp image detail");
    if(faceQuality>=80)strengths.push("One clear, well-sized face");
    if(backgroundQuality>=80)strengths.push("Clean background");
    if(composition>=80)strengths.push("Strong portrait composition");
    if(designerUsability>=80)strengths.push("Useful space for branding and copy");
    if(professionalism>=80)strengths.push("Matches the company portrait standard");
    if(poseAppropriateness>=85)strengths.push("Pose is marketing-appropriate, whether formal or casual");
    if(selfieProbability<=.2)strengths.push("Low selfie likelihood");
    const metrics:PhotoMetric[]=[{name:"Technical quality",score:technicalQuality,note:`${image.naturalWidth} × ${image.naturalHeight}px · ${inferFileNote(src)}`},{name:"Framing & composition",score:composition,note:portraitComposition.note},{name:"Background",score:backgroundQuality,note:backgroundQuality>=80?"Clean and usable":"Simplify distractions behind the agent"},{name:"Professional presentation",score:professionalism,note:professionalism>=80?"Business-ready overall presentation":"Quality, setting and editability matter more than formality"},{name:"Designer usability",score:designerUsability,note:designerUsability>=80?"Good room for graphic elements":"More negative space would help"}];
    resolve({score,overall_score:score,base_score:baseScore,status,label,tone,confidence:decision.confidence,technical_quality:technicalQuality,professionalism,composition,background_quality:backgroundQuality,face_quality:faceQuality,designer_usability:designerUsability,pose_appropriateness:poseAppropriateness,selfie_probability:selfieProbability,issues,strengths,recommendation:buildRecommendation(status,issues),decision_reason:decision.decisionReason,requirements:decision.requirements,penalties:decision.penalties,metrics});
   }catch(error){reject(error)}
  };
  image.onerror=reject;image.src=src;
 });
}
