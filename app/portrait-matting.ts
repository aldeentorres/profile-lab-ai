// Classical, on-device background removal for studio portraits. The segmenter only tells us roughly where the person is;
// everything that decides the edge - the vignetted backdrop, the cast shadow, hair strands, colour decontamination - is
// solved analytically from I = αF + (1-α)B so the cutout survives a dark banner, not just the white preview it was made on.

export type RgbaImage={data:Uint8ClampedArray;width:number;height:number};
export type PersonMask={data:Float32Array;width:number;height:number};
export type MatteBounds={minX:number;minY:number;maxX:number;maxY:number};
export type MatteResult={data:Uint8ClampedArray;width:number;height:number;softEdgeRatio:number;bounds:MatteBounds};
export type BackgroundSurface={sample:(x:number,y:number,out:number[]|Float32Array)=>void};

export const mattingThresholds={
 backdropConfidence:.08, // at or below this segmenter confidence, and reachable from a border, a pixel samples the backdrop surface
 doubtConfidence:.12, // above this the segmenter suspects the subject, so the pixel is matted rather than dropped - isolated hair spikes live here
 coreConfidence:.5,
 sureConfidence:.95, // this sure, the segmenter alone makes a pixel core: a lit neck edge or white collar matches the backdrop in colour, and without it the hole fill leaks through it into every enclosed light region
 coreDistance:28, // colour distance from the backdrop estimate that makes a pixel certainly subject; a light shirt sits below it and is rescued by hole filling instead
 doubtDistance:20,
 shadowSpread:.08, // a cast shadow scales every channel by nearly the same ratio; subject colour does not
 shadowMin:.3,shadowMax:1.05, // up to 1.05 so unshaded backdrop the segmenter doubted (a gap between limbs) still counts as backdrop
 shadowConfidence:.5, // the segmenter must lean against the pixel before a uniform ratio can call it backdrop: a grey suit is also a uniform darkening of a grey backdrop, and its edge sits below .85 in the segmenter
 candidateDistance:40, // foreground candidates closer than this to the backdrop cannot define an alpha direction
 nearestMargin:8, // the nearest foreground wins unless another candidate explains the pixel better by this much: grey pixels sit on the line between black and the backdrop, so the darkest candidate always fits nearly as well and would make solid hair 60% opaque
 opaqueAlpha:.9, // a pixel that projects at least this far toward the foreground is foreground; the residual band would otherwise darken every hair edge by a tenth on black
 erode:2, // closing bulges the mask outward across concave gaps, so the opacity floor is eroded before it is trusted
 bandShare:.02, // width of the matted band around the interior, as a share of the short edge
 opaqueBlend:.75, // above this alpha the decontaminated colour blends back to the original pixel
 deepBlack:70,skinSaturation:.18, // inside the head only deep-black hair and chromatic skin are certainly opaque; grey is a strand over backdrop until matting says otherwise
 headShare:.3, // the head rule is confined to the top of the subject so it never eats light clothing
 headEdgeShare:1.5, // ...and to this many band widths of the silhouette, where strands and gaps live; a cheek highlight deep inside the face is never a strand
 headStrandShare:.5, // a mid-grey pixel is a defocused strand only this close to the silhouette; deeper in, mid-grey is a highlight on the hair body
 headLightRatio:.6, // lighter than this share of the backdrop, grey is backdrop showing through a gap between strands anywhere in the band
 headGreySpread:.06, // ...and to pixels that are a uniform scaling of the backdrop - what backdrop through a strand gap looks like; a brown hair highlight (spread ~.09) or a warm skin highlight is not
 gridEdge:128, // the shadow-aware backdrop estimate is a smooth low-resolution surface
 minimumSubjectShare:.005,
};

