import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verify2FA, verifyBackupCode } from '@/lib/2fa';
import {
  checkRateLimit,
  recordAttempt,
  clearAttempts,
} from '@/lib/2fa-rate-limit';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const user = auth.user;

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can verify 2FA' },
      { status: 403 },
    );
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 },
      );
    }

    const { allowed, attemptsRemaining, resetAt } = await checkRateLimit(
      user.id,
      clientIp,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many failed attempts. Please try again later.',
          resetAt: resetAt.toISOString(),
        },
        { status: 429 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('two_fa_secret, two_fa_backup_codes')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[2fa/verify] user fetch error:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    if (!userData.two_fa_secret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 },
      );
    }

    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    let isValid = verify2FA(userData.two_fa_secret, normalizedCode);

    let usingBackupCode = false;
    let remainingBackupCodes = userData.two_fa_backup_codes || [];

    if (!isValid && remainingBackupCodes.length > 0) {
      const result = verifyBackupCode(remainingBackupCodes, normalizedCode);
      if (result.valid) {
        isValid = true;
        usingBackupCode = true;
        remainingBackupCodes = result.remaining;
      }
    }

    if (!isValid) {
      await recordAttempt(user.id, false, clientIp);
      return NextResponse.json(
        {
          error: 'Invalid code',
          attemptsRemaining: Math.max(0, attemptsRemaining - 1),
        },
        { status: 400 },
      );
    }

    if (usingBackupCode) {
      await admin
        .from('users')
        .update({
          two_fa_backup_codes: remainingBackupCodes,
        })
        .eq('id', user.id);
    }

    await admin
      .from('users')
      .update({
        two_fa_last_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await recordAttempt(user.id, true, clientIp);
    await clearAttempts(user.id);

    return NextResponse.json({
      success: true,
      message: '2FA verified successfully',
      usingBackupCode,
      backupCodesRemaining: remainingBackupCodes.length,
    });
  } catch (error) {
    console.error('[2fa/verify] error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 },
    );
  }
}
