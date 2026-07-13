import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  badRequest,
  getCurrentUser,
  isCategory,
  requireAdmin,
  serverError,
} from '@/lib/api';
import type { Product } from '@/types/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const activeParam = searchParams.get('active');

  if (category && !isCategory(category)) {
    return badRequest('Categoria inválida');
  }

  let includeInactive = false;
  if (activeParam === 'false' || activeParam === 'all') {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    includeInactive = true;
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  } else if (activeParam === 'false') {
    query = query.eq('active', false);
  }

  if (category) query = query.eq('category', category);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query;
  if (error) return serverError('Erro ao buscar produtos');

  return NextResponse.json({ products: (data ?? []) as Product[] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { name, description, category, base_price, sale_price, image_url, images, active, fulfillment_mode } = (body ??
    {}) as {
    name?: string;
    description?: string | null;
    category?: string;
    base_price?: number;
    sale_price?: number | null;
    image_url?: string | null;
    images?: string[] | null;
    active?: boolean;
    fulfillment_mode?: string;
  };

  if (!name || !name.trim()) return badRequest('Nome é obrigatório');
  if (!category || !isCategory(category)) return badRequest('Categoria inválida');
  if (typeof base_price !== 'number' || base_price < 0) {
    return badRequest('Preço base inválido');
  }
  const fulfillmentMode = ['made_to_order', 'ready_stock', 'hybrid'].includes(fulfillment_mode ?? '') ? fulfillment_mode : 'made_to_order';

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('products')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      category,
      base_price,
      sale_price: sale_price ?? null,
      image_url: image_url?.trim() || null,
      images: images ?? null,
      active: active ?? true,
      fulfillment_mode: fulfillmentMode,
    })
    .select('*')
    .single();

  if (error || !data) return serverError('Erro ao criar produto');

  return NextResponse.json({ product: data as Product }, { status: 201 });
}
