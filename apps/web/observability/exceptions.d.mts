export type ExceptionConfiguration={token:string;host:string;release:string;environment:string;surface:'vite'|'next'};
export function browserExceptions():{start(config:ExceptionConfiguration):Promise<boolean>;setConsent(value:boolean):Promise<boolean>;capture(error:unknown):boolean;state():{initialized:boolean;consent:boolean;failed:boolean;requiresReload:boolean}}|null;
export function captureBoundaryException(error:unknown):boolean;
