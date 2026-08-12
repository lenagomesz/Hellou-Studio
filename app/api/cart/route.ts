import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireUser, serverError } from '@/lib/api';
import type { CartItemView } from '@/lib/cart';
import type { CartItem, Product, ProductOption } from '@/types/database';
import { findOwnedDigitalProducts } from '@/lib/digital-purchases';
import {
  countCustomizationLetters,
  getOptionCharacterCount,
  normalizeProductCustomizationSections,
  parseProductCustomizationSelections,
} from '@/lib/product-customization';

type RawCartRow = CartItem & {
  product: Pick<
    Product,
    'id' | 'name' | 'base_price' | 'sale_price' | 'image_url' | 'category' | 'type' | 'active' | 'fulfillment_mode' | 'is_wholesale' | 'minimum_order_quantity'
  > | null;
  option:
    | Pick<ProductOption, 'id' | 'product_id' | 'name' | 'price_modifier' | 'stock' | 'color' | 'image_url'>
    | null;
};

function toView(row: RawCartRow): CartItemView | null {
  if (!row.product) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    product_option_id: row.product_option_id,
    quantity: row.quantity,
    customization_text: row.customization_text ?? null,
    created_at: row.created_at,
    product: {
      id: row.product.id,
      name: row.product.name,
      base_price: row.product.base_price,
      sale_price: row.product.sale_price,
      image_url: row.product.image_url,
      category: row.product.category,
      type: row.product.type,
      fulfillment_mode: row.product.fulfillment_mode,
      is_wholesale: row.product.is_wholesale,
      minimum_order_quantity: row.product.minimum_order_quantity,
    },
    option: row.option
      ? {
          id: row.option.id,
          name: row.option.name,
          price_modifier: row.option.price_modifier,
          stock: row.option.stock,
          color: row.option.color,
          image_url: row.option.image_url,
        }
      : null,
  };
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('cart_items')
    .select(
      'id, user_id, product_id, product_option_id, quantity, customization_text, created_at, product:products(id, name, base_price, sale_price, image_url, category, type, active, fulfillment_mode, is_wholesale, minimum_order_quantity), option:product_options(id, product_id, name, price_modifier, stock, color, image_url)',
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });

  if (error) return serverError('Erro ao buscar carrinho');

  const rows = (data ?? []) as unknown as RawCartRow[];
  const items = rows
    .filter((row) => row.product && row.product.active !== false)
    .map(toView)
    .filter((item): item is CartItemView => item !== null);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { product_id, product_option_id, quantity, customization_text } = (body ?? {}) as {
    product_id?: string;
    product_option_id?: string | null;
    quantity?: number;
    customization_text?: string | null;
  };

  if (!product_id || typeof product_id !== 'string') {
    return badRequest('product_id é obrigatório');
  }

  const optionId = product_option_id ?? null;
  const normalizedCustomization = typeof customization_text === 'string' ? customization_text.trim() : '';
  if (normalizedCustomization.length > 500) return badRequest('A personalização deve ter no máximo 500 caracteres');
  const requestedQty =
    typeof quantity === 'number' && Number.isFinite(quantity)
      ? Math.floor(quantity)
      : 1;
  if (requestedQty < 1) return badRequest('Quantidade inválida');

  const admin = getSupabaseAdmin();

  const { data: productRow, error: productError } = await admin
    .from('products')
    .select('id, name, type, category, active, is_customizable, fulfillment_mode, customization_sections, is_wholesale, minimum_order_quantity')
    .eq('id', product_id)
    .maybeSingle();

  if (productError) {
    console.error('[cart] product lookup error:', productError);
    return serverError('Erro ao validar produto');
  }
  if (!productRow?.active) {
    console.error('[cart] product unavailable:', { product_id, productRow });
    return badRequest('Produto indisponível');
  }
  const product = productRow;
  const minimumQuantity = product.is_wholesale ? Math.max(2, product.minimum_order_quantity ?? 2) : 1;
  if (product.is_wholesale && requestedQty !== 1 && requestedQty < minimumQuantity) {
    return badRequest(`Escolha 1 unidade no varejo ou pelo menos ${minimumQuantity} unidades para lojistas`);
  }
  if (product.category === 'encomenda') {
    const { data: requestOwner, error: ownerError } = await admin
      .from('print_requests')
      .select('id')
      .eq('product_id', product_id)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (ownerError) return serverError('Erro ao validar a encomenda exclusiva');
    if (!requestOwner) {
      return NextResponse.json(
        { error: 'Esta encomenda é exclusiva de outro cliente.' },
        { status: 403 },
      );
    }
  }
  if (product.type === 'digital') {
    try {
      const ownedProducts = await findOwnedDigitalProducts(admin, auth.user.id, [product_id]);
      const ownedOrderId = ownedProducts.get(product_id);
      if (ownedOrderId) {
        return NextResponse.json({
          error: `Você já comprou "${product.name}". Acesse Meus pedidos para baixar o arquivo novamente.`,
          code: 'STL_ALREADY_PURCHASED',
          order_id: ownedOrderId,
        }, { status: 409 });
      }
    } catch (error) {
      console.error('[cart] digital ownership check failed:', error);
      return serverError('Não foi possível verificar seus arquivos adquiridos. Tente novamente.');
    }
  }
  if (product.is_customizable && !normalizedCustomization) {
    return badRequest('Preencha a personalização antes de adicionar ao carrinho');
  }

  let automaticLetterCount: number | null = null;
  try {
    const sections = normalizeProductCustomizationSections(product.customization_sections);
    const automaticSection = sections.find((section) => section.autoSelectOptionByCharacterCount);
    if (automaticSection) {
      const selections = parseProductCustomizationSelections(sections, normalizedCustomization);
      automaticLetterCount = countCustomizationLetters(selections[automaticSection.id]?.text ?? '');
      if (automaticLetterCount < 1) {
        return badRequest('Digite o nome para calcular a variação e o preço');
      }
      if (!optionId) {
        return badRequest(`Selecione a variação correspondente a ${automaticLetterCount} letras`);
      }
    }
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Personalização inválida');
  }

  let optionStock: number | null = null;
  if (optionId) {
    const { data: optionRow, error: optionError } = await admin
      .from('product_options')
      .select('id, product_id, name, stock')
      .eq('id', optionId)
      .eq('active', true)
      .maybeSingle();

    if (optionError) return serverError('Erro ao validar variação');
    if (!optionRow?.product_id || optionRow.product_id !== product_id) {
      return badRequest('Variação inválida');
    }
    if (
      automaticLetterCount !== null
      && getOptionCharacterCount(optionRow.name) !== automaticLetterCount
    ) {
      return badRequest(`A variação deve corresponder às ${automaticLetterCount} letras informadas`);
    }
    optionStock = optionRow.stock;
  }

  const { data: matches, error: matchError } = await admin
    .from('cart_items')
    .select('id, quantity, product_option_id, customization_text')
    .eq('user_id', auth.user.id)
    .eq('product_id', product_id);

  if (matchError) return serverError('Erro ao verificar carrinho');

  const matchRows = (matches ?? []) as Pick<
    CartItem,
    'id' | 'quantity' | 'product_option_id' | 'customization_text'
  >[];
  const existing =
    matchRows.find((r) => r.product_option_id === optionId && (r.customization_text ?? '') === normalizedCustomization) ?? null;

  const quantityCap = product.is_wholesale ? 1000 : 50;
  const cap = product.fulfillment_mode === 'ready_stock'
    ? Math.min(optionStock ?? quantityCap, quantityCap)
    : quantityCap;
  if (cap < 1) return badRequest('Produto sem estoque disponível');
  const targetQty = (existing?.quantity ?? 0) + requestedQty;
  if (product.is_wholesale && targetQty > 1 && cap < minimumQuantity) return badRequest('Estoque insuficiente para o pedido mínimo de lojista');
  const cappedQty = Math.min(cap, targetQty);
  const finalQty = product.is_wholesale && cappedQty > 1 && cappedQty < minimumQuantity
    ? minimumQuantity
    : Math.max(1, cappedQty);

  if (existing) {
    const { error: updateError } = await admin
      .from('cart_items')
      .update({ quantity: finalQty })
      .eq('id', existing.id)
      .eq('user_id', auth.user.id);
    if (updateError) return serverError('Erro ao atualizar carrinho');
    return NextResponse.json({ id: existing.id, quantity: finalQty });
  }

  const { data: inserted, error: insertError } = await admin
    .from('cart_items')
    .insert({
      user_id: auth.user.id,
      product_id,
      product_option_id: optionId,
      quantity: finalQty,
      customization_text: normalizedCustomization || null,
    })
    .select('id, quantity')
    .single();

  if (insertError || !inserted) return serverError('Erro ao adicionar ao carrinho');
  const insertedRow = inserted as Pick<CartItem, 'id' | 'quantity'>;

  return NextResponse.json(
    { id: insertedRow.id, quantity: insertedRow.quantity },
    { status: 201 },
  );
}
