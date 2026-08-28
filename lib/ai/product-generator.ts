import { geminiClient, type GeminiImage } from './gemini-client';
import { PRODUCT_CONTENT_PROMPT, PRODUCT_CONTENT_SCHEMA, validateProductContent } from './product-content';
import { getSupabaseAdmin } from '@/lib/supabase';

// Never fetch arbitrary URLs provided by a user or model (SSRF). Only our products bucket.
export function productImageStoragePath(url: string): string | null {
  try {
    let path: string;
    if (url.startsWith('/api/product-images/')) {
      path = url.slice('/api/product-images/'.length);
      if (!path.startsWith('product-images/')) return null;
    }
    else {
      const parsed = new URL(url);
      if (parsed.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin || parsed.username || parsed.password) return null;
      const prefix = '/storage/v1/object/public/products/';
      if (!parsed.pathname.startsWith(prefix)) return null;
      path = parsed.pathname.slice(prefix.length);
    }
    path = decodeURIComponent(path);
    if (!path || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..') || /[?#\x00-\x1f]/.test(path)) return null;
    return path;
  } catch { return null; }
}

export async function loadProductImages(urls: string[]) {
  const images: GeminiImage[] = [];
  const loadedUrls: string[] = [];
  let total = 0;
  for (const url of [...new Set(urls)].slice(0, 6)) {
    const path = productImageStoragePath(url);
    if (!path) continue;
    const { data, error } = await getSupabaseAdmin().storage.from('products').download(path);
    if (error || !data || !['image/jpeg', 'image/png', 'image/webp'].includes(data.type) || data.size > 8 * 1024 * 1024) continue;
    if (total + data.size > 12 * 1024 * 1024) continue;
    total += data.size;
    images.push({ mimeType: data.type, data: Buffer.from(await data.arrayBuffer()).toString('base64') });
    loadedUrls.push(url);
  }
  return { images, loadedUrls };
}

export async function generateProductContent(facts: Record<string, unknown>, images: GeminiImage[] = []) {
  const { text } = await geminiClient.generateContent(
    JSON.stringify({ facts, image_count: images.length }), PRODUCT_CONTENT_PROMPT,
    PRODUCT_CONTENT_SCHEMA, undefined, { images, timeoutMs: 35_000, maxOutputTokens: 4096 },
  );
  return validateProductContent(JSON.parse(text), images.length);
}
