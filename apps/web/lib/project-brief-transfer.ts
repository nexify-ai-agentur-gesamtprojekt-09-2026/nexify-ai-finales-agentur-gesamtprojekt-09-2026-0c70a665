export const ORACLE_BRIEF_TRANSFER_KEY='nexify-oracle-brief-transfer-v1';
const MAX_BRIEF_LENGTH=4000;
const MAX_AGE_MS=30*60*1000;

type BriefEnvelope={source:'nexify-oracle';created_at:number;text:string};

export function saveOracleBrief(storage:Pick<Storage,'setItem'>,text:string,now=Date.now()):boolean{
 if(!text.trim()||text.length>MAX_BRIEF_LENGTH)return false;
 const envelope:BriefEnvelope={source:'nexify-oracle',created_at:now,text};
 storage.setItem(ORACLE_BRIEF_TRANSFER_KEY,JSON.stringify(envelope));
 return true;
}

export function takeOracleBrief(storage:Pick<Storage,'getItem'|'removeItem'>,now=Date.now()):string{
 const raw=storage.getItem(ORACLE_BRIEF_TRANSFER_KEY);
 if(raw===null)return '';
 storage.removeItem(ORACLE_BRIEF_TRANSFER_KEY);
 try{
  const value:unknown=JSON.parse(raw);
  if(!value||typeof value!=='object')return '';
  const envelope=value as Partial<BriefEnvelope>;
  if(envelope.source!=='nexify-oracle'||typeof envelope.created_at!=='number'||typeof envelope.text!=='string')return '';
  if(envelope.created_at>now||now-envelope.created_at>MAX_AGE_MS)return '';
  return envelope.text.length<=MAX_BRIEF_LENGTH?envelope.text:'';
 }catch{return '';}
}
