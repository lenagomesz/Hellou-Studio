import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, serverError, badRequest } from '@/lib/api';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar cupons');
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json();
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) return badRequest('Código é obrigatório');

  const discount_type = body.discount_type === 'percent' ? 'percent' : 'fixed';
  const discount_value = typeof body.discount_value === 'number' ? body.discount_value : 0;
  const min_purchase = typeof body.min_purchase === 'number' ? body.min_purchase : 0;
  const max_uses = typeof body.max_uses === 'number' ? body.max_uses : null;
  const free_shipping = body.free_shipping === true;
  const expires_at = typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('coupons')
    .insert({ code, discount_type, discount_value, min_purchase, max_uses, free_shipping, expires_at })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return badRequest('Já existe um cupom com este código');
    return serverError('Erro ao criar cupom');
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return badRequest('ID é obrigatório');

  const updates: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') updates.active = body.active;
  if (typeof body.discount_value === 'number') updates.discount_value = body.discount_value;
  if (typeof body.min_purchase === 'number') updates.min_purchase = body.min_purchase;
  if (typeof body.max_uses === 'number') updates.max_uses = body.max_uses;
  if (body.max_uses === null) updates.max_uses = null;
  if (typeof body.free_shipping === 'boolean') updates.free_shipping = body.free_shipping;
  if (typeof body.expires_at === 'string') updates.expires_at = body.expires_at || null;
  if (body.expires_at === null) updates.expires_at = null;

  if (Object.keys(updates).length === 0) return badRequest('Nenhum campo para atualizar');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('coupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return serverError('Erro ao atualizar cupom');
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return badRequest('ID é obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('coupons').delete().eq('id', id);
  if (error) return serverError('Erro ao excluir cupom');

  return NextResponse.json({ ok: true });
}
