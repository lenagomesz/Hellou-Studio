import { describe, expect, it } from 'vitest';
import { normalizePrivacyConsent, parsePrivacyCookie, PRIVACY_CONSENT_VERSION } from '@/lib/privacy';

describe('privacy consent', () => {
  it('accepts a current explicit choice and keeps necessary cookies enabled', () => {
    const consent = normalizePrivacyConsent({
      version: PRIVACY_CONSENT_VERSION,
      analytics: true,
      marketing: false,
      necessary: false,
      decidedAt: '2026-07-14T12:00:00.000Z',
    });
    expect(consent).toMatchObject({ necessary: true, analytics: true, marketing: false });
  });

  it('requires a new choice when the policy version changes', () => {
    expect(normalizePrivacyConsent({ version: 'old', analytics: true, marketing: true })).toBeNull();
  });

  it('reads the encoded cookie and rejects malformed values', () => {
    const raw = encodeURIComponent(JSON.stringify({
      version: PRIVACY_CONSENT_VERSION,
      analytics: false,
      marketing: false,
      decidedAt: '2026-07-14T12:00:00.000Z',
    }));
    expect(parsePrivacyCookie(raw)?.analytics).toBe(false);
    expect(parsePrivacyCookie('%invalid')).toBeNull();
  });
});
