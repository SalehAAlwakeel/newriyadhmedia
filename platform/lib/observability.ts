// Minimal, dependency-free error reporting.
//
// In production on Vercel, console.error is captured in the function logs and
// is enough to get going. To enable Sentry, `npm i @sentry/nextjs`, set
// SENTRY_DSN, and this helper will forward errors to it automatically (the
// indirect import keeps the package optional at build time).

let sentryInit = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentry: any = null;

async function loadSentry() {
  if (sentryInit) return sentry;
  sentryInit = true;
  if (!process.env.SENTRY_DSN) return null;
  try {
    const specifier = "@sentry/nextjs";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ specifier);
    mod.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
    sentry = mod;
  } catch {
    sentry = null;
  }
  return sentry;
}

export async function reportError(error: unknown, context?: Record<string, unknown>) {
  console.error("[error]", context ?? {}, error);
  const s = await loadSentry();
  if (s) {
    try {
      s.captureException(error, { extra: context });
    } catch {
      /* never let reporting throw */
    }
  }
}
