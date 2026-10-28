export type ExceptionConfiguration={token:string;host:string;release:string;environment:string;surface:'vite'|'next'};
export type ExceptionState={available:boolean;initialized:boolean;configured:boolean;loading:boolean;consent:boolean;failed:boolean;requiresReload:boolean;decision:'unset'|'granted'|'declined'|'revoked'};
export function browserExceptions():{start(config:ExceptionConfiguration):Promise<boolean>;setConsent(value:boolean):Promise<boolean>;capture(error:unknown):boolean;state():ExceptionState;subscribe(listener:()=>void):()=>void}|null;
export function captureBoundaryException(error:unknown):boolean;
