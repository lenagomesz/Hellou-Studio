import { getSupabaseAdmin } from '@/lib/supabase';
import type { ProductTag } from '@/types/database';

export async function attachProductTags<T extends { id: string }>(products: T[]): Promise<Array<T & { tags: ProductTag[] }>> {
  if (products.length === 0) return [];
  const admin = getSupabaseAdmin();
  const productIds = products.map((product) => product.id);
  const { data: assignments, error: assignmentError } = await admin
    .from('product_tag_assignments')
    .select('product_id, tag_id')
    .in('product_id', productIds);
  if (assignmentError || !assignments?.length) return products.map((product) => ({ ...product, tags: [] }));

  const tagIds = Array.from(new Set(assignments.map((item) => item.tag_id)));
  const { data: tags, error: tagError } = await admin
    .from('product_tags')
    .select('*')
    .in('id', tagIds)
    .order('name', { ascending: true });
  if (tagError) return products.map((product) => ({ ...product, tags: [] }));

  const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag as ProductTag]));
  const tagIdsByProduct = new Map<string, string[]>();
  for (const assignment of assignments) {
    const current = tagIdsByProduct.get(assignment.product_id) ?? [];
    current.push(assignment.tag_id);
    tagIdsByProduct.set(assignment.product_id, current);
  }

  return products.map((product) => ({
    ...product,
    tags: (tagIdsByProduct.get(product.id) ?? [])
      .map((id) => tagById.get(id))
      .filter((tag): tag is ProductTag => Boolean(tag)),
  }));
}
