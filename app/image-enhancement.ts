import {mattePortrait, type PersonMask as MatteMask} from "./portrait-matting";

export type FaceRegion = {x:number;y:number;width:number;height:number;confidence?:number};
export type BackgroundMode = "original"|"blur"|"gray"|"ivory"|"white";
export type EnhanceSettings = {
  skin:number;
  light:number;
  definition:number;
  background:BackgroundMode;
  highResolution:boolean;
};

export type PersonMask = {data:Float32Array;width:number;height:number};
export type PoseLandmark = {x:number;y:number;visibility:number};
export type EnhancementAssets = {face:FaceRegion|null;faces:FaceRegion[];personMask:PersonMask|null;pose:PoseLandmark[]|null};
export type RenderedPhoto = {dataUrl:string;width:number;height:number};
export type PortraitComposition = {score:number;note:string};
type NormalizedCrop = {x:number;y:number;width:number;height:number};
type ShoulderBounds = {left:number;right:number};
const enhancementAssetCache=new Map<string,Promise<EnhancementAssets>>();

export function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=reject;
    image.src=src;
  });
}

export async function prepareEnhancementAssets(src:string):Promise<EnhancementAssets>{
  const cached=enhancementAssetCache.get(src);
  if(cached)return cached;
  const pending=Promise.allSettled([detectFaces(src),segmentPerson(src),detectPose(src)]).then(([faceResult,maskResult,poseResult])=>{
    const faces=faceResult.status==="fulfilled"?faceResult.value:[];
    return {face:faces[0]??null,faces,personMask:maskResult.status==="fulfilled"?maskResult.value:null,pose:poseResult.status==="fulfilled"?poseResult.value:null};
  });
  enhancementAssetCache.set(src,pending);
  if(enhancementAssetCache.size>4)enhancementAssetCache.delete(enhancementAssetCache.keys().next().value!);
  return pending;
}

function findShoulderBounds(mask:PersonMask|null,face:FaceRegion|null):ShoulderBounds|null{
  if(!mask||!face)return null;
  const startY=Math.max(0,Math.floor((face.y+face.height*1.2)*mask.height)),endY=Math.min(mask.height-1,Math.ceil((face.y+face.height*1.85)*mask.height));
  if(endY<=startY)return null;
  const rows=endY-startY+1,counts=new Uint16Array(mask.width);
  for(let y=startY;y<=endY;y+=1)for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.38)counts[x]+=1;
  const minimum=Math.max(2,Math.round(rows*.16));
  let left=-1,right=-1;
  for(let x=0;x<mask.width;x+=1)if(counts[x]>=minimum){left=x;break}
  for(let x=mask.width-1;x>=0;x-=1)if(counts[x]>=minimum){right=x;break}
  return left>=0&&right>left?{left:left/mask.width,right:(right+1)/mask.width}:null;
}

// MediaPipe's face box starts at the brow, not the hairline, so a frame sized from the face alone
// clips hair off the top. The person mask's first solid row is the real top of the head, and the
// crop has to start above it. Width-relative minimum so a few stray matte pixels cannot pull the
// head line up to the top of the source.
function findSubjectTop(mask:PersonMask|null):number|null{
 if(!mask)return null;
 const minimum=Math.max(2,Math.round(mask.width*.014));
 for(let y=0;y<mask.height;y+=1){
  let count=0;
  for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.5)count+=1;
  if(count>=minimum)return y/mask.height;
 }
 return null;
}

