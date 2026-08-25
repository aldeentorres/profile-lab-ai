// The inline `style` is a computed percentage, not a themeable value — moving it to CSS would
// need a custom property per step for no gain, so it stays inline.
export function Stepper({n,label}:{n:number;label:string}){return <div className="steps" role="progressbar" aria-label={`${label}, step ${n} of 4`} aria-valuemin={1} aria-valuemax={4} aria-valuenow={n}><span>Step {n} of 4</span><i><b style={{width:`${n*25}%`}}/></i><span>{label}</span></div>}
