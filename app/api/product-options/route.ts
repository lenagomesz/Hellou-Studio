import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, notFound, requireAdmin, serverError } from '@/lib/api';
import type { ProductOption } from '@/types/database';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { product_id, name, price_modifier, stock, dimensions, color, image_url } = (body ?? {}) as {
    product_id?: string;
    name?: string;
    price_modifier?: number;
    stock?: number;
    dimensions?: string;
    color?: string;
    image_url?: string;
  };

  if (!product_id) return badRequest('product_id é obrigatório');
  if (!name || !name.trim()) return badRequest('Nome é obrigatório');

  const modifier = price_modifier ?? 0;
  if (typeof modifier !== 'number') return badRequest('price_modifier inválido');

  const stockValue = stock ?? 0;
  if (typeof stockValue !== 'number' || stockValue < 0 || !Number.isInteger(stockValue)) {
    return badRequest('Estoque inválido');
  }

  const admin = getSupabaseAdmin();

  const { data: product } = await admin
    .from('products')
    .select('id')
    .eq('id', product_id)
    .maybeSingle();

  if (!product) return notFound('Produto não encontrado');

  const { data, error } = await admin
    .from('product_options')
    .insert({
      product_id,
      name: name.trim(),
      price_modifier: modifier,
      stock: stockValue,
      dimensions: dimensions?.trim() || null,
      color: color?.trim() || null,
      image_url: image_url?.trim() || null,
    })
    .select('*')
    .single();

  if (error || !data) return serverError('Erro ao criar variação');

  return NextResponse.json({ option: data as ProductOption }, { status: 201 });
}
