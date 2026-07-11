import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { recordStockMovement } from '@/lib/inventory';
import type { ReorderTaskStatus } from '@/types/inventory';

const VALID_STATUSES: ReorderTaskStatus[] = ['pending', 'ordered', 'in_transit', 'received', 'canceled'];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const admin = getSupabaseAdmin();
    const status = req.nextUrl.searchParams.get('status');
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    let query = admin
      .from('reorder_tasks')
      .select('*, product:products(name), option:product_options(name), supplier:suppliers(name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && VALID_STATUSES.includes(status as ReorderTaskStatus)) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) return serverError('Erro ao buscar tarefas de reposicao');

    return NextResponse.json({
      tasks: data ?? [],
      pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (err) {
    console.error('[inventory/reorder-tasks] GET error:', err);
    return serverError('Erro ao buscar tarefas de reposicao');
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { product_id, product_option_id, supplier_id, quantity_ordered, estimated_arrival, cost_total, notes } = body;

    if (!product_id || !quantity_ordered || quantity_ordered <= 0) {
      return badRequest('product_id and quantity_ordered (> 0) are required');
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('reorder_tasks')
      .insert({
        product_id,
        product_option_id: product_option_id || null,
        supplier_id: supplier_id || null,
        quantity_ordered,
        estimated_arrival: estimated_arrival || null,
        cost_total: cost_total || null,
        notes: notes || null,
        created_by: auth.user!.id,
      })
      .select()
      .single();

    if (error) return serverError('Erro ao criar tarefa de reposicao');

    return NextResponse.json({ success: true, task: data });
  } catch (err) {
    console.error('[inventory/reorder-tasks] POST error:', err);
    return serverError('Erro ao criar tarefa de reposicao');
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { task_id, status, quantity_received, notes } = body;

    if (!task_id) return badRequest('task_id is required');

    const admin = getSupabaseAdmin();

    // Get current task
    const { data: task, error: fetchError } = await admin
      .from('reorder_tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (fetchError || !task) return badRequest('Task not found');

    const updates: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) updates.status = status;
    if (typeof quantity_received === 'number') updates.quantity_received = quantity_received;
    if (notes !== undefined) updates.notes = notes;

    // If marking as received, record stock movement
    if (status === 'received' && task.product_option_id) {
      const qtyReceived = quantity_received || task.quantity_ordered;
      updates.quantity_received = qtyReceived;
      updates.actual_arrival = new Date().toISOString();

      await recordStockMovement({
        product_id: task.product_id,
        product_option_id: task.product_option_id,
        quantity_change: qtyReceived,
        reason: 'reposicao',
        notes: `Reorder task ${task_id} received`,
        user_id: auth.user!.id,
        reference_id: task_id,
      });
    }

    const { error: updateError } = await admin
      .from('reorder_tasks')
      .update(updates)
      .eq('id', task_id);

    if (updateError) return serverError('Erro ao atualizar tarefa');

    return NextResponse.json({ success: true, message: 'Tarefa atualizada' });
  } catch (err) {
    console.error('[inventory/reorder-tasks] PATCH error:', err);
    return serverError('Erro ao atualizar tarefa de reposicao');
  }
}
