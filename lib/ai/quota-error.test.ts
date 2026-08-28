import { describe, expect, it } from 'vitest';
import { asGeminiQuotaError, GeminiQuotaError, nextGeminiDailyReset } from './quota-error';

describe('Gemini quota classification', () => {
  it.each([
    ['2026-08-28T12:00:00Z', '2026-08-29T07:01:00.000Z'],
    ['2026-01-15T12:00:00Z', '2026-01-16T08:01:00.000Z'],
    ['2026-03-08T09:00:00Z', '2026-03-09T07:01:00.000Z'],
    ['2026-11-01T08:00:00Z', '2026-11-02T08:01:00.000Z'],
    ['2026-08-28T06:59:59Z', '2026-08-28T07:01:00.000Z'],
    ['2026-08-28T07:00:00Z', '2026-08-29T07:01:00.000Z'],
  ])('uses the next Pacific midnight including DST: %s', (now, reset) => {
    expect(nextGeminiDailyReset(new Date(now)).toISOString()).toBe(reset);
  });
  it('ignores misleading zero retry delays on daily exhaustion', () => {
    const quota = asGeminiQuotaError({
      status: 429, message: 'secret provider details',
      errorDetails: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] }, { retryDelay: '0s' }],
    }, new Date('2026-08-28T12:00:00Z'));
    expect(quota).toMatchObject({ kind: 'daily', retryAt: '2026-08-29T07:01:00.000Z' });
    expect(quota?.message).not.toContain('secret');
  });
  it.each(['0s', '120s'])('backs off temporary limits with a minimum of a minute: %s', retryDelay => {
    const now = new Date('2026-08-28T12:00:00Z');
    const quota = asGeminiQuotaError({ status: 429, errorDetails: [{ retryDelay }] }, now);
    expect(quota?.kind).toBe('rate');
    expect(Date.parse(quota!.retryAt) - now.getTime()).toBe(retryDelay === '0s' ? 60000 : 120000);
  });
  it('supports serialized SDK errors but does not misclassify other failures', () => {
    expect(asGeminiQuotaError(new Error('[429] GenerateRequestsPerDayPerProjectPerModel-FreeTier'))?.kind).toBe('daily');
    expect(asGeminiQuotaError(new Error('503 unavailable'))).toBeNull();
    expect(asGeminiQuotaError(null)).toBeNull();
    const quota = new GeminiQuotaError('rate', '2026-08-28T12:00:00Z');
    expect(asGeminiQuotaError(quota)).toBe(quota);
  });
});
