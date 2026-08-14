import { unstable_cache } from 'next/cache';
import { REVENUE_ORDER_STATUSES } from '@/lib/order-analytics';
import { getSupabaseAdmin } from '@/lib/supabase';

type CategorizedProduct = { id: string; category: string };
type SaleItem = { product_id: string; quantity: number };

export function findBestSellerProductIds(products: CategorizedProduct[], sales: SaleItem[]): string[] {
  const productCategory = new Map(products.map((product) => [product.id, product.category]));
  const unitsByProduct = new Map<string, number>();

  for (const sale of sales) {
    if (!productCategory.has(sale.product_id)) continue;
    const quantity = Number(sale.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    unitsByProduct.set(sale.product_id, (unitsByProduct.get(sale.product_id) ?? 0) + quantity);
  }

  const winnerByCategory = new Map<string, { id: string; units: number }>();
  for (const product of products) {
    const units = unitsByProduct.get(product.id) ?? 0;
    if (units === 0) continue;

    const current = winnerByCategory.get(product.category);
    if (!current || units > current.units || (units === current.units && product.id.localeCompare(current.id) < 0)) {
      winnerByCategory.set(product.category, { id: product.id, units });
    }
  }

  return Array.from(winnerByCategory.values(), (winner) => winner.id);
}

async function loadBestSellerProductIds(): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const pageSize = 1000;
  const products: CategorizedProduct[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from('products')
      .select('id, category')
      .eq('active', true)
      .neq('category', 'encomenda')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error('[best-sellers] Falha ao carregar produtos:', error.message);
      return [];
    }
    products.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  if (products.length === 0) return [];

  const revenueOrderIds: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from('orders')
      .select('id')
      .in('status', [...REVENUE_ORDER_STATUSES])
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error('[best-sellers] Falha ao carregar pedidos confirmados:', error.message);
      return [];
    }
    revenueOrderIds.push(...(data ?? []).map((order) => order.id));
    if (!data || data.length < pageSize) break;
  }
  if (revenueOrderIds.length === 0) return [];

  // Consulta os itens diretamente pelos pedidos confirmados. Isso evita depender
  // de filtros em relações embutidas do PostgREST, que podem retornar uma lista vazia.
  const sales: SaleItem[] = [];
  const orderIdChunkSize = 200;
  for (let chunkStart = 0; chunkStart < revenueOrderIds.length; chunkStart += orderIdChunkSize) {
    const orderIds = revenueOrderIds.slice(chunkStart, chunkStart + orderIdChunkSize);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await admin
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        console.error('[best-sellers] Falha ao carregar itens vendidos:', error.message);
        return [];
      }
      sales.push(...(data ?? []).map((item) => ({ product_id: item.product_id, quantity: item.quantity })));
      if (!data || data.length < pageSize) break;
    }
  }

  return findBestSellerProductIds(products, sales);
}

export const getBestSellerProductIds = unstable_cache(
  loadBestSellerProductIds,
  ['best-selling-products-by-category-v2'],
  { revalidate: 60 },
);
