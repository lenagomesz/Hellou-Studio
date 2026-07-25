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
  if (!xSignature) return false;

  const parts = xSignature.split(',');
  let ts = '';
  let hash = '';

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') hash = value;
  }

  if (!ts || !hash) return false;

  if (!/^\d+$/.test(ts)) return false;

  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId.toLowerCase()}`);
  if (xRequestId) manifestParts.push(`request-id:${xRequestId}`);
  manifestParts.push(`ts:${ts}`);
  const manifest = `${manifestParts.join(';')};`;
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
