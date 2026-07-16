import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requirePermission, serverError } from '@/lib/api';

const DEFAULT_TAG_COLOR = '#8B5CF6';

function validColor(value: string) {
  return /^#[0-9A-F]{6}$/.test(value);
}

function revalidateCatalog() {
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/stl');
}

// GET /api/admin/products/tags - List all tags
export async function GET(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('product_tags')
    .select('*')
    .order('name');

  if (error) return serverError('Erro ao buscar tags');

  const productId = new URL(request.url).searchParams.get('product_id');
  if (!productId) {
    const { data: assignments } = await admin.from('product_tag_assignments').select('tag_id');
    const counts = new Map<string, number>();
    for (const assignment of assignments ?? []) counts.set(assignment.tag_id, (counts.get(assignment.tag_id) ?? 0) + 1);
    return NextResponse.json({ tags: (data ?? []).map((tag) => ({ ...tag, product_count: counts.get(tag.id) ?? 0 })), assigned_tag_ids: [] });
  }

  const { data: assignments, error: assignmentError } = await admin
    .from('product_tag_assignments')
    .select('tag_id')
    .eq('product_id', productId);
  if (assignmentError) return serverError('Erro ao buscar tags do produto');

  return NextResponse.json({
    tags: data ?? [],
    assigned_tag_ids: (assignments ?? []).map((item) => item.tag_id),
  });
}

// POST /api/admin/products/tags - Create a new tag
export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { name, color } = (body ?? {}) as { name?: string; color?: string };

  const normalizedName = name?.trim() ?? '';
  const normalizedColor = (color || DEFAULT_TAG_COLOR).toUpperCase();
  if (!normalizedName) return badRequest('Nome da tag é obrigatório');
  if (normalizedName.length > 40) return badRequest('O nome da tag deve ter no máximo 40 caracteres');
  if (!validColor(normalizedColor)) return badRequest('Cor da tag inválida');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('product_tags')
    .insert({ name: normalizedName, color: normalizedColor })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return badRequest('Tag já existe');
    return serverError('Erro ao criar tag');
  }

  revalidateCatalog();
  return NextResponse.json({ tag: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { id?: string; name?: string; color?: string } | null;
  const id = body?.id;
  const name = body?.name?.trim() ?? '';
  const color = body?.color?.toUpperCase() ?? '';
  if (!id) return badRequest('ID da tag é obrigatório');
  if (!name || name.length > 40) return badRequest('Informe um nome de até 40 caracteres');
  if (!validColor(color)) return badRequest('Cor da tag inválida');

  const { data, error } = await getSupabaseAdmin()
    .from('product_tags')
    .update({ name, color, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error?.code === '23505') return badRequest('Tag já existe');
  if (error || !data) return serverError('Erro ao atualizar tag');
  revalidateCatalog();
  return NextResponse.json({ tag: data });
}

// DELETE /api/admin/products/tags - Delete a tag
export async function DELETE(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return badRequest('ID da tag é obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('product_tags').delete().eq('id', id);

  if (error) return serverError('Erro ao deletar tag');

  revalidateCatalog();
  return new NextResponse(null, { status: 204 });
}

// PATCH /api/admin/products/tags - Assign/remove tags from products
export async function PATCH(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { action, product_ids, tag_ids } = (body ?? {}) as {
    action?: 'assign' | 'remove' | 'replace';
    product_ids?: string[];
    tag_ids?: string[];
  };

  if (!action || !['assign', 'remove', 'replace'].includes(action)) {
    return badRequest('Ação de tags inválida');
  }
  if (!product_ids?.length) return badRequest('product_ids é obrigatório');
  if (!Array.isArray(tag_ids) || (action !== 'replace' && tag_ids.length === 0)) return badRequest('tag_ids é obrigatório');

  const admin = getSupabaseAdmin();

  if (tag_ids.length > 0) {
    const { data: validTags, error: tagError } = await admin
      .from('product_tags')
      .select('id')
      .in('id', tag_ids);
    if (tagError || (validTags ?? []).length !== new Set(tag_ids).size) return badRequest('Uma ou mais tags são inválidas');
  }

  if (action === 'replace') {
    const { error: removeError } = await admin
      .from('product_tag_assignments')
      .delete()
      .in('product_id', product_ids);
    if (removeError) return serverError('Erro ao atualizar tags');
    if (tag_ids.length > 0) {
      const assignments = product_ids.flatMap((pid) => tag_ids.map((tid) => ({ product_id: pid, tag_id: tid })));
      const { error } = await admin.from('product_tag_assignments').insert(assignments);
      if (error) return serverError('Erro ao atribuir tags');
    }
  } else if (action === 'assign') {
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

  revalidateCatalog();
  return NextResponse.json({ success: true });
}
