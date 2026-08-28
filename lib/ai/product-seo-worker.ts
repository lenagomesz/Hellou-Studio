import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Product } from '@/types/database';
import { mergeProductSEO, type GeneratedSEO } from './product-content';
import { generateProductContent, loadProductImages } from './product-generator';

export async function processProductSEO(productId?: string) {
  if (!process.env.GOOGLE_GENAI_API_KEY) throw new Error('Configure GOOGLE_GENAI_API_KEY para processar o SEO.');
  const admin = getSupabaseAdmin();
  const { data: jobs, error } = await admin.rpc('claim_product_seo', { p_product_id: productId ?? null, p_limit: productId ? 1 : 3 });
  if (error) throw new Error('Não foi possível acessar a fila de SEO. Confira a migração do banco.');
  const results = await Promise.all((jobs ?? []).map(async (job: { product_id: string; revision: string }) => {
    try {
      const { data, error: productError } = await admin.from('products').select('*').eq('id', job.product_id).single();
      if (productError || !data) throw new Error('Produto indisponível');
      const product = data as Product & { seo_ai_generated?: GeneratedSEO };
      const urls = [product.image_url, ...(product.images ?? []), product.image_url_2].filter((url): url is string => Boolean(url));
      const { images, loadedUrls } = await loadProductImages(urls);
      const content = await generateProductContent({ name: product.name, description: product.description?.slice(0, 5000), category: product.category, type: product.type }, images);
      const patch = mergeProductSEO(product, content, loadedUrls);
      const { data: saved, error: saveError } = await admin.rpc('finish_product_seo', {
        p_product_id: product.id, p_revision: job.revision, p_patch: patch,
      });
      if (saveError) throw new Error('Falha ao salvar SEO');
      if (saved) {
        revalidatePath(`/products/${product.id}`);
        revalidatePath(`/stl/${product.id}`);
        revalidatePath('/products');
        revalidatePath('/');
      }
      return { id: product.id, status: saved ? 'updated' : 'changed', images: loadedUrls.length, skippedImages: [...new Set(urls)].length - loadedUrls.length };
    } catch {
      // Do not log prompts, customer data or provider errors containing credentials.
      await admin.from('product_seo_jobs').update({ last_error: 'A geração falhou; confira a chave, a cota e as imagens. Nova tentativa após 10 minutos (máximo 3).' })
        .eq('product_id', job.product_id).eq('revision', job.revision);
      return { id: job.product_id, status: 'failed' };
    }
  }));
  return { processed: results.length, results };
}

export async function processProductSEOSafely(productId?: string) {
  try { await processProductSEO(productId); }
  catch { console.warn('[product-seo] Processamento pendente; cadastro preservado.'); }
}