export function fitBackgroundSurface(image:RgbaImage,seeds:Uint8Array):BackgroundSurface{
 // Low-order polynomial per channel over the confidently-background pixels: a studio backdrop falls off toward the corners, and a
 // single median colour would leave the corners looking like faint foreground.
 const {data,width,height}=image,sx=2/Math.max(1,width-1),sy=2/Math.max(1,height-1),count=width*height;
 let seedCount=0;for(let i=0;i<count;i++)if(seeds[i])seedCount++;
 const stride=Math.max(1,Math.floor(seedCount/40000)),coefficients=new Float64Array(18),basis=new Float64Array(6);
 const evaluate=(x:number,y:number,channel:number)=>{const nx=x*sx-1,ny=y*sy-1,c=channel*6;return coefficients[c]+coefficients[c+1]*nx+coefficients[c+2]*ny+coefficients[c+3]*nx*nx+coefficients[c+4]*nx*ny+coefficients[c+5]*ny*ny};
 for(let pass=0;pass<2;pass++){
  const normal=new Float64Array(36),rhs=new Float64Array(18);let used=0,seen=0;
  for(let i=0;i<count;i++){
   if(!seeds[i]||seen++%stride)continue;
   const x=i%width,y=(i-x)/width,nx=x*sx-1,ny=y*sy-1;
   // The second pass drops samples the first surface could not explain - a stray hair, a stand, a reflection on the backdrop.
   if(pass&&(Math.abs(evaluate(x,y,0)-data[i*4])>12||Math.abs(evaluate(x,y,1)-data[i*4+1])>12||Math.abs(evaluate(x,y,2)-data[i*4+2])>12))continue;
   basis[0]=1;basis[1]=nx;basis[2]=ny;basis[3]=nx*nx;basis[4]=nx*ny;basis[5]=ny*ny;used++;
   for(let r=0;r<6;r++){for(let c=0;c<6;c++)normal[r*6+c]+=basis[r]*basis[c];for(let channel=0;channel<3;channel++)rhs[channel*6+r]+=basis[r]*data[i*4+channel]}
  }
  if(used<12){if(!pass){const fallback=meanColour(image,seeds);coefficients.fill(0);for(let channel=0;channel<3;channel++)coefficients[channel*6]=fallback[channel]}break}
  for(let channel=0;channel<3;channel++){const solved=solveNormal(normal,rhs.subarray(channel*6,channel*6+6));if(!solved)break;coefficients.set(solved,channel*6)}
 }
 return{sample(x,y,out){out[0]=evaluate(x,y,0);out[1]=evaluate(x,y,1);out[2]=evaluate(x,y,2)}};
}

function meanColour(image:RgbaImage,seeds:Uint8Array){const sum=[0,0,0];let n=0;for(let i=0;i<seeds.length;i++){if(!seeds[i])continue;n++;sum[0]+=image.data[i*4];sum[1]+=image.data[i*4+1];sum[2]+=image.data[i*4+2]}return n?sum.map(v=>v/n):[128,128,128]}

function solveNormal(normal:Float64Array,rhs:Float64Array){
 const n=6,a=new Float64Array(normal),b=new Float64Array(rhs);
 for(let col=0;col<n;col++){
  let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(a[r*n+col])>Math.abs(a[pivot*n+col]))pivot=r;
  if(Math.abs(a[pivot*n+col])<1e-9)return null;
  if(pivot!==col){for(let c=0;c<n;c++){const t=a[col*n+c];a[col*n+c]=a[pivot*n+c];a[pivot*n+c]=t}const t=b[col];b[col]=b[pivot];b[pivot]=t}
  for(let r=col+1;r<n;r++){const f=a[r*n+col]/a[col*n+col];if(!f)continue;for(let c=col;c<n;c++)a[r*n+c]-=f*a[col*n+c];b[r]-=f*b[col]}
 }
 const x=new Float64Array(n);for(let r=n-1;r>=0;r--){let s=b[r];for(let c=r+1;c<n;c++)s-=a[r*n+c]*x[c];x[r]=s/a[r*n+r]}
 return x;
}

