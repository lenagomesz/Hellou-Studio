import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

const TABLES = {
  returns: 'return_requests',
  pages: 'content_pages',
  fiscal: 'fiscal_documents',
} as const;

type Entity = keyof typeof TABLES;

function getEntity(request: NextRequest): Entity | null {
  const entity = request.nextUrl.searchParams.get('entity');
  return entity && entity in TABLES ? entity as Entity : null;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(
    getEntity(request) === 'pages' ? 'settings.manage' : getEntity(request) === 'fiscal' ? 'finance.view' : 'orders.manage',
  );
  if (auth.response) return auth.response;
  const entity = getEntity(request);
  if (!entity) return badRequest('Entidade inválida.');

  const { data, error } = await getSupabaseAdmin()
    .from(TABLES[entity])
    .select(entity === 'returns' ? '*, orders(id, total, status, users(name, email))' : entity === 'fiscal' ? '*, orders(id, total, status)' : '*')
    .order(entity === 'pages' ? 'sort_order' : 'created_at', { ascending: entity === 'pages' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const entity = getEntity(request);
  const auth = await requirePermission(entity === 'pages' ? 'settings.manage' : entity === 'fiscal' ? 'finance.view' : 'orders.manage');
  if (auth.response) return auth.response;
  if (!entity) return badRequest('Entidade inválida.');
  const body = await request.json() as Record<string, unknown>;

  let payload: Record<string, unknown>;
  if (entity === 'pages') {
    if (!body.title || !body.slug) return badRequest('Título e slug são obrigatórios.');
    payload = {
      title: String(body.title).trim(),
      slug: String(body.slug).trim().toLowerCase(),
      excerpt: body.excerpt || null,
      content: String(body.content ?? ''),
      seo_title: body.seo_title || null,
      seo_description: body.seo_description || null,
      published: Boolean(body.published),
      sort_order: Number(body.sort_order) || 0,
    };
  } else if (entity === 'returns') {
    if (!body.order_id || !body.reason) return badRequest('Pedido e motivo são obrigatórios.');
    payload = {
      order_id: body.order_id,
      user_id: body.user_id || null,
      kind: body.kind || 'return',
      reason: String(body.reason),
      customer_notes: body.customer_notes || null,
      amount: body.amount === '' || body.amount == null ? null : Number(body.amount),
    };
  } else {
    if (!body.order_id) return badRequest('Pedido é obrigatório.');
    payload = {
      order_id: body.order_id,
      provider: body.provider || 'manual',
      document_type: body.document_type || 'nfe',
      status: body.status || 'pending',
    };
  }

  const { data, error } = await getSupabaseAdmin().from(TABLES[entity]).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const entity = getEntity(request);
  const auth = await requirePermission(entity === 'pages' ? 'settings.manage' : entity === 'fiscal' ? 'finance.view' : 'orders.manage');
  if (auth.response) return auth.response;
  if (!entity) return badRequest('Entidade inválida.');
  const body = await request.json() as Record<string, unknown>;
  if (!body.id) return badRequest('ID obrigatório.');

  const allowed = entity === 'pages'
    ? ['title', 'slug', 'excerpt', 'content', 'seo_title', 'seo_description', 'published', 'sort_order']
    : entity === 'returns'
      ? ['kind', 'status', 'reason', 'customer_notes', 'admin_notes', 'amount', 'approved_at', 'received_at', 'refunded_at']
      : ['status', 'provider', 'document_type', 'external_id', 'access_key', 'document_number', 'series', 'xml_url', 'pdf_url', 'error_message', 'issued_at'];
  const payload = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key]]));
  payload.updated_at = new Date().toISOString();

  const { data, error } = await getSupabaseAdmin().from(TABLES[entity]).update(payload).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}
