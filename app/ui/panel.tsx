import type {ReactNode} from "react";

export function Panel({className,children}:{className?:string;children?:ReactNode}){
 return <div className={className||undefined}>{children}</div>;
}
