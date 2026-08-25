import {Check,HelpCircle} from "lucide-react";

export const Placeholder=({n=2,badge}:{n?:number;badge?:string})=><div className={`portrait p${n}`}>{badge?<span className="badge"><Check size={14}/> {badge}</span>:null}</div>;

export const MediaFrame=({src,className="",alt="Portrait",badge,badgeTone="approved"}:{src?:string;className?:string;alt?:string;badge?:string;badgeTone?:"approved"|"pending"})=>src?<div className="photo-media"><img className={`user-photo ${className}`} src={src} alt={alt} width={960} height={1200}/>{badge?<span className={`badge ${badgeTone==="pending"?"pending":""}`}>{badgeTone==="pending"?<HelpCircle size={14}/>:<Check size={14}/>} {badge}</span>:null}</div>:<Placeholder badge={badge}/>;
