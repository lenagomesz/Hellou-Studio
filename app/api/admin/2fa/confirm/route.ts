import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verify2FA, hashBackupCode } from '@/lib/2fa';
import { checkRateLimit, recordAttempt, clearAttempts } from '@/lib/2fa-rate-limit';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const user = auth.user;

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can setup 2FA' },
      { status: 403 },
    );
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const { secret, code, backupCodes } = await request.json();

    if (!secret || !code || !backupCodes || !Array.isArray(backupCodes)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 },
      );
    }

    if (backupCodes.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid backup codes' },
        { status: 400 },
      );
    }

    const isValid = verify2FA(secret, code);
    if (!isValid) {
      await recordAttempt(user.id, false, clientIp);
      return NextResponse.json(
        { error: 'Invalid code. Please try again.' },
        { status: 400 },
      );
    }

    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('users')
      .update({
        two_fa_enabled: true,
        two_fa_secret: secret,
        two_fa_backup_codes: hashedBackupCodes,
        two_fa_backup_codes_generated_at: new Date().toISOString(),
        two_fa_last_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('[2fa/confirm] update error:', error);
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 },
      );
    }

    await recordAttempt(user.id, true, clientIp);
    await clearAttempts(user.id);

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes,
      warning:
        'Save these backup codes in a safe place. You can use them if you lose access to your authenticator app.',
    });
  } catch (error) {
    console.error('[2fa/confirm] error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm 2FA' },
      { status: 500 },
    );
  }
}
