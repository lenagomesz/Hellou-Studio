import { getSupabaseAdmin } from './supabase';
import type { AdminNotification } from '@/types/database';

export async function createAdminAlert(params: {
  type: string;
  title: string;
  body?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  related_order_id?: string;
  related_product_id?: string;
  related_product_option_id?: string;
}): Promise<AdminNotification | null> {
  const admin = getSupabaseAdmin();

  const { error, data } = await admin
    .from('admin_notifications')
    .insert({
      type: params.type,
      title: params.title,
      body: params.body || null,
      priority: params.priority || 'normal',
      related_order_id: params.related_order_id || null,
      related_product_id: params.related_product_id || null,
      related_product_option_id: params.related_product_option_id || null,
      read: false,
      archived: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[admin-alerts] Error creating alert:', error);
    return null;
  }

  return data;
}
