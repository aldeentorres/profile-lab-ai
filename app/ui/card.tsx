import type {ReactNode,HTMLAttributes} from "react";

// Card renders <article> because four of its five absorbed call sites already do. The fifth
// (`.sheet button`) is an interactive choice tile and keeps its own element — a <button> inside
// an <article> would change both the accessibility tree and the rendered markup.
// `...rest` (matching Button's pattern) carries `role="listitem"` on the batch grid tile through
// unchanged — the brief's className-only signature would silently drop it.
export function Card({className,children,...rest}:{className?:string;children?:ReactNode}&HTMLAttributes<HTMLElement>){
 return <article className={className||undefined} {...rest}>{children}</article>;
}
