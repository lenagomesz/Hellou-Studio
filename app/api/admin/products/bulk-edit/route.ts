import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireAdmin, serverError } from '@/lib/api';

interface BulkEditPayload {
  product_ids: string[];
  changes: {
    base_price?: number;
    active?: boolean;
  };
}

// POST /api/admin/products/bulk-edit - Apply bulk changes to products
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON invalido');
  }

  const { product_ids, changes } = (body ?? {}) as BulkEditPayload;

  if (!product_ids?.length) return badRequest('product_ids e obrigatorio');
  if (!changes || Object.keys(changes).length === 0) {
    return badRequest('Nenhuma alteracao fornecida');
  }

  const admin = getSupabaseAdmin();

  // Build update object
  const update: Record<string, unknown> = {};
  if (changes.base_price !== undefined) update.base_price = changes.base_price;
  if (changes.active !== undefined) update.active = changes.active;
  update.updated_at = new Date().toISOString();

  const { error: updateError, count } = await admin
    .from('products')
    .update(update)
    .in('id', product_ids);

  if (updateError) {
    return serverError('Erro ao atualizar produtos');
  }

  return NextResponse.json({
    success: true,
    results: {
      updated: count ?? product_ids.length,
    },
  });
}