export function mattePortrait(image:RgbaImage,mask:PersonMask):MatteResult{
 const t=mattingThresholds,{data,width,height}=image,count=width*height,confidence=resampleMask(mask,width,height),queue=new Int32Array(count);
 const rgb=(index:number,out:Float32Array)=>{out[0]=data[index*4];out[1]=data[index*4+1];out[2]=data[index*4+2]};

 // 1. Backdrop surface from pixels the segmenter called background that are reachable from any border.
 const passable=new Uint8Array(count);for(let i=0;i<count;i++)passable[i]=confidence[i]<=77?1:0;
 const reach=floodFromBorders(passable,width,height,queue),seeds=new Uint8Array(count);
 const backdropLimit=Math.round(t.backdropConfidence*255);for(let i=0;i<count;i++)seeds[i]=reach[i]&&confidence[i]<=backdropLimit?1:0;
 const surface=fitBackgroundSurface(image,seeds);

 // 2. Shadow-aware backdrop: a pixel that is the surface scaled by one uniform ratio is backdrop (shaded or not) wherever the
 // segmenter leans against the subject. Those pixels feed a low-resolution grid that follows the shadow; the subject is
 // inpainted by diffusion so the edge alpha compares against the shadowed backdrop rather than the unshaded surface.
 // A blurred edge of dark hair or a dark suit is also a uniform blend with the backdrop, so nothing within a band width of the
 // segmenter's subject may vote - the shadow further out reaches those cells by diffusion anyway.
 const radius=Math.max(3,Math.round(Math.min(width,height)*t.bandShare)),coreLimit=Math.round(t.coreConfidence*255),subject=new Uint8Array(count);
 for(let i=0;i<count;i++)subject[i]=confidence[i]>=coreLimit?1:0;
 const nearSubject=dilate(subject,width,height,radius,queue);
 const backdropLike=new Uint8Array(count),surfaceColour=new Float32Array(3),shadowLimit=Math.round(t.shadowConfidence*255);
 for(let i=0;i<count;i++){
  if(seeds[i]){backdropLike[i]=1;continue}
  if(confidence[i]>=shadowLimit||nearSubject[i])continue;
  const x=i%width,y=(i-x)/width;surface.sample(x,y,surfaceColour);
  let low=Infinity,high=-Infinity;for(let c=0;c<3;c++){const ratio=data[i*4+c]/Math.max(1,surfaceColour[c]);if(ratio<low)low=ratio;if(ratio>high)high=ratio}
  if(high-low<t.shadowSpread&&(low+high)/2>=t.shadowMin&&(low+high)/2<=t.shadowMax)backdropLike[i]=1;
 }
 const grid=buildBackdropGrid(image,backdropLike,surface);
 const backdrop=new Float32Array(3),sampleBackdrop=(x:number,y:number)=>grid.sample(x,y,backdrop);

 // 3. Solid interior: far from the backdrop and believed by the segmenter, then holes filled from all four borders so a gap
 // that is only open at the bottom (a cropped arm) stays a gap, while an enclosed light shirt becomes subject.
 const distance=new Uint8Array(count),notCore=new Uint8Array(count),sureLimit=Math.round(t.sureConfidence*255);
 for(let i=0;i<count;i++){
  const x=i%width,y=(i-x)/width;sampleBackdrop(x,y);
  const d=Math.hypot(data[i*4]-backdrop[0],data[i*4+1]-backdrop[1],data[i*4+2]-backdrop[2]);distance[i]=Math.min(255,Math.round(d));
  notCore[i]=!backdropLike[i]&&((d>t.coreDistance&&confidence[i]>=coreLimit)||confidence[i]>=sureLimit)?0:1;
 }
 const outside=floodFromBorders(notCore,width,height,queue),interior=new Uint8Array(count);
 let interiorCount=0,minX=width,minY=height,maxX=-1,maxY=-1;
 for(let i=0;i<count;i++){if(outside[i])continue;interior[i]=1;interiorCount++;const x=i%width,y=(i-x)/width;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
 if(interiorCount<count*t.minimumSubjectShare)throw new Error("No person detected");
 const floor=erode(interior,width,height,t.erode,queue);

 // 4. Inside the head, near the silhouette, only deep-black hair and chromatic skin are certainly opaque. Grey pixels there are
 // backdrop seen through strands or defocused hair - opaque on white, a silver halo on black - and are handed to the matting.
 const headBottom=minY+(maxY-minY)*t.headShare,deep=erode(interior,width,height,Math.round(radius*t.headEdgeShare),queue),body=erode(interior,width,height,Math.max(1,Math.round(radius*t.headStrandShare)),queue);
 for(let y=minY;y<headBottom;y++)for(let x=minX;x<=maxX;x++){
  const i=y*width+x;if(!floor[i]||deep[i])continue;
  const r=data[i*4],g=data[i*4+1],b=data[i*4+2],high=Math.max(r,g,b),low=Math.min(r,g,b);
  const deepBlack=high<t.deepBlack,skin=high>0&&(high-low)/high>t.skinSaturation&&r>=g&&r>b;
  if(deepBlack||skin)continue;
  sampleBackdrop(x,y);let lowRatio=Infinity,highRatio=-Infinity;for(let c=0;c<3;c++){const ratio=data[i*4+c]/Math.max(1,backdrop[c]);if(ratio<lowRatio)lowRatio=ratio;if(ratio>highRatio)highRatio=ratio}
  if(highRatio-lowRatio<t.headGreySpread&&(lowRatio>=t.headLightRatio||!body[i]))floor[i]=0;
 }

 // 5. The matted band: near the interior, or anywhere the segmenter had doubts and the colour is not backdrop.
 const near=dilate(interior,width,height,radius,queue),unknown=new Uint8Array(count),doubtLimit=Math.round(t.doubtConfidence*255);
 for(let i=0;i<count;i++)unknown[i]=!floor[i]&&(near[i]||(confidence[i]>doubtLimit&&distance[i]>t.doubtDistance))?1:0;
 const alpha=new Float32Array(count);for(let i=0;i<count;i++)alpha[i]=floor[i]?1:0;
 solveAlpha(image,floor,unknown,alpha,sampleBackdrop,backdrop,radius,queue);

 // 6. Decontaminate: F = (I - (1-α)B) / α for partial pixels, blended back to the original as α approaches 1.
 const out=new Uint8ClampedArray(count*4),colour=new Float32Array(3);let soft=0;minX=width;minY=height;maxX=-1;maxY=-1;
 for(let i=0;i<count;i++){
  let a=alpha[i];if(a<=.02)a=0;if(a>=t.opaqueAlpha)a=1;
  const x=i%width,y=(i-x)/width;rgb(i,colour);
  if(a>0&&a<1){
   sampleBackdrop(x,y);const blend=Math.min(1,Math.max(0,(a-t.opaqueBlend)/(1-t.opaqueBlend)));
   for(let c=0;c<3;c++){const f=(colour[c]-(1-a)*backdrop[c])/a;colour[c]=Math.min(255,Math.max(0,f))*(1-blend)+colour[c]*blend}
   if(a<.98)soft++;
  }
  out[i*4]=colour[0];out[i*4+1]=colour[1];out[i*4+2]=colour[2];out[i*4+3]=Math.round(a*255);
  if(a>.05){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
 }
 return{data:out,width,height,softEdgeRatio:soft/count,bounds:{minX,minY,maxX,maxY}};
}

function solveAlpha(image:RgbaImage,floor:Uint8Array,unknown:Uint8Array,alpha:Float32Array,sampleBackdrop:(x:number,y:number)=>void,backdrop:Float32Array,radius:number,queue:Int32Array){
 // Sampling-based matting. For every unknown pixel, candidate foreground colours are the nearest confident-foreground pixel and the
 // darkest and brightest confident-foreground pixels in two window sizes (so an isolated hair spike can still reach its hair).
 // Each candidate gives α by projection onto F-B; the candidate whose residual is smallest wins. A local maximum of the distance
 // map is never used as F: beside a hairline the darkest nearby pixel is the wrong foreground for a light edge.
 const t=mattingThresholds,{data,width,height}=image,count=width*height,nearest=nearestForeground(floor,unknown,width,height,queue);
 const cell=radius,gridWidth=Math.ceil(width/cell),gridHeight=Math.ceil(height/cell),cells=gridWidth*gridHeight;
 const dark=new Int32Array(cells).fill(-1),darkLuma=new Float32Array(cells).fill(Infinity),bright=new Int32Array(cells).fill(-1),brightLuma=new Float32Array(cells).fill(-Infinity);
 for(let i=0;i<count;i++){
  if(!floor[i])continue;
  const x=i%width,y=(i-x)/width,c=Math.floor(y/cell)*gridWidth+Math.floor(x/cell),luma=.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2];
  if(luma<darkLuma[c]){darkLuma[c]=luma;dark[c]=i}if(luma>brightLuma[c]){brightLuma[c]=luma;bright[c]=i}
 }
 const candidates=new Int32Array(5),minimumSquared=t.candidateDistance*t.candidateDistance,margin=t.nearestMargin*t.nearestMargin;
 const windowExtremes=(gx:number,gy:number,reach:number,slot:number)=>{
  let darkest=-1,darkestLuma=Infinity,brightest=-1,brightestLuma=-Infinity;
  for(let y=Math.max(0,gy-reach);y<=Math.min(gridHeight-1,gy+reach);y++)for(let x=Math.max(0,gx-reach);x<=Math.min(gridWidth-1,gx+reach);x++){const c=y*gridWidth+x;if(darkLuma[c]<darkestLuma){darkestLuma=darkLuma[c];darkest=dark[c]}if(brightLuma[c]>brightestLuma){brightestLuma=brightLuma[c];brightest=bright[c]}}
  candidates[slot]=darkest;candidates[slot+1]=brightest;
 };
 const solved=new Float32Array(count);
 for(let i=0;i<count;i++){
  if(!unknown[i])continue;
  const x=i%width,y=(i-x)/width;sampleBackdrop(x,y);
  const u0=data[i*4]-backdrop[0],u1=data[i*4+1]-backdrop[1],u2=data[i*4+2]-backdrop[2];
  candidates[0]=nearest[i];windowExtremes(Math.floor(x/cell),Math.floor(y/cell),1,1);windowExtremes(Math.floor(x/cell),Math.floor(y/cell),4,3);
  let best=-1,bestResidual=Infinity,nearestAlpha=-1,nearestResidual=Infinity;
  for(let k=0;k<5;k++){
   const f=candidates[k];if(f<0)continue;
   const v0=data[f*4]-backdrop[0],v1=data[f*4+1]-backdrop[1],v2=data[f*4+2]-backdrop[2],vv=v0*v0+v1*v1+v2*v2;
   if(vv<minimumSquared)continue;
   const a=Math.min(1,Math.max(0,(u0*v0+u1*v1+u2*v2)/vv)),r0=u0-a*v0,r1=u1-a*v1,r2=u2-a*v2,residual=r0*r0+r1*r1+r2*r2;
   if(k===0){nearestAlpha=a;nearestResidual=residual}
   if(residual<bestResidual){bestResidual=residual;best=a}
  }
  if(nearestAlpha>=0&&nearestResidual<=bestResidual+margin)best=nearestAlpha;
  // No usable candidate: the pixel is either backdrop-coloured or a colour nothing nearby explains; fall back to distance alone.
  solved[i]=best>=0?best:Math.min(1,Math.sqrt(u0*u0+u1*u1+u2*u2)/(2*t.coreDistance));
 }
 // Projection alpha is per-pixel and speckles in fine hair. A 3x3 mean weighted by colour similarity keeps a strand continuous
 // while a plain mean would average a one-pixel strand with the backdrop beside it and thin it to nothing.
 const similarity=2*20*20;
 for(let i=0;i<count;i++){
  if(!unknown[i])continue;
  const x=i%width,y=(i-x)/width,r=data[i*4],g=data[i*4+1],b=data[i*4+2];let sum=0,weight=0;
  for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=height)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=width)continue;const j=yy*width+xx,dr=data[j*4]-r,dg=data[j*4+1]-g,db=data[j*4+2]-b,w=Math.exp(-(dr*dr+dg*dg+db*db)/similarity);sum+=w*(unknown[j]?solved[j]:floor[j]?1:0);weight+=w}}
  alpha[i]=sum/weight;
 }
}

