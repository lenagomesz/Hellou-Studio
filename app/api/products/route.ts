import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  badRequest,
  getCurrentUser,
  isCategory,
  requirePermission,
  serverError,
} from '@/lib/api';
import type { Product } from '@/types/database';
import { attachProductTags } from '@/lib/product-tags';
import { parseOptionalPrice } from '@/lib/product-filters';
import { normalizeProductCommercialFields, type ProductCommercialInput } from '@/lib/product-commercial';
import {
  normalizeProductCustomizationCopy,
  normalizeProductCustomizationSections,
  type ProductCustomizationCopyInput,
} from '@/lib/product-customization';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const activeParam = searchParams.get('active');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 24));
  const type = searchParams.get('type');
  const minPrice = parseOptionalPrice(searchParams.get('min_price'));
  const maxPrice = parseOptionalPrice(searchParams.get('max_price'));

  if (category && !isCategory(category)) {
    return badRequest('Categoria inválida');
  }

  let includeInactive = false;
  if (activeParam === 'false' || activeParam === 'all') {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    includeInactive = true;
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from('products')
    .select('*, product_options(id, name, stock, price_modifier)', { count: 'exact' })
    .or('category.neq.encomenda,type.eq.digital')
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  } else if (activeParam === 'false') {
    query = query.eq('active', false);
  }

  if (category) query = query.eq('category', category);
  if (search) {
    const safeSearch = search.replace(/[%_,()]/g, ' ').trim();
    if (safeSearch) query = query.or(`name.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%`);
  }
  if (type === 'physical' || type === 'digital') query = query.eq('type', type);
  if (minPrice !== undefined) query = query.gte('base_price', minPrice);
  if (maxPrice !== undefined) query = query.lte('base_price', maxPrice);

  const from = (page - 1) * limit;
  const { data, count, error } = await query.range(from, from + limit - 1);
  if (error) return serverError('Erro ao buscar produtos');

  const products = await attachProductTags((data ?? []) as Product[]);
  return NextResponse.json({
    products,
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const {
    name,
    description,
    category,
    base_price,
    sale_price,
    image_url,
    images,
    active,
    fulfillment_mode,
    is_wholesale,
    minimum_order_quantity,
    is_customizable,
    customization_question,
    customization_help_text,
    customization_placeholder,
    customization_sections,
    options,
    ...commercialInput
  } = (body ??
    {}) as {
    name?: string;
    description?: string | null;
    category?: string;
    base_price?: number;
    sale_price?: number | null;
    image_url?: string | null;
    images?: string[] | null;
    active?: boolean;
    fulfillment_mode?: string;
    is_wholesale?: boolean;
    minimum_order_quantity?: number;
    is_customizable?: boolean;
    options?: Array<{ name: string; dimensions?: string | null; notes?: string | null; color?: string | null; image_url?: string | null; price_modifier?: number; stock?: number; sort_order?: number; active?: boolean }>;
    customization_sections?: unknown;
  } & ProductCommercialInput & ProductCustomizationCopyInput;

  if (active === false) {
    const statusAuth = await requirePermission('products.status.manage');
    if (statusAuth.response) return statusAuth.response;
  }

  if (!name || !name.trim()) return badRequest('Nome é obrigatório');
  if (!category || !isCategory(category)) return badRequest('Categoria inválida');
  if (typeof base_price !== 'number' || base_price < 0) {
    return badRequest('Preço base inválido');
  }
  if (sale_price !== undefined && sale_price !== null && (
    typeof sale_price !== 'number' || !Number.isFinite(sale_price) || sale_price < 0
  )) {
    return badRequest('Preço promocional inválido');
  }
  const fulfillmentMode = ['made_to_order', 'ready_stock', 'hybrid'].includes(fulfillment_mode ?? '') ? fulfillment_mode : 'made_to_order';
  const minimumOrderQuantity = is_wholesale ? minimum_order_quantity : 1;
  if (is_wholesale && (!Number.isInteger(minimumOrderQuantity) || Number(minimumOrderQuantity) < 2 || Number(minimumOrderQuantity) > 999)) {
    return badRequest('Informe uma quantidade mínima entre 2 e 999 unidades');
  }
  let commercialFields;
  try {
    commercialFields = normalizeProductCommercialFields(commercialInput);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Dados comerciais inválidos');
  }
  let customizationCopy;
  let customizationSections;
  try {
    customizationCopy = normalizeProductCustomizationCopy({
      customization_question,
      customization_help_text,
      customization_placeholder,
    });
    customizationSections = normalizeProductCustomizationSections(customization_sections);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Textos de personalização inválidos');
  }

  const admin = getSupabaseAdmin();
  const { data: productCategory } = await admin
    .from('product_categories')
    .select('slug')
    .eq('slug', category)
    .eq('active', true)
    .maybeSingle();
  if (!productCategory) return badRequest('Categoria não encontrada ou inativa');

  const { data, error } = await admin
    .from('products')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      category,
      type: 'physical',
      base_price,
      sale_price: sale_price ?? null,
      image_url: image_url?.trim() || null,
      images: images ?? null,
      active: active ?? true,
      fulfillment_mode: fulfillmentMode,
      is_wholesale: !!is_wholesale,
      minimum_order_quantity: Number(minimumOrderQuantity),
      is_customizable: !!is_customizable,
      ...customizationCopy,
      customization_sections: customizationSections,
      ...commercialFields,
    })
    .select('*')
    .single();

  if (error?.code === '23505') return badRequest('SKU ou slug já está sendo usado por outro produto');
  if (error || !data) return serverError('Erro ao criar produto');

  const validOptions = (options ?? []).filter((option) => option.name?.trim() || option.color?.trim());
  if (validOptions.length > 0) {
    const { error: optionsError } = await admin.from('product_options').insert(validOptions.map((option, index) => ({
      product_id: data.id,
      name: option.name?.trim() || '',
      dimensions: option.dimensions?.trim() || null,
      notes: option.notes?.trim() || null,
      color: option.color?.trim() || null,
      image_url: option.image_url?.trim() || null,
      price_modifier: Number(option.price_modifier ?? 0),
      stock: Math.max(0, Math.trunc(Number(option.stock ?? 0))),
      sort_order: Number.isInteger(option.sort_order) ? option.sort_order : index * 10,
      active: option.active ?? true,
    })));
    if (optionsError) {
      await admin.from('products').delete().eq('id', data.id);
      console.error('[products] option insert error:', optionsError);
      return serverError('Erro ao criar as variações do produto');
    }
  }

  revalidatePath('/');
  revalidatePath('/products');
  return NextResponse.json({ product: data as Product }, { status: 201 });
}
