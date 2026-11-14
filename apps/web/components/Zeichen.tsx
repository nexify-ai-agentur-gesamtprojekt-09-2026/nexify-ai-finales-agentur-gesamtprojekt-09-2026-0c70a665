/* Zeichensatz des Atelier-Systems: ein Raster (24), eine Strichstaerke (1.5), runde Enden, Farbe = Textfarbe.
   Kein Schriftzeichen ersetzt ein Zeichen (keine „→", „↗", „›"). Der Senden-Pfeil zeigt nach rechts. */
const pfade={
  'pfeil':'M5 12h14M13 6l6 6-6 6',
  'pfeil-aus':'M7 17 17 7M8 7h9v9',
  'winkel':'M6 9l6 6 6-6',
  'abspielen':'M8 5.5v13l10.5-6.5z',
  'pause':'M9 6v12M15 6v12',
  'ton':'M4 10v4h3l5 4V6l-5 4zM16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10',
  'ton-aus':'M4 10v4h3l5 4V6l-5 4zM16.5 9.5l5 5M21.5 9.5l-5 5',
  'haken':'M5 12.5l4.5 4.5L19 7.5',
  'auge':'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5z',
  'auge-aus':'M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M14 14a2.75 2.75 0 0 1-3.9-3.9M6.3 7.6A15.6 15.6 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.3 9.3 0 0 0 3.3-.6',
  'brief':'M3.5 6.5h17v11h-17zM4 7l8 6.5L20 7',
  'schloss':'M6.5 10.5h11v9h-11zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
  'ordner':'M3.5 7.5v10h17v-8h-8l-2-2z',
} as const;
export type ZeichenName=keyof typeof pfade;
export function Zeichen({name,groesse=20,className}:{name:ZeichenName;groesse?:number;className?:string}){
  return <svg className={['nx-zeichen',className].filter(Boolean).join(' ')} data-zeichen={name} viewBox="0 0 24 24" width={groesse} height={groesse} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={pfade[name]}/></svg>;
}
export const zeichenNamen=Object.keys(pfade) as ZeichenName[];
