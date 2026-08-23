import type {FaceRegion, PersonMask} from "./image-enhancement";

export type PoseLandmark = {x:number;y:number;visibility:number};
export type BodyExtent = "unknown"|"head_only"|"head_shoulders"|"half_body"|"three_quarter"|"full_body";
export type HandState = "absent"|"complete"|"partial";
export type BodyAnalysis = {
 extent:BodyExtent;
 extentScore:number;
 bodyVisibleRatio:number;
 cropScore:number;
 croppedEdges:string[];
 hands:HandState;
 handScore:number;
 handNote:string;
 subjectArea:number;
 note:string;
};

// MediaPipe pose landmark indices we care about.
const NOSE=0,L_SHOULDER=11,R_SHOULDER=12,L_WRIST=15,R_WRIST=16,L_HIP=23,R_HIP=24,L_KNEE=25,R_KNEE=26,L_ANKLE=27,R_ANKLE=28;
const L_HAND=[17,19,21],R_HAND=[18,20,22];
const VISIBLE=.55,clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const inFrame=(point?:PoseLandmark)=>!!point&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1;
const seen=(point?:PoseLandmark)=>!!point&&point.visibility>=VISIBLE&&inFrame(point);
const eitherSeen=(points:PoseLandmark[],a:number,b:number)=>seen(points[a])||seen(points[b]);

// "Enough body for a designer to work with" is a function of how far down the torso the frame reaches,
// never of how formally the agent is posed. Sitting, leaning and relaxed arms all read the same here.
function measureExtent(points:PoseLandmark[]):{extent:BodyExtent;extentScore:number}{
 const shoulders=eitherSeen(points,L_SHOULDER,R_SHOULDER),hips=eitherSeen(points,L_HIP,R_HIP),knees=eitherSeen(points,L_KNEE,R_KNEE),ankles=eitherSeen(points,L_ANKLE,R_ANKLE),head=seen(points[NOSE]);
 if(ankles)return {extent:"full_body",extentScore:100};
 if(knees)return {extent:"three_quarter",extentScore:100};
 if(hips)return {extent:"half_body",extentScore:92};
 if(shoulders)return {extent:"head_shoulders",extentScore:38};
 if(head)return {extent:"head_only",extentScore:14};
 return {extent:"unknown",extentScore:0};
}

// A hand only matters when the agent actually put it in the shot. Hands resting out of frame or
// tucked behind the body are normal portrait framing and must not cost anything.
function measureHands(points:PoseLandmark[]):{hands:HandState;handScore:number;handNote:string}{
 const side=(wrist:number,fingers:number[])=>{
  const w=points[wrist];
  if(!w||w.visibility<VISIBLE)return "absent" as HandState;
  if(!inFrame(w))return "absent" as HandState;
  const tracked=fingers.map(index=>points[index]).filter((point):point is PoseLandmark=>!!point&&point.visibility>=VISIBLE*.7);
  if(!tracked.length)return "partial" as HandState;
  return tracked.every(inFrame)?"complete" as HandState:"partial" as HandState;
 };
 const left=side(L_WRIST,L_HAND),right=side(R_WRIST,R_HAND),states=[left,right];
 const partial=states.filter(state=>state==="partial").length,complete=states.filter(state=>state==="complete").length;
 if(partial>=2)return {hands:"partial",handScore:34,handNote:"Both hands run out of frame — hard to mask cleanly"};
 if(partial===1)return {hands:"partial",handScore:62,handNote:"One hand is cut off at the frame edge"};
 if(complete)return {hands:"complete",handScore:100,handNote:`${complete===2?"Both hands are":"The visible hand is"} fully in frame`};
 return {hands:"absent",handScore:100,handNote:"Hands are outside the composition — nothing to crop badly"};
}

// Which frame edges the silhouette runs off, and how much of it does so.
function measureCrop(mask:PersonMask|null,points:PoseLandmark[]):{cropScore:number;croppedEdges:string[]}{
 const croppedEdges:string[]=[];
 if(!mask)return {cropScore:70,croppedEdges};
 const {data,width,height}=mask,covered=(index:number)=>data[index]>.5;
 const edgeRun=(cells:number[])=>cells.filter(covered).length/cells.length;
 const topCells=[],bottomCells=[],leftCells=[],rightCells=[];
 for(let x=0;x<width;x+=1){topCells.push(x);bottomCells.push((height-1)*width+x)}
 for(let y=0;y<height;y+=1){leftCells.push(y*width);rightCells.push(y*width+width-1)}
 const top=edgeRun(topCells),bottom=edgeRun(bottomCells),left=edgeRun(leftCells),right=edgeRun(rightCells);
 // A subject standing on the bottom edge is normal framing; the head and the sides are not.
 if(top>.06)croppedEdges.push("top of the head");
 if(left>.3)croppedEdges.push("left side");
 if(right>.3)croppedEdges.push("right side");
 const headCut=seen(points[NOSE])&&top>.06?28:0;
 const cropScore=clamp(100-top*260-Math.max(0,left-.3)*120-Math.max(0,right-.3)*120-headCut-Math.max(0,bottom-.86)*40);
 return {cropScore,croppedEdges};
}

export function analyzeBody(points:PoseLandmark[]|null,mask:PersonMask|null,face:FaceRegion|null,subjectArea:number):BodyAnalysis{
 if(!points?.length){
  // No pose model result: fall back to silhouette height relative to the face, which still separates
  // a head-and-shoulders crop from a half-body shot.
  const ratio=face&&face.height>0?estimateSilhouetteHeight(mask)/face.height:0;
  const extent:BodyExtent=ratio>=6?"full_body":ratio>=4.2?"three_quarter":ratio>=3.1?"half_body":ratio>=1.8?"head_shoulders":ratio>0?"head_only":"unknown";
  const extentScore=extent==="full_body"||extent==="three_quarter"?100:extent==="half_body"?92:extent==="head_shoulders"?38:extent==="head_only"?14:0;
  const {cropScore,croppedEdges}=measureCrop(mask,[]);
  return {extent,extentScore,bodyVisibleRatio:ratio,cropScore,croppedEdges,hands:"absent",handScore:100,handNote:"Hand framing could not be verified",subjectArea,note:describe(extent,croppedEdges)};
 }
 const {extent,extentScore}=measureExtent(points),{hands,handScore,handNote}=measureHands(points),{cropScore,croppedEdges}=measureCrop(mask,points);
 const ratio=face&&face.height>0?estimateSilhouetteHeight(mask)/face.height:0;
 return {extent,extentScore,bodyVisibleRatio:ratio,cropScore,croppedEdges,hands,handScore,handNote,subjectArea,note:describe(extent,croppedEdges)};
}

function estimateSilhouetteHeight(mask:PersonMask|null){
 if(!mask)return 0;
 let top=-1,bottom=-1;
 for(let y=0;y<mask.height&&top<0;y+=1)for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.5){top=y;break}
 for(let y=mask.height-1;y>=0&&bottom<0;y-=1)for(let x=0;x<mask.width;x+=1)if(mask.data[y*mask.width+x]>.5){bottom=y;break}
 return top<0||bottom<top?0:(bottom-top+1)/mask.height;
}

function describe(extent:BodyExtent,croppedEdges:string[]){
 if(croppedEdges.length)return `Cut off at the ${croppedEdges.join(" and ")}`;
 return {full_body:"Full body in frame — plenty for any layout",three_quarter:"Three-quarter framing — very usable",half_body:"Half body in frame — usable for design",head_shoulders:"Only head and shoulders — too little body for design use",head_only:"Face only — no body area to work with",unknown:"Body framing could not be verified"}[extent];
}
