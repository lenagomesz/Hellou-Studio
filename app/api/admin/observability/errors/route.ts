import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('operational_errors')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os erros.' }, { status: 500 });
  return NextResponse.json({ errors: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;
  const body = await request.json() as { id?: string; resolved?: boolean };
  if (!body.id) return NextResponse.json({ error: 'Erro não informado.' }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from('operational_errors')
    .update({ resolved_at: body.resolved === false ? null : new Date().toISOString() })
    .eq('id', body.id);
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar o erro.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
