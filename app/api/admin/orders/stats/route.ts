import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { getOrderQuickStats } from '@/lib/order-management';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const stats = await getOrderQuickStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[order-stats] error:', err);
    return NextResponse.json({ error: 'Erro ao buscar estatisticas' }, { status: 500 });
  }
}
