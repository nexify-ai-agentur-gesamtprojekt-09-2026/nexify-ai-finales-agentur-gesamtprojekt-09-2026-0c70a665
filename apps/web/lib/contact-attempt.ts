export type ContactAttempt={key:string;fingerprint:string};
export function persistContactAttempt(storage:Pick<Storage,'getItem'|'setItem'>,key:string,attempt:ContactAttempt):void{
 const value=JSON.stringify(attempt);
 try{storage.setItem(key,value);if(storage.getItem(key)!==value)throw new Error('readback');}
 catch{throw new Error('request_storage_unavailable');}
}
export function readContactAttempt(value:string|null):ContactAttempt|null{
 if(!value)return null;
 try{const candidate=JSON.parse(value);if(typeof candidate.key==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(candidate.key)&&typeof candidate.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(candidate.fingerprint))return {key:candidate.key,fingerprint:candidate.fingerprint};}catch{/* no authority from storage */}
 throw new Error('pending_request_unverifiable');
}
export async function contactAttempt(payload:string,previous:ContactAttempt|null,cryptography:Crypto=crypto):Promise<ContactAttempt>{
 const hash=await cryptography.subtle.digest('SHA-256',new TextEncoder().encode(payload));
 const fingerprint=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
 if(previous){if(previous.fingerprint!==fingerprint)throw new Error('pending_request_changed');return previous;}
 return {key:cryptography.randomUUID(),fingerprint};
}
