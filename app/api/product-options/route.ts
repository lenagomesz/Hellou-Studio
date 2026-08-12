import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, notFound, requireAdmin, serverError } from '@/lib/api';
import type { ProductOption } from '@/types/database';
import { normalizeProductColor } from '@/lib/product-colors';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { product_id, name, price_modifier, stock, dimensions, notes, color, image_url, active } = (body ?? {}) as {
    product_id?: string;
    name?: string;
    price_modifier?: number;
    stock?: number;
    dimensions?: string;
    notes?: string;
    color?: string;
    image_url?: string;
    active?: boolean;
  };

  if (!product_id) return badRequest('product_id é obrigatório');
  if (!name?.trim() && !color?.trim()) return badRequest('Informe um nome ou uma cor');
  const normalizedColor = normalizeProductColor(color);
  if (color?.trim() && !normalizedColor) return badRequest('Escolha uma cor da paleta ou informe um código hexadecimal válido');

  const modifier = price_modifier ?? 0;
  if (typeof modifier !== 'number') return badRequest('price_modifier inválido');

  const stockValue = stock ?? 0;
  if (typeof stockValue !== 'number' || stockValue < 0 || !Number.isInteger(stockValue)) {
    return badRequest('Estoque inválido');
  }
  if (active !== undefined && typeof active !== 'boolean') {
    return badRequest('Status inválido');
  }

  const admin = getSupabaseAdmin();

  const { data: product } = await admin
    .from('products')
    .select('id')
    .eq('id', product_id)
    .maybeSingle();

  if (!product) return notFound('Produto não encontrado');

  const { data: lastOption, error: orderError } = await admin
    .from('product_options')
    .select('sort_order')
    .eq('product_id', product_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) return serverError('Erro ao calcular a ordem da variação');

  const { data, error } = await admin
    .from('product_options')
    .insert({
      product_id,
      name: name?.trim() || '',
      price_modifier: modifier,
      stock: stockValue,
      dimensions: dimensions?.trim() || null,
      notes: notes?.trim() || null,
      color: normalizedColor,
      image_url: image_url?.trim() || null,
      active: active ?? true,
      sort_order: (lastOption?.sort_order ?? -10) + 10,
    })
    .select('*')
    .single();

  if (error || !data) return serverError('Erro ao criar variação');

  return NextResponse.json({ option: data as ProductOption }, { status: 201 });
}
