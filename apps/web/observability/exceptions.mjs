/** Exceptions only. No identity, pageviews, replay, navigation or form payloads. */
const modes=new Set(['production','preview','development','test']);
const errors=new Set(['Error','TypeError','RangeError','ReferenceError','SyntaxError','URIError','EvalError','AggregateError']);
const number=v=>Number.isSafeInteger(v)&&v>=0&&v<10000000?v:undefined;
export function validConfiguration(c){return Boolean(c&&/^phc_[A-Za-z0-9_-]+$/.test(c.token||'')&&c.host==='https://eu.i.posthog.com'&&/^[a-f0-9]{40}$/.test(c.release||'')&&modes.has(c.environment)&&['vite','next'].includes(c.surface));}
export function redactException(event,c,origin,distinctId){
 if(event?.event!=='$exception')return null;
 const input=event.properties?.$exception_list;
 if(!Array.isArray(input)||!input.length)return null;
 const list=input.slice(0,3).map(e=>({type:errors.has(e.type)?e.type:'Error',value:'Application error (details redacted)',mechanism:{type:'generic',handled:e.mechanism?.handled===true},stacktrace:{type:'raw',frames:(e.stacktrace?.frames||[]).slice(-30).flatMap(f=>{
  try{const u=new URL(f.filename,origin);if(u.origin!==origin||!/^\/(?:assets\/|_next\/static\/|src\/|apps\/|@fs\/workspace\/nexify-current-integration\/apps\/)/.test(u.pathname)||!(/\.(?:m?js|tsx?)(?:$|\/)/).test(u.pathname))return [];
   return [{filename:u.origin+u.pathname,lineno:number(f.lineno),colno:number(f.colno)}];}catch{return [];}
 })}}));
 // Rebuild the property object: do not forward SDK browser properties or arbitrary caller metadata.
 return {event:'$exception',timestamp:event.timestamp,uuid:event.uuid,properties:{token:c.token,distinct_id:distinctId,$process_person_profile:false,$exception_list:list,$exception_type:list[0].type,$exception_message:'Application error (details redacted)',release_sha:c.release,release_version:c.release,release_name:'nexify-'+c.surface,environment:c.environment,app_surface:c.surface}};
}
export function createExceptionController({load,origin}){
 let sdk,loading,consent=false,config,identity,epoch,revoked=false,failed=false,pending=false,decision="unset";
 const listeners=new Set();
 let snapshot=Object.freeze({available:true,initialized:false,configured:false,loading:false,consent:false,failed:false,requiresReload:false,decision:"unset"});
 function emit(){const next={available:true,initialized:Boolean(sdk),configured:Boolean(config),loading:pending,consent,failed,requiresReload:revoked,decision};if(Object.keys(next).some(k=>next[k]!==snapshot[k])){snapshot=Object.freeze(next);for(const listener of listeners)listener();}}
 const seen=new WeakSet();
 async function start(c){
  if(!validConfiguration(c))return false;
  if(config&&JSON.stringify(config)!==JSON.stringify(c))return false;
  config={...c};emit();if(!consent||failed||revoked)return false;if(sdk)return true;
  if(!loading){pending=true;emit();loading=(async()=>{
   try{const candidate=await load();if(!consent)return false;identity='nexify-unidentified-exception';epoch=new AbortController();
    sdk=candidate.init(c.token,{api_host:c.host,debug:false,api_transport:'fetch',disable_beacon:true,fetch_options:{signal:epoch.signal,keepalive:false},autocapture:false,capture_pageview:false,capture_pageleave:false,capture_dead_clicks:false,capture_heatmaps:false,capture_performance:false,capture_exceptions:{capture_unhandled_errors:true,capture_unhandled_rejections:true,capture_console_errors:false},disable_session_recording:true,disable_surveys:true,disable_conversations:true,disable_product_tours:true,advanced_disable_toolbar_metrics:true,save_campaign_params:false,save_referrer:false,ip:false,disable_surveys_automatic_display:true,disable_web_experiments:true,enable_recording_console_log:false,person_profiles:'never',persistence:'memory',disable_persistence:true,request_batching:false,opt_out_capturing_by_default:false,advanced_disable_flags:true,disable_external_dependency_loading:true,error_tracking:{exception_steps:{enabled:false}},before_send:event=>consent?redactException(event,c,origin,identity):null},'nexify_errors');
    return Boolean(sdk);
   }catch{failed=true;consent=false;epoch?.abort();return false;}finally{loading=undefined;pending=false;emit();}
  })();}return loading;
 }
 async function setConsent(value){
  if(value!==true){if(decision==="granted"||sdk)revoked=true;decision=revoked?"revoked":"declined";consent=false;epoch?.abort();sdk?.set_config({capture_exceptions:false,opt_out_capturing_by_default:true});emit();return false;}
  // A fresh document is required after revocation: this SDK can resolve retry fetchOptions
  // from current config, so rotating to a new signal could revive an old queued event.
  if(revoked||failed)return false;
  consent=true;decision="granted";emit();return sdk?true:config?start(config):false;
 }
 function capture(error){if(!consent||!sdk||!(error instanceof Error)||seen.has(error))return false;seen.add(error);sdk.captureException(error);return true;}
 return {start,setConsent,capture,state:()=>snapshot,subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);}};
}
// Pinned1.440.0 spreads fetch_options into native fetch. Revocation permanently
// aborts that signal for this document, including retries and unload. There is no
// signal rotation or private queue mutation; re-consent requires a fresh page.
const slot=Symbol.for('nexify.exceptions.v1');
export function browserExceptions(){
 if(typeof window==='undefined'||typeof window.fetch!=='function'||typeof AbortController!=='function')return null;
 if(!window[slot]){
  const controller=createExceptionController({origin:window.location.origin,load:async()=>{await import('posthog-js/dist/exception-autocapture.js');return (await import('posthog-js/no-external')).default;}});
  window[slot]=controller;
  // An existing consent manager may call setConsent directly or emit this narrowly scoped signal.
  // No storage read, implicit consent, or client/account identifier is used.
  window.addEventListener('nexify:exception-consent',event=>{void controller.setConsent(event.detail?.granted===true);});
 }
 return window[slot];
}
export function captureBoundaryException(error){return browserExceptions()?.capture(error)??false;}
