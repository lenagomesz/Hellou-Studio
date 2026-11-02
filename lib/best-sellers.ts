import { unstable_cache } from 'next/cache';
import { REVENUE_ORDER_STATUSES } from '@/lib/order-analytics';
import { getSupabaseAdmin } from '@/lib/supabase';

type CategorizedProduct = { id: string; category: string };
type SaleItem = { product_id: string; quantity: number; order_id?: string };

export type ProductSales = { orderCount: number; unitsSold: number };
export type ProductSalesStats = { bestSellerIds: string[]; byProduct: Record<string, ProductSales> };

export function summarizeProductSales(sales: SaleItem[]): Record<string, ProductSales> {
  const summaries: Record<string, ProductSales> = {};
  const orders = new Map<string, Set<string>>();
  for (const sale of sales) {
    const quantity = Number(sale.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const summary = summaries[sale.product_id] ??= { orderCount: 0, unitsSold: 0 };
    summary.unitsSold += quantity;
    const productOrders = orders.get(sale.product_id) ?? new Set<string>();
    if (sale.order_id) productOrders.add(sale.order_id);
    orders.set(sale.product_id, productOrders);
    summary.orderCount = productOrders.size;
  }
  return summaries;
}

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

async function loadProductSalesStats(): Promise<ProductSalesStats> {
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
      throw new Error('Não foi possível carregar os produtos para o resumo de vendas');
    }
    products.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  if (products.length === 0) return { bestSellerIds: [], byProduct: {} };

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
      throw new Error('Não foi possível carregar os pedidos confirmados');
    }
    revenueOrderIds.push(...(data ?? []).map((order) => order.id));
    if (!data || data.length < pageSize) break;
  }
  if (revenueOrderIds.length === 0) return { bestSellerIds: [], byProduct: {} };

  // Consulta os itens diretamente pelos pedidos confirmados. Isso evita depender
  // de filtros em relações embutidas do PostgREST, que podem retornar uma lista vazia.
  const sales: SaleItem[] = [];
  const orderIdChunkSize = 200;
  for (let chunkStart = 0; chunkStart < revenueOrderIds.length; chunkStart += orderIdChunkSize) {
    const orderIds = revenueOrderIds.slice(chunkStart, chunkStart + orderIdChunkSize);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await admin
        .from('order_items')
        .select('product_id, quantity, order_id')
        .in('order_id', orderIds)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        console.error('[best-sellers] Falha ao carregar itens vendidos:', error.message);
        throw new Error('Não foi possível carregar os itens vendidos');
      }
      sales.push(...(data ?? []).map((item) => ({ product_id: item.product_id, quantity: item.quantity, order_id: item.order_id })));
      if (!data || data.length < pageSize) break;
    }
  }

  return { bestSellerIds: findBestSellerProductIds(products, sales), byProduct: summarizeProductSales(sales) };
}

export const getProductSalesStats = unstable_cache(
  loadProductSalesStats,
  ['confirmed-product-sales-v1'],
  { revalidate: 60 },
);

export async function getBestSellerProductIds() {
  return (await getProductSalesStats()).bestSellerIds;
}
