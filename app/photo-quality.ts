export type PhotoMetric = { name:string; score:number; note:string };
export type PhotoRating = { score:number; label:string; tone:"good"|"fair"|"low"; metrics:PhotoMetric[] };

export const emptyPhotoRating:PhotoRating={
 score:0,
 label:"Checking photo…",
 tone:"fair",
 metrics:["Image size","Lighting","Contrast","Sharpness","Crop fit"].map(name=>({name,score:0,note:"Waiting for image"})),
};

export function evaluatePhoto(src:string,targetAspect=.8){
 return new Promise<PhotoRating>((resolve,reject)=>{
  const image=new Image();
  image.crossOrigin="anonymous";
  image.onload=()=>{
   try{
    const sampleSize=96,canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});
    canvas.width=sampleSize;
    canvas.height=sampleSize;
    if(!context)throw new Error("Canvas is unavailable");
    context.drawImage(image,0,0,sampleSize,sampleSize);
    const pixels=context.getImageData(0,0,sampleSize,sampleSize).data,luminance:number[]=[];
    for(let index=0;index<pixels.length;index+=4)luminance.push(.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2]);
    const mean=luminance.reduce((sum,value)=>sum+value,0)/luminance.length;
    const deviation=Math.sqrt(luminance.reduce((sum,value)=>sum+(value-mean)**2,0)/luminance.length);
    let edgeTotal=0,edgeCount=0;
    for(let y=1;y<sampleSize-1;y++)for(let x=1;x<sampleSize-1;x++){
     const index=y*sampleSize+x;
     edgeTotal+=Math.abs(4*luminance[index]-luminance[index-1]-luminance[index+1]-luminance[index-sampleSize]-luminance[index+sampleSize]);
     edgeCount+=1;
    }
    const sourceAspect=image.naturalWidth/image.naturalHeight;
    const cropLoss=sourceAspect>targetAspect?1-targetAspect/sourceAspect:1-sourceAspect/targetAspect;
    const imageSize=Math.min(100,Math.round(Math.min(image.naturalWidth,image.naturalHeight)/12));
    const lighting=Math.round(Math.max(0,100-Math.abs(mean-145)*1.35));
    const contrast=Math.round(Math.min(100,deviation/52*100));
    const sharpness=Math.round(Math.min(100,(edgeTotal/edgeCount)/42*100));
    const cropFit=Math.round(Math.max(0,100-cropLoss*180));
    const metrics:PhotoMetric[]=[
     {name:"Image size",score:imageSize,note:`${image.naturalWidth} × ${image.naturalHeight}px`},
     {name:"Lighting",score:lighting,note:mean<90?"Too dark":mean>205?"Too bright":"Balanced exposure"},
     {name:"Contrast",score:contrast,note:contrast>60?"Good separation":"Looks flat"},
     {name:"Sharpness",score:sharpness,note:sharpness>60?"Clear detail":"May be soft"},
     {name:"Crop fit",score:cropFit,note:cropFit>70?`${targetAspect===1?"Square":"4:5"} ready`:"Reframe recommended"},
    ];
    const score=Math.round(imageSize*.2+lighting*.2+contrast*.15+sharpness*.25+cropFit*.2);
    resolve({score,label:score>=85?"Studio ready":score>=70?"Good, can improve":"Retake recommended",tone:score>=85?"good":score>=70?"fair":"low",metrics});
   }catch(error){reject(error)}
  };
  image.onerror=reject;
  image.src=src;
 });
}
