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
  description: string;
  pictures: Array<{ url: string }>;
  listing_type_id: 'gold_special' | 'bronze' | 'silver' | 'gold' | 'platinum';
  condition: string;
  attributes?: Array<{
    id: string;
    value_id?: string;
    value_name?: string;
  }>;
}

interface MLResponse {
  id: string;
  permalink: string;
  error?: string;
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
) {
  const categoryId = await predictBrazilianCategory(product.name);
  const mlProduct: MLProduct = {
    title: product.name.substring(0, 60),
    category_id: categoryId,
    price: Math.round((product.sale_price || product.base_price) * 100) / 100,
    currency_id: 'BRL',
    available_quantity: product.type === 'digital' ? 999 : 10,
    description: product.description || product.name,
    pictures: product.image_url
      ? [{ url: product.image_url }]
      : [],
    listing_type_id: 'gold_special',
    condition: 'new',
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
      console.error('[ML Sync] Error uploading product:', data);
      return null;
    }

    const admin = getSupabaseAdmin();
    await admin.from('mercado_livre_listings').upsert({
      product_id: product.id,
      ml_listing_id: data.id,
      ml_user_id: userId,
      ml_permalink: data.permalink,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'product_id,ml_user_id' });

    return data.id;
  } catch (error) {
    console.error('[ML Sync] Exception uploading product:', error);
    return null;
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
    let successCount = 0;
    let errorCount = 0;

    for (const product of products as Product[]) {
      const mlListingId = await uploadToMercadoLivre(product, accessToken, userId);
      if (mlListingId) {
        successCount++;
        syncedProducts.push({
          id: product.id,
          name: product.name,
          mlListingId,
        });
      } else {
        errorCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      message: 'Sincronização concluída',
      synced: successCount,
      failed: errorCount,
      total: products.length,
      products: syncedProducts,
    });
  } catch (error) {
    console.error('[ML Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao sincronizar com Mercado Livre' },
      { status: 500 }
    );
  }
}
