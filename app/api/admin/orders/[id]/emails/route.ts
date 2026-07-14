import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission('orders.manage');
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin()
    .from('email_delivery_logs')
    .select('id, email_type, recipient_masked, subject, status, attempt_count, provider_email_id, sent_at, delivered_at, failed_at, last_error_message, created_at, updated_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Não foi possível consultar os e-mails.' }, { status: 500 });
  return NextResponse.json({ emails: data ?? [] });
}
