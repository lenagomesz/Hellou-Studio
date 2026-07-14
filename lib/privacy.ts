export const PRIVACY_COOKIE_NAME = 'hellou_privacy';
export const PRIVACY_CONSENT_VERSION = '2026-07-14';
export const PRIVACY_CHANGED_EVENT = 'hellou:privacy-changed';
export const OPEN_PRIVACY_EVENT = 'hellou:open-privacy';

export type PrivacyConsent = {
  version: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function normalizePrivacyConsent(value: unknown): PrivacyConsent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PrivacyConsent>;
  if (candidate.version !== PRIVACY_CONSENT_VERSION || typeof candidate.analytics !== 'boolean' || typeof candidate.marketing !== 'boolean') return null;
  return {
    version: PRIVACY_CONSENT_VERSION,
    necessary: true,
    analytics: candidate.analytics,
    marketing: candidate.marketing,
    decidedAt: typeof candidate.decidedAt === 'string' ? candidate.decidedAt : new Date().toISOString(),
  };
}

export function parsePrivacyCookie(raw: string | undefined | null) {
  if (!raw) return null;
  try {
    return normalizePrivacyConsent(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

export function readClientPrivacyConsent() {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${PRIVACY_COOKIE_NAME}=`));
  return parsePrivacyCookie(entry?.slice(PRIVACY_COOKIE_NAME.length + 1));
}
