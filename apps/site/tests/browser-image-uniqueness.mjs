// Bildeinmaligkeit (Owner-Vorgabe 04.11.2026): jedes Bild genau einmal auf der gesamten öffentlichen Seite,
// passend zum Bereich, in dem es steht. Misst gerenderte <img>, <picture>-Quellen, Video-Poster und
// CSS-Hintergrundbilder auf allen öffentlichen Routen und meldet jede Datei, die mehr als einmal erscheint.
// Aufruf: LOCAL_ORIGIN=http://127.0.0.1:3017 node apps/site/tests/browser-image-uniqueness.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = new URL("../../../", import.meta.url).pathname;
// Quellenbindung: das Gate-Skript, die Baseline und die Routenquelle, damit der Checker Veraltung erkennt.
const BINDUNG = ["apps/site/tests/browser-image-uniqueness.mjs", "config/image-uniqueness-baseline.json", "config/site-map.json"];
const quellHashes = Object.fromEntries(await Promise.all(BINDUNG.map(async (p) => [p, createHash("sha256").update(await readFile(root + p)).digest("hex")])));
const origin = process.env.LOCAL_ORIGIN || "http://127.0.0.1:3017";
const map = JSON.parse(await readFile(root + "config/site-map.json", "utf8"));
const routes = map.pages.filter((p) => p.access.visibility === "public" && !p.access.auth_required).map((p) => p.path);
// Marken- und Bedienzeichen sind keine Bilder im Sinne der Vorgabe (Logo, Favicon, Symbole).
const KEIN_BILD = /(logo|favicon|icon|sprite|apple-touch|manifest|signet)/i;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Externe Ziele blocken, damit die Seite nicht auf fremde Verbindungen wartet (Chat-Stream, Analytik).
await context.route("**/*", (route) => { try { return new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({ status: 204, body: "" }); } catch { return route.abort(); } });
const page = await context.newPage();
const fundorte = new Map();
for (const route of routes) {
  await page.goto(origin + route, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await page.waitForTimeout(300);
  const bilder = await page.evaluate(() => {
    const out = [];
    const rein = (u, wo) => { if (!u || u.startsWith("data:")) return; try { out.push({ datei: new URL(u, location.href).pathname, wo }); } catch {} };
    const wo = (el) => { const s = el.closest("section,figure,aside,header,footer,main,article"); return (s?.getAttribute("data-studio-scene") ? "studio" : s?.className?.toString().split(" ")[0]) || s?.tagName.toLowerCase() || "seite"; };
    for (const img of document.querySelectorAll("img")) { if (img.closest("[aria-hidden='true']") && img.classList.contains("studio-reflection")) continue; rein(img.currentSrc || img.src, wo(img)); }
    for (const v of document.querySelectorAll("video[poster]")) rein(v.poster, wo(v));
    for (const el of document.querySelectorAll("body *")) { const bg = getComputedStyle(el).backgroundImage; for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) rein(m[1], wo(el)); }
    return out;
  });
  const jeSeite = new Map();
  for (const b of bilder) { if (KEIN_BILD.test(b.datei)) continue; jeSeite.set(b.datei, [...(jeSeite.get(b.datei) || []), b.wo]); }
  for (const [datei, orte] of jeSeite) fundorte.set(datei, [...(fundorte.get(datei) || []), { route, anzahl: orte.length, bereiche: [...new Set(orte)] }]);
}
await browser.close();
// Baseline der bekannten, noch nicht eindeutigen Bilder (Owner-Schuld bis echte Unikat-Fotos vorliegen).
// Das Gate scheitert nur an NEUEN Mehrfachbildern außerhalb der Baseline; die Baseline baut sich ab,
// sobald bereichseigene Unikate geliefert werden. Fehlt die Datei, gilt die strenge Regel (0 erlaubt).
let baseline = [];
try { baseline = JSON.parse(await readFile(root + "config/image-uniqueness-baseline.json", "utf8")).bekannte_mehrfachbilder || []; } catch {}
const mehrfach = [...fundorte].filter(([, f]) => f.length > 1 || f[0].anzahl > 1).map(([datei, f]) => ({ datei, seiten: f.length, vorkommen: f.reduce((s, x) => s + x.anzahl, 0), fundorte: f }));
const neu = mehrfach.filter((m) => !baseline.includes(m.datei));
const report = { scope: "local build, public routes, 1440 px", routes: routes.length, bilder: fundorte.size,
  mehrfach: mehrfach.length, baseline: baseline.length, neu: neu.length,
  details: mehrfach.sort((a, b) => b.vorkommen - a.vorkommen), neue_mehrfachbilder: neu.map((m) => m.datei),
  source_sha256: quellHashes, passed: neu.length === 0 };
await mkdir(root + ".local/image-uniqueness", { recursive: true });
await writeFile(root + ".local/image-uniqueness/report.json", JSON.stringify(report, null, 2) + "\n");
console.log(`Routen ${report.routes} · verschiedene Bilder ${report.bilder} · mehrfach ${report.mehrfach} · Baseline ${report.baseline} · NEU ${report.neu}`);
for (const m of report.details) console.log(`${baseline.includes(m.datei) ? "baseline" : "NEU"}  ${m.vorkommen}× auf ${m.seiten} Seiten  ${m.datei}`);
process.exit(report.passed ? 0 : 1);
