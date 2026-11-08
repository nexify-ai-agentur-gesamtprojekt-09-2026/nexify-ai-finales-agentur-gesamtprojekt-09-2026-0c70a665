import {test, expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

// Supervisor-Auftrag 3: „keine Seite gilt als fertig ohne Chat."
// Dieser Abnahme-Test leitet seine Routenliste direkt aus config/site-map.json ab
// (Flag shared_chat_required=true) — keine hartkodierte Liste. Jede solche Route
// muss in Desktop (1440) UND Mobil (390, via Playwright-Projekt) einen sichtbaren
// Chat-Einstieg zeigen. Fehlt er, schlägt der Build rot aus.

const here = dirname(fileURLToPath(import.meta.url));
const siteMapPath = resolve(here, "../../../config/site-map.json");

type Access = {visibility?: string; auth_required?: boolean};
type Page = {path?: string; id?: string; shared_chat_required?: boolean; access?: Access};

const raw = JSON.parse(readFileSync(siteMapPath, "utf8"));
const pages: Page[] = Array.isArray(raw.pages) ? raw.pages : Object.values(raw.pages || raw);

// Pflicht-Routen: shared_chat_required=true. Auth-/interne Seiten (portal/*, intern/*)
// tragen das Flag bewusst nicht und sind ausgenommen — sie laufen hinter Login in
// einer anderen Shell ohne den öffentlichen Chat.
const chatRoutes = pages
  .filter((p) => p.shared_chat_required === true && typeof p.path === "string")
  .map((p) => p.path as string);

test.describe("Globaler Oracle/AIFly-Chat ist auf jeder Pflicht-Seite erreichbar", () => {
  test("site-map.json enthält überhaupt Chat-Pflichtseiten (Schutz gegen leeres Gate)", () => {
    expect(chatRoutes.length).toBeGreaterThan(0);
  });

  for (const route of chatRoutes) {
    test(`Chat-Einstieg sichtbar: ${route}`, async ({page}) => {
      await page.goto(route, {waitUntil: "domcontentloaded"});

      // Sichtbarer Einstieg = entweder der Launcher (Panel geschlossen) ODER ein
      // bereits offenes Panel (z. B. per gespeichertem Zustand auf Desktop).
      const launcher = page.getByTestId("chat-launcher");
      const openPanel = page.locator('[data-testid="chat-panel"]:not([hidden])');

      await expect(
        launcher.or(openPanel),
        `Weder Chat-Launcher noch offenes Chat-Panel auf ${route} sichtbar`,
      ).toBeVisible();
    });
  }
});
