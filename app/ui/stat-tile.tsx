import type {PhotoRating} from "../photo-quality";

export function CameraRating({rating,compact=false}:{rating:PhotoRating;compact?:boolean}){return <div className={`camera-rating ${rating.tone} ${compact?"compact":""}`} aria-label={`Photo rating ${rating.score} out of 100, ${rating.label}`}><strong>{rating.score}</strong><span><b>Photo rating</b><small>{rating.label}</small></span></div>}

// The metric tiles in the final preflight and the `.checks` grid are the same element with
// different parents: a small label above a value. Kept as one component so pass 2 converts the
// styling once instead of three times.
export function StatTile({label,value,className}:{label:string;value:string|number;className?:string}){
 return <span className={className}><small>{label}</small><b>{value}</b></span>;
}
