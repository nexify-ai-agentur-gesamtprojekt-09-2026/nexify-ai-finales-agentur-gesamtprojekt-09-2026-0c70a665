# Markenszenen mit Ton auf drei Leistungsseiten · 13.11.2026

Auftrag Pascal Courbois, 13.11.2026 (in der Session): „Baue auch die Videos ein“,
„Sie sollen den Ton haben“, „kein Untertitel …, nur einsetzen, sie sind fertig“.

**Status: im Quellcode eingebaut und lokal geprüft. Nicht ausgeliefert.**

## Eingebaut

| Seite (ID) | Datei in `apps/web/public/media/scenes/` | SHA-256 der eingebauten Datei | Quelle (angeliefert) | SHA-256 der Quelle |
|---|---|---|---|---|
| `automation`, `nex-agentic` | `fertigung-20261113.mp4` | `b31476632a7bf1ee287bdd99b79824344d9bb93315ff7c1ff39d741218a879ad` | `gemini_generated_video_fc43daaf.mp4` | `0cc6ca1852dec99e38e48d60c8f143508462d47d580017c9f88c2ce124f870a7` |
| `websites` | `bemusterung-20261113.mp4` | `a637ba5b23f69c257f0a9ba7d341c945445b5856f7376946fe73844d4f24b5f7` | `gemini_generated_video_da2353c4.mp4` | `129ccf3cc32c3bbdabdda23fcd28b5a16f1af8153d445dafb71dc870c67bee50` |
| `apps-portals` | `tablet-foyer-20261113.mp4` | `ba877c8fc5f7e76cf38cdb5f50ad78c4c8b6821f673076e68a6af75e7f27a7b3` | `gemini_generated_video_dab6ec03.mp4` | `cbdbd490c84db00550b80cc5d9c7d402cfdd364f1926fd1a9f6b3ad78607e7fc` |

Umwandlung: H.264 (CRF 26) und AAC 128 kbit/s, 1280×720, 10 s, je rund 1,3 MB
(Quelle je 4,4 bis 4,8 MB). Die Originale liegen nicht im Repository.

## Verhalten

- Komponente `apps/web/components/SceneVideo.tsx`, eingebunden im Kopfbild von
  `PublicContent.tsx`; Zuordnung in `apps/web/lib/brand-media.ts` (`pageVideo`).
- Vor dem Klick wird nichts geladen (`preload="none"`); das bisherige Standbild bleibt
  sichtbar und ist Rückfall bei Ladefehlern.
- Knopf „Video mit Ton abspielen“ (48 px hoch) startet den Film einmal mit Ton und den
  Bedienelementen des Browsers. Kein Autoplay, weil Browser Ton ohne Klick sperren.
- Sichtbare Kennzeichnung „Markeninszenierung · KI-generiert“ (DE/NL/FR/EN).

## Lokaler Nachweis (Chromium, `next start`)

Auf `/leistungen/agenten-automatisierung`, `/leistungen/apps-portale` und
`/leistungen/websites`, je 1440 px und 390 px: Knopf vorhanden, nach Klick läuft das
Video (Position nach 2,5 s rund 2,4 s), nicht stumm, Tonspur wird dekodiert, kein
Ladefehler, kein horizontaler Überlauf. Bildvergleich vorher/nachher für die
Automatisierungsseite gesichtet. `tsc --noEmit` sauber, `next build` erfolgreich.

Nicht geprüft: Safari und Firefox, echte Mobilgeräte, die Seite `nex-agentic`
(Pfad nicht ermittelt), NL/FR/EN-Darstellung, `make check`, `make test`.

## Bewusste Abweichung

Ohne Untertitel und Transkript, auf ausdrückliche Entscheidung des Inhabers. Der
Videoplan (`docs/design/premium-video-slot-plan-2026-11-09.json`, Qualitätsregeln)
und WCAG 2.2 AA (1.2.2) verlangen für gesprochene Inhalte Untertitel. Das Ziel
„WCAG 2.2 AA“ aus `AGENTS.md` ist für diese drei Videos damit nicht erfüllt, bis
Untertitel nachgeliefert werden. Was gesprochen wird, wurde nicht abgehört.

## Nicht eingebaut

| Quelle | Szene | Grund |
|---|---|---|
| `gemini_generated_video_a58ba79d.mp4` (`8ed4c202…`) | Bemusterung am Tisch | Ab der Mitte steht eine zweite, anders gezeichnete Vogelfigur im Bild |
| `gemini_generated_video_a72d7c53.mp4` (`5a01aba8…`) | Lagerhalle am Förderband | Passt zu `tk-home`; diese Seite nutzt eine andere Komponente ohne Kopfbild-Einbindung |
| `gemini_generated_video_0b5fc50e.mp4` (`c98f3565…`) | Eingangshalle | Bytegleich mit dem Kandidaten `trio-lobby-v1` für den Startseiten-Hero; der Hero gehört zum Scope von PR 95 |
| `gemini_generated_video_649ec2e0.mp4` (`027d8152…`) | Studio | Bytegleich mit der Quelle von `nexify-personal-intro-v1`; liegt bereits unter `/media/home-review/` |
