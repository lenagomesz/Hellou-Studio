import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, notFound, requireAdmin, serverError } from '@/lib/api';
import type { ProductCategory } from '@/types/database';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await context.params;

  let body: { name?: string; color?: string; active?: boolean; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return badRequest('Nome da categoria é obrigatório');
    if (name.length > 60) return badRequest('O nome deve ter no máximo 60 caracteres');
    update.name = name;
  }
  if (body.active !== undefined) update.active = Boolean(body.active);
  if (body.color !== undefined) {
    const color = body.color.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(color)) return badRequest('Cor da categoria inválida');
    update.color = color;
  }
  if (body.sort_order !== undefined) {
    if (!Number.isInteger(body.sort_order)) return badRequest('A ordem deve ser um número inteiro');
    update.sort_order = body.sort_order;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('product_categories')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return serverError('Erro ao atualizar categoria');
  if (!data) return notFound('Categoria não encontrada');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/stl');
  return NextResponse.json({ category: data as ProductCategory });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const admin = getSupabaseAdmin();

  const { data: category } = await admin
    .from('product_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!category) return notFound('Categoria não encontrada');
  if (category.is_system) return badRequest('Categorias padrão do sistema não podem ser excluídas');

  const { count } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', category.slug);
  if ((count ?? 0) > 0) return badRequest('Mova os produtos desta categoria antes de excluí-la');

  const { error } = await admin.from('product_categories').delete().eq('id', id);
  if (error) return serverError('Erro ao excluir categoria');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/stl');
  return new NextResponse(null, { status: 204 });
}
