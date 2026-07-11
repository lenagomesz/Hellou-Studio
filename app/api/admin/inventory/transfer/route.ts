import { NextResponse } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { recordStockMovement } from '@/lib/inventory';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { product_option_id, from_warehouse_id, to_warehouse_id, quantity, notes } = body;

    if (!product_option_id || !from_warehouse_id || !to_warehouse_id) {
      return badRequest('product_option_id, from_warehouse_id, and to_warehouse_id are required');
    }
    if (!quantity || quantity <= 0) {
      return badRequest('quantity must be greater than 0');
    }
    if (from_warehouse_id === to_warehouse_id) {
      return badRequest('Source and destination warehouses must be different');
    }

    const admin = getSupabaseAdmin();

    // Check source warehouse stock
    const { data: sourceStock } = await admin
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('warehouse_id', from_warehouse_id)
      .eq('product_option_id', product_option_id)
      .single();

    if (!sourceStock || sourceStock.quantity < quantity) {
      return badRequest(`Insufficient stock in source warehouse. Available: ${sourceStock?.quantity ?? 0}`);
    }

    // Get product_id
    const { data: option } = await admin
      .from('product_options')
      .select('product_id')
      .eq('id', product_option_id)
      .single();

    if (!option) return badRequest('Product option not found');

    // Decrease source warehouse stock
    await admin
      .from('warehouse_stock')
      .update({ quantity: sourceStock.quantity - quantity })
      .eq('id', sourceStock.id);

    // Increase destination warehouse stock (upsert)
    const { data: destStock } = await admin
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('warehouse_id', to_warehouse_id)
      .eq('product_option_id', product_option_id)
      .single();

    if (destStock) {
      await admin
        .from('warehouse_stock')
        .update({ quantity: destStock.quantity + quantity })
        .eq('id', destStock.id);
    } else {
      await admin
        .from('warehouse_stock')
        .insert({
          warehouse_id: to_warehouse_id,
          product_option_id,
          quantity,
        });
    }

    // Record stock movement (transfer)
    await recordStockMovement({
      product_id: option.product_id,
      product_option_id,
      quantity_change: 0, // net change is 0 for the total stock
      reason: 'transferencia',
      notes: notes || `Transfer ${quantity} units from warehouse ${from_warehouse_id} to ${to_warehouse_id}`,
      user_id: auth.user!.id,
      warehouse_id: from_warehouse_id,
    });

    return NextResponse.json({
      success: true,
      message: `${quantity} unidades transferidas com sucesso`,
    });
  } catch (err) {
    console.error('[inventory/transfer] error:', err);
    return serverError('Erro ao transferir estoque');
  }
}