function nearestForeground(floor:Uint8Array,unknown:Uint8Array,width:number,height:number,queue:Int32Array){
 // Multi-source breadth-first search from the opacity floor through the unknown band; every band pixel learns which floor pixel is nearest.
 const count=width*height,nearest=new Int32Array(count).fill(-1);let head=0,tail=0;
 for(let i=0;i<count;i++){if(!floor[i])continue;const x=i%width;if((x>0&&unknown[i-1])||(x<width-1&&unknown[i+1])||(i>=width&&unknown[i-width])||(i+width<count&&unknown[i+width])){nearest[i]=i;queue[tail++]=i}}
 while(head<tail){
  const i=queue[head++],x=i%width,y=(i-x)/width,source=nearest[i];
  for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=height)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=width)continue;const j=yy*width+xx;if(!unknown[j]||nearest[j]>=0)continue;nearest[j]=source;queue[tail++]=j}}
 }
 return nearest;
}

function buildBackdropGrid(image:RgbaImage,backdropLike:Uint8Array,surface:BackgroundSurface){
 const {data,width,height}=image,cell=Math.max(1,Math.ceil(Math.max(width,height)/mattingThresholds.gridEdge)),gridWidth=Math.ceil(width/cell),gridHeight=Math.ceil(height/cell),cells=gridWidth*gridHeight;
 const sum=new Float64Array(cells*3),n=new Uint32Array(cells),value=new Float32Array(cells*3),known=new Uint8Array(cells);
 for(let i=0;i<width*height;i++){if(!backdropLike[i])continue;const x=i%width,y=(i-x)/width,c=Math.floor(y/cell)*gridWidth+Math.floor(x/cell);n[c]++;sum[c*3]+=data[i*4];sum[c*3+1]+=data[i*4+1];sum[c*3+2]+=data[i*4+2]}
 const colour=[0,0,0];
 for(let c=0;c<cells;c++){
  if(n[c]){known[c]=1;for(let k=0;k<3;k++)value[c*3+k]=sum[c*3+k]/n[c];continue}
  // Unknown cells start on the fitted surface so diffusion only has to carry the shadow's deviation inward.
  surface.sample((c%gridWidth+.5)*cell,(Math.floor(c/gridWidth)+.5)*cell,colour);for(let k=0;k<3;k++)value[c*3+k]=colour[k];
 }
 const next=new Float32Array(value);
 for(let iteration=0;iteration<Math.max(gridWidth,gridHeight)*2;iteration++){
  for(let gy=0;gy<gridHeight;gy++)for(let gx=0;gx<gridWidth;gx++){
   const c=gy*gridWidth+gx;if(known[c])continue;
   for(let k=0;k<3;k++){let s=0,m=0;if(gx>0){s+=value[(c-1)*3+k];m++}if(gx<gridWidth-1){s+=value[(c+1)*3+k];m++}if(gy>0){s+=value[(c-gridWidth)*3+k];m++}if(gy<gridHeight-1){s+=value[(c+gridWidth)*3+k];m++}next[c*3+k]=s/m}
  }
  value.set(next);
 }
 return{sample(x:number,y:number,out:Float32Array){
  const gx=Math.min(gridWidth-1,Math.max(0,(x+.5)/cell-.5)),gy=Math.min(gridHeight-1,Math.max(0,(y+.5)/cell-.5)),x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(gridWidth-1,x0+1),y1=Math.min(gridHeight-1,y0+1),fx=gx-x0,fy=gy-y0;
  for(let k=0;k<3;k++){const top=value[(y0*gridWidth+x0)*3+k]*(1-fx)+value[(y0*gridWidth+x1)*3+k]*fx,bottom=value[(y1*gridWidth+x0)*3+k]*(1-fx)+value[(y1*gridWidth+x1)*3+k]*fx;out[k]=top*(1-fy)+bottom*fy}
 }};
}

