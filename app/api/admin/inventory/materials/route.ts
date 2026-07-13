import { NextResponse } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

const priorities = new Set(['low', 'normal', 'high', 'urgent']);

function nonNegativeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('inventory_materials')
    .select('*, supplier:suppliers(id, name)')
    .eq('active', true)
    .order('priority', { ascending: false })
    .order('current_weight_grams', { ascending: true });

  if (error) return serverError('Erro ao buscar materiais. Aplique a migration de operações no Supabase.');
  return NextResponse.json({ materials: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const colorName = typeof body.color_name === 'string' ? body.color_name.trim() : '';
  if (!name || !colorName) return badRequest('Nome e cor são obrigatórios');

  const priority = typeof body.priority === 'string' && priorities.has(body.priority) ? body.priority : 'normal';
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('inventory_materials').insert({
    name,
    material_type: typeof body.material_type === 'string' ? body.material_type.trim().toUpperCase() : 'PLA',
    brand: typeof body.brand === 'string' ? body.brand.trim() || null : null,
    color_name: colorName,
    color_hex: typeof body.color_hex === 'string' && /^#[0-9a-f]{6}$/i.test(body.color_hex) ? body.color_hex : '#A1A1AA',
    spool_weight_grams: nonNegativeNumber(body.spool_weight_grams, 1000),
    current_weight_grams: nonNegativeNumber(body.current_weight_grams),
    reserved_weight_grams: nonNegativeNumber(body.reserved_weight_grams),
    reorder_point_grams: nonNegativeNumber(body.reorder_point_grams, 250),
    target_weight_grams: nonNegativeNumber(body.target_weight_grams, 1000),
    cost_per_kg: nonNegativeNumber(body.cost_per_kg),
    priority,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
  }).select('*').single();

  if (error) return serverError(`Erro ao cadastrar material: ${error.message}`);
  return NextResponse.json({ material: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json() as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return badRequest('ID é obrigatório');

  const updates: Record<string, unknown> = {};
  for (const field of ['current_weight_grams', 'reserved_weight_grams', 'reorder_point_grams', 'target_weight_grams', 'cost_per_kg']) {
    if (body[field] !== undefined) updates[field] = nonNegativeNumber(body[field]);
  }
  if (typeof body.priority === 'string' && priorities.has(body.priority)) updates.priority = body.priority;
  if (typeof body.notes === 'string') updates.notes = body.notes.trim() || null;
  if (typeof body.active === 'boolean') updates.active = body.active;
  if (Object.keys(updates).length === 0) return badRequest('Nenhuma alteração enviada');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('inventory_materials').update(updates).eq('id', id).select('*').single();
  if (error) return serverError('Erro ao atualizar material');
  return NextResponse.json({ material: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const body = await request.json() as { id?: string };
  if (!body.id) return badRequest('ID é obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('inventory_materials').update({ active: false }).eq('id', body.id);
  if (error) return serverError('Erro ao arquivar material');
  return NextResponse.json({ ok: true });
}
