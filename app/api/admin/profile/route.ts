import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const user = auth.user;

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('users')
      .select(
        'id, email, name, role, two_fa_enabled, two_fa_last_verified_at, two_fa_backup_codes_generated_at',
      )
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      two_fa_enabled: data.two_fa_enabled,
      two_fa_last_verified_at: data.two_fa_last_verified_at,
      two_fa_backup_codes_generated_at: data.two_fa_backup_codes_generated_at,
    });
  } catch (error) {
    console.error('[admin/profile] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
