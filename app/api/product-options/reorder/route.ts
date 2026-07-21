import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireAdmin, serverError } from '@/lib/api';

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { product_id, option_ids } = (body ?? {}) as {
    product_id?: string;
    option_ids?: string[];
  };

  if (!product_id) return badRequest('product_id é obrigatório');
  if (!Array.isArray(option_ids) || option_ids.length === 0) {
    return badRequest('Informe as variações na ordem desejada');
  }
  if (new Set(option_ids).size !== option_ids.length) {
    return badRequest('A lista contém variações repetidas');
  }

  const admin = getSupabaseAdmin();
  const { data: currentOptions, error: readError } = await admin
    .from('product_options')
    .select('id')
    .eq('product_id', product_id);

  if (readError) return serverError('Erro ao conferir as variações');

  const currentIds = new Set((currentOptions ?? []).map((option) => option.id));
  if (currentIds.size !== option_ids.length || option_ids.some((id) => !currentIds.has(id))) {
    return badRequest('A lista precisa conter todas as variações deste produto');
  }

  const results = await Promise.all(
    option_ids.map((id, index) =>
      admin
        .from('product_options')
        .update({ sort_order: index * 10 })
        .eq('id', id)
        .eq('product_id', product_id),
    ),
  );

  if (results.some(({ error }) => error)) {
    return serverError('Erro ao salvar a ordem das variações');
  }

  return NextResponse.json({ ok: true });
}
