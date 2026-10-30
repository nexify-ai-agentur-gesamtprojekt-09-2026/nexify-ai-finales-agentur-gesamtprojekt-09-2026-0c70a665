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
