import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireAdmin, serverError } from '@/lib/api';
import type { ProductCategory } from '@/types/database';

function createSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('product_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return serverError('Erro ao buscar categorias');
  return NextResponse.json({ categories: (data ?? []) as ProductCategory[] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: { name?: string; slug?: string; color?: string; active?: boolean; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const name = body.name?.trim();
  const slug = createSlug(body.slug?.trim() || name || '');
  const color = body.color?.toUpperCase() || '#EC4899';
  if (!name) return badRequest('Nome da categoria é obrigatório');
  if (!slug) return badRequest('Identificador da categoria é inválido');
  if (name.length > 60) return badRequest('O nome deve ter no máximo 60 caracteres');
  if (!/^#[0-9A-F]{6}$/.test(color)) return badRequest('Cor da categoria inválida');

  const { data, error } = await getSupabaseAdmin()
    .from('product_categories')
    .insert({
      name,
      slug,
      color,
      active: body.active ?? true,
      sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 0,
    })
    .select('*')
    .single();

  if (error?.code === '23505') return badRequest('Já existe uma categoria com esse nome ou identificador');
  if (error || !data) return serverError('Erro ao criar categoria');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/stl');
  return NextResponse.json({ category: data as ProductCategory }, { status: 201 });
}
