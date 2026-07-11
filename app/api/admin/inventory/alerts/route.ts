import { NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getStockAlerts } from '@/lib/inventory';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const alerts = await getStockAlerts();

    const critical = alerts.filter(a => a.level === 'critical');
    const low = alerts.filter(a => a.level === 'low');

    return NextResponse.json({
      alerts,
      summary: {
        critical: critical.length,
        low: low.length,
        total: alerts.length,
      },
    });
  } catch (err) {
    console.error('[inventory/alerts] error:', err);
    return serverError('Erro ao buscar alertas de estoque');
  }
}
