// Designer review queue: an agent's challenge to an AI verdict they believe is wrong.
//
// This exists only for judgement calls. A photo with a validated visual defect never reaches here —
// `designerReviewEligible` in photo-decision.ts is the gate, and it is decided on measurements of the
// image rather than on any score the model derived from it.
export type ReviewRequest = {
 id:string;
 createdAt:string;
 agentName:string;
 agentId?:string;
 photo:string;
 score:number;
 status:"REVIEW"|"REJECT"|"REUPLOAD";
 // What the AI concluded that the agent is challenging, in the AI's own words.
 disputedGates:string[];
 // The agent's case, in theirs.
 note:string;
 state:"pending";
};

const storageKey="studio-review-requests";

export function createReviewRequestId(){return `IQI-REV-${Math.random().toString(36).slice(2,8).toUpperCase()}`}

// Requests persist, but the portrait itself does not: a full-size data URL would blow past the
// localStorage quota, exactly as the print order book found. The queue keeps the case, not the file.
export function recordReviewRequest(request:ReviewRequest){
 try{
  const stored:Omit<ReviewRequest,"photo">={id:request.id,createdAt:request.createdAt,agentName:request.agentName,agentId:request.agentId,score:request.score,status:request.status,disputedGates:request.disputedGates,note:request.note,state:request.state};
  localStorage.setItem(storageKey,JSON.stringify([stored,...listReviewRequests()].slice(0,40)));
 }catch{/* a full or unavailable store must never block the agent from asking */}
 return request;
}

export function listReviewRequests():Omit<ReviewRequest,"photo">[]{
 try{
  const raw=localStorage.getItem(storageKey);
  return raw?JSON.parse(raw) as Omit<ReviewRequest,"photo">[]:[];
 }catch{return []}
}
