import { getSupabaseAdmin } from '@/lib/supabase';
import type {
  SlackEventType,
  SlackNotificationPriority,
  SlackMessage,
  SlackBlock,
  SlackAttachment,
  SlackWebhookConfig,
  SlackEventConfig,
  SlackNotificationPreferences,
} from '@/types/slack';
import { PRIORITY_COLORS, EVENT_TYPE_EMOJI, EVENT_TYPE_LABELS } from '@/types/slack';

// ─── Core: Send message to Slack ────────────────────────────────────────────

export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage,
): Promise<{ ok: boolean; error?: string; ts?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Slack API error: ${res.status} - ${text}` };
    }

    // Incoming webhooks return "ok" as text, not JSON
    return { ok: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: errMsg };
  }
}

// ─── Preferences & Quiet Hours ──────────────────────────────────────────────

export async function getSlackPreferences(): Promise<SlackNotificationPreferences | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('slack_notification_preferences')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('[slack] Error fetching preferences:', error);
    return null;
  }
  return data as SlackNotificationPreferences;
}

export function isInQuietHours(prefs: SlackNotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
  const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ─── Webhook & Event Config ─────────────────────────────────────────────────

export async function getActiveWebhooks(): Promise<SlackWebhookConfig[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('slack_webhooks')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[slack] Error fetching webhooks:', error);
    return [];
  }
  return (data ?? []) as SlackWebhookConfig[];
}

export async function getEventConfigs(webhookId: string): Promise<SlackEventConfig[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('slack_event_configs')
    .select('*')
    .eq('webhook_id', webhookId)
    .eq('enabled', true);

  if (error) {
    console.error('[slack] Error fetching event configs:', error);
    return [];
  }
  return (data ?? []) as SlackEventConfig[];
}

// ─── Rich Message Builders ──────────────────────────────────────────────────

export function buildOrderMessage(
  eventType: SlackEventType,
  data: {
    orderId: string;
    customerName?: string;
    customerEmail?: string;
    total?: number;
    items?: Array<{ name: string; quantity: number; price: number }>;
    reason?: string;
  },
  priority: SlackNotificationPriority,
  mentionTarget?: string | null,
): SlackMessage {
  const emoji = EVENT_TYPE_EMOJI[eventType];
  const label = EVENT_TYPE_LABELS[eventType];
  const color = PRIORITY_COLORS[priority];

  const mention = mentionTarget ? `${mentionTarget} ` : '';
  const headerText = `${emoji} ${mention}*${label}*`;

  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: headerText },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Pedido:*\n#${data.orderId.slice(0, 8)}` },
        { type: 'mrkdwn', text: `*Cliente:*\n${data.customerName ?? data.customerEmail ?? 'N/A'}` },
        ...(data.total != null
          ? [{ type: 'mrkdwn' as const, text: `*Total:*\nR$ ${data.total.toFixed(2)}` }]
          : []),
        { type: 'mrkdwn', text: `*Prioridade:*\n${priority.toUpperCase()}` },
      ],
    },
  ];

  if (data.items && data.items.length > 0) {
    const itemsList = data.items
      .slice(0, 5)
      .map((i) => `- ${i.name} x${i.quantity} (R$ ${i.price.toFixed(2)})`)
      .join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Itens:*\n${itemsList}` },
    });
  }

  if (data.reason) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Motivo:*\n${data.reason}` },
    });
  }

  // Interactive buttons
  blocks.push({
    type: 'actions',
    block_id: `order_actions_${data.orderId}`,
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Ver Pedido', emoji: true },
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/orders/${data.orderId}`,
        action_id: 'view_order',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Marcar em Processamento', emoji: true },
        action_id: 'mark_processing',
        style: 'primary',
        value: data.orderId,
      },
    ],
  });

  const attachments: SlackAttachment[] = [{ color, blocks }];

  return {
    text: `${label}: Pedido #${data.orderId.slice(0, 8)}`,
    attachments,
  };
}

