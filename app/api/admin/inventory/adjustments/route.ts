import { NextResponse } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { recordStockMovement } from '@/lib/inventory';
import type { StockMovementReason } from '@/types/inventory';

const VALID_ADJUSTMENT_REASONS: StockMovementReason[] = [
  'ajuste_manual', 'reposicao', 'quebra', 'perda', 'devolucao',
];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { product_option_id, quantity_change, reason, notes, warehouse_id } = body;

    if (!product_option_id) {
      return badRequest('product_option_id is required');
    }
    if (typeof quantity_change !== 'number' || quantity_change === 0) {
      return badRequest('quantity_change must be a non-zero number');
    }
    if (!reason || !VALID_ADJUSTMENT_REASONS.includes(reason)) {
      return badRequest(`reason must be one of: ${VALID_ADJUSTMENT_REASONS.join(', ')}`);
    }

    // Get the product_id from product_option
    const admin = getSupabaseAdmin();
    const { data: option, error: optionError } = await admin
      .from('product_options')
      .select('product_id, stock')
      .eq('id', product_option_id)
      .single();

    if (optionError || !option) {
      return badRequest('Product option not found');
    }

    const result = await recordStockMovement({
      product_id: option.product_id,
      product_option_id,
      quantity_change,
      reason,
      notes: notes || undefined,
      user_id: auth.user!.id,
      warehouse_id: warehouse_id || undefined,
    });

    if (!result.success) {
      return badRequest(result.error || 'Failed to adjust stock');
    }

    return NextResponse.json({
      success: true,
      message: `Estoque ajustado: ${quantity_change > 0 ? '+' : ''}${quantity_change} unidades`,
      new_stock: option.stock + quantity_change,
    });
  } catch (err) {
    console.error('[inventory/adjustments] error:', err);
    return serverError('Erro ao ajustar estoque');
  }
}
