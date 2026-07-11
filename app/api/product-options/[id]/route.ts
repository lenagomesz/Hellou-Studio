import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, notFound, requireAdmin, serverError } from '@/lib/api';
import type { ProductOption } from '@/types/database';

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
    price_modifier?: number;
    stock?: number;
    dimensions?: string | null;
    color?: string | null;
    image_url?: string | null;
  };

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) return badRequest('Nome não pode ser vazio');
    update.name = input.name.trim();
  }
  if (input.price_modifier !== undefined) {
    if (typeof input.price_modifier !== 'number') {
      return badRequest('price_modifier inválido');
    }
    update.price_modifier = input.price_modifier;
  }
  if (input.stock !== undefined) {
    if (
      typeof input.stock !== 'number' ||
      input.stock < 0 ||
      !Number.isInteger(input.stock)
    ) {
      return badRequest('Estoque inválido');
    }
    update.stock = input.stock;
  }
  if (input.dimensions !== undefined) {
    update.dimensions = input.dimensions?.trim() || null;
  }
  if (input.color !== undefined) {
    update.color = input.color?.trim() || null;
  }
  if (input.image_url !== undefined) {
    update.image_url = input.image_url?.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return badRequest('Nenhum campo para atualizar');
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('product_options')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return serverError('Erro ao atualizar variação');
  if (!data) return notFound('Variação não encontrada');

  return NextResponse.json({ option: data as ProductOption });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('product_options').delete().eq('id', id);

  if (error) return serverError('Erro ao excluir variação');

  return new NextResponse(null, { status: 204 });
}
