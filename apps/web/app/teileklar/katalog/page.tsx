// FILE: apps/web/app/teileklar/katalog/page.tsx
// ANGELEGT: 16.11.2026 — Befund: /teileklar/katalog antwortete mit 404, obwohl die Adresse naheliegt und auf
// Drucksachen und in Gespraechen genannt wird. Die Seite selbst gibt es nicht; das Sortiment steht unter
// /teileklar/shop (eigener Dienst) oder im laufenden Shop unter der eigenen Adresse. Beides entscheidet
// config/teileklar-schaufenster.json. Statt einer eigenen Seite fuehrt die Adresse dorthin weiter, damit kein
// toter Verweis entsteht und keine zweite Sortimentsseite gepflegt werden muss.
import {permanentRedirect} from 'next/navigation';
import schaufenster from '../../../../../config/teileklar-schaufenster.json';

export const dynamic = 'force-dynamic';

export default function Katalog(): never {
  permanentRedirect(schaufenster.quelle === 'extern' ? schaufenster.externer_shop.adresse : '/teileklar/shop');
}
