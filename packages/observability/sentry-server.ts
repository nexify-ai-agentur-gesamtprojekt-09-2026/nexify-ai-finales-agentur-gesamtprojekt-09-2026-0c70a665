/** Minimal Sentry capture for Vercel Node functions. No-op without SENTRY_DSN. */
import * as Sentry from '@sentry/node';

let initialised = false;

function ensure(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  if (!initialised) {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'production',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      dataCollection: { userInfo: false },
      tracesSampleRate: 0,
    });
    initialised = true;
  }
  return true;
}

/** Captures unexpected failures only; expected client errors stay out of Sentry. */
export function captureServerError(error: unknown, tags?: Record<string, string>): void {
  if (!ensure()) return;
  Sentry.captureException(error, tags ? { tags } : undefined);
}

export async function flush(timeoutMs = 2000): Promise<void> {
  if (initialised) await Sentry.flush(timeoutMs).catch(() => false);
}
