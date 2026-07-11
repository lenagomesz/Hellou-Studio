import { NextResponse } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const admin = getSupabaseAdmin();

    const { data: warehouses, error } = await admin
      .from('warehouses')
      .select('*')
      .eq('active', true)
      .order('is_default', { ascending: false });

    if (error) return serverError('Erro ao buscar armazens');

    // Get stock summary per warehouse
    const warehousesWithStock = await Promise.all(
      (warehouses ?? []).map(async (wh) => {
        const { data: stockData } = await admin
          .from('warehouse_stock')
          .select('quantity')
          .eq('warehouse_id', wh.id);

        const totalUnits = (stockData ?? []).reduce((sum, s) => sum + s.quantity, 0);
        const totalItems = stockData?.length ?? 0;

        return {
          ...wh,
          total_units: totalUnits,
          total_items: totalItems,
        };
      })
    );

    return NextResponse.json({ warehouses: warehousesWithStock });
  } catch (err) {
    console.error('[inventory/warehouses] GET error:', err);
    return serverError('Erro ao buscar armazens');
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, address, city, state, zip_code } = body;

    if (!name || !name.trim()) {
      return badRequest('name is required');
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('warehouses')
      .insert({
        name: name.trim(),
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zip_code || null,
      })
      .select()
      .single();

    if (error) return serverError('Erro ao criar armazem');

    return NextResponse.json({ success: true, warehouse: data });
  } catch (err) {
    console.error('[inventory/warehouses] POST error:', err);
    return serverError('Erro ao criar armazem');
  }
}
