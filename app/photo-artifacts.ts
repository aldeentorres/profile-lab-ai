export type SourceArtifacts = {
 contentCoverage:number;
 deadCanvas:number;
 letterboxed:boolean;
 chromeRatio:number;
 isScreenshot:boolean;
 detailVariance:number;
 focusScore:number;
 subjectFocusScore:number;
 structureScore:number;
 note:string;
};

const FLAT_ROW_RANGE=14;
// Structural detail: the edges a designer actually needs — eyes, eyebrows, hairline, nose and lip
// boundaries, glasses, a shirt collar, clothing seams, the outer silhouette. It is read as the strength
// of the strongest few per cent of edges rather than their average, because the average is dominated by
// skin and fabric. Smooth skin, beauty retouching, soft studio lighting and JPEG compression all flatten
// the average without touching those structural edges, so a mean-based sharpness read calls a perfectly
// usable portrait "blurred". This one only falls when the structure itself is genuinely gone.
const STRUCTURE_PERCENTILE=.98;
// |Laplacian| on 8-bit luminance: a crisp lash line or collar seam runs 60-150, visible softness lands
// in the 20s and 30s, and below ~15 nothing structural has survived at any scale.
const STRUCTURE_FULL_MARKS=70;
const EDGE_BINS=512;

// Exact enough at 1-unit resolution, and far cheaper than sorting a few hundred thousand samples.
function edgePercentile(histogram:Uint32Array,ratio:number){
 let total=0;
 for(let bin=0;bin<histogram.length;bin+=1)total+=histogram[bin];
 if(!total)return 0;
 const target=total*ratio;
 let seen=0;
 for(let bin=0;bin<histogram.length;bin+=1){seen+=histogram[bin];if(seen>=target)return bin}
 return histogram.length-1;
}

// Screenshots, letterboxed exports and re-saved thumbnails all look "clean" to a background check
// because their padding is perfectly flat. These read the source frame itself instead.
// `subjectAt` receives normalised coordinates and returns the person-mask value there. Supplying it lets
// focus be read on the agent alone, which matters for cut-outs where flat backdrop dominates the frame.
export function inspectSource(luminance:Float32Array,width:number,height:number,subjectAt?:(nx:number,ny:number)=>number):SourceArtifacts{
 const at=(x:number,y:number)=>luminance[y*width+x];
 const rowRange=(y:number)=>{let min=Infinity,max=-Infinity;for(let x=0;x<width;x+=1){const value=at(x,y);if(value<min)min=value;if(value>max)max=value}return max-min};
 const columnRange=(x:number)=>{let min=Infinity,max=-Infinity;for(let y=0;y<height;y+=1){const value=at(x,y);if(value<min)min=value;if(value>max)max=value}return max-min};
 let top=0,bottom=0,left=0,right=0;
 while(top<height*.45&&rowRange(top)<FLAT_ROW_RANGE)top+=1;
 while(bottom<height*.45&&rowRange(height-1-bottom)<FLAT_ROW_RANGE)bottom+=1;
 while(left<width*.45&&columnRange(left)<FLAT_ROW_RANGE)left+=1;
 while(right<width*.45&&columnRange(width-1-right)<FLAT_ROW_RANGE)right+=1;
 const contentCoverage=((height-top-bottom)/height)*((width-left-right)/width),deadCanvas=1-contentCoverage;
 const absLaplacian=(x:number,y:number)=>Math.abs(4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1));
 let total=0,count=0;
 for(let y=1;y<height-1;y+=1)for(let x=1;x<width-1;x+=1){total+=absLaplacian(x,y);count+=1}
 const overallMean=total/Math.max(1,count);
 // Phone screenshots carry a status bar: dense, high-contrast glyph edges packed into the top strip.
 const stripHeight=Math.max(3,Math.floor(height*.1));
 let strip=0,stripCount=0;
 for(let y=1;y<stripHeight;y+=1)for(let x=1;x<width-1;x+=1){strip+=absLaplacian(x,y);stripCount+=1}
 const chromeRatio=overallMean>.4?strip/Math.max(1,stripCount)/overallMean:0;
 // Focus is judged on the real photographic area only, so flat padding cannot fake or hide softness.
 const x0=Math.max(1,left+1),x1=Math.max(x0+1,width-1-right),y0=Math.max(1,top+1),y1=Math.max(y0+1,height-1-bottom);
 let sum=0,sumSquares=0,samples=0;
 const frameEdges=new Uint32Array(EDGE_BINS),subjectEdges=new Uint32Array(EDGE_BINS);
 const bin=(value:number)=>Math.min(EDGE_BINS-1,Math.round(Math.abs(value)));
 for(let y=y0;y<y1;y+=1)for(let x=x0;x<x1;x+=1){const value=4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1);sum+=value;sumSquares+=value*value;samples+=1;frameEdges[bin(value)]+=1}
 const mean=sum/Math.max(1,samples),detailVariance=Math.max(0,sumSquares/Math.max(1,samples)-mean*mean);
 let subjectSum=0,subjectSquares=0,subjectSamples=0;
 if(subjectAt)for(let y=y0;y<y1;y+=1)for(let x=x0;x<x1;x+=1){
  const inside=subjectAt(x/width,y/height)>.6&&subjectAt((x-1)/width,y/height)>.6&&subjectAt((x+1)/width,y/height)>.6&&subjectAt(x/width,(y-1)/height)>.6&&subjectAt(x/width,(y+1)/height)>.6;
  if(!inside)continue;
  const value=4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1);subjectSum+=value;subjectSquares+=value*value;subjectSamples+=1;subjectEdges[bin(value)]+=1;
 }
 const letterboxed=contentCoverage<.62,isScreenshot=chromeRatio>=1.6;
 // ~1000 is a crisp studio portrait, ~300 is visibly soft, <150 is unusable.
 const focusScore=Math.max(0,Math.min(100,Math.sqrt(detailVariance)/33*100));
 // Too few subject pixels to trust (tiny or failed mask): fall back to the whole-frame read.
 const subjectMean=subjectSum/Math.max(1,subjectSamples),subjectVariance=Math.max(0,subjectSquares/Math.max(1,subjectSamples)-subjectMean*subjectMean);
 const subjectFocusScore=subjectSamples>2000?Math.max(0,Math.min(100,Math.sqrt(subjectVariance)/33*100)):focusScore;
 // Read on the agent where there are enough subject pixels to trust, on the photographic area otherwise.
 const structureScore=Math.max(0,Math.min(100,edgePercentile(subjectSamples>2000?subjectEdges:frameEdges,STRUCTURE_PERCENTILE)/STRUCTURE_FULL_MARKS*100));
 // "Soft" and "unusable" are different findings, so the note says softness only when the structural
 // edges are going too — a mean-based focus read alone is retouching as often as it is blur.
 const note=isScreenshot?"Looks like a phone screenshot rather than a photo file":letterboxed?"Padded with empty bars — supply the original photo, not a boxed export":structureScore<45?"Structural detail on the subject is soft":Math.min(focusScore,subjectFocusScore)<45?"Softly processed, but the structural detail is intact":"Source frame looks like an original photo";
 return {contentCoverage,deadCanvas,letterboxed,chromeRatio,isScreenshot,detailVariance,focusScore,subjectFocusScore,structureScore,note};
}
