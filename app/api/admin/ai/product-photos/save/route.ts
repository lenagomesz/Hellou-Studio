import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { MAX_PRODUCT_IMAGES, productGallery } from '@/lib/ai/product-photo';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  let body: { productId?: string; urls?: string[]; makeCoverUrl?: string | null };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  if (!body.productId || !Array.isArray(body.urls) || body.urls.length === 0 || body.urls.length > 4) {
    return NextResponse.json({ error: 'Selecione de 1 a 4 fotos aprovadas.' }, { status: 400 });
  }
  const prefix = `/api/product-images/product-images/ai-generated/${body.productId}/`;
  const urls = [...new Set(body.urls)];
  const paths = urls.map((url) => {
    if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.slice('/api/product-images/'.length));
    const storagePrefix = `product-images/ai-generated/${body.productId}/`;
    const fileName = path.slice(storagePrefix.length);
    return path.startsWith(storagePrefix) && /^[a-f0-9-]+\.(png|jpg|webp)$/i.test(fileName) ? path : null;
  });
  if (paths.some((path) => !path)) {
    return NextResponse.json({ error: 'Uma das fotos aprovadas não pertence a este produto.' }, { status: 400 });
  }
  if (body.makeCoverUrl && !urls.includes(body.makeCoverUrl)) {
    return NextResponse.json({ error: 'A capa precisa estar entre as fotos aprovadas.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: product, error } = await admin.from('products')
    .select('id,image_url,image_url_2,images')
    .eq('id', body.productId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Não foi possível consultar o produto.' }, { status: 500 });
  if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  const files = await Promise.all(paths.map((path) => admin.storage.from('products').download(path!)));
  if (files.some((file) => file.error || !file.data)) {
    return NextResponse.json({ error: 'Uma das fotos aprovadas não está mais disponível. Gere-a novamente.' }, { status: 400 });
  }

  const current = productGallery(product);
  const cover = body.makeCoverUrl || current[0] || urls[0];
  const gallery = [...new Set([cover, ...current, ...urls])];
  if (gallery.length > MAX_PRODUCT_IMAGES) {
    return NextResponse.json({
      error: `Este produto ficaria com ${gallery.length} fotos. O limite é ${MAX_PRODUCT_IMAGES}; remova algumas fotos antes de salvar.`,
    }, { status: 400 });
  }

  const { error: updateError } = await admin.from('products').update({
    image_url: cover,
    images: gallery,
    updated_at: new Date().toISOString(),
  }).eq('id', product.id);
  if (updateError) return NextResponse.json({ error: 'Não foi possível adicionar as fotos ao produto.' }, { status: 500 });

  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${product.id}`);
  revalidatePath(`/dashboard/products/${product.id}`);
  return NextResponse.json({ gallery, added: urls.length, cover });
}
