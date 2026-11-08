# NeXify AI FACTORY — React/Next.js App

Vollständige Website als **Next.js 15 (App Router) + React 19 + TypeScript**.
Ersetzt die statische Canvas-Variante durch eine echte App mit Routing **und** Backend-Nahtstellen.

## Seiten
`/` (Start) · `/leistungen` · `/arbeitsweise` · `/budget` · `/produkte` · `/kontakt` · `/impressum`

## Interaktiv (Client Components)
Header/Mobile-Menü, Oracle-Chat, Szenen-Rotation (IntersectionObserver), Leistungs-Akkordeon,
Budget-Rechner, Kontaktformular.

## Backend-Nahtstellen (bereit zum Anschließen)
- `app/api/chat/route.ts`  → an den NeXify-Router (9router) hängen
- `app/api/contact/route.ts` → an Resend/CRM hängen
Beide funktionieren jetzt schon (deterministische Antwort), ohne 404.

## Lokal starten
```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm run start   # Produktion
```

## Deploy (Vercel)
Framework-Preset **Next.js**. Als EIGENES Projekt deployen (nicht das Shop-Projekt
`prj_Po7…` überschreiben). Danach gezielt `nexifyai.de` bzw. eine Vorschau-Domain zuweisen.
Weil es eine echte Next-App ist, können Shop-/Chat-APIs später in dieselbe App integriert
werden — kein Totalausfall wie bei statischem Ersatz.

## Design-Tokens
`app/globals.css` (`:root`) — Quelle: TOKENS.json v1.0.0 (Surface #111212, Lime #C0EE38,
Ink #F3F0EA, Champagne #C4B394, Steel #BDC5C9, Fokusring, 8-pt-Raster).
