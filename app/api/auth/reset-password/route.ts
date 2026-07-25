import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  const { token, password } = (await req.json()) as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'A senha deve ter entre 8 e 128 caracteres' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: resetEntry } = await admin
    .from('password_reset_tokens')
    .delete()
    .eq('token', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .select('user_id')
    .maybeSingle();

  if (!resetEntry) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await admin.rpc('change_password_after_reset', {
    p_user_id: resetEntry.user_id,
    p_password_hash: passwordHash,
  });

  if (error) {
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
