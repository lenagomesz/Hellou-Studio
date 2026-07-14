import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  badRequest,
  isCategory,
  notFound,
  requireAdmin,
  requirePermission,
  serverError,
} from '@/lib/api';
import type { Product, ProductOption } from '@/types/database';

type ProductWithOptions = Product & { product_options: ProductOption[] };

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('products')
    .select('*, product_options(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) return serverError('Erro ao buscar produto');
  if (!data) return notFound('Produto não encontrado');

  return NextResponse.json({ product: data as ProductWithOptions });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await ctx.params;
    console.log('[products-patch] updating product:', id);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('JSON inválido');
    }

    const input = (body ?? {}) as {
      name?: string;
      description?: string | null;
      category?: string;
      base_price?: number;
      sale_price?: number | null;
      image_url?: string | null;
      images?: string[] | null;
      active?: boolean;
      fulfillment_mode?: string;
    };

    const update: Record<string, unknown> = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) return badRequest('Nome não pode ser vazio');
      update.name = input.name.trim();
    }
    if (input.description !== undefined) {
      update.description = input.description?.trim() || null;
    }
    if (input.category !== undefined) {
      if (!isCategory(input.category)) return badRequest('Categoria inválida');
      update.category = input.category;
    }
    if (input.fulfillment_mode !== undefined) {
      if (!['made_to_order', 'ready_stock', 'hybrid'].includes(input.fulfillment_mode)) return badRequest('Modo de produção inválido');
      update.fulfillment_mode = input.fulfillment_mode;
    }
    if (input.base_price !== undefined) {
      if (typeof input.base_price !== 'number' || input.base_price < 0) {
        return badRequest('Preço base inválido');
      }
      update.base_price = input.base_price;
    }
    if (input.sale_price !== undefined) {
      update.sale_price = input.sale_price;
    }
    if (input.image_url !== undefined) {
      update.image_url = input.image_url?.trim() || null;
    }
    if (input.images !== undefined) {
      update.images = input.images;
    }
    if (input.active !== undefined) {
      update.active = !!input.active;
    }

    if (Object.keys(update).length === 0) {
      return badRequest('Nenhum campo para atualizar');
    }

    update.updated_at = new Date().toISOString();

    console.log('[products-patch] update payload:', update);

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('products')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[products-patch] db error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: `Erro ao atualizar produto: ${error.message}` },
        { status: 400 }
      );
    }
    if (!data) {
      console.error('[products-patch] product not found after update:', id);
      return notFound('Produto não encontrado');
    }

    console.log('[products-patch] product updated successfully:', id);

    // Invalidate cache for product pages
    revalidatePath(`/products/${id}`, 'page');
    revalidatePath(`/dashboard/products/${id}`, 'page');

    return NextResponse.json({ product: data as Product });
  } catch (err) {
    console.error('[products-patch] exception:', {
      type: typeof err,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission('products.delete');
    if (auth.response) return auth.response;

    const { id } = await ctx.params;
    console.log('[products-delete] deleting product:', id);

    const admin = getSupabaseAdmin();
    const { error } = await admin.from('products').delete().eq('id', id);

    if (error) {
      console.error('[products-delete] error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: `Erro ao excluir produto: ${error.message}` },
        { status: 400 }
      );
    }

    console.log('[products-delete] product deleted successfully:', id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[products-delete] exception:', {
      type: typeof err,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}` },
      { status: 500 }
    );
  }
}
