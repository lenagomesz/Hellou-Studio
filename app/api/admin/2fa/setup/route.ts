import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generate2FA, generateBackupCodes } from '@/lib/2fa';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const user = auth.user;

  // Only admins can setup 2FA
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can setup 2FA' },
      { status: 403 },
    );
  }

  try {
    const { secret, qrCode } = await generate2FA(user.email || user.id);
    const backupCodes = generateBackupCodes(10);

    // Return setup info (not saved yet - user must confirm)
    return NextResponse.json({
      success: true,
      qrCode,
      secret,
      backupCodes,
      message: 'Scan the QR code with your authenticator app, then confirm with a 6-digit code',
    });
  } catch (error) {
    console.error('[2fa/setup] error:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA setup' },
      { status: 500 },
    );
  }
}
