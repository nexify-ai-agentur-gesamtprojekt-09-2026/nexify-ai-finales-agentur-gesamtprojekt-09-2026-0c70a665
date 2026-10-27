/** Explicit public-install build; registration grants no identity or API rights. */
export async function registerPublicInstallation(enabled, environment=globalThis){
 if(enabled!==true||!environment.isSecureContext||!['https:','http:'].includes(environment.location.protocol)||environment.__NEXIFY_STANDALONE_PREVIEW__===true||!environment.navigator.serviceWorker)return {status:'disabled'};
 try{
  await environment.navigator.serviceWorker.register('/public-install-worker.js',{scope:'/',updateViaCache:'none'});
  return {status:'registered_network_only'};
 }catch{return {status:'unavailable'};}
}
