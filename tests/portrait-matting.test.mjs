import assert from "node:assert/strict";
import test from "node:test";

import {fitBackgroundSurface, mattePortrait, mattingThresholds} from "../app/portrait-matting.ts";

// A synthetic studio portrait with every failure mode the classical pipeline must survive:
// a vignetted backdrop, a soft cast shadow welded to the torso, a light shirt patch close to
// the backdrop colour, half-covered hair strands, a defocused mid-grey strand, and a real gap
// between the arm and the torso that is only open at the bottom border.
const width=240,height=320,head={cx:120,cy:110,rx:32,ry:40};
const backdropAt=(x,y)=>{const c=205-45*(((x-120)**2+(y-160)**2)/(120**2+160**2));return[c,c,c+5]};
const inHead=(x,y)=>((x-head.cx)/head.rx)**2+((y-head.cy)/head.ry)**2<=1;
const hairTop=x=>head.cy-head.ry*Math.sqrt(Math.max(0,1-((x-head.cx)/head.rx)**2));
const strandColumns=[104,112,120,128,136];
const shirtPatch={x0:100,y0:220,x1:120,y1:240},shadowBand={x0:160,y0:170,x1:190,y1:320},gap={x0:60,y0:170,x1:80,y1:320};
const defocused={x:144,y0:Math.round(hairTop(144))-10,y1:Math.round(hairTop(144))}; // a blurred strand welded to the cap, rendered as solid mid-grey
const collar={x0:100,y0:150,x1:160,y1:156}; // a white collar that runs out to the silhouette, so it touches the backdrop it matches
function subjectAt(x,y){
 if(y>=collar.y0&&y<collar.y1&&x>=collar.x0&&x<collar.x1)return[215,215,220];
 if(y>=150&&y<170&&x>=40&&x<160)return[40,50,90];
 if(y>=170&&x>=40&&x<60)return[40,50,90];
 if(y>=170&&x>=80&&x<160)return x>=shirtPatch.x0&&x<shirtPatch.x1&&y>=shirtPatch.y0&&y<shirtPatch.y1?[185,185,190]:[40,50,90];
 if(inHead(x,y))return y<95?[15,12,10]:[215,165,135];
 return null;
}
function buildPortrait(){
 const data=new Uint8ClampedArray(width*height*4),confidence=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const index=y*width+x;let rgb=backdropAt(x,y),conf=0;
  if(x>=shadowBand.x0&&x<shadowBand.x1&&y>=shadowBand.y0){const ramp=x>=182?.75+(x-181)/9*.25:.75;rgb=rgb.map(v=>v*ramp);conf=.45}
  const solid=subjectAt(x,y);if(solid){rgb=solid;conf=1}
  if(x>=gap.x0&&x<gap.x1&&y>=gap.y0)conf=.7; // the segmenter sealed the gap
  const top=hairTop(x);
  for(const column of strandColumns){if(Math.abs(x-column)<=1&&y<top&&y>=top-12){if(x===column)rgb=rgb.map((v,i)=>v*.5+[15,12,10][i]*.5);conf=.6}}
  if(x===defocused.x&&y>=defocused.y0&&y<defocused.y1){rgb=[110,110,112];conf=1}
  data.set([rgb[0],rgb[1],rgb[2],255],index*4);confidence[index]=conf;
 }
 // MediaPipe returns its mask at a lower resolution than the photo; average 2x2 like a downsample would.
 const maskWidth=width/2,maskHeight=height/2,mask=new Float32Array(maskWidth*maskHeight);
 for(let y=0;y<maskHeight;y++)for(let x=0;x<maskWidth;x++){const x0=x*2,y0=y*2;mask[y*maskWidth+x]=(confidence[y0*width+x0]+confidence[y0*width+x0+1]+confidence[(y0+1)*width+x0]+confidence[(y0+1)*width+x0+1])/4}
 return{image:{data,width,height},mask:{data:mask,width:maskWidth,height:maskHeight}};
}
const alphaAt=(result,x,y)=>result.data[(y*width+x)*4+3]/255;
const rgbAt=(image,x,y)=>Array.from(image.data.subarray((y*width+x)*4,(y*width+x)*4+3));
const luma=([r,g,b])=>.299*r+.587*g+.114*b;

