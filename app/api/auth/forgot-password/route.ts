import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: user } = await admin
    .from('users')
    .select('id, email, name')
    .eq('email', email.toLowerCase().trim())
    .single();

  // Always return success to avoid email enumeration
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await admin.from('password_reset_tokens').delete().eq('user_id', user.id);

  const { error: insertError } = await admin.from('password_reset_tokens').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('[forgot-password] insert token error:', insertError);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  await sendPasswordResetEmail(user.email, user.name, token);

  return NextResponse.json({ success: true });
}
