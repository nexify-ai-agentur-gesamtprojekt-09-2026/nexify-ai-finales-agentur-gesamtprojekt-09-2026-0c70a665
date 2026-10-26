export function routePath(location,hashMode=false){
  const raw=hashMode?(location.hash.startsWith('#/')?location.hash.slice(1):'/'):location.pathname;
  const path=raw.split(/[?#]/,1)[0];
  try{
    const decoded=decodeURIComponent(path);
    if(/[\\\u0000-\u0020\u007f]/.test(decoded)||/%[0-9a-f]{2}/i.test(decoded)||!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?\/?$/.test(decoded))return null;
    return decoded.length>1?decoded.replace(/\/$/,''):decoded;
  }catch{return null;}
}
export function interceptNavigation(href,event,currentOrigin){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.download||event.target&&event.target!=='_self')return false;
  try{const url=new URL(href,currentOrigin);return url.origin===currentOrigin&&['http:','https:'].includes(url.protocol);}catch{return false;}
}
