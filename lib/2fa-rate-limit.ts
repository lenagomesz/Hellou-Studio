import { getSupabaseAdmin } from './supabase';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function checkRateLimit(
  userId: string,
  _ipAddress?: string,
): Promise<{
  allowed: boolean;
  attemptsRemaining: number;
  resetAt: Date;
}> {
  const admin = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const { data: attempts, error } = await admin
    .from('two_fa_attempts')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', windowStart.toISOString())
    .limit(MAX_ATTEMPTS + 1);

  if (error) {
    console.error('[2fa-rate-limit] error checking attempts:', error);
    throw error;
  }

  const attemptCount = attempts?.length || 0;
  const allowed = attemptCount < MAX_ATTEMPTS;
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptCount);
  const resetAt = new Date(windowStart.getTime() + WINDOW_MINUTES * 60 * 1000);

  return { allowed, attemptsRemaining, resetAt };
}

export async function recordAttempt(
  userId: string,
  success: boolean,
  ipAddress?: string,
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { error } = await admin.from('two_fa_attempts').insert({
    user_id: userId,
    success,
    ip_address: ipAddress || null,
  });

  if (error) {
    console.error('[2fa-rate-limit] error recording attempt:', error);
    throw error;
  }
}

export async function clearAttempts(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('two_fa_attempts')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[2fa-rate-limit] error clearing attempts:', error);
    throw error;
  }
}
