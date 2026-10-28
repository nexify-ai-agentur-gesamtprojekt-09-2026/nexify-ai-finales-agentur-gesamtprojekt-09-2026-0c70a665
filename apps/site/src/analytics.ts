/** PostHog pageview capture without SDK dependency. No cookies, no PII, no autocapture. */
const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";

// Session-scoped random id, kept in memory only. No cookie, no localStorage.
const distinctId = `anon-${crypto.randomUUID()}`;

export function capturePageview(path: string): void {
  if (!key) return;
  const body = JSON.stringify({
    api_key: key,
    event: "$pageview",
    properties: {
      distinct_id: distinctId,
      $current_url: `${location.origin}${path}`,
      $pathname: path,
      $host: location.host,
      locale: document.documentElement.lang,
    },
  });
  // keepalive so the event survives a navigation
  void fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
