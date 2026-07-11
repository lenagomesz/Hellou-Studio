import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV !== 'production',
  enabled: !!process.env.SENTRY_DSN,

  // Filter out noise
  integrations: (integrations) => {
    return integrations.filter((integration) => {
      return integration.name !== 'Breadcrumbs';
    });
  },

  // Capture only important errors
  beforeSend(event) {
    // Ignore network timeouts (user's connection issue)
    if (event.exception?.values?.[0]?.value?.includes?.('timeout')) {
      return null;
    }

    return event;
  },
});
