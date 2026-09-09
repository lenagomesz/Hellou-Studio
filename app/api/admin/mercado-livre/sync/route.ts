import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getValidMercadoLivreToken } from '@/lib/mercado-livre';
import type { Product, ProductOption } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface MLProduct {
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  buying_mode: 'buy_it_now';
  description: string;
  pictures: Array<{ source: string }>;
  listing_type_id: 'gold_special' | 'bronze' | 'silver' | 'gold' | 'platinum';
  condition: string;
  attributes?: Array<{
    id: string;
    value_id?: string;
    value_name?: string;
  }>;
  variations?: Array<{
    attribute_combinations: Array<{ id: string; value_id?: string; value_name?: string }>;
    price: number;
    available_quantity: number;
    picture_ids: string[];
    attributes?: Array<{ id: string; value_name: string }>;
  }>;
}

interface MLResponse {
  id?: string;
  permalink?: string;
  error?: string;
  message?: string;
  status?: number;
  cause?: Array<{
    code?: string;
    message?: string;
    type?: string;
  }>;
}

type ProductWithOptions = Omit<Product, 'product_options'> & { product_options?: ProductOption[] };

type SyncFailure = {
  productId: string;
  productName: string;
  stage: 'category' | 'publication' | 'database' | 'unexpected';
  status?: number;
  code?: string;
  message: string;
  details?: string[];
};

type UploadResult =
  | { ok: true; mlListingId: string }
  | { ok: false; failure: SyncFailure };

type ExistingMLItem = {
  id: string;
  title?: string;
  permalink?: string;
  seller_custom_field?: string | null;
  attributes?: Array<{ id?: string; value_name?: string | null }>;
};

type MLCategoryAttribute = {
  id: string;
  value_type?: string;
  values?: Array<{ id?: string; name?: string }>;
  allowed_units?: Array<{ id?: string; name?: string }>;
  default_unit?: string;
  tags?: {
    required?: boolean;
    catalog_required?: boolean;
    catalog_listing_required?: boolean;
    allow_variations?: boolean;
  };
};

const ATTRIBUTE_DEFAULTS: Record<string, string[]> = {
  MANUFACTURER: ['Hellou Studio'],
  MATERIAL: ['PLA', 'Plástico', 'Outro'],
  MAIN_MATERIAL: ['PLA', 'Plástico', 'Outro'],
  OCCASIONS: ['Aniversário', 'Empresarial', 'Natal'],
  SOUVENIR_FORMAT: ['Chaveiro', 'Pingente', 'Caixa'],
  IS_EDIBLE: ['Não', 'No'],
  SALES_UNIT: ['Unidade', 'Unit'],
  YIELD_OF_SALES_UNIT: ['1'],
  COLOR: ['Multicolorido', 'Rosa', 'Azul', 'Preto', 'Branco'],
  SIZE: ['Único', 'Unico', 'U'],
  GENDER: ['Sem gênero infantil', 'Sem gênero', 'Unissex', 'Genderless'],
};

function normalizeMatchValue(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

async function recoverExistingListings(
  products: Product[],
  accessToken: string,
  userId: string,
) {
  const admin = getSupabaseAdmin();
  const { data: savedListings, error: savedError } = await admin
    .from('mercado_livre_listings')
    .select('product_id, ml_listing_id')
    .eq('ml_user_id', userId);
  if (savedError) throw new Error(`Não foi possível consultar os vínculos existentes: ${savedError.message}`);

  const byProductId = new Map<string, string>(
    (savedListings ?? []).map((listing) => [String(listing.product_id), String(listing.ml_listing_id)]),
  );
  const searchUrl = new URL(`https://api.mercadolibre.com/users/${encodeURIComponent(userId)}/items/search`);
  searchUrl.searchParams.set('status', 'active');
  searchUrl.searchParams.set('orders', 'start_time_desc');
  searchUrl.searchParams.set('limit', '100');
  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!searchResponse.ok) return byProductId;
  const searchData = await searchResponse.json() as { results?: string[] };
  const itemIds = (searchData.results ?? []).slice(0, 100);

  for (let index = 0; index < itemIds.length; index += 10) {
    const batch = itemIds.slice(index, index + 10);
    const items = await Promise.all(batch.map(async (itemId): Promise<ExistingMLItem | null> => {
      const response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      return response.ok ? response.json() as Promise<ExistingMLItem> : null;
    }));

    for (const item of items) {
      if (!item?.id) continue;
      const sellerSku = item.attributes?.find((attribute) => attribute.id === 'SELLER_SKU')?.value_name
        ?? item.seller_custom_field;
      const modelName = item.attributes?.find((attribute) => attribute.id === 'MODEL')?.value_name;
      const product = products.find((candidate) => {
        if (candidate.sku && sellerSku && normalizeMatchValue(candidate.sku) === normalizeMatchValue(sellerSku)) return true;
        const candidateName = normalizeMatchValue(candidate.name.substring(0, 60));
        return candidateName === normalizeMatchValue(modelName) || candidateName === normalizeMatchValue(item.title);
      });
      if (!product || byProductId.has(product.id)) continue;

      const { error } = await admin.from('mercado_livre_listings').upsert({
        product_id: product.id,
        ml_listing_id: item.id,
        ml_user_id: userId,
        ml_permalink: item.permalink ?? `https://produto.mercadolivre.com.br/${item.id}`,
        synced_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      }, { onConflict: 'product_id,ml_user_id' });
      if (!error) byProductId.set(product.id, item.id);
    }
  }
  return byProductId;
}

