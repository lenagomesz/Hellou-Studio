import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getStockMovements } from '@/lib/inventory';
import type { StockMovementReason } from '@/types/inventory';

const VALID_REASONS: StockMovementReason[] = [
  'venda', 'devolucao', 'ajuste_manual', 'reposicao', 'quebra', 'perda', 'transferencia',
];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const params = req.nextUrl.searchParams;
    const product_option_id = params.get('product_option_id') || undefined;
    const product_id = params.get('product_id') || undefined;
    const reason = params.get('reason') as StockMovementReason | null;
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const offset = (page - 1) * limit;

    const { movements, total } = await getStockMovements({
      product_option_id,
      product_id,
      reason: reason && VALID_REASONS.includes(reason) ? reason : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[inventory/movements] error:', err);
    return serverError('Erro ao buscar movimentacoes');
  }
}
