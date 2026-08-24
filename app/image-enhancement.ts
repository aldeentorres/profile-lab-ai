export type FaceRegion = {x:number;y:number;width:number;height:number;confidence?:number};
export type BackgroundMode = "original"|"blur"|"gray"|"ivory";
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

function portraitCrop(image:HTMLImageElement,assets:EnhancementAssets,targetAspect:number):NormalizedCrop{
  const sourceWidth=image.naturalWidth,sourceHeight=image.naturalHeight,face=assets.face,shoulders=findShoulderBounds(assets.personMask,face);
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
    if(cropWidth>sourceWidth){cropWidth=sourceWidth;cropHeight=cropWidth/targetAspect}
    if(cropHeight>sourceHeight){cropHeight=sourceHeight;cropWidth=cropHeight*targetAspect}
  }
  const subjectCenter=(shoulders?(shoulders.left+shoulders.right)/2:face?face.x+face.width/2:.5)*sourceWidth,idealY=face?face.y*sourceHeight-cropHeight*.09:(sourceHeight-cropHeight)/2,x=Math.max(0,Math.min(sourceWidth-cropWidth,subjectCenter-cropWidth/2)),y=Math.max(0,Math.min(sourceHeight-cropHeight,idealY));
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

export async function renderProfessionalPhoto(src:string,settings:EnhanceSettings,assets:EnhancementAssets,preview=false,targetAspect=.8):Promise<RenderedPhoto>{
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

  const personMask=assets.personMask?createPersonMask(assets.personMask,width,height,crop):null;
  const canReplaceBackground=settings.background!=="original"&&personMask;
  if(canReplaceBackground){
    paintBackground(context,framed,settings.background,width,height);
    if(settings.background!=="blur"){
      context.save();
      context.globalAlpha=.22;
      context.filter=`blur(${Math.max(10,width*.015)}px)`;
      context.drawImage(personMask!,width*.012,height*.015);
      context.restore();
    }
    const subject=makeCanvas(width,height),subjectContext=subject.getContext("2d");
    if(subjectContext){
      subjectContext.drawImage(tone,0,0);
      subjectContext.globalCompositeOperation="destination-in";
      subjectContext.drawImage(personMask!,0,0);
      context.drawImage(subject,0,0);
    }
  }else{
    context.drawImage(tone,0,0);
  }
  addRelight(context,width,height,exposureStrength,personMask);
  return {dataUrl:canvas.toDataURL("image/jpeg",preview?.88:.93),width,height};
}
