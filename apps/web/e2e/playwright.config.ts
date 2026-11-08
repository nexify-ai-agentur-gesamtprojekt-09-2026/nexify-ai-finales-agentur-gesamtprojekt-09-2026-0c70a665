import {defineConfig, devices} from "@playwright/test";

// Abnahme-Konfiguration für den globalen Oracle/AIFly-Chat (Supervisor-Auftrag 3).
// Prüft jede site-map.json-Route mit shared_chat_required=true auf einen sichtbaren
// Chat-Einstieg, in zwei Viewports: Desktop 1440 und Mobil 390. Fehlt der Einstieg,
// schlägt der Lauf (und damit das Gate) rot aus.
//
// Server: standardmäßig der lokale apps/web-Server auf 127.0.0.1:3004.
// Override per PLAYWRIGHT_BASE_URL (z. B. eine .de-/Vercel-Preview-URL).
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3004";

// Vorinstalliertes Chromium der Umgebung (kein eigener Download).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  expect: {timeout: 15_000},
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", {outputFile: ".results/chat-presence.json"}]],
  use: {
    baseURL,
    trace: "off",
    launchOptions: {executablePath, args: ["--no-sandbox", "--headless=new"]},
  },
  projects: [
    {
      name: "desktop-1440",
      use: {...devices["Desktop Chrome"], viewport: {width: 1440, height: 900}},
    },
    {
      name: "mobil-390",
      // Eigener Viewport (kein Geräteprofil), damit deviceScaleFactor/Touch die
      // Workspace-„mobile"-Logik (≤820px) zuverlässig auslösen.
      use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true},
    },
  ],
});
