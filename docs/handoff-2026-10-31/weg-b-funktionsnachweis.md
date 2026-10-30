# Funktionsnachweis Weg B — NEX-MEDIA-SYNC-20261030-01 (real gemessen)

Datum: 2026-10-31. Art: echter Browser-Funktionstest mit **tatsächlichen Medien**, nicht nur
Quell-/Geometrie-Contract. Keine Provider-/Generierungsaufrufe. **Keine Lippensync-Abnahme.**

## Testlauf
- Test: `apps/site/tests/browser-media-sync.mjs` (Vite-Preview des gebauten `apps/site`, Chromium via pw-shim).
- Umgebung: **HeadlessChrome/145.0.7632.0**, Viewport **390×844**, Motion AN (kein reduced-motion).
- Ergebnis: **passed, 0 Page-Errors.** Rohdaten: `.local/media-sync/browser-media-sync.json`.

## Gemessene Szenen (welcome `hero`, project `home-project`, choice `home-choice`)
| Szene | Start-Master (s) | Loop-Dauer (s) | Seek-Drift (Loop vs master%dur) |
|---|---|---|---|
| hero | 0,80 | 10,042 | **0,00** |
| home-project | 0,83 | 10,042 | **0,00** |
| home-choice | 0,83 | 10,042 | **0,00** |

## Belegte Verhaltensweisen (je Szene assertiert)
- **Start:** `audio.currentTime` (Master) läuft > 0; Ambient-Loop spielt (`loopPaused=false`).
- **Pause:** `audio.paused=true` **und** Loop eingefroren (`loopPaused=true`); Master und `loop.currentTime`
  ändern sich über 600 ms **nicht** (|Δ|<0,08 s) → Weg-B-Pause friert beide Medien am selben Punkt.
- **Seek:** nach `audio.currentTime=target` ist `loop.currentTime ≈ target % loopDur` (Drift 0,00; Toleranz
  max(0,4 s; 6 % der Clipdauer)) → deterministische Modulo-Kopplung, ausdrücklich Ambient, **keine** Lippensync.
- **Fortsetzen:** Master läuft ab Seek-Position weiter (`audioPaused=false`).
- **Replay:** `restart` setzt Master < 3 s zurück.
- **Single-Audible:** `nexify:presenter-play` einer anderen Szene pausiert diese Audiospur.

## Erfasste Größen & Grenzen
- Erfasst: `master=audio.currentTime`, `mediaTime=loop.currentTime`, `loop.duration`, `audio.duration`,
  `viewport`, `navigator.userAgent`.
- Grenzen (ehrlich): (1) **JavaScript-Media-Zeit** ist kein Nachweis realer Lautsprecher-Latenz.
  (2) Nur **HeadlessChrome/145 @390px** gemessen — echte iOS/Android/WebKit-/PWA-Geräteprüfung steht aus.
  (3) **Keine phonetische Lippensynchronität** gemessen/behauptet (Ambient-Loop ohne passende Mundbewegung).
