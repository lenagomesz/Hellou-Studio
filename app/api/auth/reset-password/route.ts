import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, password } = (await req.json()) as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: resetEntry } = await admin
    .from('password_reset_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (!resetEntry) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });
  }

  if (new Date(resetEntry.expires_at) < new Date()) {
    await admin.from('password_reset_tokens').delete().eq('token', token);
    return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await admin
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', resetEntry.user_id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }

  await admin.from('password_reset_tokens').delete().eq('token', token);

  return NextResponse.json({ success: true });
}