function chooseAttributeValue(attribute: MLCategoryAttribute, candidates: string[]) {
  if (attribute.value_type === 'number_unit') {
    const unit = attribute.default_unit ?? attribute.allowed_units?.[0]?.id ?? attribute.allowed_units?.[0]?.name;
    return { value_name: unit ? `${candidates[0]} ${unit}` : candidates[0] };
  }
  if (!attribute.values?.length) return { value_name: candidates[0] };
  for (const candidate of candidates) {
    const candidateValue = normalizeMatchValue(candidate);
    const match = attribute.values.find((value) => normalizeMatchValue(value.name) === candidateValue);
    if (match) return match.id ? { value_id: match.id } : { value_name: match.name ?? candidate };
  }
  return null;
}

async function getCategoryRules(categoryId: string, accessToken: string, product: ProductWithOptions) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [categoryResponse, attributesResponse] = await Promise.all([
    fetch(`https://api.mercadolibre.com/categories/${encodeURIComponent(categoryId)}`, { headers, cache: 'no-store' }),
    fetch(`https://api.mercadolibre.com/categories/${encodeURIComponent(categoryId)}/attributes`, { headers, cache: 'no-store' }),
  ]);
  const category = categoryResponse.ok ? await categoryResponse.json() as {
    minimum_price?: number;
    settings?: { minimum_price?: number };
  } : {};
  const specifications = attributesResponse.ok ? await attributesResponse.json() as MLCategoryAttribute[] : [];
  const productColor = ['rosa', 'laranja', 'azul', 'amarela', 'amarelo', 'vermelha', 'vermelho', 'verde', 'preto', 'branco']
    .find((color) => normalizeMatchValue(product.name).includes(color));
  const defaults: Record<string, string[]> = {
    ...ATTRIBUTE_DEFAULTS,
    COLOR: productColor ? [productColor, ...ATTRIBUTE_DEFAULTS.COLOR] : ATTRIBUTE_DEFAULTS.COLOR,
    SIZE: product.length_cm && product.width_cm
      ? [`${product.length_cm} x ${product.width_cm} cm`, ...ATTRIBUTE_DEFAULTS.SIZE]
      : ATTRIBUTE_DEFAULTS.SIZE,
  };

  const requiredAttributes = specifications.flatMap((attribute) => {
    const required = attribute.tags?.required || attribute.tags?.catalog_required || attribute.tags?.catalog_listing_required;
    const candidates = defaults[attribute.id];
    if (!required || !candidates) return [];
    const selected = chooseAttributeValue(attribute, candidates);
    return selected ? [{ id: attribute.id, ...selected }] : [];
  });
  return {
    minimumPrice: category.minimum_price ?? category.settings?.minimum_price ?? 0,
    requiredAttributes,
    specifications,
  };
}