export function buildStockMessage(
  eventType: SlackEventType,
  data: {
    products: Array<{
      name: string;
      currentStock: number;
      reorderPoint: number;
      optionName?: string;
    }>;
  },
  priority: SlackNotificationPriority,
  mentionTarget?: string | null,
): SlackMessage {
  const emoji = EVENT_TYPE_EMOJI[eventType];
  const label = EVENT_TYPE_LABELS[eventType];
  const color = PRIORITY_COLORS[priority];

  const mention = mentionTarget ? `${mentionTarget} ` : '';
  const count = data.products.length;
  const headerText = `${emoji} ${mention}*${label}* - ${count} produto${count > 1 ? 's' : ''}`;

  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: headerText },
    },
  ];

  // Show up to 10 products in the message
  const productsList = data.products.slice(0, 10).map((p) => {
    const optionLabel = p.optionName ? ` (${p.optionName})` : '';
    return `- *${p.name}${optionLabel}*: ${p.currentStock} restantes (ponto reposicao: ${p.reorderPoint})`;
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: productsList.join('\n') },
  });

  if (data.products.length > 10) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `_...e mais ${data.products.length - 10} produtos_` },
    });
  }

  blocks.push({
    type: 'actions',
    block_id: 'stock_actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Ver Estoque', emoji: true },
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/inventory`,
        action_id: 'view_inventory',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Tarefas de Reposicao', emoji: true },
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/inventory/reorder-tasks`,
        action_id: 'view_reorder',
        style: 'primary',
      },
    ],
  });

  return {
    text: `${label}: ${count} produtos precisam de atencao`,
    attachments: [{ color, blocks }],
  };
}