export async function analyzePortraitComposition(src:string,targetAspect=.8):Promise<PortraitComposition>{
  const [assets,image]=await Promise.all([prepareEnhancementAssets(src),loadImage(src)]),face=assets.face;
  if(!face)return {score:0,note:"Face not detected"};
  const shoulders=findShoulderBounds(assets.personMask,face),subjectCenter=shoulders?(shoulders.left+shoulders.right)/2:face.x+face.width/2,offset=Math.abs(subjectCenter-.5),centerScore=offset<=.18?100:Math.max(0,100-(offset-.18)*420),headroom=face.y,headroomScore=headroom>=.035&&headroom<=.24?100:Math.max(0,100-Math.min(Math.abs(headroom-.035),Math.abs(headroom-.24))*520),scaleScore=face.height>=.1&&face.height<=.36?100:Math.max(0,100-Math.min(Math.abs(face.height-.1),Math.abs(face.height-.36))*650),sourceAspect=image.naturalWidth/image.naturalHeight,aspectLoss=sourceAspect>targetAspect?1-targetAspect/sourceAspect:1-sourceAspect/targetAspect,aspectScore=Math.max(0,100-aspectLoss*180),faceClearance=Math.min(face.x,face.y,1-face.x-face.width,1-face.y-face.height),cropSafety=faceClearance>=.025?100:Math.max(0,100-(.025-faceClearance)*2200),score=Math.round(centerScore*.2+headroomScore*.2+scaleScore*.2+cropSafety*.25+aspectScore*.15);
  const note=faceClearance<.02?"Leave more room around the face":face.height<.1?"Agent is small, but lifestyle framing is allowed":face.height>.36?"Frame wider to avoid selfie-style proximity":offset>.25?"Reposition the agent or preserve intentional copy space":score>=75?"Marketing-safe framing · relaxed poses welcome":"Reframe for cleaner design space";
  return {score,note};
}

// A real face lands near .96; crossed arms, folded hands and patterned fabric produce phantoms around .6.
export const confidentFace=.75;
async function detectFaces(src:string):Promise<FaceRegion[]>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const detector=await vision.FaceDetector.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/blaze_face_short_range.tflite"},
    runningMode:"IMAGE",
    minDetectionConfidence:.5,
  });
  try{
    // Ranked by confidence, not by area: the largest box is not always the actual face. Callers decide
    // what to do with the weak ones — see confidentFace.
    return detector.detect(image).detections.flatMap(detection=>{
      const box=detection.boundingBox,confidence=detection.categories?.[0]?.score??0;
      return box?[{
        x:box.originX/image.naturalWidth,
        y:box.originY/image.naturalHeight,
        width:box.width/image.naturalWidth,
        height:box.height/image.naturalHeight,
        confidence,
      }]:[];
    }).sort((a,b)=>b.confidence-a.confidence||b.width*b.height-a.width*a.height);
  }finally{
    detector.close();
  }
}

// Body framing and hand completeness need skeleton landmarks; face box plus silhouette cannot tell
// "hands resting out of shot" from "hands chopped off at the wrist".
async function detectPose(src:string):Promise<PoseLandmark[]|null>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const landmarker=await vision.PoseLandmarker.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/pose_landmarker_lite.task"},
    runningMode:"IMAGE",
    numPoses:1,
    minPoseDetectionConfidence:.4,
    minPosePresenceConfidence:.4,
  });
  try{
    const landmarks=landmarker.detect(image).landmarks?.[0];
    return landmarks?.length?landmarks.map(point=>({x:point.x,y:point.y,visibility:point.visibility??0})):null;
  }finally{
    landmarker.close();
  }
}

async function segmentPerson(src:string):Promise<PersonMask>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const segmenter=await vision.ImageSegmenter.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/selfie_segmenter.tflite"},
    runningMode:"IMAGE",
    outputConfidenceMasks:true,
    outputCategoryMask:false,
  });
  try{
    return await new Promise<PersonMask>((resolve,reject)=>{
      segmenter.segment(image,result=>{
        const mask=result.confidenceMasks?.[0];
        if(!mask){reject(new Error("No person mask was returned"));return}
        resolve({data:new Float32Array(mask.getAsFloat32Array()),width:mask.width,height:mask.height});
      });
    });
  }finally{
    segmenter.close();
  }
}

function makeCanvas(width:number,height:number){
  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  return canvas;
}

