import { NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { generateStockCSV } from '@/lib/inventory';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const csv = await generateStockCSV();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="estoque_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error('[inventory/export] error:', err);
    return serverError('Erro ao exportar estoque');
  }
}
