import type { Product } from '@/types/database';

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://helloustudio.com.br').replace(/\/$/, '');
export const SITE_NAME = 'Hellou Studio';

export function absoluteUrl(path = '/') {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function plainText(value: string | null | undefined, fallback: string, maxLength = 160) {
  const normalized = value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || fallback;
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function productPath(product: Pick<Product, 'id' | 'type'>) {
  return product.type === 'digital' ? `/stl/${product.id}` : `/products/${product.id}`;
}

export function productImages(product: Pick<Product, 'image_url' | 'image_url_2' | 'images'>) {
  return [...new Set([product.image_url, product.image_url_2, ...(product.images ?? [])].filter((image): image is string => Boolean(image)))]
    .map((image) => image.startsWith('http') ? image : absoluteUrl(image));
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
