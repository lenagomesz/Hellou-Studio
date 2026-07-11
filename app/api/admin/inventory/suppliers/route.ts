import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const admin = getSupabaseAdmin();
    const includeInactive = req.nextUrl.searchParams.get('include_inactive') === 'true';

    let query = admin
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) return serverError('Erro ao buscar fornecedores');

    // For each supplier, get product count and recent on-time delivery stats
    const suppliersWithStats = await Promise.all(
      (data ?? []).map(async (supplier) => {
        const { count: productCount } = await admin
          .from('product_suppliers')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', supplier.id);

        const { data: reorderTasks } = await admin
          .from('reorder_tasks')
          .select('estimated_arrival, actual_arrival')
          .eq('supplier_id', supplier.id)
          .eq('status', 'received')
          .not('estimated_arrival', 'is', null)
          .not('actual_arrival', 'is', null)
          .limit(20);

        let onTimeRate = null;
        if (reorderTasks && reorderTasks.length > 0) {
          const onTime = reorderTasks.filter(
            t => new Date(t.actual_arrival!) <= new Date(t.estimated_arrival!)
          ).length;
          onTimeRate = Math.round((onTime / reorderTasks.length) * 100);
        }

        return {
          ...supplier,
          product_count: productCount ?? 0,
          on_time_delivery_rate: onTimeRate,
        };
      })
    );

    return NextResponse.json({ suppliers: suppliersWithStats });
  } catch (err) {
    console.error('[inventory/suppliers] GET error:', err);
    return serverError('Erro ao buscar fornecedores');
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, contact_name, email, phone, website, address, lead_time_days, notes } = body;

    if (!name || !name.trim()) {
      return badRequest('name is required');
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('suppliers')
      .insert({
        name: name.trim(),
        contact_name: contact_name || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        lead_time_days: lead_time_days || 7,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return serverError('Erro ao criar fornecedor');

    return NextResponse.json({ success: true, supplier: data });
  } catch (err) {
    console.error('[inventory/suppliers] POST error:', err);
    return serverError('Erro ao criar fornecedor');
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { supplier_id, ...updates } = body;

    if (!supplier_id) return badRequest('supplier_id is required');

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('suppliers')
      .update(updates)
      .eq('id', supplier_id);

    if (error) return serverError('Erro ao atualizar fornecedor');

    return NextResponse.json({ success: true, message: 'Fornecedor atualizado' });
  } catch (err) {
    console.error('[inventory/suppliers] PATCH error:', err);
    return serverError('Erro ao atualizar fornecedor');
  }
}
