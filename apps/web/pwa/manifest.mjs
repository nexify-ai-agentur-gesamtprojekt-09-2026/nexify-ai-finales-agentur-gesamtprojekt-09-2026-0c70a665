// Manifest der öffentlichen Installation von apps/web. Grundlage ist das gemeinsame Manifest aus
// apps/site/pwa/plugin.mjs (Kennung, Start, Bereich, Icons aus dem vorhandenen Logo). Ergänzt wird nur,
// was apps/web tatsächlich ausliefert: Schreibrichtung, die Grundfarbe der Kopfleiste (app/layout.tsx)
// und zwei Kurzwege zu vorhandenen Seiten. /signet.svg liegt nur in apps/site und entfällt hier.
import {publicInstallationManifest} from '../../site/pwa/plugin.mjs';

/** Kurzwege mit den Namen der Hauptnavigation (components/SiteNavigation.tsx). Nur Seiten aus config/site-map.json. */
export const INSTALL_SHORTCUTS=[{name:'Leistungen',url:'/leistungen'},{name:'Kontakt',url:'/kontakt'}];
/** Icons, die in apps/web/public liegen. */
export const INSTALL_ICONS=['/icon-192.png','/icon-512.png','/icon-maskable-512.png'];

export function nextInstallationManifest(tokens){
 const base=publicInstallationManifest(tokens);
 return {...base,dir:'ltr',background_color:tokens['color-dunkel-grund'],theme_color:tokens['color-dunkel-grund'],
  icons:base.icons.filter(icon=>INSTALL_ICONS.includes(icon.src)),
  shortcuts:INSTALL_SHORTCUTS.map(({name,url})=>({name,url,icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'}]}))};
}