function buildProductVariations(
  product: ProductWithOptions,
  specifications: MLCategoryAttribute[],
  requestUrl: string,
  minimumPrice: number,
) {
  const options = (product.product_options ?? []).filter((option) => option.active);
  if (options.length === 0) return { variations: undefined, variationAttributeId: null };

  const variationSpecifications = specifications.filter((attribute) => attribute.tags?.allow_variations);
  const hasColorForEveryOption = options.every((option) => option.color_name || option.color);
  const variationAttribute = (hasColorForEveryOption
    ? variationSpecifications.find((attribute) => attribute.id === 'COLOR')
    : null)
    ?? variationSpecifications.find((attribute) => attribute.id === 'MODEL')
    ?? variationSpecifications.find((attribute) => ['string', 'list'].includes(attribute.value_type ?? ''));
  if (!variationAttribute) return { variations: undefined, variationAttributeId: null };

  const usedValues = new Set<string>();
  const variations = options.map((option, index) => {
    const baseValue = variationAttribute.id === 'COLOR'
      ? option.color_name || option.color || option.name
      : option.name;
    let valueName = baseValue;
    const normalized = normalizeMatchValue(valueName);
    if (usedValues.has(normalized)) valueName = `${valueName} ${index + 1}`;
    usedValues.add(normalizeMatchValue(valueName));
    const selectedValue = chooseAttributeValue(variationAttribute, [valueName]) ?? { value_name: valueName };
    const optionImage = option.image_url ? new URL(option.image_url, requestUrl).toString() : null;
    const fallbackImage = uniqueProductImages(product, requestUrl)[0];
    const optionSku = product.sku ? `${product.sku}-${index + 1}` : `${product.id.slice(0, 8)}-${index + 1}`;

    return {
      attribute_combinations: [{ id: variationAttribute.id, ...selectedValue }],
      price: Math.max(
        Math.round(((product.sale_price || product.base_price) + option.price_modifier) * 100) / 100,
        minimumPrice,
      ),
      available_quantity: Math.max(0, option.stock),
      picture_ids: [optionImage ?? fallbackImage].filter((value): value is string => Boolean(value)),
      attributes: [{ id: 'SELLER_SKU', value_name: optionSku }],
    };
  });
  return { variations, variationAttributeId: variationAttribute.id };
}

function uniqueProductImages(product: ProductWithOptions, requestUrl: string) {
  return [...new Set([
    product.image_url,
    product.image_url_2,
    ...(product.images ?? []),
    ...(product.product_options ?? []).map((option) => option.image_url),
  ].filter((value): value is string => Boolean(value?.trim())))]
    .map((value) => new URL(value, requestUrl).toString());
}

function mercadoLivreFailure(product: Product, data: MLResponse, responseStatus: number): SyncFailure {
  const causes = (data.cause ?? []).filter((cause) => cause.type !== 'warning');
  const details = causes.map((cause) => (
    cause.code ? `${cause.code}: ${cause.message ?? 'Validação recusada'}` : cause.message ?? 'Validação recusada'
  ));
  return {
    productId: product.id,
    productName: product.name,
    stage: 'publication',
    status: data.status ?? responseStatus,
    code: causes[0]?.code ?? data.error,
    message: details[0] ?? data.message ?? data.error ?? 'O Mercado Livre recusou a publicação sem informar o motivo.',
    details,
  };
}

async function predictBrazilianCategory(product: ProductWithOptions) {
  const query = [product.name, product.category, product.description]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 250);
  const url = new URL('https://api.mercadolibre.com/sites/MLB/domain_discovery/search');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json() as Array<{ category_id?: string }>;
  const categoryId = data[0]?.category_id;
  if (!response.ok || !categoryId) throw new Error(`Categoria brasileira não encontrada para "${product.name}".`);
  return categoryId;
}

