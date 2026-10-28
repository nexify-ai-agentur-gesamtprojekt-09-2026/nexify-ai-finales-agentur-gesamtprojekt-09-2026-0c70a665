export type ProjectBriefDraft={goal:string;situation:string;nextStep:string;originPath:string|null;step:number;open:boolean};
export const briefLimits:Readonly<{goal:400;situation:800;nextStep:400}>;
export function emptyBrief():ProjectBriefDraft;
export function briefComplete(value:unknown):boolean;
export function briefText(value:ProjectBriefDraft,labels:{goal:string;situation:string;nextStep:string;source:string},origin?:string):string;
export function briefMailto(address:string|undefined,subject:string,body:string):string|null;
