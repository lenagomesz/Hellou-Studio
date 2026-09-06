import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductReviews } from '@/components/shop/ProductReviews';
import { getCurrentUser } from '@/lib/api';
import type { Product, ProductOption } from '@/types/database';
import { absoluteUrl, plainText, productIdentifier, productImages, productPath, safeJsonLd } from '@/lib/seo';
import { findOwnedDigitalProducts } from '@/lib/digital-purchases';
import { attachProductTags } from '@/lib/product-tags';
import { getStoreSettings } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadProductWithOptions(identifier: string) {
  const admin = getSupabaseAdmin();
  let productQuery = admin.from('products').select('*, product_options(price_modifier)').eq('type', 'digital').eq('active', true);
  productQuery = UUID_PATTERN.test(identifier) ? productQuery.eq('id', identifier) : productQuery.eq('slug', identifier);
  const productRes = await withTimeout(productQuery.maybeSingle(), 12000);
  if (productRes.error) throw productRes.error;
  let productData = productRes.data as Product | null;

  if (!productData && !UUID_PATTERN.test(identifier)) {
    const fallback = await withTimeout(admin.from('products').select('*, product_options(price_modifier)').eq('type', 'digital').eq('active', true).is('slug', null).limit(500), 12000);
    const matched = (fallback.data ?? []).find(product => productIdentifier(product as Product) === identifier);
    if (matched) productData = matched as Product;
  }

  if (!productData) return null;

  const optionsRes = await withTimeout(admin.from('product_options').select('*')
    .eq('product_id', productData.id).eq('active', true).order('created_at', { ascending: true }), 12000);
  if (optionsRes.error) throw optionsRes.error;

  return {
    product: productData,
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
  const title = product.seo_title || `${product.name} — arquivo STL`;
  const description = plainText(product.seo_description || product.description, `${product.name}, arquivo STL digital para impressão 3D.`);
  const images = productImages(product);
  const canonical = productPath(product);
  return {
    title,
    description,
    keywords: product.seo_keywords ?? [],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function STLProductDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) notFound();
  if (id !== productIdentifier(result.product)) redirect(productPath(result.product));

  const { product: rawProduct, options } = result;
  const storeSettings = await getStoreSettings();
  const product = (await attachProductTags([rawProduct]))[0];

  const [related, user] = await Promise.all([
    getRelatedProducts(product.id).then(attachProductTags),
    getCurrentUser(),
  ]);
  let ownedOrderId: string | null = null;
  if (user) {
    try {
      const ownedProducts = await findOwnedDigitalProducts(getSupabaseAdmin(), user.id, [product.id]);
      ownedOrderId = ownedProducts.get(product.id) ?? null;
    } catch (error) {
      console.error('[stl-detail] Could not verify product ownership:', error);
    }
  }

  const price = product.sale_price ?? product.base_price;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainText(product.seo_description || product.description, `${product.name}, arquivo STL digital para impressão 3D.`, 500),
    image: productImages(product),
    sku: product.sku || product.id,
    category: 'Arquivo STL para impressão 3D',
    brand: { '@type': 'Brand', name: storeSettings.identity.name },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(productPath(product)),
      priceCurrency: storeSettings.commerce.currency,
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

      <ProductDetail product={product} options={options} ownedOrderId={ownedOrderId} />

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
