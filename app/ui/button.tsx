import type {ButtonHTMLAttributes} from "react";

// The studio uses 34 distinct button class strings, and 27 of them appear exactly once —
// `scanner-start`, `reminder-home-optout`, `codeformer-action` and friends each belong to one
// view. Only the recurring seven become variants; everything else passes through `className`
// unchanged. Promoting the one-offs into an enum would grow a vocabulary that no caller can
// remember and that the CSS does not actually treat as a family.
export type ButtonVariant="primary"|"gold"|"link"|"upload"|"take-photo"|"remove-photo"|"danger";

type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:ButtonVariant};

// `type` defaults to "button" because a bare <button> defaults to type="submit"; an unmarked
// button that later ends up inside a <form> would then become a silent submit bug that renders
// identically. `session-start` is the one call site that gains an explicit type from this today.
export function Button({variant,className,type="button",...rest}:ButtonProps){
 // Variant leads, caller classes follow — the order the un-extracted markup already emits
 // (`class="primary session-start"`), preserved because the markup test asserts it.
 const classes=[variant,className].filter(Boolean).join(" ");
 return <button type={type} className={classes||undefined} {...rest}/>;
}