function resampleMask(mask:PersonMask,width:number,height:number){
 const out=new Uint8Array(width*height),sx=mask.width/width,sy=mask.height/height;
 for(let y=0;y<height;y++){
  const my=Math.min(mask.height-1,Math.max(0,(y+.5)*sy-.5)),y0=Math.floor(my),y1=Math.min(mask.height-1,y0+1),fy=my-y0;
  for(let x=0;x<width;x++){
   const mx=Math.min(mask.width-1,Math.max(0,(x+.5)*sx-.5)),x0=Math.floor(mx),x1=Math.min(mask.width-1,x0+1),fx=mx-x0;
   const value=(mask.data[y0*mask.width+x0]*(1-fx)+mask.data[y0*mask.width+x1]*fx)*(1-fy)+(mask.data[y1*mask.width+x0]*(1-fx)+mask.data[y1*mask.width+x1]*fx)*fy;
   out[y*width+x]=Math.round(Math.min(1,Math.max(0,value))*255);
  }
 }
 return out;
}

function floodFromBorders(passable:Uint8Array,width:number,height:number,queue:Int32Array){
 // Seeds on all four borders: a corner seed alone cannot reach a gap that a cropped limb closes off along the bottom row.
 const count=width*height,reached=new Uint8Array(count);let head=0,tail=0;
 const seed=(i:number)=>{if(passable[i]&&!reached[i]){reached[i]=1;queue[tail++]=i}};
 for(let x=0;x<width;x++){seed(x);seed((height-1)*width+x)}for(let y=0;y<height;y++){seed(y*width);seed(y*width+width-1)}
 while(head<tail){const i=queue[head++],x=i%width;if(x>0)seed(i-1);if(x<width-1)seed(i+1);if(i>=width)seed(i-width);if(i+width<count)seed(i+width)}
 return reached;
}

