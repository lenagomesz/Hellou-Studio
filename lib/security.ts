import { createHmac, timingSafeEqual } from 'crypto';

export function sanitizeSearchInput(input: string): string {
  return input.replace(/[,.()"'%;]/g, '');
}

export function verifyWebhookSignature(
  dataId: string,
  xSignature: string | null,
  xRequestId: string | null,
  secret: string,
): boolean {
  if (!xSignature || !xRequestId) return false;

  const parts = xSignature.split(',');
  let ts = '';
  let hash = '';

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') hash = value;
  }

  if (!ts || !hash) return false;

  const rawTimestamp = Number(ts);
  if (!Number.isFinite(rawTimestamp)) return false;
  const timestampMs = rawTimestamp < 10_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
  if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function validateShippingCost(cost: unknown): number {
  const num = Number(cost);
  if (!Number.isFinite(num) || num < 0) return 0;
  if (num > 200) return 200;
  return Math.round(num * 100) / 100;
}
