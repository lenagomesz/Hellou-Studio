import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  badRequest,
  isCategory,
  notFound,
  requireAdmin,
  serverError,
} from '@/lib/api';
import type { Product, ProductOption } from '@/types/database';

type ProductWithOptions = Product & { product_options: ProductOption[] };

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('products')
    .select('*, product_options(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) return serverError('Erro ao buscar produto');
  if (!data) return notFound('Produto não encontrado');

  return NextResponse.json({ product: data as ProductWithOptions });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const input = (body ?? {}) as {
    name?: string;
    description?: string | null;
    category?: string;
    base_price?: number;
    image_url?: string | null;
    active?: boolean;
  };

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) return badRequest('Nome não pode ser vazio');
    update.name = input.name.trim();
  }
  if (input.description !== undefined) {
    update.description = input.description?.trim() || null;
  }
  if (input.category !== undefined) {
    if (!isCategory(input.category)) return badRequest('Categoria inválida');
    update.category = input.category;
  }
  if (input.base_price !== undefined) {
    if (typeof input.base_price !== 'number' || input.base_price < 0) {
      return badRequest('Preço base inválido');
    }
    update.base_price = input.base_price;
  }
  if (input.image_url !== undefined) {
    update.image_url = input.image_url?.trim() || null;
  }
  if (input.active !== undefined) {
    update.active = !!input.active;
  }

  if (Object.keys(update).length === 0) {
    return badRequest('Nenhum campo para atualizar');
  }

  update.updated_at = new Date().toISOString();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('products')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return serverError('Erro ao atualizar produto');
  if (!data) return notFound('Produto não encontrado');

  return NextResponse.json({ product: data as Product });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('products').delete().eq('id', id);

  if (error) return serverError('Erro ao excluir produto');

  return new NextResponse(null, { status: 204 });
}
