/**
 * Sentry error tracking integration
 * 
 * To enable Sentry:
 * 1. Install @sentry/react: npm install @sentry/react
 * 2. Set SENTRY_DSN environment variable
 * 3. Uncomment the Sentry initialization code below
 */

// Uncomment these imports when Sentry is enabled
// import * as Sentry from "@sentry/react";

export function initSentry() {
  // Uncomment and configure Sentry when ready
  /*
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
  */

  console.log("[Sentry] Sentry integration not enabled. To enable, install @sentry/react and configure.");
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  // Uncomment when Sentry is enabled
  // Sentry.captureException(error, { extra: context });
  console.error("[Sentry] Error captured:", error, context);
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  // Uncomment when Sentry is enabled
  // Sentry.captureMessage(message, { level });
  console.log(`[Sentry] Message captured [${level}]:`, message);
}
