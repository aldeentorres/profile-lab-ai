export type FaceRegion = {x:number;y:number;width:number;height:number};
export type BackgroundMode = "original"|"blur"|"gray"|"ivory";
export type EnhanceSettings = {
  skin:number;
  light:number;
  definition:number;
  background:BackgroundMode;
  highResolution:boolean;
};

export type PersonMask = {data:Float32Array;width:number;height:number};
export type EnhancementAssets = {face:FaceRegion|null;personMask:PersonMask|null};
export type RenderedPhoto = {dataUrl:string;width:number;height:number};

export function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=reject;
    image.src=src;
  });
}

export async function prepareEnhancementAssets(src:string):Promise<EnhancementAssets>{
  const [faceResult,maskResult]=await Promise.allSettled([detectPrimaryFace(src),segmentPerson(src)]);
  return {
    face:faceResult.status==="fulfilled"?faceResult.value:null,
    personMask:maskResult.status==="fulfilled"?maskResult.value:null,
  };
}

async function detectPrimaryFace(src:string):Promise<FaceRegion|null>{
  const [image,vision]=await Promise.all([loadImage(src),import("@mediapipe/tasks-vision")]);
  const files=await vision.FilesetResolver.forVisionTasks("/mediapipe");
  const detector=await vision.FaceDetector.createFromOptions(files,{
    baseOptions:{modelAssetPath:"/blaze_face_short_range.tflite"},
    runningMode:"IMAGE",
    minDetectionConfidence:.5,
  });
  try{
    const box=detector.detect(image).detections[0]?.boundingBox;
    if(!box)return null;
    return {
      x:box.originX/image.naturalWidth,
      y:box.originY/image.naturalHeight,
      width:box.width/image.naturalWidth,
      height:box.height/image.naturalHeight,
    };
  }finally{
    detector.close();
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

function measureLight(image:HTMLImageElement){
  const sample=makeCanvas(48,48),context=sample.getContext("2d",{willReadFrequently:true});
  if(!context)return 145;
  context.drawImage(image,0,0,48,48);
  const pixels=context.getImageData(0,0,48,48).data;
  let total=0;
  for(let index=0;index<pixels.length;index+=4){
    total+=.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
  }
  return total/(pixels.length/4);
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

function createPersonMask(mask:PersonMask,targetWidth:number,targetHeight:number){
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
  targetContext.drawImage(source,0,0,targetWidth,targetHeight);
  return target;
}

function paintBackground(context:CanvasRenderingContext2D,image:HTMLImageElement,mode:BackgroundMode,width:number,height:number){
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

export async function renderProfessionalPhoto(src:string,settings:EnhanceSettings,assets:EnhancementAssets,preview=false):Promise<RenderedPhoto>{
  const image=await loadImage(src),sourceLongEdge=Math.max(image.naturalWidth,image.naturalHeight),desiredLongEdge=preview?Math.min(sourceLongEdge,1400):settings.highResolution?Math.min(2048,sourceLongEdge*2):sourceLongEdge,scale=desiredLongEdge/sourceLongEdge,width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
  const canvas=makeCanvas(width,height),context=canvas.getContext("2d");
  if(!context)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const tone=makeCanvas(width,height),toneContext=tone.getContext("2d");
  if(!toneContext)return {dataUrl:src,width:image.naturalWidth,height:image.naturalHeight};
  const meanLight=measureLight(image),exposureStrength=settings.light/70,brightness=1+((145-meanLight)/255)*.62*exposureStrength;
  toneContext.imageSmoothingEnabled=true;
  toneContext.imageSmoothingQuality="high";
  toneContext.filter=`brightness(${brightness}) contrast(${1+settings.definition*.00105}) saturate(${1+settings.definition*.00028})`;
  toneContext.drawImage(image,0,0,width,height);
  toneContext.filter="none";
  applyFaceRetouch(tone,assets.face,settings.skin);

  const personMask=assets.personMask?createPersonMask(assets.personMask,width,height):null;
  const canReplaceBackground=settings.background!=="original"&&personMask;
  if(canReplaceBackground){
    paintBackground(context,image,settings.background,width,height);
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