test("the backdrop is modelled as a surface: a quadratic fit recovers the vignetted corners from border samples",()=>{
 const {image}=buildPortrait(),seeds=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(!subjectAt(x,y)&&!(x>=shadowBand.x0&&y>=shadowBand.y0)&&!inHead(x,y)&&y>40)seeds[y*width+x]=1}
 const surface=fitBackgroundSurface(image,seeds),sample=[0,0,0];
 for(const [x,y] of [[0,0],[239,0],[0,319],[120,160]]){surface.sample(x,y,sample);const truth=backdropAt(x,y);assert.ok(Math.abs(sample[0]-truth[0])<3&&Math.abs(sample[2]-truth[2])<3,`surface at ${x},${y} follows the vignette (${sample} vs ${truth})`)}
});

test("the cast shadow is removed: uniform multiplicative darkening next to the torso is background, not subject",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 for(const [x,y] of [[163,200],[170,250],[178,300]])assert.ok(alphaAt(result,x,y)<.08,`shadow at ${x},${y} is transparent, got ${alphaAt(result,x,y)}`);
});

test("hole filling treats all four borders as background so an arm-to-torso gap open only at the bottom stays transparent",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 for(const y of [200,260,315])assert.ok(alphaAt(result,70,y)<.05,`gap at 70,${y} is transparent, got ${alphaAt(result,70,y)}`);
 assert.ok(alphaAt(result,120,280)>.98,"the torso interior stays fully opaque");
});

test("a light patch on the clothing that nearly matches the backdrop stays opaque because it is enclosed by subject",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 for(const [x,y] of [[110,230],[103,223],[117,237]])assert.ok(alphaAt(result,x,y)>.97,`shirt patch at ${x},${y} is opaque, got ${alphaAt(result,x,y)}`);
});

test("a white collar that reaches the silhouette stays opaque where the segmenter is certain, instead of letting the hole fill leak in",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 for(const [x,y] of [[120,153],[140,153],[150,153]])assert.ok(alphaAt(result,x,y)>.9,`collar at ${x},${y} is opaque, got ${alphaAt(result,x,y)}`);
});

test("half-covered hair strands keep partial alpha instead of a shrink-wrapped silhouette",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 for(const x of strandColumns){const y=Math.round(hairTop(x))-6,alpha=alphaAt(result,x,y);assert.ok(alpha>.3&&alpha<.75,`strand at ${x},${y} is partial, got ${alpha}`)}
 assert.ok(alphaAt(result,120,80)>.98,"the solid hair cap stays opaque");
});

test("inside the head a defocused mid-grey strand the segmenter marked opaque is handed to the matting, not trusted",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 const alpha=alphaAt(result,defocused.x,defocused.y0+5);
 assert.ok(alpha>.25&&alpha<.85,`defocused strand is partial, got ${alpha}`);
});

test("edge colours are decontaminated so no backdrop grey rides along in semi-transparent pixels",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask),x=120,y=Math.round(hairTop(x))-6;
 assert.ok(luma(rgbAt(result,x,y))<luma(rgbAt(image,x,y))-30,"a half-covered strand pixel is returned as the strand colour, darker than the blend");
 assert.deepEqual(rgbAt(result,120,280),rgbAt(image,120,280),"fully opaque pixels keep their original colour");
});

test("no light halo against black: backdrop pixels just outside the subject carry no light",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 for(const [x,y] of [[37,240],[163,120],[120,42],[78,250]]){const alpha=alphaAt(result,x,y);assert.ok(alpha*luma(rgbAt(result,x,y))<12,`composite on black at ${x},${y} is dark, alpha ${alpha}`)}
});

test("the soft-edge share is reported and is neither a hard cutout nor a smeared matte",()=>{
 const {image,mask}=buildPortrait(),result=mattePortrait(image,mask);
 assert.ok(result.softEdgeRatio>.001&&result.softEdgeRatio<.06,`soft edge share ${result.softEdgeRatio}`);
 assert.ok(result.bounds.minY<=Math.round(hairTop(120))-8&&result.bounds.maxY===height-1&&result.bounds.minX<=40&&result.bounds.maxX>=159,"bounds cover strands, arm and cropped torso");
});

test("an empty person mask is reported so the caller can fall back",()=>{
 const {image,mask}=buildPortrait();
 assert.throws(()=>mattePortrait(image,{...mask,data:new Float32Array(mask.data.length)}),/No person/);
 assert.ok(mattingThresholds.coreDistance>0);
});
