import { NextResponse } from 'next/server';
import { badRequest, notFound, requireUser, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('product_favorites')
    .select('product_id')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return serverError('Não foi possível carregar seus favoritos.');
  return NextResponse.json({ productIds: (data ?? []).map((item) => item.product_id) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  if (!isUuid(productId)) return badRequest('Produto inválido.');

  const admin = getSupabaseAdmin();
  const { data: product, error: productError } = await admin
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();

  if (productError) return serverError('Não foi possível verificar o produto.');
  if (!product) return notFound('Produto não encontrado.');

  const { error } = await admin.from('product_favorites').upsert(
    { user_id: auth.user.id, product_id: productId },
    { onConflict: 'user_id,product_id', ignoreDuplicates: true },
  );
  if (error) return serverError('Não foi possível salvar o favorito.');
  return NextResponse.json({ favorite: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const productId = new URL(request.url).searchParams.get('productId');
  if (!isUuid(productId)) return badRequest('Produto inválido.');

  const { error } = await getSupabaseAdmin()
    .from('product_favorites')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('product_id', productId);

  if (error) return serverError('Não foi possível remover o favorito.');
  return NextResponse.json({ favorite: false });
}
