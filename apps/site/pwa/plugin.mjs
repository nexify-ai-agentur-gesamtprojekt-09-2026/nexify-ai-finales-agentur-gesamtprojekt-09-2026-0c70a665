// Explicit local build mode only. No default production activation.
import {readFileSync} from 'node:fs';
export function publicInstallationManifest(tokens){
 return {id:'/',name:'NeXify AI',short_name:'NeXify AI',start_url:'/',scope:'/',display:'standalone',lang:'de',background_color:tokens['color-graphit-900'],theme_color:tokens['color-graphit-900'],icons:[{src:'/signet.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},{src:'/signet.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}]};
}
export function publicPwaPlugin(mode){
 const enabled=mode==='public-pwa';
 return {name:'nexify-public-installation',
  config(){return {define:{__PUBLIC_PWA__:JSON.stringify(enabled)}};},
  transformIndexHtml(){return enabled?[{tag:'link',attrs:{rel:'manifest',href:'/manifest.webmanifest'},injectTo:'head'}]:[];},
  generateBundle(){
   if(!enabled)return;
   const tokens=JSON.parse(readFileSync(new URL('../../../packages/tokens/tokens.json',import.meta.url),'utf8'));
   this.emitFile({type:'asset',fileName:'manifest.webmanifest',source:JSON.stringify(publicInstallationManifest(tokens))});
   this.emitFile({type:'asset',fileName:'public-install-worker.js',source:readFileSync(new URL('./worker.js',import.meta.url),'utf8')});
  }
 };
}
