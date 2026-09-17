import { readClientPrivacyConsent } from '@/lib/privacy';

type MetaEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';
type Fbq = ((command: string, event: string, parameters?: Record<string, unknown>) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
let consentGranted = true;

export function syncMetaConsent() {
  if (typeof window === 'undefined' || !pixelId) return false;
  const allowed = readClientPrivacyConsent()?.marketing === true;
  if (!allowed) {
    if (window.fbq && consentGranted) {
      window.fbq('consent', 'revoke');
      consentGranted = false;
    }
    return false;
  }
  if (window.fbq && !consentGranted) {
    window.fbq('consent', 'grant');
    consentGranted = true;
  }
  return true;
}

export function trackMetaEvent(event: MetaEvent, parameters?: Record<string, unknown>) {
  if (!pixelId || !syncMetaConsent()) return false;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    fbq('init', pixelId);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq('track', event, parameters);
  return true;
}
