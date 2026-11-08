import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { geminiQuotaResponse } from '@/lib/ai/quota-response';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHANNEL_URL, THEMES, generateChannelCaption, generateScheduledChannelPosts, productLink, productPrice, type ChannelTheme } from '@/lib/whatsapp-channel';

export const runtime = 'nodejs';
export const maxDuration = 60;

function invalid(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }
function validTheme(value: unknown): value is ChannelTheme { return typeof value === 'string' && THEMES.includes(value as ChannelTheme); }

export async function GET() {
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;
  const admin = getSupabaseAdmin();
  const [{ data: posts, error: postsError }, { data: schedule, error: scheduleError }, { data: catalog, error: catalogError }] = await Promise.all([
    admin.from('whatsapp_channel_posts').select('*').order('scheduled_at', { ascending: false, nullsFirst: false }).limit(150),
    admin.from('whatsapp_channel_schedule').select('*').order('weekday'),
    admin.from('products').select('id,name,image_url').eq('active', true).eq('type', 'physical').gt('base_price', 0).not('image_url', 'is', null).order('created_at', { ascending: false }).limit(150),
  ]);
  if (postsError || scheduleError || catalogError) return NextResponse.json({ error: 'Não foi possível carregar a central.' }, { status: 500 });
  const ids = [...new Set((posts ?? []).map((post) => post.product_id).filter((id): id is string => Boolean(id)))];
  const { data: products, error: productError } = ids.length
    ? await admin.from('products').select('id,name,slug,image_url,base_price,sale_price,active').in('id', ids)
    : { data: [], error: null };
  if (productError) return NextResponse.json({ error: 'Não foi possível atualizar os preços.' }, { status: 500 });
  const byId = new Map((products ?? []).map((product) => [product.id, product]));
  return NextResponse.json({ channelUrl: CHANNEL_URL, schedule, catalog, posts: (posts ?? []).map((post) => {
    const product = post.product_id ? byId.get(post.product_id) : null;
    const currentPrice = product?.active ? productPrice(product) : null;
    return { ...post, product_available: Boolean(product?.active), price_changed: post.status !== 'published' && currentPrice !== null && Number(post.product_price) !== currentPrice, product_name: product?.name ?? post.product_name, product_price: post.status === 'published' ? post.product_price : currentPrice, product_url: product?.active ? productLink(product) : null, image_url: product?.image_url ?? post.image_url };
  }) });
}

