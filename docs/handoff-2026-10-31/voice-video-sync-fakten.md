# Handoff 2026-10-31 — Fakten: Stimme/Video-Synchronisation (Ist-Stand, keine Generierung)

Nur vorhandene Fakten (Pascalanfrage 14:40). **Keine** neue TTS/Video-Generierung, keine Tools
installiert, keine bezahlten Aufrufe, Originale unverändert. `ffprobe`/`ffmpeg` sind in dieser
Umgebung **NICHT installiert** (kein Install erlaubt) → technische Werte stammen aus dem
versionierten Asset-**Manifest** und `file`-Headern, nicht aus einem Live-ffprobe-Lauf.

## 1. Controller / Dateien + Commit
- Steuerung: `apps/web/components/TrioScene.tsx` (+ `TrioScene.css`), Szenenvertrag/Cues/Assets:
  `apps/web/lib/home-scenes.ts`.
- Letzter Commit auf TrioScene: **`cfd87b9`** (Ambient-Loop-Start für intro-lose Szenen),
  davor `d054f7f`, `9bdad3c`.

## 2. Architektur: Video und Stimme sind BEWUSST ENTKOPPELT (kein Lip-Sync)
- `home-scenes.ts` (Z.33-35) wörtlich: „Real loop clips (Kling v3 Pro image-to-video …). Start = end
  frame, so the loops are seamless … **No face edits, no lip-sync.**"
- `TrioScene.tsx` (Z.14-15, 66): Intro läuft einmal (Walk-in), dann nahtloser Loop **silent**,
  „**independent of the voice track**". Video-Elemente sind `muted loop` (Loop) bzw. `muted` (Intro).
- Stimme ist ein **separates** `<audio>`-Element (`scene.audioSrc`); Synchronisation erfolgt nur
  gegen **zeitcodierte Caption-Cues** (`cues[]` + `.vtt`), **nicht** gegen Mundbewegungen.
- **Antwort auf die Kernfrage:** Die Videos enthalten **keine passenden Mundbewegungen** — es sind
  reine **Ambient-Loops** (identitätstreu, ohne Gesichts-/Lippenbearbeitung).

## 3. Clip-Assets (`apps/web/public/media/home-loops/`, Werte aus `manifest.json`)
| Clip | Auflösung | Dauer | FPS | Alpha | Modell |
|---|---|---|---|---|---|
| welcome-intro | 1920×1080 | 5,04 s | nicht im Manifest (ffprobe nötig) | **nein** (`format=yuv420p`) | fal-ai/kling-video/v3/pro/image-to-video |
| welcome-loop | 1920×1080 | 10,04 s | — (ffprobe nötig) | nein (yuv420p) | Kling v3 Pro i2v |
| project-loop | 1920×1080 | 10,04 s | — (ffprobe nötig) | nein (yuv420p) | Kling v3 Pro i2v |
| choice-loop | 1920×1080 | 10,04 s | — (ffprobe nötig) | nein (yuv420p) | Kling v3 Pro i2v |
- Formate je Clip: `.mp4` (H.264, `ISO Media MP4 Base Media v1`) + `.webm` + Poster `.jpg`.
  SHA256/webm_sha256/source_sha256 je Clip im Manifest hinterlegt.
- **FPS/Codec-Detailprofil/start_time** sind ohne ffprobe nicht belegbar → offen bis ffprobe verfügbar.

## 4. Audio-Assets (`apps/web/public/media/home-review/`)
- Produktionsstimmen: `welcome-elevenlabs-v4.mp3`, `project-elevenlabs-v4.mp3`, `choice-elevenlabs-v4.mp3`.
- Technik (`file`-Header welcome): **MPEG layer III, 192 kbps, 48 kHz, Stereo**, ID3 v2.4 (ElevenLabs v4 TTS).
- Captions: `welcome.vtt` / `project.vtt` / `choice.vtt` (zeitcodiert).

## 5. Ist-Timeline (aus `home-scenes.ts` cues + `config/home-film-scripts.json`, Status `production_scripts_not_release`)
- **welcome** (FILM-home-welcome, H00): entranceSeconds 4, endHoldSeconds 3, Solldauer 42-45 s.
  Sprechphasen: Pascal 4-15,31 · NeX 16,81-24,86 · Oracle 26,36-35,76 · Pascal 37,26-40,42.
