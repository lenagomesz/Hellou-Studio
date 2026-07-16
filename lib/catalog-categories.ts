import { getSupabaseAdmin } from '@/lib/supabase';
import type { ProductCategory, ProductType } from '@/types/database';

export async function getCatalogCategories(type: ProductType): Promise<ProductCategory[]> {
  try {
    const admin = getSupabaseAdmin();
    let productsQuery = admin
      .from('products')
      .select('category')
      .eq('active', true);

    productsQuery = type === 'physical'
      ? productsQuery.or('type.eq.physical,type.is.null')
      : productsQuery.eq('type', type);

    if (type === 'physical') productsQuery = productsQuery.neq('category', 'encomenda');

    const { data: products, error: productsError } = await productsQuery;
    if (productsError) return [];

    const slugs = Array.from(new Set((products ?? []).map((product) => product.category).filter(Boolean)));
    if (slugs.length === 0) return [];

    const { data: categories, error: categoriesError } = await admin
      .from('product_categories')
      .select('*')
      .eq('active', true)
      .in('slug', slugs)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (categoriesError) return [];
    return (categories ?? []) as ProductCategory[];
  } catch (error) {
    console.error('[catalog-categories] Error loading categories:', error);
    return [];
  }
}
