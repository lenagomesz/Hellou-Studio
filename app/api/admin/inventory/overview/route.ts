import { NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getStockOverview, getInventoryDashboardSummary } from '@/lib/inventory';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const [overview, summary] = await Promise.all([
      getStockOverview(),
      getInventoryDashboardSummary(),
    ]);

    return NextResponse.json({ overview, summary });
  } catch (err) {
    console.error('[inventory/overview] error:', err);
    return serverError('Erro ao buscar visao geral do estoque');
  }
}
