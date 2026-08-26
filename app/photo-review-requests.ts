import type {PhotoStatus} from "./photo-decision.ts";
import type {PhotoCategory} from "./atlas-profile-photo.ts";

// Designer queue. Two different requests land here, and they are never mixed:
//
//   original_approval  "I want to use my ORIGINAL photo even though the AI did not approve it." The
//                      designer sees the original only and their decision is final for that image.
//   enhanced_review    "The AI-enhanced version needs a human, or I am not happy with it." The designer
//                      receives both the original and the enhanced portrait with both ratings.
//
// Either way the photo is untouched, no enhancement is run and the AI's ratings are stored as they
// were. `original_approval` exists only inside the REVIEW verdict — `designerReviewEligible` in
// photo-decision.ts is the gate, and a retake or a re-upload closes that door: the original has to be
// replaced, not argued for. `enhanced_review` survives a retake recommendation, because what is being
// submitted is the generated portrait, not the photograph the verdict sent back; the original travels
// with it for identity comparison only. A re-upload closes both kinds — nothing can be made from a file
// that small. `reviewRequestBlockedBy` below re-checks all of this here rather than trusting the screen.
export type ReviewKind="original_approval"|"enhanced_review";
export type WorkflowStatus="PENDING DESIGNER APPROVAL"|"PENDING DESIGNER REVIEW";
export type DesignerDecision="pending"|"approved"|"retake"|"reupload";
export type ReviewScores={score:number;status:PhotoStatus;categories:{name:string;score:number}[];issues:string[];recommendation:string};
export type ReviewRequest={
 id:string;
 createdAt:string;
 agentName:string;
 agentId?:string;
 kind:ReviewKind;
 workflowStatus:WorkflowStatus;
 // What the agent wants the photo for — the designer desk shows it so an Atlas profile photo is never
 // confused with an awards-night entry. It follows the agent's own choice in Photos and can change
 // after the case is opened, which is why the queue keeps it on the case rather than deriving it.
 category?:PhotoCategory;
 photo:string;
 enhancedPhoto?:string;
 // The AI's verdict on the original, exactly as it was shown — never overwritten by a later rating.
 original:ReviewScores;
 enhanced?:ReviewScores;
 aiUsability:number;
 // What the AI concluded that the agent is asking a designer to look past, in the AI's own words.
 disputedGates:string[];
 // Concerns the automatic checks raised about the enhanced portrait, if there is one.
 concerns:string[];
 // The agent's case, in theirs.
 note:string;
 useOriginalRequested:boolean;
 designerDecision:DesignerDecision;
 // Agent-facing note attached to a designer's decision — never the designer's internal review notes.
 designerFeedback?:string;
 reviewedAt?:string;
 state:"pending"|"decided";
};
export type StoredReviewRequest=Omit<ReviewRequest,"photo"|"enhancedPhoto">;

const storageKey="studio-review-requests";
export const workflowStatusFor:Record<ReviewKind,WorkflowStatus>={original_approval:"PENDING DESIGNER APPROVAL",enhanced_review:"PENDING DESIGNER REVIEW"};

export function createReviewRequestId(){return `IQI-REV-${Math.random().toString(36).slice(2,8).toUpperCase()}`}

// The queue is the last checkpoint before a case exists, so it re-checks the verdict rather than
// trusting whichever screen called it: a stale button, a resumed session or a direct call must not be
// able to submit the original of a photograph the verdict already sent back. `original` is the AI's
// verdict as it was shown, so this is the same status the agent saw, not a fresh score.
export class ReviewRequestBlockedError extends Error{
 status:PhotoStatus;
 constructor(status:PhotoStatus){super(status==="REUPLOAD"?"This photo needs to be re-uploaded at a higher resolution before it can go to a designer.":"This photo requires a retake before it can proceed.");this.name="ReviewRequestBlockedError";this.status=status}
}
export function reviewRequestBlockedBy(request:Pick<ReviewRequest,"original"|"kind">){
 if(request.original.status==="REUPLOAD")return "REUPLOAD" as PhotoStatus;
 // A retake recommendation blocks the photograph, not the portrait generated from it — so it closes
 // `original_approval` (the ask is "approve this photo as it is") and leaves `enhanced_review` open.
 return request.original.status==="REJECT"&&request.kind==="original_approval"?"REJECT" as PhotoStatus:null;
}

// Requests persist, but the portraits themselves do not: a full-size data URL would blow past the
// localStorage quota, exactly as the print order book found. The queue keeps the case, not the file.
export function recordReviewRequest(request:ReviewRequest){
 const blocked=reviewRequestBlockedBy(request);
 if(blocked)throw new ReviewRequestBlockedError(blocked);
 try{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {photo,enhancedPhoto,...stored}=request;
  localStorage.setItem(storageKey,JSON.stringify([stored,...listReviewRequests().filter(item=>item.id!==request.id)].slice(0,40)));
 }catch{/* a full or unavailable store must never block the agent from asking */}
 return request;
}

export function listReviewRequests():StoredReviewRequest[]{
 try{
  const raw=localStorage.getItem(storageKey);
  return raw?JSON.parse(raw) as StoredReviewRequest[]:[];
 }catch{return []}
}

// The designer's decision is the final word for that image. It only ever moves the request forward:
// nothing here re-scores, re-enhances or touches the photo.
export function resolveReviewRequest(id:string,decision:Exclude<DesignerDecision,"pending">,feedback?:string){
 try{
  const reviewedAt=new Date().toISOString();
  const next=listReviewRequests().map(item=>item.id===id&&item.state==="pending"?{...item,designerDecision:decision,designerFeedback:feedback?.trim()||undefined,reviewedAt,state:"decided" as const}:item);
  localStorage.setItem(storageKey,JSON.stringify(next));
  return next.find(item=>item.id===id)??null;
 }catch{return null}
}
