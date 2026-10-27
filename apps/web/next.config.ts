import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://127.0.0.1:3003/api/:path*" }]
      : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" }
    ] }];
  }
};
export default config;
