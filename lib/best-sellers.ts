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
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, category')
    .eq('active', true)
    .neq('category', 'encomenda');

  if (productsError || !products?.length) return [];

  const sales: SaleItem[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from('order_items')
      .select('product_id, quantity, order:orders!inner(status)')
      .in('order.status', [...REVENUE_ORDER_STATUSES])
      .range(offset, offset + pageSize - 1);

    if (error) return [];
    sales.push(...(data ?? []).map((item) => ({ product_id: item.product_id, quantity: item.quantity })));
    if (!data || data.length < pageSize) break;
  }

  return findBestSellerProductIds(products, sales);
}

export const getBestSellerProductIds = unstable_cache(
  loadBestSellerProductIds,
  ['best-selling-products-by-category'],
  { revalidate: 60 },
);
