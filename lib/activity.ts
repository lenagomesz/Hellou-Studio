import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

export type ActivityEventType =
  | 'login'
  | 'session_start'
  | 'page_view'
  | 'product_view'
  | 'cart'
  | 'checkout'
  | 'order'
  | 'print_request';

export async function recordUserActivity(input: {
  userId: string;
  eventType: ActivityEventType;
  path?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const [, eventResult] = await Promise.all([
    admin.from('users').update({ last_seen_at: now }).eq('id', input.userId),
    admin.from('user_activity_events').insert({
      user_id: input.userId,
      event_type: input.eventType,
      path: input.path?.slice(0, 500) || null,
      entity_type: input.entityType?.slice(0, 80) || null,
      entity_id: input.entityId?.slice(0, 160) || null,
      metadata: input.metadata ?? {},
      created_at: now,
    }),
  ]);

  if (eventResult.error) {
    // A aplicação continua funcionando antes de a migration ser aplicada.
    console.warn('[activity] Não foi possível registrar o evento:', eventResult.error.message);
  }
}
