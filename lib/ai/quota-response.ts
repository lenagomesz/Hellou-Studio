import { NextResponse } from 'next/server';
import { asGeminiQuotaError } from './quota-error';

export function geminiQuotaResponse(error: unknown) {
  const quota = asGeminiQuotaError(error);
  if (!quota) return null;
  return NextResponse.json({ error: quota.message, code: quota.code, retryAt: quota.retryAt, quotaKind: quota.kind }, {
    status: 429,
    headers: { 'Retry-After': String(Math.max(1, Math.ceil((Date.parse(quota.retryAt) - Date.now()) / 1000))) },
  });
}
