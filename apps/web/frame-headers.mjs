// Frame policy: DENY everywhere; only the Emergent preview pod (explicit server flag) may be embedded by Emergent.
export const PREVIEW_FRAME_ANCESTORS = "frame-ancestors 'self' https://*.emergentagent.com https://emergent.sh https://*.emergent.sh";

export function frameHeaders(env) {
  if (env.ALLOW_EMERGENT_PREVIEW_FRAME === "1" && !env.VERCEL && !env.VERCEL_ENV) {
    return [{ key: "Content-Security-Policy", value: PREVIEW_FRAME_ANCESTORS }];
  }
  return [{ key: "X-Frame-Options", value: "DENY" }];
}
