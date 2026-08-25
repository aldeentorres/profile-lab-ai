import type {ReactNode} from "react";

// Four unrelated-looking classes with one shape: a small label, sometimes with a leading icon.
// `tone` names the CSS class rather than a colour, so a theme file that repaints `.badge` keeps
// working and no colour value has to be restated here.
export type BadgeTone="badge"|"photo-type-tag"|"photo-category-tag"|"eyebrow";

export function Badge({tone="badge",className,icon,children}:{tone?:BadgeTone;className?:string;icon?:ReactNode;children?:ReactNode}){
 const classes=[tone,className].filter(Boolean).join(" ");
 return <span className={classes}>{icon}{icon?" ":null}{children}</span>;
}