export function buildGenericMessage(
  eventType: SlackEventType,
  data: {
    title: string;
    details?: string;
    fields?: Array<{ label: string; value: string }>;
    actionUrl?: string;
    actionLabel?: string;
  },
  priority: SlackNotificationPriority,
  mentionTarget?: string | null,
): SlackMessage {
  const emoji = EVENT_TYPE_EMOJI[eventType];
  const label = EVENT_TYPE_LABELS[eventType];
  const color = PRIORITY_COLORS[priority];

  const mention = mentionTarget ? `${mentionTarget} ` : '';
  const headerText = `${emoji} ${mention}*${label}*`;

  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: headerText },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${data.title}*${data.details ? `\n${data.details}` : ''}` },
    },
  ];

  if (data.fields && data.fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: data.fields.map((f) => ({
        type: 'mrkdwn' as const,
        text: `*${f.label}:*\n${f.value}`,
      })),
    });
  }

  if (data.actionUrl) {
    blocks.push({
      type: 'actions',
      block_id: `action_${eventType}`,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: data.actionLabel ?? 'Ver Detalhes', emoji: true },
          url: data.actionUrl,
          action_id: 'view_details',
        },
      ],
    });
  }

  return {
    text: `${label}: ${data.title}`,
    attachments: [{ color, blocks }],
  };
}

export function buildDigestMessage(
  events: Array<{
    eventType: SlackEventType;
    summary: string;
    count: number;
  }>,
  period: string,
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `:memo: *Resumo de Notificacoes* (${period})` },
    },
  ];

  for (const event of events) {
    const emoji = EVENT_TYPE_EMOJI[event.eventType];
    const label = EVENT_TYPE_LABELS[event.eventType];
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${label}* (${event.count}x): ${event.summary}`,
      },
    });
  }

  blocks.push({
    type: 'actions',
    block_id: 'digest_actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Ver Dashboard', emoji: true },
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard`,
        action_id: 'view_dashboard',
      },
    ],
  });

  return {
    text: `Resumo: ${events.length} tipos de eventos no periodo ${period}`,
    blocks,
  };
}

// ─── Main Dispatch Function ─────────────────────────────────────────────────

export async function dispatchSlackNotification(
  eventType: SlackEventType,
  payload: Record<string, unknown>,
  options?: {
    threadTs?: string;
    forceSend?: boolean; // bypass quiet hours
  },
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Check preferences
  const prefs = await getSlackPreferences();
  if (!prefs) return;

  // Check quiet hours (unless forced or critical)
  if (!options?.forceSend && isInQuietHours(prefs)) {
    // Queue for digest if digest mode is enabled
    if (prefs.digest_mode_enabled) {
      const webhooks = await getActiveWebhooks();
      for (const webhook of webhooks) {
        const configs = await getEventConfigs(webhook.id);
        const eventConfig = configs.find((c) => c.event_type === eventType);
        if (eventConfig) {
          await admin.from('slack_digest_queue').insert({
            webhook_id: webhook.id,
            event_type: eventType,
            priority: eventConfig.priority,
            payload,
          });
        }
      }
    }
    return;
  }

  // Get all active webhooks
  const webhooks = await getActiveWebhooks();

  for (const webhook of webhooks) {
    const configs = await getEventConfigs(webhook.id);
    const eventConfig = configs.find((c) => c.event_type === eventType);

    // Skip if event not configured or disabled
    if (!eventConfig) continue;

    // Apply filters
    if (eventConfig.min_order_value != null && typeof payload.total === 'number') {
      if (payload.total < eventConfig.min_order_value) continue;
    }
    if (eventConfig.min_stock_threshold != null && typeof payload.currentStock === 'number') {
      if (payload.currentStock > eventConfig.min_stock_threshold) continue;
    }

    // Check bulk threshold - group similar events
    if (prefs.bulk_threshold > 0) {
      const { count } = await admin
        .from('slack_notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_id', webhook.id)
        .eq('event_type', eventType)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if ((count ?? 0) >= prefs.bulk_threshold) {
        // Already too many of this type recently, queue for digest
        await admin.from('slack_digest_queue').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          priority: eventConfig.priority,
          payload,
        });
        continue;
      }
    }

    // Build the message
    let message: SlackMessage;

    if (['new_order', 'order_canceled', 'refund', 'payment_error'].includes(eventType)) {
      message = buildOrderMessage(
        eventType,
        payload as Parameters<typeof buildOrderMessage>[1],
        eventConfig.priority as SlackNotificationPriority,
        eventConfig.mention_target,
      );
    } else if (['low_stock', 'critical_stock'].includes(eventType)) {
      message = buildStockMessage(
        eventType,
        payload as Parameters<typeof buildStockMessage>[1],
        eventConfig.priority as SlackNotificationPriority,
        eventConfig.mention_target,
      );
    } else {
      message = buildGenericMessage(
        eventType,
        payload as Parameters<typeof buildGenericMessage>[1],
        eventConfig.priority as SlackNotificationPriority,
        eventConfig.mention_target,
      );
    }

    // Add thread_ts for threading related events
    if (options?.threadTs) {
      message.thread_ts = options.threadTs;
    }

    // Send it
    const result = await sendSlackMessage(webhook.webhook_url, message);

    // Log it
    await admin.from('slack_notification_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      priority: eventConfig.priority,
      status: result.ok ? 'sent' : 'failed',
      message_ts: result.ts ?? null,
      thread_ts: options?.threadTs ?? null,
      payload,
      response: result.ok ? { ok: true } : null,
      error_message: result.error ?? null,
    });

    // Handle escalation if enabled
    if (prefs.escalation_enabled && eventConfig.priority === 'critical') {
      // Store escalation info for cron job to check
      await admin.from('slack_notification_logs').update({
        response: { escalation_pending: true, escalation_deadline: new Date(Date.now() + prefs.escalation_timeout_minutes * 60 * 1000).toISOString() },
      }).eq('webhook_id', webhook.id).eq('event_type', eventType).is('responded_at', null).order('created_at', { ascending: false }).limit(1);
    }
  }
}

// ─── Digest Processing ──────────────────────────────────────────────────────

export async function processDigestQueue(): Promise<void> {
  const admin = getSupabaseAdmin();
  const prefs = await getSlackPreferences();
  if (!prefs || !prefs.digest_mode_enabled) return;

  // Get queued items grouped by webhook
  const { data: queueItems, error } = await admin
    .from('slack_digest_queue')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !queueItems || queueItems.length === 0) return;

  // Group by webhook_id
  const grouped: Record<string, typeof queueItems> = {};
  for (const item of queueItems) {
    const key = item.webhook_id as string;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  for (const [webhookId, items] of Object.entries(grouped)) {
    // Get webhook
    const { data: webhook } = await admin
      .from('slack_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (!webhook) continue;

    // Group by event type
    const byType: Record<string, typeof items> = {};
    for (const item of items) {
      const et = item.event_type as string;
      if (!byType[et]) byType[et] = [];
      byType[et].push(item);
    }

    const digestEvents = Object.entries(byType).map(([eventType, typeItems]) => ({
      eventType: eventType as SlackEventType,
      summary: `${typeItems.length} evento(s) agrupados`,
      count: typeItems.length,
    }));

    const message = buildDigestMessage(digestEvents, `ultimos ${prefs.digest_interval_minutes}min`);
    const result = await sendSlackMessage(webhook.webhook_url as string, message);

    // Log
    await admin.from('slack_notification_logs').insert({
      webhook_id: webhookId,
      event_type: 'digest' as string,
      priority: 'low',
      status: result.ok ? 'sent' : 'failed',
      payload: { digest: true, event_count: items.length },
      error_message: result.error ?? null,
    });
  }

  // Clear the queue
  const ids = queueItems.map((i) => i.id);
  await admin.from('slack_digest_queue').delete().in('id', ids);
}

// ─── Test Webhook ───────────────────────────────────────────────────────────

export async function testSlackWebhook(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  const message: SlackMessage = {
    text: 'Teste de conexao - Ecommerce 3D',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':white_check_mark: *Conexao com Slack configurada com sucesso!*\n\nVoce recebera notificacoes do Ecommerce 3D neste canal.',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn' as const,
            text: `Enviado em ${new Date().toLocaleString('pt-BR')}`,
          },
        ],
      },
    ],
  };

  return sendSlackMessage(webhookUrl, message);
}
