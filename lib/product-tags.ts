import { getSupabaseAdmin } from '@/lib/supabase';
import { getProductSalesStats } from '@/lib/best-sellers';
import type { ProductTag } from '@/types/database';

export async function attachProductTags<T extends { id: string }>(products: T[]): Promise<Array<T & { tags: ProductTag[]; is_best_seller: boolean; order_count?: number; sold_quantity?: number }>> {
  if (products.length === 0) return [];
  const admin = getSupabaseAdmin();
  const productIds = products.map((product) => product.id);
  const [{ data: assignments, error: assignmentError }, salesStats] = await Promise.all([
    admin
      .from('product_tag_assignments')
      .select('product_id, tag_id')
      .in('product_id', productIds),
    getProductSalesStats().catch(() => null),
  ]);
  const bestSellerIdSet = new Set(salesStats?.bestSellerIds ?? []);
  const salesFor = (id: string) => salesStats ? {
    order_count: salesStats.byProduct[id]?.orderCount ?? 0,
    sold_quantity: salesStats.byProduct[id]?.unitsSold ?? 0,
  } : {};

  if (assignmentError || !assignments?.length) {
    return products.map((product) => ({
      ...product,
      tags: [],
      is_best_seller: bestSellerIdSet.has(product.id),
      ...salesFor(product.id),
    }));
  }

  const tagIds = Array.from(new Set(assignments.map((item) => item.tag_id)));
  const { data: tags, error: tagError } = await admin
    .from('product_tags')
    .select('*')
    .in('id', tagIds)
    .order('name', { ascending: true });
  if (tagError) {
    return products.map((product) => ({
      ...product,
      tags: [],
      is_best_seller: bestSellerIdSet.has(product.id),
      ...salesFor(product.id),
    }));
  }

  const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag as ProductTag]));
  const tagIdsByProduct = new Map<string, string[]>();
  for (const assignment of assignments) {
    const current = tagIdsByProduct.get(assignment.product_id) ?? [];
    current.push(assignment.tag_id);
    tagIdsByProduct.set(assignment.product_id, current);
  }

  return products.map((product) => ({
    ...product,
    is_best_seller: bestSellerIdSet.has(product.id),
    ...salesFor(product.id),
    tags: (tagIdsByProduct.get(product.id) ?? [])
      .map((id) => tagById.get(id))
      .filter((tag): tag is ProductTag => Boolean(tag)),
  }));
}
