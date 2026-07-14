import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductReviews } from '@/components/shop/ProductReviews';
import { getCurrentUser } from '@/lib/api';
import type { Product, ProductOption } from '@/types/database';
import { absoluteUrl, plainText, productImages, safeJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadProductWithOptions(id: string) {
  const admin = getSupabaseAdmin();
  const [productRes, optionsRes] = await withTimeout(
    Promise.all([
      admin
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('type', 'digital')
        .eq('active', true)
        .maybeSingle(),
      admin
        .from('product_options')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true }),
    ]),
    12000,
  );

  if (productRes.error) throw productRes.error;
  if (optionsRes.error) throw optionsRes.error;
  if (!productRes.data) return null;

  return {
    product: productRes.data as Product,
    options: (optionsRes.data ?? []) as ProductOption[],
  };
}

async function getProductWithOptions(id: string) {
  try {
    return await loadProductWithOptions(id);
  } catch (firstError) {
    console.error('[stl-detail] First product query failed; retrying:', firstError);
    return loadProductWithOptions(id);
  }
}

async function getRelatedProducts(excludeId: string) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await withTimeout(
      admin
        .from('products')
        .select('*')
        .eq('type', 'digital')
        .eq('active', true)
        .neq('id', excludeId)
        .order('created_at', { ascending: false })
        .limit(4),
      12000,
    );
    if (error) throw error;
    return (data ?? []) as Product[];
  } catch (error) {
    console.error('[stl-detail] Related products query failed:', error);
    return [];
  }
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) return { title: 'Arquivo STL não encontrado', robots: { index: false, follow: false } };

  const { product } = result;
  const description = plainText(product.description, `${product.name}, arquivo STL digital para impressão 3D.`);
  const images = productImages(product);
  const canonical = `/stl/${product.id}`;
  return {
    title: `${product.name} — arquivo STL`,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, title: product.name, description, images },
    twitter: { card: 'summary_large_image', title: product.name, description, images },
  };
}

export default async function STLProductDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) notFound();

  const { product, options } = result;

  const [related, user] = await Promise.all([
    getRelatedProducts(product.id),
    getCurrentUser(),
  ]);

  const price = product.sale_price ?? product.base_price;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainText(product.description, `${product.name}, arquivo STL digital para impressão 3D.`, 500),
    image: productImages(product),
    sku: product.id,
    category: 'Arquivo STL para impressão 3D',
    brand: { '@type': 'Brand', name: 'Hellou Studio' },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/stl/${product.id}`),
      priceCurrency: 'BRL',
      price: price.toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }} />
      <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">
          Início
        </Link>
        <span className="mx-2">/</span>
        <Link href="/stl" className="hover:text-gray-900 dark:hover:text-gray-100">
          Arquivos STL
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">{product.name}</span>
      </nav>

      <ProductDetail product={product} options={options} />

      <ProductReviews productId={product.id} isAdmin={user?.role === 'admin'} />

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Outros arquivos STL</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
