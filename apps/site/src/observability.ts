import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const sampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0");

if (dsn) {
  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? "production",
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ?? undefined,
    dataCollection: { userInfo: false },
    tracesSampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
  });
}

export function captureClientError(error: unknown): void {
  if (dsn) Sentry.captureException(error);
}
