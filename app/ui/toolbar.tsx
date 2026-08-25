import type {ReactNode} from "react";

export function Toolbar({className,children}:{className?:string;children?:ReactNode}){
 return <div className={className||undefined}>{children}</div>;
}
