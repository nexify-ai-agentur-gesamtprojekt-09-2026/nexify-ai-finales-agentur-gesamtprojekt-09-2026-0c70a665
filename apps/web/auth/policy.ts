/** Authentication is not authorization. No caller-controlled role/tenant mapping. */
export type AuthEnvironment = Record<string, string | undefined>;
function validPublishableKey(key: string): boolean {
  const encoded = /^pk_(?:live|test)_([A-Za-z0-9+/]+={0,2})$/.exec(key)?.[1];
  if (!encoded) return false;
  try {
    // Clerk SDK's decoded format is "frontend.hostname$". Enforce a DNS
    // hostname as well, rather than allowing a malformed Provider to mount.
    const decoded = atob(encoded);
    if (!decoded.endsWith("$")) return false;
    const host = decoded.slice(0, -1);
    const labels = host.split(".");
    return host.length <= 253 && labels.length >= 2 && labels.every(label =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  } catch { return false; }
}
export function clerkConfiguration(env: AuthEnvironment) {
  const publicKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const secret = env.CLERK_SECRET_KEY || "";
  const publicMode = /^pk_(live|test)_[A-Za-z0-9+/=]+$/.exec(publicKey)?.[1];
  const secretMode = /^sk_(live|test)_[A-Za-z0-9]{20,}$/.exec(secret)?.[1];
  const ready = Boolean(validPublishableKey(publicKey) && publicMode && publicMode === secretMode &&
    ((env.NODE_ENV !== "production" && env.APP_ENV !== "production") || publicMode === "live"));
  return { ready };
}
export function canonicalPath(path: string): string | null {
  try {
    let decoded = path;
    for (let i = 0; i < 4; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (/%[0-9a-f]{2}/i.test(decoded) || !decoded.startsWith("/") ||
        /[\\\u0000-\u0020\u007f?#]/.test(decoded)) return null;
    const segments: string[] = [];
    for (const part of decoded.split("/")) {
      if (part === "..") segments.pop();
      else if (part && part !== ".") segments.push(part);
    }
    return "/" + segments.join("/");
  } catch { return null; }
}
export function privateRoute(path: string, protectedPaths: readonly string[]) {
  return protectedPaths.some(prefix => path === prefix || path.startsWith(prefix + "/"));
}
export function privateDecision(ready: boolean, userId: string | null) {
  if (!ready) return "unavailable" as const;
  if (!userId) return "sign_in" as const;
  // A verified subject alone supplies no server-owned tenant/site membership.
  return "membership_required" as const;
}