export async function POST(request: Request) {
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { action?: string; theme?: unknown; productId?: string } | null;
  if (!body) return invalid('JSON inválido.');
  if (body.action === 'generate') {
    try { return NextResponse.json({ created: await generateScheduledChannelPosts() }); }
    catch (error) { return geminiQuotaResponse(error) ?? NextResponse.json({ error: 'Não foi possível gerar a programação.' }, { status: 503 }); }
  }
  if (body.action !== 'draft' || !validTheme(body.theme)) return invalid('Ação ou tema inválido.');
  if (!body.productId) return invalid('Selecione um produto real.');
  const admin = getSupabaseAdmin();
  const { data: product, error } = await admin.from('products').select('id,name,slug,description,image_url,base_price,sale_price,created_at').eq('id', body.productId).eq('active', true).eq('type', 'physical').single();
  if (error || !product || !product.image_url || Number(product.base_price) <= 0) return invalid('Produto indisponível ou sem foto.');
  if (body.theme === 'promotion' && !(product.sale_price != null && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.base_price))) return invalid('Este produto não tem promoção cadastrada.');
  try {
    const caption = await generateChannelCaption(body.theme, product);
    const { data, error: insertError } = await admin.from('whatsapp_channel_posts').insert({ theme: body.theme, product_id: product.id, product_name: product.name, product_price: productPrice(product), product_url: productLink(product), image_url: product.image_url, caption, status: 'draft' }).select('*').single();
    if (insertError) throw insertError;
    return NextResponse.json({ post: data }, { status: 201 });
  } catch (cause) { return geminiQuotaResponse(cause) ?? NextResponse.json({ error: 'Não foi possível gerar o rascunho.' }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { action?: string; id?: string; caption?: string; scheduledAt?: string; weekday?: number; localTime?: string; theme?: unknown; enabled?: boolean } | null;
  if (!body) return invalid('JSON inválido.');
  const admin = getSupabaseAdmin();
  if (body.action === 'schedule') {
    if (!Number.isInteger(body.weekday) || body.weekday! < 0 || body.weekday! > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.localTime ?? '') || !validTheme(body.theme) || typeof body.enabled !== 'boolean') return invalid('Programação inválida.');
    const { error } = await admin.from('whatsapp_channel_schedule').upsert({ weekday: body.weekday, local_time: body.localTime, theme: body.theme, enabled: body.enabled, updated_at: new Date().toISOString() }, { onConflict: 'weekday' });
    return error ? NextResponse.json({ error: 'Erro ao salvar programação.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return invalid('Publicação inválida.');
  const { data: post, error: readError } = await admin.from('whatsapp_channel_posts').select('*').eq('id', body.id).single();
  if (readError || !post) return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
  if (body.action === 'regenerate') {
    if (post.status === 'published') return invalid('Publicação já registrada como publicada.');
    if (!post.product_id) return invalid('Produto original indisponível.');
    const { data: product } = await admin.from('products').select('id,name,slug,description,image_url,base_price,sale_price,created_at').eq('id', post.product_id).eq('active', true).single();
    if (!product) return invalid('Produto original indisponível.');
    try {
      const caption = await generateChannelCaption(post.theme, product);
      const { error } = await admin.from('whatsapp_channel_posts').update({ caption, product_price: productPrice(product), product_name: product.name, product_url: productLink(product), image_url: product.image_url, status: 'draft', approved_at: null, updated_at: new Date().toISOString() }).eq('id', post.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    } catch (cause) { return geminiQuotaResponse(cause) ?? NextResponse.json({ error: 'Não foi possível regenerar.' }, { status: 503 }); }
  }
  if (body.action === 'publish') {
    if (post.status !== 'ready' && post.status !== 'scheduled') return invalid('Aprove a publicação antes de registrar o envio manual.');
    const { error } = await admin.from('whatsapp_channel_posts').update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id);
    return error ? NextResponse.json({ error: 'Erro ao registrar publicação.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (post.status === 'published') return invalid('O histórico publicado não pode ser alterado.');
  if (body.action === 'edit') {
    if (typeof body.caption !== 'string' || !body.caption.trim() || body.caption.length > 1500) return invalid('A legenda deve ter entre 1 e 1500 caracteres.');
    const { error } = await admin.from('whatsapp_channel_posts').update({ caption: body.caption.trim(), status: 'draft', approved_at: null, updated_at: new Date().toISOString() }).eq('id', post.id);
    return error ? NextResponse.json({ error: 'Erro ao editar publicação.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (body.action === 'approve') {
    if (post.product_id) {
      const { data: product } = await admin.from('products').select('id,base_price,sale_price,active,image_url').eq('id', post.product_id).single();
      if (!product?.active || !product.image_url) return invalid('Produto indisponível.');
      if (Number(post.product_price) !== productPrice(product)) return invalid('O preço do produto mudou. Regenere e revise a legenda antes de aprovar.');
    }
    const date = body.scheduledAt ?? post.scheduled_at;
    if (!date || !Number.isFinite(Date.parse(date))) return invalid('Informe data e horário válidos.');
    const status = Date.parse(date) <= Date.now() ? 'ready' : 'scheduled';
    const { error } = await admin.from('whatsapp_channel_posts').update({ status, scheduled_at: new Date(date).toISOString(), approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id);
    return error ? NextResponse.json({ error: 'Erro ao aprovar publicação.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  return invalid('Ação inválida.');
}