- **project** (S01): entrance 4, hold 3, 45-55 s; 4 Cues (Pascal/NeX/Oracle/Pascal).
- **choice** (S02): entrance 4, hold 3; 4 Cues (NeX/Pascal/Oracle/Pascal, Ende 46,33).
- **Konsequenz:** Loops sind 5-10 s und wiederholen sich über ~42-55 s Sprache → eine
  wort-/phonemgenaue Mundsynchronität ist mit diesen Assets **konstruktiv nicht gegeben**.

## 6. Seek / Replay / Phasen (TrioScene.tsx)
- Seek: `input.trio-progress` setzt `audio.currentTime` (nur Audio); Videos werden **nicht** geseekt (laufen als `loop`).
- Replay: `restart()` setzt Audio auf 0, Phase `entering`, Cue-Index −1, startet neu.
- Loop-Steuerung: IntersectionObserver pausiert den Loop außerhalb des Viewports (Akku); intro-lose
  Szenen starten den Loop über das `loopRef`-Elternelement.

## 7. Nicht verdrahtete Experiment-/Review-Artefakte (NICHT in Produktion)
- In `home-review/` liegen `lip-audio-1..3.mp3`, `lip-input-1..3.mp4`, `portrait-input.mp4`,
  `welcome-review.mp4/.webm/.vtt`. Diese sind in **keinem** Produktionscode referenziert (grep leer)
  → reine Mess-/Review-/Lip-Experiment-Artefakte, keine aktive Hero-Funktion.

## 8. Offene, nur mit ffprobe belegbare Punkte (für deinen Folgeauftrag)
- Exakte FPS, Codec-Profil/Level, `start_time`, Audio-Streams je Clip (Loops sind stumm → vermutlich 0 Audiostreams, unbelegt ohne ffprobe), genaue MP3-Dauer je Stimme.

## 9. Eignungsprüfung vorhandener Lip-/Review-Assets (lesend, NEX-MEDIA-SYNC §5)
Ergebnis: **keine wiederverwendbaren, freigegebenen, identitätstreuen Lippen-Ergebnisse.**
- `config/page-media-registry.json` → `welcome-review-clip-v1`: **`status: review_only_not_approved`**.
- `tools/produce_face_sync.py` markiert `portrait-input.mp4`/`lip-audio-3` ausdrücklich:
  `'purpose':'isolated face-crop test, not final film'`, `voice_acceptance:False`, `release:False`.
- `lip-input-*`/`lip-audio-*` stammen aus `tools/produce_home_hero.py`/`produce_face_sync.py` (Experimente),
  sind in **keinem** Produktionspfad verdrahtet.
→ Diese Assets werden **nicht** als Lippenperformance wiederverwendet (keine falsche Abnahme).

## 10. Umsetzung Weg B (deterministischer Zeitgleichlauf, umgesetzt)
`apps/web/components/TrioScene.tsx`: ein Controller, `audio.currentTime` = Master.
- Pause friert Audio **und** Loop ein (nicht bei natürlichem Ende); Resume/Playing spielt beide.
- Seek re-derive't die Loop-Zeit deterministisch per **Modulo** (`master%l.duration`) — ausdrücklich
  Ambient, **keine** Frame-/Lippensync.
- `waiting`/`stalled` koppelt (friert Loop), `seeked` richtet neu aus.
- Starttoken verhindert, dass eine verspätete `play()`-Promise nach Pause/Unmount/Locale-Wechsel
  neu startet; benigner `AbortError`/`NotAllowedError` wird **nicht** als harter Fehler gezeigt.
- Locale-Wechsel stoppt die laufende Szene (Effekt-Cleanup + Token-Invalidierung).
- Battery-IntersectionObserver setzt den Loop bei Scroll-in nur fort, wenn der Nutzer **nicht**
  pausiert hat. Hero-Baseline (DOM/Klassen/testids/reduced-motion) unverändert.
- Beleg: `make test` 583 grün (inkl. neuem Contract-Test `test_trioscene_is_single_audio_master_controller_weg_b`),
  Resize real neu gemessen (108 Checks/0 Issues), Identity-Hero real nachgemessen (passed, errors:0).
- **Nicht erfüllt/offen (keine Schönrechnung):** echte phonetische Lippensynchronität fehlt weiterhin
  mangels geeigneter, freigegebener Lippen-Assets; echte Geräte-/Lippenabnahme steht aus.