function grow(source:Uint8Array,width:number,height:number,radius:number,queue:Int32Array){
 // Chebyshev distance band of `radius` around the source, by level-limited 8-connected breadth-first search.
 const count=width*height,band=new Uint8Array(count),seen=new Uint8Array(count);let head=0,tail=0;
 for(let i=0;i<count;i++){if(!source[i])continue;const x=i%width;if((x>0&&!source[i-1])||(x<width-1&&!source[i+1])||(i>=width&&!source[i-width])||(i+width<count&&!source[i+width])){seen[i]=1;queue[tail++]=i}}
 for(let level=0;level<radius&&head<tail;level++){
  const end=tail;
  while(head<end){const i=queue[head++],x=i%width,y=(i-x)/width;for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=height)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=width)continue;const j=yy*width+xx;if(seen[j]||source[j])continue;seen[j]=1;band[j]=1;queue[tail++]=j}}}
 }
 return band;
}

function dilate(mask:Uint8Array,width:number,height:number,radius:number,queue:Int32Array){const band=grow(mask,width,height,radius,queue);for(let i=0;i<mask.length;i++)if(mask[i])band[i]=1;return band}

function erode(mask:Uint8Array,width:number,height:number,radius:number,queue:Int32Array){
 // Image borders are not "outside": a subject cropped at the bottom keeps its last rows opaque instead of a dotted matted edge.
 const inverse=new Uint8Array(mask.length);for(let i=0;i<mask.length;i++)inverse[i]=mask[i]?0:1;
 const band=grow(inverse,width,height,radius,queue),out=new Uint8Array(mask.length);for(let i=0;i<mask.length;i++)out[i]=mask[i]&&!band[i]?1:0;return out;
}
