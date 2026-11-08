import { geminiClient } from '@/lib/ai/gemini-client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getStoreDateKey, getStoreDayBounds } from '@/lib/store-time';

export const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDj6zBCMY0F5F5aGQ0J';
export const THEMES = ['product', 'poll', 'gift', 'behind_scenes', 'decor', 'seasonal', 'promotion'] as const;
export type ChannelTheme = typeof THEMES[number];

type Product = { id: string; name: string; slug: string | null; description: string | null; image_url: string | null; base_price: number; sale_price: number | null; created_at: string };
type Schedule = { id: string; weekday: number; local_time: string; theme: ChannelTheme; enabled: boolean };

export function productPrice(product: Pick<Product, 'base_price' | 'sale_price'>) {
  const base = Number(product.base_price);
  const sale = product.sale_price == null ? null : Number(product.sale_price);
  return sale !== null && sale > 0 && sale < base ? sale : base;
}

export function productLink(product: Pick<Product, 'slug' | 'id'>) {
  return `https://helloustudio.com.br/products/${encodeURIComponent(product.slug || product.id)}`;
}

export function slotForDate(date: Date, localTime: string) {
  const [hour, minute] = localTime.split(':').map(Number);
  const { start } = getStoreDayBounds(date);
  return new Date(start.getTime() + (hour * 60 + minute) * 60_000).toISOString();
}

export function weekdayForDate(date: Date) {
  const [year, month, day] = getStoreDateKey(date).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function chooseProduct(products: Product[], recentlyUsed: Set<string>) {
  return products.filter((product) => !recentlyUsed.has(product.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

const schema = {
  type: 'object',
  properties: { caption: { type: 'string' } },
  required: ['caption'],
};

export async function generateChannelCaption(theme: ChannelTheme, product: Product | null) {
  const facts = product ? {
    name: product.name,
    description: product.description,
    price: productPrice(product),
    link: productLink(product),
    promotion: product.sale_price != null && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.base_price),
  } : null;
  const prompt = JSON.stringify({ theme, product: facts, channel: 'WhatsApp', language: 'pt-BR' });
  const system = 'Escreva uma legenda curta, natural e persuasiva para o Canal da Hellou Studio. Use somente os fatos fornecidos. Nunca invente preço, promoção, estoque, medida, material, prazo ou benefício. NÃO escreva preços nem links: o sistema acrescentará os valores reais depois. Para enquete, escreva uma pergunta e 2 a 4 alternativas; não afirme que a enquete foi criada no WhatsApp. Para bastidores, fale genericamente sem inventar detalhes de produção. Use no máximo 2 emojis. Retorne JSON com caption.';
  const { text } = await geminiClient.generateContent(prompt, system, schema);
  const parsed = JSON.parse(text) as { caption?: unknown };
  if (typeof parsed.caption !== 'string' || !parsed.caption.trim()) throw new Error('Legenda inválida da IA');
  const body = parsed.caption.trim().replace(/https?:\/\/\S+/g, '').trim().slice(0, 1200);
  if (!product) return body;
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productPrice(product));
  return `${body}\n\n${price}\n${productLink(product)}`;
}

export async function generateScheduledChannelPosts(now = new Date()) {
  const admin = getSupabaseAdmin();
  const [{ data: schedules, error: scheduleError }, { data: products, error: productError }, { data: recent, error: recentError }] = await Promise.all([
    admin.from('whatsapp_channel_schedule').select('*').eq('enabled', true),
    admin.from('products').select('id,name,slug,description,image_url,base_price,sale_price,created_at').eq('active', true).eq('type', 'physical').gt('base_price', 0).not('image_url', 'is', null).order('created_at', { ascending: false }).limit(150),
    admin.from('whatsapp_channel_posts').select('product_id,scheduled_at').gte('created_at', new Date(now.getTime() - 21 * 86400_000).toISOString()),
  ]);
  if (scheduleError || productError || recentError) throw new Error('Não foi possível consultar a programação e o catálogo');
  const candidates = (products ?? []) as Product[];
  const used = new Set<string>((recent ?? []).map((post) => post.product_id).filter((id): id is string => Boolean(id)));
  const created: string[] = [];
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now.getTime() + offset * 86400_000);
    for (const schedule of (schedules ?? []) as Schedule[]) {
      if (weekdayForDate(day) !== schedule.weekday) continue;
      const scheduledAt = slotForDate(day, schedule.local_time);
      if (new Date(scheduledAt) <= now) continue;
      const { data: existing, error: existingError } = await admin.from('whatsapp_channel_posts').select('id').eq('schedule_id', schedule.id).eq('scheduled_at', scheduledAt).maybeSingle();
      if (existingError) throw existingError;
      if (existing) continue;
      const eligible = schedule.theme === 'promotion'
        ? candidates.filter((product) => product.sale_price != null && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.base_price))
        : candidates;
      const product = chooseProduct(eligible, used);
      if (!product) continue;
      const caption = await generateChannelCaption(schedule.theme, product);
      const { data, error } = await admin.from('whatsapp_channel_posts').insert({
        schedule_id: schedule.id, theme: schedule.theme, product_id: product.id,
        product_name: product.name, product_price: productPrice(product), product_url: productLink(product),
        image_url: product.image_url, caption, scheduled_at: scheduledAt, status: 'draft',
      }).select('id').single();
      if (error && error.code !== '23505') throw error;
      if (data) { created.push(data.id); used.add(product.id); }
    }
  }
  return created;
}

export async function notifyDueChannelPosts(now = new Date()) {
  const admin = getSupabaseAdmin();
  const nextDay = new Date(now.getTime() + 86400_000);
  const { data, error } = await admin.from('whatsapp_channel_posts').select('id,status').lte('scheduled_at', nextDay.toISOString()).is('notified_at', null).in('status', ['draft', 'scheduled']).limit(30);
  if (error) throw error;
  let count = 0;
  for (const post of data ?? []) {
    const { data: claimed, error: claimError } = await admin.from('whatsapp_channel_posts').update({ notified_at: now.toISOString(), status: post.status === 'scheduled' ? 'ready' : 'draft' }).eq('id', post.id).is('notified_at', null).select('id').maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    const { error: notificationError } = await admin.from('admin_notifications').insert({ type: 'whatsapp_channel', title: post.status === 'scheduled' ? 'Publicação pronta para o Canal WhatsApp' : 'Rascunho do Canal WhatsApp para revisar', body: 'Abra a Central de WhatsApp para copiar a legenda e a foto. Confirme manualmente após publicar.', priority: 'normal' });
    if (notificationError) {
      await admin.from('whatsapp_channel_posts').update({ notified_at: null, status: post.status }).eq('id', post.id);
      throw notificationError;
    }
    count++;
  }
  return count;
}