function measureLight(image:CanvasImageSource){
  const sample=makeCanvas(48,48),context=sample.getContext("2d",{willReadFrequently:true});
  if(!context)return 145;
  context.fillStyle="#fff";
  context.fillRect(0,0,48,48);
  context.drawImage(image,0,0,48,48);
  const pixels=context.getImageData(0,0,48,48).data;
  let total=0,count=0;
  for(let y=4;y<22;y+=1)for(let x=11;x<31;x+=1){
    const index=(y*48+x)*4;
    total+=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
    count+=1;
  }
  return total/count;
}

function applyFaceRetouch(canvas:HTMLCanvasElement,face:FaceRegion|null,strength:number){
  if(!face||!strength)return;
  const context=canvas.getContext("2d"),soft=makeCanvas(canvas.width,canvas.height),softContext=soft.getContext("2d"),mask=makeCanvas(canvas.width,canvas.height),maskContext=mask.getContext("2d");
  if(!context||!softContext||!maskContext)return;
  const blur=Math.max(1.2,Math.min(canvas.width,canvas.height)*(.0012+strength*.000025));
  softContext.filter=`blur(${blur}px) brightness(${1+strength*.00025}) saturate(${1-strength*.00022})`;
  softContext.drawImage(canvas,0,0);
  const cx=(face.x+face.width/2)*canvas.width,cy=(face.y+face.height*.52)*canvas.height,rx=face.width*canvas.width*.72,ry=face.height*canvas.height*.82;
  maskContext.save();
  maskContext.translate(cx,cy);
  maskContext.scale(rx,ry);
  const feather=maskContext.createRadialGradient(0,0,0,0,0,1);
  feather.addColorStop(0,"rgba(255,255,255,1)");
  feather.addColorStop(.56,"rgba(255,255,255,.96)");
  feather.addColorStop(.83,"rgba(255,255,255,.36)");
  feather.addColorStop(1,"rgba(255,255,255,0)");
  maskContext.fillStyle=feather;
  maskContext.fillRect(-1,-1,2,2);
  maskContext.restore();
  softContext.globalCompositeOperation="destination-in";
  softContext.drawImage(mask,0,0);
  context.save();
  context.globalAlpha=Math.min(.38,strength*.0062);
  context.drawImage(soft,0,0);
  context.restore();
}

function createPersonMask(mask:PersonMask,targetWidth:number,targetHeight:number,crop:NormalizedCrop={x:0,y:0,width:1,height:1}){
  const source=makeCanvas(mask.width,mask.height),sourceContext=source.getContext("2d"),image=sourceContext?.createImageData(mask.width,mask.height);
  if(!sourceContext||!image)return null;
  for(let index=0;index<mask.data.length;index+=1){
    const confidence=Math.max(0,Math.min(1,(mask.data[index]-.14)/.72));
    const feather=confidence*confidence*(3-2*confidence);
    const offset=index*4;
    image.data[offset]=255;
    image.data[offset+1]=255;
    image.data[offset+2]=255;
    image.data[offset+3]=Math.round(feather*255);
  }
  sourceContext.putImageData(image,0,0);
  const target=makeCanvas(targetWidth,targetHeight),targetContext=target.getContext("2d");
  if(!targetContext)return null;
  targetContext.imageSmoothingEnabled=true;
  targetContext.imageSmoothingQuality="high";
  targetContext.filter=`blur(${Math.max(1,Math.min(targetWidth,targetHeight)*.0012)}px)`;
  targetContext.drawImage(source,crop.x*mask.width,crop.y*mask.height,crop.width*mask.width,crop.height*mask.height,0,0,targetWidth,targetHeight);
  return target;
}

