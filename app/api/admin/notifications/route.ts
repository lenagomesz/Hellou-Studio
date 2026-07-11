import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Number(searchParams.get('limit')) || 20);
  const unreadOnly = searchParams.get('unread') === 'true';
  const type = searchParams.get('type');

  const offset = (page - 1) * limit;

  const admin = getSupabaseAdmin();

  let query = admin
    .from('admin_notifications')
    .select('*', { count: 'exact' })
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    notifications: data,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'JSON inválido' },
      { status: 400 },
    );
  }

  const {
    title,
    body: notifBody,
    type,
    priority,
    related_order_id,
    related_product_id,
    related_product_option_id,
    due_date,
  } = (body ?? {}) as {
    title?: string;
    body?: string;
    type?: string;
    priority?: string;
    related_order_id?: string;
    related_product_id?: string;
    related_product_option_id?: string;
    due_date?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json(
      { error: 'Título é obrigatório' },
      { status: 400 },
    );
  }

  if (!type) {
    return NextResponse.json(
      { error: 'Tipo é obrigatório' },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('admin_notifications')
    .insert({
      title: title.trim(),
      body: notifBody?.trim() || null,
      type,
      priority: priority || 'normal',
      related_order_id: related_order_id || null,
      related_product_id: related_product_id || null,
      related_product_option_id: related_product_option_id || null,
      due_date: due_date || null,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao criar notificação' },
      { status: 500 },
    );
  }

  return NextResponse.json({ notification: data }, { status: 201 });
}
