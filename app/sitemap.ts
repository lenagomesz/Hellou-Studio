import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { absoluteUrl, productPath } from '@/lib/seo';
import type { Product } from '@/types/database';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/products'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/stl'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/request-print'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('products')
      .select('id, type, updated_at, image_url, images')
      .eq('active', true)
      .neq('category', 'encomenda');
    if (error) throw error;

    const products = (data ?? []) as Pick<Product, 'id' | 'type' | 'updated_at' | 'image_url' | 'images'>[];
    return [...staticPages, ...products.map((product) => ({
      url: absoluteUrl(productPath(product)),
      lastModified: product.updated_at,
      changeFrequency: 'weekly' as const,
      priority: product.type === 'digital' ? 0.7 : 0.8,
      images: [...new Set([product.image_url, ...(product.images ?? [])].filter((image): image is string => Boolean(image)))]
        .map((image) => image.startsWith('http') ? image : absoluteUrl(image)),
    }))];
  } catch {
    return staticPages;
  }
}