function paintBackground(context:CanvasRenderingContext2D,image:CanvasImageSource,mode:BackgroundMode,width:number,height:number){
  if(mode==="blur"){
    const overscan=1.06,drawWidth=width*overscan,drawHeight=height*overscan;
    context.save();
    context.filter=`blur(${Math.max(12,Math.min(width,height)*.018)}px) brightness(.82) saturate(.72)`;
    context.drawImage(image,(width-drawWidth)/2,(height-drawHeight)/2,drawWidth,drawHeight);
    context.restore();
    return;
  }
  const palette=mode==="gray"?["#26302e","#67716d"]:["#c9bcaa","#f1eadf"];
  context.fillStyle=palette[0];
  context.fillRect(0,0,width,height);
  const glow=context.createRadialGradient(width*.48,height*.28,0,width*.48,height*.28,Math.max(width,height)*.76);
  glow.addColorStop(0,palette[1]);
  glow.addColorStop(.62,palette[0]);
  glow.addColorStop(1,"#151a18");
  context.fillStyle=glow;
  context.fillRect(0,0,width,height);
}

// Clear air above the top of the head, as a share of the frame height. Below ~.04 the hair reads as
// touching the edge even when no pixel is actually cut.
const headroomMargin=.055;
function portraitCrop(image:HTMLImageElement,assets:EnhancementAssets,targetAspect:number):NormalizedCrop{
  const sourceWidth=image.naturalWidth,sourceHeight=image.naturalHeight,face=assets.face,shoulders=findShoulderBounds(assets.personMask,face),headTop=findSubjectTop(assets.personMask);
  let cropHeight=sourceHeight,cropWidth=cropHeight*targetAspect;
  if(cropWidth>sourceWidth){cropWidth=sourceWidth;cropHeight=cropWidth/targetAspect}
  if(face){
    const targetFaceHeight=targetAspect===1?.24:.22;
    cropHeight=Math.min(sourceHeight,face.height*sourceHeight/targetFaceHeight);
    cropWidth=cropHeight*targetAspect;
    if(shoulders){
      const requiredWidth=(shoulders.right-shoulders.left)*sourceWidth/.88;
      if(requiredWidth>cropWidth){cropWidth=requiredWidth;cropHeight=cropWidth/targetAspect}
    }
    // Grow the frame until the top of the head plus a margin, the face and some chest all fit. Without
    // this a face-sized crop that is merely slid upwards would push the chin and shoulders out of frame.
    if(headTop!==null&&headTop<face.y){
      const required=((face.y+face.height*1.75)*sourceHeight-headTop*sourceHeight)/(1-headroomMargin);
      if(required>cropHeight){cropHeight=required;cropWidth=cropHeight*targetAspect}
    }
    if(cropWidth>sourceWidth){cropWidth=sourceWidth;cropHeight=cropWidth/targetAspect}
    if(cropHeight>sourceHeight){cropHeight=sourceHeight;cropWidth=cropHeight*targetAspect}
  }
  // Whatever the face-relative ideal says, the frame never starts below the top of the head.
  const headLimit=headTop===null?null:headTop*sourceHeight-cropHeight*headroomMargin,faceIdealY=face?face.y*sourceHeight-cropHeight*.09:(sourceHeight-cropHeight)/2;
  const subjectCenter=(shoulders?(shoulders.left+shoulders.right)/2:face?face.x+face.width/2:.5)*sourceWidth,idealY=headLimit===null?faceIdealY:Math.min(faceIdealY,headLimit),x=Math.max(0,Math.min(sourceWidth-cropWidth,subjectCenter-cropWidth/2)),y=Math.max(0,Math.min(sourceHeight-cropHeight,idealY));
  return {x:x/sourceWidth,y:y/sourceHeight,width:cropWidth/sourceWidth,height:cropHeight/sourceHeight};
}

function frameSource(image:HTMLImageElement,crop:NormalizedCrop){
  const width=Math.max(1,Math.round(image.naturalWidth*crop.width)),height=Math.max(1,Math.round(image.naturalHeight*crop.height)),canvas=makeCanvas(width,height),context=canvas.getContext("2d");
  if(context)context.drawImage(image,crop.x*image.naturalWidth,crop.y*image.naturalHeight,crop.width*image.naturalWidth,crop.height*image.naturalHeight,0,0,width,height);
  return canvas;
}

