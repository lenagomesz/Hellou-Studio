import { NextResponse } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { createBroadcastNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { title, body: messageBody, target_user_id } = (body ?? {}) as {
    title?: string;
    body?: string;
    target_user_id?: string;
  };

  if (!title?.trim()) {
    return badRequest('Título é obrigatório');
  }

  try {
    await createBroadcastNotification(
      title.trim(),
      messageBody?.trim() || null,
      target_user_id || null,
    );
  } catch {
    return serverError('Erro ao enviar notificação');
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
