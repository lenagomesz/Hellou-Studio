import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getStockForecast } from '@/lib/inventory';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const productOptionId = req.nextUrl.searchParams.get('product_option_id') || undefined;
    const forecasts = await getStockForecast(productOptionId);

    return NextResponse.json({ forecasts });
  } catch (err) {
    console.error('[inventory/forecast] error:', err);
    return serverError('Erro ao gerar previsao de estoque');
  }
}
