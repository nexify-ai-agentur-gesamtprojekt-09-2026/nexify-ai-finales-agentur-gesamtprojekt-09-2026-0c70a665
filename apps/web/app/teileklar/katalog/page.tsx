// FILE: apps/web/app/teileklar/katalog/page.tsx
// ANGELEGT: 16.11.2026 — Befund: /teileklar/katalog antwortete mit 404, obwohl die Adresse naheliegt und auf
// Drucksachen und in Gespraechen genannt wird. Die Seite selbst gibt es nicht; das Sortiment steht unter
// /teileklar/shop (eigener Dienst) oder im laufenden Shop unter der eigenen Adresse. Beides entscheidet
// config/teileklar-schaufenster.json. Statt einer eigenen Seite fuehrt die Adresse dorthin weiter, damit kein
// toter Verweis entsteht und keine zweite Sortimentsseite gepflegt werden muss.
// BEFUND 16.11.2026 (Codex am PR 213, nachgeprueft): Das Ziel haengt von config/teileklar-schaufenster.json ab und
// kann sich mit einem Wort aendern. Eine dauerhafte Weiterleitung (308) darf der Browser behalten; nach einer
// Umstellung liefe sie weiter auf das alte Ziel, auch wenn die Seite neu ausgeliefert wird und force-dynamic gilt.
// Deshalb eine vorruebergehende Weiterleitung (307). Sie bleibt eine Weiterleitung, nur eben keine, die haengen bleibt.
import {redirect} from 'next/navigation';
import schaufenster from '../../../../../config/teileklar-schaufenster.json';

export const dynamic = 'force-dynamic';

export default function Katalog(): never {
  redirect(schaufenster.quelle === 'extern' ? schaufenster.externer_shop.adresse : '/teileklar/shop');
}
