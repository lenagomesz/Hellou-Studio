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

  const { data: resetEntry, error: tokenError } = await admin
    .from('password_reset_tokens')
    .select('user_id')
    .eq('token', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (tokenError || !resetEntry) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error: rpcError } = await admin.rpc('change_password_after_reset', {
    p_user_id: resetEntry.user_id,
    p_password_hash: passwordHash,
  });

  // Ambientes que ainda não aplicaram a migration da função RPC precisam
  // continuar conseguindo trocar a senha. O service role mantém este fallback
  // restrito ao servidor e o token só é consumido depois da atualização.
  if (rpcError) {
    const { data: updatedUser, error: updateError } = await admin
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resetEntry.user_id)
      .select('id')
      .maybeSingle();

    if (updateError || !updatedUser) {
      console.error('[reset-password] password update failed:', {
        rpcCode: rpcError.code,
        updateCode: updateError?.code,
      });
      return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
    }

    // Invalida sessões quando a função de segurança já existir no banco.
    await admin.rpc('revoke_user_sessions', { p_user_id: resetEntry.user_id });
  }

  const { error: consumeError } = await admin
    .from('password_reset_tokens')
    .delete()
    .eq('token', tokenHash);

  if (consumeError) {
    console.error('[reset-password] token cleanup failed:', { code: consumeError.code });
  }

  return NextResponse.json({ success: true });
}
