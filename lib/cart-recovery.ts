import { createHash } from 'crypto';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendTrackedEmail } from '@/lib/email-delivery';
import { preBuiltTemplates, renderTemplate } from '@/lib/email-marketing/templates';
import { normalizeEmailBaseUrl } from '@/lib/email-links';

type Automation = {
  id: string;
  subject: string | null;
  body_html: string | null;
  delay_minutes: number;
  trigger_conditions: Record<string, unknown> | null;
  total_sent: number;
};

type CartRow = {
  id: string;
  user_id: string;
  product_id: string;
  product_option_id: string | null;
  quantity: number;
  updated_at: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

export function cartSignature(items: CartRow[]) {
  const content = [...items]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => `${item.id}:${item.quantity}:${item.updated_at}`)
    .join('|');
  return createHash('sha256').update(content).digest('hex');
}

export function calculateRecoveryTotal(items: Array<{ quantity: number; basePrice: number; salePrice?: number | null; priceModifier?: number | null }>) {
  return Math.round(items.reduce((total, item) => total + ((item.salePrice ?? item.basePrice) + (item.priceModifier ?? 0)) * item.quantity, 0) * 100) / 100;
}

export async function recoverAbandonedCarts() {
  const admin = getSupabaseAdmin();
  const { data: automationData, error: automationError } = await admin
    .from('email_automations')
    .select('id, subject, body_html, delay_minutes, trigger_conditions, total_sent')
    .eq('trigger_type', 'cart_abandoned')
    .eq('enabled', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (automationError) throw automationError;
  if (!automationData) return { processed: 0, skipped: 0, reason: 'automation_disabled' as const };

  const automation = automationData as Automation;
  const delayMinutes = Math.min(10_080, Math.max(60, automation.delay_minutes || 120));
  const maxAgeDaysValue = Number(automation.trigger_conditions?.max_age_days ?? 7);
  const maxAgeDays = Number.isFinite(maxAgeDaysValue) ? Math.min(30, Math.max(1, maxAgeDaysValue)) : 7;
  const staleBefore = new Date(Date.now() - delayMinutes * 60_000).toISOString();
  const freshAfter = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();

  const { data: cartData, error: cartError } = await admin
    .from('cart_items')
    .select('id, user_id, product_id, product_option_id, quantity, updated_at')
    .lt('updated_at', staleBefore)
    .gte('updated_at', freshAfter)
    .order('updated_at', { ascending: true });
  if (cartError) throw cartError;
  const cartRows = (cartData ?? []) as CartRow[];
  if (!cartRows.length) return { processed: 0, skipped: 0, reason: 'no_abandoned_carts' as const };

  const userIds = [...new Set(cartRows.map((item) => item.user_id))];
  const productIds = [...new Set(cartRows.map((item) => item.product_id))];
  const optionIds = [...new Set(cartRows.map((item) => item.product_option_id).filter((id): id is string => Boolean(id)))];

  const [{ data: users }, { data: products }, { data: options }, { data: orders }] = await Promise.all([
    admin.from('users').select('id, email, name').in('id', userIds).eq('role', 'user'),
    admin.from('products').select('id, name, base_price, sale_price, active').in('id', productIds),
    optionIds.length ? admin.from('product_options').select('id, price_modifier').in('id', optionIds) : Promise.resolve({ data: [] }),
    admin.from('orders').select('user_id, status, created_at').in('user_id', userIds).gte('created_at', freshAfter),
  ]);

  const emails = (users ?? []).map((user) => user.email);
  const { data: preferences } = emails.length ? await admin
    .from('email_preferences')
    .select('email')
    .in('email', emails)
    .eq('subscribed', true)
    .eq('gdpr_consent', true)
    .eq('blacklisted', false) : { data: [] };

  const consentedEmails = new Set((preferences ?? []).map((preference) => preference.email.toLowerCase()));
  const userMap = new Map((users ?? []).map((user) => [user.id, user]));
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  const optionMap = new Map((options ?? []).map((option) => [option.id, option]));
  const template = preBuiltTemplates.find((item) => item.slug === 'abandoned-cart');
  if (!template) throw new Error('Template de carrinho abandonado não encontrado.');

  const grouped = new Map<string, CartRow[]>();
  for (const item of cartRows) grouped.set(item.user_id, [...(grouped.get(item.user_id) ?? []), item]);

  const candidates = [...grouped.entries()].map(([userId, items]) => ({ userId, items, signature: cartSignature(items) }));
  const { data: existingEvents } = await admin
    .from('cart_recovery_events')
    .select('user_id, cart_signature')
    .in('user_id', userIds)
    .eq('recovery_stage', 1);
  const existing = new Set((existingEvents ?? []).map((event) => `${event.user_id}:${event.cart_signature}`));

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { processed: 0, skipped: candidates.length, reason: 'email_provider_unavailable' as const };
  const resend = new Resend(resendKey);
  const baseUrl = normalizeEmailBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const from = process.env.RESEND_FROM_EMAIL || 'helloustudio <onboarding@resend.dev>';
  let processed = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const user = userMap.get(candidate.userId);
    const latestCartUpdate = Math.max(...candidate.items.map((item) => new Date(item.updated_at).getTime()));
    const hasNewerOrder = (orders ?? []).some((order) => order.user_id === candidate.userId
      && new Date(order.created_at).getTime() >= latestCartUpdate
      && !['canceled', 'rejected', 'refunded'].includes(order.status));
    if (!user || !consentedEmails.has(user.email.toLowerCase()) || hasNewerOrder || existing.has(`${candidate.userId}:${candidate.signature}`)) {
      skipped += 1;
      continue;
    }

    const validItems = candidate.items.flatMap((item) => {
      const product = productMap.get(item.product_id);
      if (!product?.active) return [];
      return [{
        ...item,
        name: product.name,
        basePrice: Number(product.base_price),
        salePrice: product.sale_price === null ? null : Number(product.sale_price),
        priceModifier: item.product_option_id ? Number(optionMap.get(item.product_option_id)?.price_modifier ?? 0) : 0,
      }];
    });
    if (!validItems.length) {
      skipped += 1;
      continue;
    }

    const total = calculateRecoveryTotal(validItems);
    const unsubscribeUrl = `${baseUrl}/api/email-marketing/unsubscribe?email=${encodeURIComponent(user.email)}&source=cart-recovery`;
    const variables = {
      customer_name: escapeHtml(user.name || 'Cliente'),
      cart_items: validItems.map((item) => `${escapeHtml(item.name)} × ${item.quantity}`).join('<br>'),
      cart_total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total),
      base_url: baseUrl,
      unsubscribe_url: unsubscribeUrl,
    };
    const subject = renderTemplate(automation.subject || template.subject, variables);
    const renderedHtml = renderTemplate(automation.body_html || template.body_html, variables);
    const unsubscribeLink = `<p style="margin:24px 0 0;text-align:center;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Não quero receber lembretes de carrinho</a></p>`;
    const html = renderedHtml.includes(unsubscribeUrl)
      ? renderedHtml
      : renderedHtml.includes('</body>')
        ? renderedHtml.replace('</body>', `${unsubscribeLink}</body>`)
        : `${renderedHtml}${unsubscribeLink}`;
    const result = await sendTrackedEmail(resend, {
      from,
      to: user.email,
      subject,
      html,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    }, { emailType: 'abandoned_cart', metadata: { itemCount: validItems.length } });

    if (result.error) {
      skipped += 1;
      continue;
    }

    await Promise.all([
      admin.from('cart_recovery_events').insert({
        user_id: candidate.userId,
        automation_id: automation.id,
        cart_signature: candidate.signature,
        recovery_stage: 1,
        item_count: validItems.length,
        cart_total: total,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }),
      admin.from('automation_logs').insert({ automation_id: automation.id, user_id: candidate.userId, email: user.email, status: 'sent' }),
      admin.from('email_automations').update({ total_sent: automation.total_sent + processed + 1 }).eq('id', automation.id),
    ]);
    processed += 1;
  }

  return { processed, skipped, reason: 'completed' as const };
}
