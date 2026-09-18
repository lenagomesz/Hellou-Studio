import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRIVACY_COOKIE_NAME, PRIVACY_CONSENT_VERSION } from '@/lib/privacy';

const consent = encodeURIComponent(JSON.stringify({
  version: PRIVACY_CONSENT_VERSION,
  necessary: true,
  analytics: true,
  marketing: true,
  decidedAt: '2026-09-18T00:00:00.000Z',
}));

describe('Meta Pixel', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete window.fbq;
    delete window._fbq;
    document.cookie = `${PRIVACY_COOKIE_NAME}=; Max-Age=0; Path=/`;
  });

  it('waits for the SDK before transmitting queued ecommerce events', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1443878417838913');
    document.cookie = `${PRIVACY_COOKIE_NAME}=${consent}; Path=/`;
    const appendChild = vi.spyOn(document.head, 'appendChild');
    const { trackMetaEvent } = await import('@/lib/meta-pixel');

    expect(trackMetaEvent('ViewContent', { content_ids: ['product-1'], content_type: 'product', value: 12, currency: 'BRL' })).toBe(true);
    const script = appendChild.mock.calls.find(([node]) => node instanceof HTMLScriptElement)?.[0] as HTMLScriptElement;
    expect(script.src).toBe('https://connect.facebook.net/en_US/fbevents.js');

    const callMethod = vi.fn();
    window.fbq!.callMethod = callMethod;
    script.onload!(new Event('load'));

    expect(callMethod).toHaveBeenCalledWith('track', 'ViewContent', {
      content_ids: ['product-1'], content_type: 'product', value: 12, currency: 'BRL',
    });
  });
});
