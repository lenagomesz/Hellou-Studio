import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { durableRateLimit } from '@/lib/durable-rate-limit';
import { processProductSEO } from '@/lib/ai/product-seo-worker';

export const maxDuration = 60;

export async function GET() {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { data, error, count } = await getSupabaseAdmin().from('product_seo_jobs')
    .select('product_id,attempts,available_at,last_error,products(name)', { count: 'exact' }).order('created_at').limit(50);
  if (error) return NextResponse.json({ error: 'Aplique a migração de SEO para ativar a fila.' }, { status: 503 });
  return NextResponse.json({ jobs: data, total: count, configured: Boolean(process.env.GOOGLE_GENAI_API_KEY) });
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const limit = await durableRateLimit(request, `product-seo:${auth.user.id}`, { maxRequests: 30, windowMs: 3600_000 });
  if (!limit.success) return NextResponse.json({ error: 'Limite de lotes atingido. Tente mais tarde.' }, { status: 429 });
  try { return NextResponse.json(await processProductSEO()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'SEO indisponível' }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  if (typeof body?.productId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.productId)) return NextResponse.json({ error: 'Produto inválido' }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from('product_seo_jobs')
    .update({ revision: crypto.randomUUID(), attempts: 0, available_at: new Date().toISOString(), last_error: null })
    .eq('product_id', body.productId).gte('attempts', 3).lte('available_at', new Date().toISOString()).select('product_id');
  if (error || !data?.length) return NextResponse.json({ error: 'Item não disponível para reenvio; aguarde o término da tentativa atual.' }, { status: 409 });
  return NextResponse.json({ success: true });
}
