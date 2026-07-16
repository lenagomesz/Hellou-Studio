import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireAdmin, serverError } from '@/lib/api';

// GET /api/admin/products/saved-filters - List saved filters for current user
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('saved_filters')
    .select('*')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar filtros salvos');

  return NextResponse.json({ filters: data ?? [] });
}

// POST /api/admin/products/saved-filters - Save a new filter
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { name, filters } = (body ?? {}) as {
    name?: string;
    filters?: Record<string, unknown>;
  };

  if (!name?.trim()) return badRequest('Nome do filtro é obrigatório');
  if (!filters) return badRequest('Filtros sao obrigatorios');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('saved_filters')
    .insert({
      name: name.trim(),
      filters,
      user_id: auth.user!.id,
    })
    .select('*')
    .single();

  if (error) return serverError('Erro ao salvar filtro');

  return NextResponse.json({ filter: data }, { status: 201 });
}

// DELETE /api/admin/products/saved-filters - Delete a saved filter
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return badRequest('ID do filtro é obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('saved_filters')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user!.id);

  if (error) return serverError('Erro ao deletar filtro');

  return new NextResponse(null, { status: 204 });
}
