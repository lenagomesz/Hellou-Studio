import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, serverError } from '@/lib/api';
import { getStoreDateKey } from '@/lib/store-time';

// GET /api/admin/products/export - Export products as CSV
export async function GET() {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data: products, error } = await admin
    .from('products')
    .select('id, name, sku, base_price, sale_price, cost_price, category, type, active, weight_grams, length_cm, width_cm, height_cm, slug, seo_title, seo_description, description, image_url, created_at')
    .neq('category', 'encomenda')
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar produtos para export');

  // Build CSV
  const headers = ['id', 'name', 'sku', 'category', 'type', 'base_price', 'sale_price', 'cost_price', 'weight_grams', 'length_cm', 'width_cm', 'height_cm', 'slug', 'seo_title', 'seo_description', 'description', 'active', 'image_url', 'created_at'];
  const rows = (products ?? []).map((p: Record<string, unknown>) => {
    return [
      p.id,
      `"${String(p.name ?? '').replace(/"/g, '""')}"`,
      p.sku ?? '',
      p.category,
      p.type,
      p.base_price,
      p.sale_price ?? '',
      p.cost_price ?? '',
      p.weight_grams ?? '',
      p.length_cm ?? '',
      p.width_cm ?? '',
      p.height_cm ?? '',
      p.slug ?? '',
      `"${String(p.seo_title ?? '').replace(/"/g, '""')}"`,
      `"${String(p.seo_description ?? '').replace(/"/g, '""')}"`,
      `"${String(p.description ?? '').replace(/"/g, '""')}"`,
      p.active ? 'true' : 'false',
      p.image_url ?? '',
      p.created_at,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products_export_${getStoreDateKey()}.csv"`,
    },
  });
}
