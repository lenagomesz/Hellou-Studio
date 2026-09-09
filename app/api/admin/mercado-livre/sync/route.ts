import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getValidMercadoLivreToken } from '@/lib/mercado-livre';
import type { Product } from '@/types/database';

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

function uniqueProductImages(product: Product, requestUrl: string) {
  return [...new Set([
    product.image_url,
    product.image_url_2,
    ...(product.images ?? []),
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

async function predictBrazilianCategory(title: string) {
  const url = new URL('https://api.mercadolibre.com/sites/MLB/domain_discovery/search');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', title);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json() as Array<{ category_id?: string }>;
  const categoryId = data[0]?.category_id;
  if (!response.ok || !categoryId) throw new Error(`Categoria brasileira não encontrada para "${title}".`);
  return categoryId;
}

async function uploadToMercadoLivre(
  product: Product,
  accessToken: string,
  userId: string,
  requestUrl: string,
) : Promise<UploadResult> {
  let categoryId: string;
  try {
    categoryId = await predictBrazilianCategory(product.name);
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
  const mlProduct: MLProduct = {
    title: product.name.substring(0, 60),
    category_id: categoryId,
    price: Math.round((product.sale_price || product.base_price) * 100) / 100,
    currency_id: 'BRL',
    available_quantity: product.type === 'digital' ? 999 : 10,
    buying_mode: 'buy_it_now',
    description: product.description || product.name,
    pictures,
    listing_type_id: 'gold_special',
    condition: 'new',
    attributes: [
      { id: 'BRAND', value_name: 'Hellou Studio' },
      { id: 'MODEL', value_name: product.name.substring(0, 255) },
      ...(product.sku ? [{ id: 'SELLER_SKU', value_name: product.sku }] : []),
    ],
  };

  try {
    const response = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(mlProduct),
    });

    const data = await response.json() as MLResponse;

    if (!response.ok) {
      const failure = mercadoLivreFailure(product, data, response.status);
      console.error('[ML Sync] Error uploading product:', failure);
      return { ok: false, failure };
    }

    if (!data.id || !data.permalink) {
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
      ml_listing_id: data.id,
      ml_user_id: userId,
      ml_permalink: data.permalink,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'product_id,ml_user_id' });
    if (listingError) {
      return {
        ok: false,
        failure: {
          productId: product.id,
          productName: product.name,
          stage: 'database',
          message: `Anúncio ${data.id} criado, mas não foi possível salvar o vínculo: ${listingError.message}`,
        },
      };
    }

    return { ok: true, mlListingId: data.id };
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

    const { data: products, error } = await admin
      .from('products')
      .select('*')
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
    let successCount = 0;
    let errorCount = 0;

    for (const product of products as Product[]) {
      const uploadResult = await uploadToMercadoLivre(product, accessToken, userId, request.url);
      if (uploadResult.ok) {
        successCount++;
        syncedProducts.push({
          id: product.id,
          name: product.name,
          mlListingId: uploadResult.mlListingId,
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
