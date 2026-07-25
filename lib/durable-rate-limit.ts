import 'server-only';
import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthSecret } from '@/lib/security-env';
import { rateLimit as localRateLimit } from '@/lib/rate-limit';

export interface DurableRateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

function clientAddress(request: Request | NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function durableRateLimit(
  request: Request | NextRequest,
  scope: string,
  options: { maxRequests: number; windowMs: number },
): Promise<DurableRateLimitResult> {
  const keyHash = createHmac('sha256', getAuthSecret())
    .update(`${scope}:${clientAddress(request)}`)
    .digest('hex');

  try {
    const { data, error } = await getSupabaseAdmin().rpc('consume_api_rate_limit', {
      p_key_hash: keyHash,
      p_max_requests: options.maxRequests,
      p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Rate limit returned no result.');
    return {
      success: Boolean(row.allowed),
      remaining: Number(row.remaining) || 0,
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch {
    return localRateLimit(keyHash, options);
  }
}
