import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { generateStockCSV } from '@/lib/inventory';
import { getStoreDateKey } from '@/lib/store-time';

export async function GET() {
  const auth = await requirePermission('inventory.manage');
  if (auth.response) return auth.response;

  try {
    const csv = await generateStockCSV();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="estoque_${getStoreDateKey()}.csv"`,
      },
    });
  } catch (err) {
    console.error('[inventory/export] error:', err);
    return serverError('Erro ao exportar estoque');
  }
}
