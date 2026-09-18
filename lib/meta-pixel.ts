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
let sdkState: 'idle' | 'loading' | 'ready' = 'idle';
let flushingEvents = false;
const pendingEvents: Array<{ event: MetaEvent; parameters?: Record<string, unknown> }> = [];

export function syncMetaConsent() {
  if (typeof window === 'undefined' || !pixelId) return false;
  const allowed = readClientPrivacyConsent()?.marketing === true;
  if (!allowed) {
    pendingEvents.length = 0;
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

function flushMetaEvents() {
  if (typeof window === 'undefined' || sdkState !== 'ready' || flushingEvents || !syncMetaConsent()) return;

  const fbq = window.fbq;
  if (!fbq?.callMethod) return;

  flushingEvents = true;
  try {
    for (const { event, parameters } of pendingEvents.splice(0)) {
      fbq('track', event, parameters);
    }
  } finally {
    flushingEvents = false;
  }
}

function loadMetaPixel() {
  if (typeof window === 'undefined' || !pixelId) return false;

  if (window.fbq?.callMethod) {
    sdkState = 'ready';
    flushMetaEvents();
    return true;
  }

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
  }

  if (sdkState !== 'idle') return true;

  sdkState = 'loading';
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  script.onload = () => {
    if (window.fbq?.callMethod) {
      sdkState = 'ready';
      flushMetaEvents();
    } else {
      sdkState = 'idle';
    }
  };
  script.onerror = () => {
    sdkState = 'idle';
  };
  document.head.appendChild(script);
  return true;
}

export function trackMetaEvent(event: MetaEvent, parameters?: Record<string, unknown>) {
  if (!pixelId || !syncMetaConsent()) return false;

  pendingEvents.push({ event, parameters });
  if (!loadMetaPixel()) return false;
  if (sdkState === 'ready') {
    flushMetaEvents();
  }
  return true;
}
