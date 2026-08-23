export type SourceArtifacts = {
 contentCoverage:number;
 deadCanvas:number;
 letterboxed:boolean;
 chromeRatio:number;
 isScreenshot:boolean;
 detailVariance:number;
 focusScore:number;
 note:string;
};

const FLAT_ROW_RANGE=14;

// Screenshots, letterboxed exports and re-saved thumbnails all look "clean" to a background check
// because their padding is perfectly flat. These read the source frame itself instead.
export function inspectSource(luminance:Float32Array,width:number,height:number):SourceArtifacts{
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
 for(let y=y0;y<y1;y+=1)for(let x=x0;x<x1;x+=1){const value=4*at(x,y)-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1);sum+=value;sumSquares+=value*value;samples+=1}
 const mean=sum/Math.max(1,samples),detailVariance=Math.max(0,sumSquares/Math.max(1,samples)-mean*mean);
 const letterboxed=contentCoverage<.62,isScreenshot=chromeRatio>=1.6;
 // ~1000 is a crisp studio portrait, ~300 is visibly soft, <150 is unusable.
 const focusScore=Math.max(0,Math.min(100,Math.sqrt(detailVariance)/33*100));
 const note=isScreenshot?"Looks like a phone screenshot rather than a photo file":letterboxed?"Padded with empty bars — supply the original photo, not a boxed export":focusScore<45?"Subject detail is soft":"Source frame looks like an original photo";
 return {contentCoverage,deadCanvas,letterboxed,chromeRatio,isScreenshot,detailVariance,focusScore,note};
}
