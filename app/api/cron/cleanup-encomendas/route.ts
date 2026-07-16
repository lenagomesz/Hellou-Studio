import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { captureOperationalError, finishCronRun, startCronRun } from '@/lib/observability';
import { requireAdmin } from '@/lib/api';

const DAYS_AFTER_DELIVERY = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isCron = Boolean(process.env.CRON_SECRET)
    && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
  }

  const cronRun = await startCronRun('cleanup-encomendas');

  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000).toISOString();

  const { data: requests } = await admin
    .from('print_requests')
    .select('product_id')
    .eq('status', 'delivered')
    .lt('updated_at', cutoff)
    .not('product_id', 'is', null);

  if (!requests || requests.length === 0) {
    await finishCronRun(cronRun, { status: 'success', processedCount: 0 });
    return NextResponse.json({ deleted: 0 });
  }

  const productIds = requests
    .map((r: { product_id: string | null }) => r.product_id)
    .filter(Boolean) as string[];

  if (productIds.length === 0) {
    await finishCronRun(cronRun, { status: 'success', processedCount: 0 });
    return NextResponse.json({ deleted: 0 });
  }

  const { error } = await admin
    .from('products')
    .delete()
    .in('id', productIds)
    .eq('category', 'encomenda');

  if (error) {
    await finishCronRun(cronRun, { status: 'failed', error });
    await captureOperationalError({ fingerprint: 'cron-cleanup-encomendas', category: 'cron.failed', title: 'Falha na limpeza de encomendas antigas', error, route: '/api/cron/cleanup-encomendas', alert: true });
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }

  await finishCronRun(cronRun, { status: 'success', processedCount: productIds.length });
  return NextResponse.json({ deleted: productIds.length });
}

export const GET = POST;