async function uploadToMercadoLivre(
  product: ProductWithOptions,
  accessToken: string,
  userId: string,
  requestUrl: string,
  existingListingId?: string,
) : Promise<UploadResult> {
  let categoryId: string;
  try {
    categoryId = await predictBrazilianCategory(product);
  } catch (error) {
    return {
      ok: false,
      failure: {
        productId: product.id,
        productName: product.name,
        stage: 'category',
        message: error instanceof Error ? error.message : 'Não foi possível identificar a categoria brasileira.',
      },
    };
  }

  const pictures = uniqueProductImages(product, requestUrl).map((source) => ({ source }));
  if (pictures.length === 0) {
    return {
      ok: false,
      failure: {
        productId: product.id,
        productName: product.name,
        stage: 'publication',
        code: 'item.listing_type_id.requiresPictures',
        message: 'Este produto não possui imagem. O Mercado Livre exige pelo menos uma imagem para esse tipo de anúncio.',
      },
    };
  }
  const categoryRules = await getCategoryRules(categoryId, accessToken, product);
  const variationData = buildProductVariations(
    product,
    categoryRules.specifications,
    requestUrl,
    categoryRules.minimumPrice,
  );
  const activeOptions = (product.product_options ?? []).filter((option) => option.active);
  const mlProduct: MLProduct = {
    title: product.name.substring(0, 60),
    category_id: categoryId,
    price: Math.max(
      Math.round((product.sale_price || product.base_price) * 100) / 100,
      categoryRules.minimumPrice,
    ),
    currency_id: 'BRL',
    available_quantity: activeOptions.length > 0
      ? activeOptions.reduce((total, option) => total + Math.max(0, option.stock), 0)
      : product.type === 'digital' ? 999 : 10,
    buying_mode: 'buy_it_now',
    description: product.description || product.name,
    pictures,
    listing_type_id: 'gold_special',
    condition: 'new',
    attributes: [
      { id: 'BRAND', value_name: 'Hellou Studio' },
      { id: 'MODEL', value_name: product.name.substring(0, 255) },
      ...(product.sku ? [{ id: 'SELLER_SKU', value_name: product.sku }] : []),
      ...categoryRules.requiredAttributes.filter((attribute) => (
        !['BRAND', 'MODEL', 'SELLER_SKU', variationData.variationAttributeId].includes(attribute.id)
      )),
    ],
    variations: variationData.variations,
  };

  try {
    const publicationUrl = existingListingId
      ? `https://api.mercadolibre.com/items/${encodeURIComponent(existingListingId)}`
      : 'https://api.mercadolibre.com/items';
    const updatePayload = {
      title: mlProduct.title,
      price: mlProduct.price,
      available_quantity: mlProduct.available_quantity,
      pictures: mlProduct.pictures,
      attributes: mlProduct.attributes,
      ...(mlProduct.variations ? { variations: mlProduct.variations } : {}),
    };
    const response = await fetch(publicationUrl, {
      method: existingListingId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(existingListingId ? updatePayload : mlProduct),
    });

    const data = await response.json() as MLResponse;

    if (!response.ok) {
      const failure = mercadoLivreFailure(product, data, response.status);
      console.error('[ML Sync] Error uploading product:', failure);
      return { ok: false, failure };
    }

    const listingId = data.id ?? existingListingId;
    const permalink = data.permalink ?? (listingId ? `https://produto.mercadolivre.com.br/${listingId}` : null);
    if (!listingId || !permalink) {
      return {
        ok: false,
        failure: {
          productId: product.id,
          productName: product.name,
          stage: 'publication',
          message: 'O Mercado Livre respondeu sem o ID ou o link da publicação.',
        },
      };
    }

    const admin = getSupabaseAdmin();
    const { error: listingError } = await admin.from('mercado_livre_listings').upsert({
      product_id: product.id,
      ml_listing_id: listingId,
      ml_user_id: userId,
      ml_permalink: permalink,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'product_id,ml_user_id' });
    if (listingError) {
      return {
        ok: false,
        failure: {
          productId: product.id,
          productName: product.name,
          stage: 'database',
          message: `Anúncio ${listingId} sincronizado, mas não foi possível salvar o vínculo: ${listingError.message}`,
        },
      };
    }

    return { ok: true, mlListingId: listingId };
  } catch (error) {
    console.error('[ML Sync] Exception uploading product:', error);
    return {
      ok: false,
      failure: {
        productId: product.id,
        productName: product.name,
        stage: 'unexpected',
        message: error instanceof Error ? error.message : 'Erro inesperado ao publicar o produto.',
      },
    };
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const { accessToken, userId } = await getValidMercadoLivreToken(auth.user.id, request.url);
    const admin = getSupabaseAdmin();

    const { error: listingTableError } = await admin
      .from('mercado_livre_listings')
      .select('id')
      .limit(1);
    if (listingTableError) {
      return NextResponse.json({
        error: "A tabela 'mercado_livre_listings' não existe no Supabase. Aplique a migration 20260909_mercado_livre_listings_recovery.sql antes de sincronizar novamente. Nenhum novo anúncio foi criado nesta tentativa.",
        code: 'MERCADO_LIVRE_LISTINGS_TABLE_MISSING',
      }, { status: 503 });
    }

    const { data: products, error } = await admin
      .from('products')
      .select('*, product_options(*)')
      .eq('active', true)
      .limit(50);

    if (error) {
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum produto ativo encontrado', synced: 0 },
        { status: 200 }
      );
    }

    const syncedProducts = [];
    const failures: SyncFailure[] = [];
    const existingListings = await recoverExistingListings(products as ProductWithOptions[], accessToken, userId);
    let successCount = 0;
    let errorCount = 0;

    for (const product of products as ProductWithOptions[]) {
      const uploadResult = await uploadToMercadoLivre(
        product,
        accessToken,
        userId,
        request.url,
        existingListings.get(product.id),
      );
      if (uploadResult.ok) {
        successCount++;
        syncedProducts.push({
          id: product.id,
          name: product.name,
          mlListingId: uploadResult.mlListingId,
          variations: (product.product_options ?? []).filter((option) => option.active).length,
        });
      } else {
        errorCount++;
        failures.push(uploadResult.failure);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      message: 'Sincronização concluída',
      synced: successCount,
      failed: errorCount,
      total: products.length,
      products: syncedProducts,
      failures,
      errorSummary: Object.entries(failures.reduce<Record<string, number>>((summary, failure) => {
        const key = failure.message;
        summary[key] = (summary[key] ?? 0) + 1;
        return summary;
      }, {})).map(([message, count]) => ({ message, count })),
    });
  } catch (error) {
    console.error('[ML Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao sincronizar com Mercado Livre' },
      { status: 500 }
    );
  }
}
