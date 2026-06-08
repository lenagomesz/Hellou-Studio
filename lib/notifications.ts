import { getSupabaseAdmin } from '@/lib/supabase';
import type { NotificationType } from '@/types/database';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string | null,
  metadata?: Record<string, unknown> | null,
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    metadata: metadata ?? null,
  });
  if (error) console.error('[notifications] create error:', error);
}

export async function createBroadcastNotification(
  title: string,
  body?: string | null,
  targetUserId?: string | null,
) {
  const admin = getSupabaseAdmin();

  if (targetUserId) {
    await createNotification(targetUserId, 'announcement', title, body);
    return;
  }

  const { data: users, error } = await admin.from('users').select('id');
  if (error || !users) {
    console.error('[notifications] broadcast fetch users error:', error);
    return;
  }

  const rows = users.map((u: { id: string }) => ({
    user_id: u.id,
    type: 'announcement' as const,
    title,
    body: body ?? null,
    metadata: null,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await admin.from('notifications').insert(rows);
    if (insertError) console.error('[notifications] broadcast insert error:', insertError);
  }
}
