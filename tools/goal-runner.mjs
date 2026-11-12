#!/usr/bin/env node
// A bounded local continuation tick. The existing Auftragsregister is the only task source.
import {readFile,writeFile,mkdir,rm,rename,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const register=join(root,'docs/09-final/auftragsregister-2026-11-08.md');
const statePath=join(root,'ops/goal/STATE.json');
const logDir=join(root,'ops/goal/LOGS');
const lockPath=join(root,'ops/goal/.runner.lock');
const start='<!-- nexify-goal-tasks-json:start -->';
const end='<!-- nexify-goal-tasks-json:end -->';
const flags=new Set(process.argv.slice(2));
const now=()=>new Date().toISOString();
const day=()=>new Date().toISOString().slice(0,10);

async function atomic(path,value){const temp=path+'.tmp-'+process.pid;await writeFile(temp,value,{mode:0o600});await rename(temp,path);}
async function readState(){return JSON.parse(await readFile(statePath,'utf8'));}
async function readRegister(){
 const source=await readFile(register,'utf8'),a=source.indexOf(start),b=source.indexOf(end);
 if(a<0||b<a)throw Error('register_task_block_missing');
 const raw=source.slice(a+start.length,b).trim();
 const match=/^```json\s*([\s\S]*?)\s*```$/.exec(raw);
 if(!match)throw Error('register_task_json_invalid');
 const data=JSON.parse(match[1]);
 if(data.schema_version!==1||!Array.isArray(data.tasks))throw Error('register_schema_invalid');
 return {source,a,b,data};
}
async function writeRegister(snapshot){
 const {source,a,b,data}=snapshot;
 const updated=source.slice(0,a+start.length)+'\n```json\n'+JSON.stringify(data,null,2)+'\n```\n'+source.slice(b);
 await atomic(register,updated);
}
function pick(tasks){return tasks.filter(t=>t.status==='READY'&&t.id&&t.title&&Array.isArray(t.paths)).sort((a,b)=>a.priority-b.priority)[0];}
async function lock(path=lockPath){
 try{await mkdir(path);await writeFile(join(path,'owner.json'),JSON.stringify({pid:process.pid,at:now()}));return true;}
 catch(error){
  if(error.code!=='EEXIST')throw error;
  try{
   const owner=JSON.parse(await readFile(join(path,'owner.json'),'utf8'));
   try{process.kill(owner.pid,0);return false;}catch(check){if(check.code!=='ESRCH')return false;}
  }catch{
   if(Date.now()-(await stat(path)).mtimeMs<25*60000)return false;
  }
  await rename(path,path+'.stale-'+Date.now());
  await mkdir(path);await writeFile(join(path,'owner.json'),JSON.stringify({pid:process.pid,at:now()}));
  return true;
 }
}
async function eventLog(record){await mkdir(logDir,{recursive:true});await writeFile(join(logDir,'runner-events.jsonl'),JSON.stringify(record)+'\n',{flag:'a',mode:0o600});}
async function hashes(paths){const entries=[];for(const path of paths){try{entries.push([path,createHash('sha256').update(await readFile(join(root,path))).digest('hex')]);}catch{entries.push([path,null]);}}return Object.fromEntries(entries);}
function prompt(task){return `Du setzt genau EIN begrenztes Arbeitspaket des NeXify Unified Master-GOAL fort. Lies AGENTS.md, das führende Register docs/09-final/auftragsregister-2026-11-08.md und bei Bedarf die Goal-Quelle ${'/Users/gast/.codex/attachments/c417bef0-bf02-4f7e-beea-3fcdf44300c8/pasted-text-1.txt'}.\nAufgabe ${task.id}: ${task.title}. Scope: ${task.scope}. Erlaubte Quellpfade: ${task.paths.join(', ')}. Abnahme: ${task.acceptance}. Rückweg: ${task.rollback}.\nVorher-Screenshots und Messwerte liegen unter ops/goal/EVIDENCE/before/. Der eingeschränkte Codex-Sandbox darf keinen lokalen HTTP-Port öffnen. Starte daher darin keinen Browser- oder Vite-Server. Nutze die vorhandenen Bilder und Quell-Dateien für die konkrete CSS-Korrektur; der vertrauenswürdige Host-Runner führt nach deinem Ende Build, Browser-Screenshots und bestehende Tests aus.\nArbeite nur im lokalen Quellverzeichnis. Keine Site-Veröffentlichung, kein GitHub-Merge, keine externen Nachrichten, Zahlungen, Rechteänderungen oder Secret-Transfers. Bewahre fremde Änderungen. Schreibe am Ende einen kurzen prüfbaren Bericht mit geänderten Pfaden und offenem Review. Ändere nicht den maschinenlesbaren Taskblock oder STATE.json; der Runner verwaltet diese. Wenn das Paket nicht sicher abschließbar ist, benenne den konkreten Blocker und stoppe.\n`;}
async function hostCommand(command,args,minutes=5){
 const child=spawn(command,args,{cwd:root,stdio:['ignore','pipe','pipe']});let stdoutBytes=0,stderrBytes=0,timedOut=false;
 child.stdout.on('data',chunk=>stdoutBytes+=chunk.length);child.stderr.on('data',chunk=>stderrBytes+=chunk.length);
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),5000).unref();},minutes*60000);
 const exitCode=await new Promise((done,reject)=>{child.once('error',reject);child.once('close',code=>done(code));});clearTimeout(timer);
 return {exitCode,stdoutBytes,stderrBytes,timedOut};
}
async function execute(task,state){
 const resume=state.active_task_id===task.id&&Boolean(state.session_id);
 const args=resume?['exec','resume','--json','--skip-git-repo-check',state.session_id,'-']:['exec','--json','-s','workspace-write','--skip-git-repo-check','-C',root,'-'];
 const child=spawn('/usr/local/bin/codex',args,{cwd:root,env:{...process.env,CI:'1'},stdio:['pipe','pipe','pipe']});
 child.stdin.end(prompt(task));
 let buffer='',sessionId=resume?state.session_id:null,events=0,stderrBytes=0,timedOut=false,sessionSave=Promise.resolve(),finalText='';
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),5000).unref();},state.timeout_minutes*60000);
 child.stdout.on('data',chunk=>{buffer+=String(chunk);let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const event=JSON.parse(line);events++;if(event.type==='thread.started'&&event.thread_id){sessionId=event.thread_id;state.session_id=sessionId;sessionSave=sessionSave.then(()=>atomic(statePath,JSON.stringify(state,null,2)+'\n'));}if(event.type==='item.completed'&&event.item?.type==='agent_message')finalText=event.item.text||finalText;}catch{}}});
 child.stderr.on('data',chunk=>{stderrBytes+=chunk.length;});
 const exitCode=await new Promise((done,reject)=>{child.once('error',reject);child.once('close',code=>done(code));});
 clearTimeout(timer);
 await sessionSave;
 return {exitCode,sessionId,events,stderrBytes,timedOut,reportedBlocked:/\bblockiert\b|\bblocked\b|nicht möglich|cannot complete/i.test(finalText)};
}
async function selfTest(){
 const sample={tasks:[{id:'A',status:'TODO',priority:1,paths:[],title:'a'},{id:'B',status:'READY',priority:3,paths:[],title:'b'},{id:'C',status:'READY',priority:2,paths:[],title:'c'}]};
 if(pick(sample.tasks)?.id!=='C')throw Error('task_selection_failed');
 const p=join(tmpdir(),'nexify-goal-runner-test-'+process.pid);
 if(!(await lock(p)))throw Error('first_lock_failed');
 if(await lock(p))throw Error('double_start_not_blocked');
 await rm(p,{recursive:true});
 await readRegister();await readState();
 console.log(JSON.stringify({self_test:'passed',selection:true,locking:true,register:true,state:true}));
}
async function main(){
 if(flags.has('--self-test'))return selfTest();
 if(!(await lock())){console.log('SKIP locked');return;}
 try{
  const state=await readState(),snapshot=await readRegister();
  if(!state.enabled){console.log('SKIP disabled');return;}
  if(state.not_before&&Date.now()<Date.parse(state.not_before)){console.log('SKIP not_before');return;}
  if(state.backoff_until&&Date.now()<Date.parse(state.backoff_until)){console.log('SKIP backoff');return;}
  const count=state.runs_by_day[day()]||0;
  if(count>=state.max_runs_per_day){console.log('SKIP daily_limit');return;}
  if(state.last_attempt_at&&Date.now()-Date.parse(state.last_attempt_at)<state.minimum_minutes_between_runs*60000){console.log('SKIP minimum_interval');return;}
  let task=state.active_task_id?snapshot.data.tasks.find(item=>item.id===state.active_task_id&&item.status==='RUNNING'):null;
  if(task&&!state.session_id){task.status='BLOCKED';task.next='Unterbrochener Lauf ohne gesicherte Sitzungs-ID: Quelländerungen und Ergebnis zuerst prüfen';await writeRegister(snapshot);await eventLog({at:now(),task:task.id,event:'blocked_unclear_outcome'});console.log('SKIP interrupted_without_session');return;}
  task=task||pick(snapshot.data.tasks);
  if(!task){console.log('SKIP no_ready_task');return;}
  state.active_task_id=task.id;state.last_attempt_at=now();state.runs_by_day[day()]=count+1;
  task.status='RUNNING';await writeRegister(snapshot);await atomic(statePath,JSON.stringify(state,null,2)+'\n');
  await eventLog({at:now(),task:task.id,event:'started'});
  if(task.sub_goal==='02-04'){
   const before=await hostCommand('/usr/local/bin/node',['apps/site/tests/browser-goal-capture.mjs','--before'],3);
   if(before.exitCode!==0||before.timedOut){task.status='BLOCKED';task.next='Host-Browser-Vorprüfung fehlgeschlagen; kein Modelllauf gestartet';await writeRegister(snapshot);state.active_task_id=null;await atomic(statePath,JSON.stringify(state,null,2)+'\n');await eventLog({at:now(),task:task.id,event:'preflight_failed',...before});console.log('BLOCKED preflight');return;}
  }
  const prior=await hashes(task.paths);
  const result=await execute(task,state);
  const after=await hashes(task.paths);
  const changed=task.paths.filter(path=>prior[path]!==after[path]);
  state.session_id=result.sessionId;
  let hostChecks=[];
  if(result.exitCode===0&&!result.timedOut&&!result.reportedBlocked&&(!task.require_source_change||changed.length)){
   if(task.sub_goal==='02-04'){
    for(const [command,args,minutes] of [['/Users/gast/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm',['--filter','@nexify/site','build:standalone'],5],['/usr/local/bin/node',['apps/site/tests/browser-goal-capture.mjs','--after'],3],['/usr/local/bin/node',['apps/site/tests/browser-identity-hero.mjs'],5],['/usr/local/bin/node',['apps/site/tests/browser-video-hero-20261109.mjs'],3]]){
     const check=await hostCommand(command,args,minutes);hostChecks.push({command:args.join(' '),...check});if(check.exitCode!==0||check.timedOut)break;
    }
   }
  }
  const checksPassed=hostChecks.every(check=>check.exitCode===0&&!check.timedOut);
  if(result.exitCode===0&&!result.timedOut&&!result.reportedBlocked&&(!task.require_source_change||changed.length)&&checksPassed){task.status='REVIEW';state.last_success_at=now();state.active_task_id=null;state.session_id=null;state.retry_count=0;state.backoff_until=null;task.next='Quellen und Tests unabhängig prüfen, dann Freigabe oder Korrektur';}
  else if(result.reportedBlocked||task.require_source_change&&!changed.length||!checksPassed){task.status='BLOCKED';state.active_task_id=null;state.session_id=null;task.next=result.reportedBlocked?'Modell meldete einen konkreten Blocker; vor erneuter Ausführung beheben':!changed.length?'Keine geforderte Quelländerung; kein Erfolg behaupten':'Host-Build oder Browsertest fehlgeschlagen; Teiländerungen prüfen';}
  else{state.retry_count++;task.status=state.retry_count>=3?'BLOCKED':'READY';state.backoff_until=new Date(Date.now()+Math.min(360,30*2**(state.retry_count-1))*60000).toISOString();task.next=result.timedOut?'Laufzeitgrenze erreicht; Checkpoint und Teiländerungen prüfen':'CLI-Fehler; Checkpoint und Teiländerungen vor Wiederholung prüfen';}
  await writeRegister(snapshot);await atomic(statePath,JSON.stringify(state,null,2)+'\n');
  await eventLog({at:now(),task:task.id,event:task.status,exit_code:result.exitCode,timed_out:result.timedOut,reported_blocked:result.reportedBlocked,changed,host_checks:hostChecks,events:result.events,stderr_bytes:result.stderrBytes,session_id:result.sessionId});
  console.log(JSON.stringify({task:task.id,status:task.status,exit_code:result.exitCode,timed_out:result.timedOut}));
 }finally{await rm(lockPath,{recursive:true,force:true});}
}
main().catch(async error=>{await eventLog({at:now(),event:'runner_error',reason:String(error.message).slice(0,160)}).catch(()=>{});console.error('Runner error:',error.message);process.exitCode=1;});
