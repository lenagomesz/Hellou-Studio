import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
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
  listing_type_id: string;
  condition: string;
  attributes?: Array<{
    id: string;
    value_id?: string;
    value_name?: string;
  }>;
}

const CATEGORY_MAPPING: Record<string, string> = {
  'Produtos 3D': 'MCO429800',
  'Chaveiros': 'MCO181594',
  'Canecas': 'MCO181600',
  'Acessórios': 'MCO181594',
  'Impressão 3D': 'MCO429800',
  'Arquivos STL': 'MCO429800',
  'default': 'MCO429800',
};

function mapCategoryToML(category: string): string {
  return CATEGORY_MAPPING[category] || CATEGORY_MAPPING['default'];
}

async function uploadToMercadoLivre(
  product: Product,
  accessToken: string,
  userId: string,
) {
  const mlProduct: MLProduct = {
    title: product.name.substring(0, 60),
    category_id: mapCategoryToML(product.category),
    price: Math.round((product.sale_price || product.base_price) * 100) / 100,
    currency_id: 'COP',
    available_quantity: product.type === 'digital' ? 999 : 10,
    description: product.description || product.name,
    pictures: product.image_url
      ? [{ url: product.image_url }]
      : [],
    listing_type_id: 'gold_special' as any,
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

    const data = await response.json() as any;

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

  const { accessToken, userId } = await request.json() as {
    accessToken?: string;
    userId?: string;
  };

  if (!accessToken || !userId) {
    return NextResponse.json(
      { error: 'É necessário accessToken e userId do Mercado Livre' },
      { status: 400 }
    );
  }

  try {
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
