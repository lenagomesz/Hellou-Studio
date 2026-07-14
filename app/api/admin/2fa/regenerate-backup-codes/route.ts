import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateBackupCodes, hashBackupCode } from '@/lib/2fa';

export async function POST(_request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const user = auth.user;

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can regenerate backup codes' },
      { status: 403 },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('two_fa_enabled')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[2fa/regenerate-backup-codes] user fetch error:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    if (!userData.two_fa_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 },
      );
    }

    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    const { error: updateError } = await admin
      .from('users')
      .update({
        two_fa_backup_codes: hashedBackupCodes,
        two_fa_backup_codes_generated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[2fa/regenerate-backup-codes] update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to regenerate backup codes' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes,
      warning:
        'Save these new backup codes in a safe place. Your previous backup codes will no longer work.',
    });
  } catch (error) {
    console.error('[2fa/regenerate-backup-codes] error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 },
    );
  }
}
