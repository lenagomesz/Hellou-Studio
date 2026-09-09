import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getMercadoLivreConnection } from '@/lib/mercado-livre';
import { getMercadoLivreConfig } from '@/lib/mercado-livre-config';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    getMercadoLivreConfig('https://helloustudio.com.br/api/admin/mercado-livre/status');
    const connection = await getMercadoLivreConnection(auth.user.id);
    return NextResponse.json({
      connected: Boolean(connection),
      account: connection ? {
        userId: connection.ml_user_id,
        nickname: connection.ml_nickname,
        expiresAt: connection.expires_at,
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao consultar a conexão.' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const { error } = await getSupabaseAdmin()
    .from('mercado_livre_connections')
    .delete()
    .eq('admin_user_id', auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disconnected: true });
}
