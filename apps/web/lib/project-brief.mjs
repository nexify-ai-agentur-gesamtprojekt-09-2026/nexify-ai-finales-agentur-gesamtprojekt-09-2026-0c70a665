/** In-memory public project preparation only. No persistence, transport or authority. */
export const briefLimits=Object.freeze({goal:400,situation:800,nextStep:400});
export function emptyBrief(){return {goal:'',situation:'',nextStep:'',originPath:null,step:0,open:false};}
export function briefComplete(value){return Object.entries(briefLimits).every(([key,limit])=>typeof value?.[key]==='string'&&value[key].trim().length>0&&value[key].length<=limit);}
export function briefText(value,labels,origin){
 return [[labels.goal,value.goal],[labels.situation,value.situation],[labels.nextStep,value.nextStep],...(origin?[[labels.source,origin]]:[])].map(([label,text])=>label+': '+text.trim()).join('\n\n');
}
export function briefMailto(address,subject,body){
 // The recipient must be the existing public agency contact, never visitor input.
 if(address!=='mail@nexifyai.cloud')return null;
 return 'mailto:'+address+'?subject='+encodeURIComponent(subject.replace(/[\r\n]/g,' ').slice(0,160))+'&body='+encodeURIComponent(body);
}
