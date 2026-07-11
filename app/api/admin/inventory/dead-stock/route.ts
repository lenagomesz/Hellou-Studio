import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getDeadStock } from '@/lib/inventory';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10);
    const deadStock = await getDeadStock(Math.max(30, days));

    return NextResponse.json({ dead_stock: deadStock });
  } catch (err) {
    console.error('[inventory/dead-stock] error:', err);
    return serverError('Erro ao buscar estoque parado');
  }
}
