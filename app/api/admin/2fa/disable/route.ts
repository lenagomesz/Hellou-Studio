import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verify2FA } from '@/lib/2fa';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const user = auth.user;

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can disable 2FA' },
      { status: 403 },
    );
  }

  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required to disable 2FA' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('two_fa_secret, two_fa_enabled')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[2fa/disable] user fetch error:', userError);
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

    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    const isValid = verify2FA(userData.two_fa_secret!, normalizedCode);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid code. Cannot disable 2FA.' },
        { status: 400 },
      );
    }

    const { error: updateError } = await admin
      .from('users')
      .update({
        two_fa_enabled: false,
        two_fa_secret: null,
        two_fa_backup_codes: null,
        two_fa_last_verified_at: null,
        two_fa_backup_codes_generated_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[2fa/disable] update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    });
  } catch (error) {
    console.error('[2fa/disable] error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 },
    );
  }
}
