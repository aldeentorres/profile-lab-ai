import {AlertCircle,Check,HelpCircle} from "lucide-react";

export const Placeholder=({n=2,badge}:{n?:number;badge?:string})=><div className={`portrait p${n}`}>{badge?<span className="badge"><Check size={14}/> {badge}</span>:null}</div>;

// "action": a new, additive tone -- distinct from "pending" so a photo the agent must act on
// (Action Required) no longer shares one amber "?" badge with a photo that is simply waiting on
// us (Pending Designer Review). No existing call site's tone changes; only the personal view's
// Action Required card opts in.
export const MediaFrame=({src,className="",alt="Portrait",badge,badgeTone="approved"}:{src?:string;className?:string;alt?:string;badge?:string;badgeTone?:"approved"|"pending"|"action"})=>src?<div className="photo-media"><img className={`user-photo ${className}`} src={src} alt={alt} width={960} height={1200}/>{badge?<span className={`badge ${badgeTone==="pending"?"pending":badgeTone==="action"?"action":""}`}>{badgeTone==="pending"?<HelpCircle size={14}/>:badgeTone==="action"?<AlertCircle size={14}/>:<Check size={14}/>} {badge}</span>:null}</div>:<Placeholder badge={badge}/>;
