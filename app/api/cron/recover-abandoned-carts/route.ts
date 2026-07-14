import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { recoverAbandonedCarts } from '@/lib/cart-recovery';
import { captureOperationalError, finishCronRun, startCronRun } from '@/lib/observability';

export async function POST(request: Request) {
  const isCron = Boolean(process.env.CRON_SECRET)
    && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
  }

  const cronRun = await startCronRun('recover-abandoned-carts');
  try {
    const result = await recoverAbandonedCarts();
    await finishCronRun(cronRun, { status: 'success', processedCount: result.processed });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await finishCronRun(cronRun, { status: 'failed', error });
    await captureOperationalError({
      fingerprint: 'recover-abandoned-carts',
      category: 'cron.failed',
      title: 'Falha ao recuperar carrinhos abandonados',
      error,
      route: '/api/cron/recover-abandoned-carts',
      severity: 'error',
      alert: true,
    });
    return NextResponse.json({ success: false, error: 'Não foi possível processar os carrinhos.' }, { status: 500 });
  }
}

export const GET = POST;
