import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, serverError } from '@/lib/api';

// GET /api/admin/products/export - Export products as CSV
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data: products, error } = await admin
    .from('products')
    .select('id, name, base_price, category, active, created_at')
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar produtos para export');

  // Build CSV
  const headers = ['id', 'name', 'base_price', 'category', 'active', 'created_at'];
  const rows = (products ?? []).map((p: Record<string, unknown>) => {
    return [
      p.id,
      `"${String(p.name ?? '').replace(/"/g, '""')}"`,
      p.base_price,
      p.category,
      p.active ? 'true' : 'false',
      p.created_at,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
