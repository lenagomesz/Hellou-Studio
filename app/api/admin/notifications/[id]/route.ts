import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'JSON inválido' },
      { status: 400 },
    );
  }

  const { read, archived } = (body ?? {}) as {
    read?: boolean;
    archived?: boolean;
  };

  const admin = getSupabaseAdmin();
  const update: Record<string, unknown> = {};

  if (read !== undefined) update.read = read;
  if (archived !== undefined) update.archived = archived;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: 'Nenhum campo para atualizar' },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from('admin_notifications')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação' },
      { status: 500 },
    );
  }

  return NextResponse.json({ notification: data });
}
