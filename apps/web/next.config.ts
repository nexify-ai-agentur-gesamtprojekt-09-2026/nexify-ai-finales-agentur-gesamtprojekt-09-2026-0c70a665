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
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://127.0.0.1:3003/api/:path*" }]
      : [];
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
