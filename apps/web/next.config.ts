import type { NextConfig } from "next";

import {mapPolicy,escrowMaps} from "../../tools/observability/private-sourcemaps.mjs";
import {resolve} from "node:path";
import {frameHeaders} from "./frame-headers.mjs";
const maps=mapPolicy(process.env,"next",resolve(import.meta.dirname,"../.."));
const config: NextConfig = {
  env:{NEXT_PUBLIC_RELEASE_SHA:maps.release,NEXT_PUBLIC_APP_ENV:process.env.VERCEL_ENV||process.env.NEXIFY_APP_ENV||""},
  productionBrowserSourceMaps:maps.enabled,
  compiler:maps.enabled?{runAfterProductionCompile:async({distDir})=>{await escrowMaps(resolve(distDir,"static"),maps);}}:undefined,
  poweredByHeader: false,
  allowedDevOrigins: ["*.preview.emergentagent.com", "*.cluster-1.preview.emergentcf.cloud"],
  images: { unoptimized: true },
  async rewrites() {
    // 2026-11-14 09:58 (Europe/Berlin): /agb lieferte oeffentlich 404, obwohl die
    // Rechtsseite (id "terms") unter /vertragsgrundlagen liegt. Rewrite statt Redirect:
    // kanonische URL bleibt /vertragsgrundlagen, /agb antwortet mit 200 und demselben
    // geprueften Inhalt. Rueckweg: Eintrag entfernen.
    const agbRewrite = [{ source: "/agb", destination: "/vertragsgrundlagen" }];
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://127.0.0.1:3003/api/:path*" }, ...agbRewrite]
      : agbRewrite;
  },
  async redirects() {
    // Concept requirement (section 16.2): legacy auth links must resolve to the real routes.
    return [
      { source: "/login", destination: "/anmelden", permanent: true },
      { source: "/signup", destination: "/registrieren", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...frameHeaders(process.env)
    ] }];
  }
};
export default config;
