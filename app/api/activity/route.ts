import { NextResponse } from 'next/server';
import { badRequest, requireUser } from '@/lib/api';
import { recordUserActivity, type ActivityEventType } from '@/lib/activity';

const allowedEvents = new Set<ActivityEventType>(['session_start', 'page_view', 'product_view', 'cart', 'checkout']);

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (auth.user.role === 'admin') return NextResponse.json({ ok: true });

  const body = await request.json().catch(() => null) as {
    eventType?: ActivityEventType;
    path?: string;
    entityType?: string;
    entityId?: string;
  } | null;

  if (!body?.eventType || !allowedEvents.has(body.eventType)) return badRequest('Evento inválido');
  if (body.path && (!body.path.startsWith('/') || body.path.length > 500)) return badRequest('Caminho inválido');

  await recordUserActivity({
    userId: auth.user.id,
    eventType: body.eventType,
    path: body.path,
    entityType: body.entityType,
    entityId: body.entityId,
  });

  return NextResponse.json({ ok: true });
}