function cropFace(face:FaceRegion|null,crop:NormalizedCrop):FaceRegion|null{
  if(!face)return null;
  return {x:(face.x-crop.x)/crop.width,y:(face.y-crop.y)/crop.height,width:face.width/crop.width,height:face.height/crop.height};
}

function addRelight(context:CanvasRenderingContext2D,width:number,height:number,strength:number,mask:HTMLCanvasElement|null){
  if(!strength)return;
  const light=makeCanvas(width,height),lightContext=light.getContext("2d");
  if(!lightContext)return;
  const gradient=lightContext.createRadialGradient(width*.3,height*.2,0,width*.3,height*.2,Math.max(width,height)*.72);
  gradient.addColorStop(0,`rgba(255,244,220,${.22*strength})`);
  gradient.addColorStop(.5,`rgba(255,240,218,${.08*strength})`);
  gradient.addColorStop(1,"rgba(255,255,255,0)");
  lightContext.fillStyle=gradient;
  lightContext.fillRect(0,0,width,height);
  if(mask){lightContext.globalCompositeOperation="destination-in";lightContext.drawImage(mask,0,0)}
  context.save();
  context.globalCompositeOperation="screen";
  context.drawImage(light,0,0);
  context.restore();
}

// Same classical matting the Brand Assets subsale-banner cutout uses (background surface fit, cast-shadow
// removal, hole fill, colour decontamination) instead of the crude confidence-threshold mask below — run
// once per source image and reused for every slider tweak, rather than the earlier per-render mask.
export async function computePortraitMatte(src:string,mask:PersonMask|null):Promise<HTMLCanvasElement|null>{
  if(!mask)return null;
  const image=await loadImage(src),source=makeCanvas(image.naturalWidth,image.naturalHeight),sourceContext=source.getContext("2d",{willReadFrequently:true});
  if(!sourceContext)return null;
  sourceContext.drawImage(image,0,0);
  const pixels=sourceContext.getImageData(0,0,source.width,source.height);
  const matte=mattePortrait({data:pixels.data,width:pixels.width,height:pixels.height},mask as MatteMask);
  const output=makeCanvas(matte.width,matte.height),outputContext=output.getContext("2d");
  if(!outputContext)return null;
  const result=outputContext.createImageData(matte.width,matte.height);
  result.data.set(matte.data);
  outputContext.putImageData(result,0,0);
  return output;
}

function cropMatteCanvas(source:HTMLCanvasElement,crop:NormalizedCrop,targetWidth:number,targetHeight:number){
  const target=makeCanvas(targetWidth,targetHeight),targetContext=target.getContext("2d");
  if(!targetContext)return null;
  targetContext.imageSmoothingEnabled=true;
  targetContext.imageSmoothingQuality="high";
  targetContext.drawImage(source,crop.x*source.width,crop.y*source.height,crop.width*source.width,crop.height*source.height,0,0,targetWidth,targetHeight);
  return target;
}

// A standalone counterpart to computePortraitMatte for images that were never run through the crop
// pipeline above — an AI-generated portrait, say — where the composite must stay at the source's own
// framing rather than being re-cropped. Same matting algorithm, no relight or retouch, background always
// white; falls back to the untouched source when no person is detected.
export async function compositeOnWhite(src:string,personMask:PersonMask|null):Promise<RenderedPhoto>{
  const image=await loadImage(src),matte=await computePortraitMatte(src,personMask).catch(()=>null);
  if(!matte)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const canvas=makeCanvas(image.naturalWidth,image.naturalHeight),context=canvas.getContext("2d");
  if(!context)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  context.fillStyle="#fff";
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(matte,0,0);
  return {dataUrl:canvas.toDataURL("image/jpeg",.93),width:canvas.width,height:canvas.height};
}

