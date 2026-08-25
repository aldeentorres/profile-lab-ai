import type {ReactNode} from "react";

// Deliberately a plain wrapper. An eyebrow/title/lead prop API was specified here and is wrong
// on two counts: the eyebrows became <Badge tone="eyebrow"> in Task 5, so a prop that renders its
// own <span className="eyebrow"> would double-wrap them, and .photos-heading has no eyebrow at
// all -- it is an h1 and a count. Structuring content through props means restructuring markup,
// which this pass forbids. Pass 2 styles these classes in CSS; the component only has to name them.
export function PageHeader({className,children}:{className?:string;children?:ReactNode}){
 return <div className={className||undefined}>{children}</div>;
}
