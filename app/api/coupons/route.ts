import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, serverError, badRequest } from '@/lib/api';

export async function GET() {
  const auth = await requirePermission('marketing.manage');
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
  try {
    const auth = await requirePermission('marketing.manage');
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
    const exclusiveUserEmail = typeof body.exclusive_user_email === 'string' ? body.exclusive_user_email.trim().toLowerCase() : '';
    const bonusTitle = typeof body.bonus_title === 'string' ? body.bonus_title.trim() : '';
    const bonusDescription = typeof body.bonus_description === 'string' ? body.bonus_description.trim() : '';
    const showInBonusArea = body.show_in_bonus_area === true;

    if (!Number.isFinite(discount_value) || discount_value < 0) return badRequest('Valor do desconto inválido');
    if (discount_type === 'percent' && discount_value > 100) return badRequest('O desconto percentual não pode ultrapassar 100%');
    if (!Number.isFinite(min_purchase) || min_purchase < 0) return badRequest('Compra mínima inválida');
    if (max_uses !== null && (!Number.isInteger(max_uses) || max_uses < 1)) return badRequest('Limite de usos inválido');
    if (discount_value === 0 && !free_shipping) return badRequest('Informe um desconto ou ative o frete grátis');

    console.log('[coupons-post] creating coupon:', { code, discount_type, discount_value, min_purchase, max_uses, free_shipping, expires_at });

    const admin = getSupabaseAdmin();
    let exclusiveUserId: string | null = null;
    if (exclusiveUserEmail) {
      const { data: exclusiveUser } = await admin.from('users').select('id').eq('email', exclusiveUserEmail).maybeSingle();
      if (!exclusiveUser) return badRequest('Cliente não encontrado para o e-mail informado');
      exclusiveUserId = exclusiveUser.id;
    }
    const { data, error } = await admin
      .from('coupons')
      .insert({ code, discount_type, discount_value, min_purchase, max_uses, free_shipping, expires_at, exclusive_user_id: exclusiveUserId, bonus_title: bonusTitle || null, bonus_description: bonusDescription || null, show_in_bonus_area: showInBonusArea })
      .select()
      .single();

    if (error) {
      console.error('[coupons-post] db error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      if (error.code === '23505') return badRequest('Já existe um cupom com este código');
      return NextResponse.json({ error: `Erro ao criar cupom: ${error.message}` }, { status: 400 });
    }

    console.log('[coupons-post] coupon created successfully:', data.id);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[coupons-post] exception:', {
      type: typeof err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePermission('marketing.manage');
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

  if (typeof body.discount_value === 'number' && (!Number.isFinite(body.discount_value) || body.discount_value < 0)) return badRequest('Valor do desconto inválido');
  if (typeof body.min_purchase === 'number' && (!Number.isFinite(body.min_purchase) || body.min_purchase < 0)) return badRequest('Compra mínima inválida');
  if (typeof body.max_uses === 'number' && (!Number.isInteger(body.max_uses) || body.max_uses < 1)) return badRequest('Limite de usos inválido');

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
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return badRequest('ID é obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('coupons').delete().eq('id', id);
  if (error) return serverError('Erro ao excluir cupom');

  return NextResponse.json({ ok: true });
}
