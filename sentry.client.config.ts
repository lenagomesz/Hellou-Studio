import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV !== 'production',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,

  // Ignore errors from extensions and scripts
  beforeSend(event, hint) {
    // Ignore errors from extensions
    if (
      event.request?.url?.includes('extension://') ||
      event.request?.url?.includes('chrome://')
    ) {
      return null;
    }

    // Ignore network errors (likely user connection)
    if (
      hint.originalException instanceof TypeError &&
      hint.originalException.message.includes('fetch')
    ) {
      return null;
    }

    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.headers;
      delete event.request.query_string;
    }

    return event;
  },

  // List of URLs to ignore
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Third party scripts
    /google-analytics/i,
  ],
});