// A crop-only counterpart to renderProfessionalPhoto's framing step: same face-aware crop
// rectangle (portraitCrop) and the same pixel resample (frameSource), but no relight, retouch or
// background composite. Lets a raw source image be shown at the identical frame an already-
// rendered result was cropped to, so a compare slider or hold-to-reveal control lines up a fixed
// feature (an eye, a collar) at the same screen coordinate instead of comparing two differently-
// cropped pictures.
export async function cropSourceToAspect(src:string,assets:EnhancementAssets,targetAspect=.8):Promise<RenderedPhoto>{
  const image=await loadImage(src),crop=portraitCrop(image,assets,targetAspect),framed=frameSource(image,crop);
  return {dataUrl:framed.toDataURL("image/jpeg",.93),width:framed.width,height:framed.height};
}

export async function renderProfessionalPhoto(src:string,settings:EnhanceSettings,assets:EnhancementAssets,preview=false,targetAspect=.8,matte:HTMLCanvasElement|null=null):Promise<RenderedPhoto>{
  const image=await loadImage(src),crop=portraitCrop(image,assets,targetAspect),framed=frameSource(image,crop),sourceLongEdge=Math.max(framed.width,framed.height),desiredLongEdge=preview?Math.min(sourceLongEdge,1400):settings.highResolution?Math.min(2048,Math.max(1600,sourceLongEdge)):sourceLongEdge,scale=desiredLongEdge/sourceLongEdge,width=Math.max(1,Math.round(framed.width*scale)),height=Math.max(1,Math.round(framed.height*scale));
  const canvas=makeCanvas(width,height),context=canvas.getContext("2d");
  if(!context)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const tone=makeCanvas(width,height),toneContext=tone.getContext("2d");
  if(!toneContext)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const meanLight=measureLight(framed),exposureStrength=settings.light/70,brightness=1+((145-meanLight)/255)*.62*exposureStrength;
  toneContext.imageSmoothingEnabled=true;
  toneContext.imageSmoothingQuality="high";
  toneContext.filter=`brightness(${brightness}) contrast(${1+settings.definition*.00105}) saturate(${1+settings.definition*.00028})`;
  toneContext.drawImage(framed,0,0,width,height);
  toneContext.filter="none";
  applyFaceRetouch(tone,cropFace(assets.face,crop),settings.skin);

  // A precomputed matte (the subsale-banner cutout algorithm) takes priority over the plain confidence
  // mask: its edges already account for cast shadows, hair strands and colour spill, so it needs no extra
  // blur or feathering here.
  const cutoutMask=matte?cropMatteCanvas(matte,crop,width,height):assets.personMask?createPersonMask(assets.personMask,width,height,crop):null;
  const canReplaceBackground=settings.background!=="original"&&cutoutMask;
  if(canReplaceBackground){
    if(settings.background==="white"){
      context.fillStyle="#fff";
      context.fillRect(0,0,width,height);
    }else{
      paintBackground(context,framed,settings.background,width,height);
      if(settings.background!=="blur"){
        context.save();
        context.globalAlpha=.22;
        context.filter=`blur(${Math.max(10,width*.015)}px)`;
        context.drawImage(cutoutMask!,width*.012,height*.015);
        context.restore();
      }
    }
    const subject=makeCanvas(width,height),subjectContext=subject.getContext("2d");
    if(subjectContext){
      subjectContext.drawImage(tone,0,0);
      subjectContext.globalCompositeOperation="destination-in";
      subjectContext.drawImage(cutoutMask!,0,0);
      context.drawImage(subject,0,0);
    }
  }else{
    context.drawImage(tone,0,0);
  }
  addRelight(context,width,height,exposureStrength,cutoutMask);
  return {dataUrl:canvas.toDataURL("image/jpeg",preview?.88:.93),width,height};
}
