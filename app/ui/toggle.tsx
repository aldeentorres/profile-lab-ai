import type {ReactNode} from "react";

// The visual switch is the <i>, painted entirely by `.consents input:checked+i` in CSS. The
// real checkbox stays in the DOM and stays operable — it is positioned off-screen, not hidden —
// so the control remains keyboard-reachable and announces its own state. The <i> must stay the
// input's next sibling or the adjacent-sibling selector stops matching and the switch freezes
// in its unchecked appearance while the checkbox underneath still toggles.
export function Toggle({name,label,note,checked,onChange,ariaLabel}:{name:string;label:ReactNode;note?:ReactNode;checked:boolean;onChange:(value:boolean)=>void;ariaLabel:string}){
 return <label>
  <span><b>{label}</b>{note?<small>{note}</small>:null}</span>
  <input name={name} type="checkbox" aria-label={ariaLabel} checked={checked} onChange={event=>onChange(event.target.checked)}/>
  <i/>
 </label>;
}
