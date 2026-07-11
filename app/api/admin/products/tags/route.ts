import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireAdmin, serverError } from '@/lib/api';

// GET /api/admin/products/tags - List all tags
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('product_tags')
    .select('*')
    .order('name');

  if (error) return serverError('Erro ao buscar tags');

  return NextResponse.json({ tags: data ?? [] });
}

// POST /api/admin/products/tags - Create a new tag
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON invalido');
  }

  const { name, color } = (body ?? {}) as { name?: string; color?: string };

  if (!name || !name.trim()) return badRequest('Nome da tag e obrigatorio');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('product_tags')
    .insert({ name: name.trim(), color: color || '#6B7280' })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return badRequest('Tag ja existe');
    return serverError('Erro ao criar tag');
  }

  return NextResponse.json({ tag: data }, { status: 201 });
}

// DELETE /api/admin/products/tags - Delete a tag
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return badRequest('ID da tag e obrigatorio');

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('product_tags').delete().eq('id', id);

  if (error) return serverError('Erro ao deletar tag');

  return new NextResponse(null, { status: 204 });
}

// PATCH /api/admin/products/tags - Assign/remove tags from products
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON invalido');
  }

  const { action, product_ids, tag_ids } = (body ?? {}) as {
    action?: 'assign' | 'remove';
    product_ids?: string[];
    tag_ids?: string[];
  };

  if (!action || !['assign', 'remove'].includes(action)) {
    return badRequest('Action deve ser "assign" ou "remove"');
  }
  if (!product_ids?.length) return badRequest('product_ids e obrigatorio');
  if (!tag_ids?.length) return badRequest('tag_ids e obrigatorio');

  const admin = getSupabaseAdmin();

  if (action === 'assign') {
    const assignments = product_ids.flatMap((pid) =>
      tag_ids.map((tid) => ({ product_id: pid, tag_id: tid }))
    );
    const { error } = await admin
      .from('product_tag_assignments')
      .upsert(assignments, { onConflict: 'product_id,tag_id' });

    if (error) return serverError('Erro ao atribuir tags');
  } else {
    for (const pid of product_ids) {
      const { error } = await admin
        .from('product_tag_assignments')
        .delete()
        .eq('product_id', pid)
        .in('tag_id', tag_ids);

      if (error) return serverError('Erro ao remover tags');
    }
  }

  return NextResponse.json({ success: true });
}
