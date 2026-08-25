import type {ReactNode} from "react";

// The label wraps the control rather than pointing at it with htmlFor, which is what the existing
// .device-field markup does and what keeps the whole row a click target.
export function Field({label,className,children}:{label:ReactNode;className?:string;children:ReactNode}){
 return <label className={className||undefined}><span>{label}</span>{children}</label>;
}
