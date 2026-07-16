import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createTimelineEvent } from '@/lib/order-management';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return badRequest('orderId obrigatório');

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('order_notes')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const { orderId, content } = body as { orderId: string; content: string };

  if (!orderId || !content?.trim()) {
    return badRequest('orderId e content sao obrigatorios');
  }

  const admin = getSupabaseAdmin();
  const adminName = auth.user.name ?? auth.user.email;

  const { data, error } = await admin
    .from('order_notes')
    .insert({
      order_id: orderId,
      author_id: auth.user.id,
      author_name: adminName,
      content: content.trim(),
      is_internal: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar nota' }, { status: 500 });
  }

  // Add timeline event
  await createTimelineEvent({
    orderId,
    status: 'note_added',
    changedBy: auth.user.id,
    changedByName: adminName,
    message: `Nota: "${content.trim().slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
    metadata: { note_id: data.id },
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const noteId = req.nextUrl.searchParams.get('noteId');
  if (!noteId) return badRequest('noteId obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('order_notes').delete().eq('id', noteId);

  if (error) {
    return NextResponse.json({ error: 'Erro ao deletar nota' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
