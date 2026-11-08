/** Shared arrow glyph of the homepage system (hc-arrow). Used by every page derived from the Startseite. */
export const HcArrow=({direction='right',size=18}:{direction?:'right'|'out'|'down'|'left';size?:number})=>{
 const path=direction==='out'?'M5 19 19 5M5 5h14v14':direction==='down'?'M12 4v16M5 13l7 7 7-7':direction==='left'?'M20 12H4M11 5l-7 7 7 7':'M4 12h16M13 5l7 7-7 7';
 return <svg className="hc-arrow" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path}/></svg>;
};
export const HcDisclosureIcon=()=><svg className="hc-disclosure-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14m-7-7v14"/></svg>;
