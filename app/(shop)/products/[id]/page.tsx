import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { MetaProductView } from '@/components/analytics/MetaProductView';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductReviews } from '@/components/shop/ProductReviews';
import { ProductSocialProof } from '@/components/shop/ProductSocialProof';
import { getCurrentUser } from '@/lib/api';
import type { Product, ProductOption } from '@/types/database';
import { absoluteUrl, plainText, productIdentifier, productImages, productPath, safeJsonLd } from '@/lib/seo';
import { attachProductTags } from '@/lib/product-tags';
import { getStoreSettings } from '@/lib/store-settings';
import { loadAvailableProductOptions, loadEffectiveCustomizationSections } from '@/lib/catalog-availability';
import { CustomKitConfigurator, type KitSelectableProduct } from '@/components/shop/CustomKitConfigurator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadProductWithOptions(identifier: string) {
  const admin = getSupabaseAdmin();
  let productQuery = admin.from('products').select('*').eq('type', 'physical').eq('active', true);
  productQuery = UUID_PATTERN.test(identifier) ? productQuery.eq('id', identifier) : productQuery.eq('slug', identifier);
  const productRes = await withTimeout(productQuery.maybeSingle(), 12000);
  if (productRes.error) throw productRes.error;
  let productData = productRes.data as Product | null;

  if (!productData && !UUID_PATTERN.test(identifier)) {
    const fallback = await withTimeout(admin.from('products').select('*').eq('type', 'physical').eq('active', true).is('slug', null).limit(500), 12000);
    const matched = (fallback.data ?? []).find(product => productIdentifier(product as Product) === identifier);
    if (matched) productData = matched as Product;
  }

  if (!productData) return null;

  const optionsRes = await withTimeout(admin.from('product_options').select('*')
    .eq('product_id', productData.id)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true }), 12000);
  if (optionsRes.error) throw optionsRes.error;

  const [options, sections] = await Promise.all([
    loadAvailableProductOptions(admin, (optionsRes.data ?? []) as ProductOption[]),
    loadEffectiveCustomizationSections(admin, productData.id, productData.customization_sections),
  ]);
  return {
    product: { ...productData, customization_sections: sections, total_option_count: (optionsRes.data ?? []).length },
    options,
  };
}

async function getProductWithOptions(id: string) {
  try {
    return await loadProductWithOptions(id);
  } catch (firstError) {
    console.error('[product-detail] First product query failed; retrying:', firstError);
    return loadProductWithOptions(id);
  }
}

function getRelatedProducts(category: string, excludeId: string, productType: string) {
  return unstable_cache(
    () =>
      withTimeout(
        (async () => {
          const admin = getSupabaseAdmin();
          let query = admin
            .from('products')
            .select('*, product_options(price_modifier)')
            .eq('active', true)
            .eq('category', category)
            .neq('id', excludeId);

          if (productType === 'digital') {
            query = query.eq('type', 'digital');
          } else {
            query = query.neq('type', 'digital');
          }

          const { data } = await query
            .in('category', ['chaveiros', 'escritorio', 'criaturas'])
            .not('name', 'ilike', 'Encomenda%')
            .order('created_at', { ascending: false })
            .limit(4);
          return (data ?? []) as Product[];
        })(),
      ).catch(() => [] as Product[]),
    [`related-${category}-${excludeId}-${productType}`],
    { revalidate: 60 },
  )();
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result || result.product.category === 'encomenda') return { title: 'Produto não encontrado', robots: { index: false, follow: false } };

  const { product } = result;
  const settings = await getStoreSettings();
  const title = product.seo_title || product.name;
  const description = plainText(product.seo_description || product.description, `${product.name}, produzido sob demanda pela ${settings.identity.name}.`);
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

export default async function ProductDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) notFound();
  if (id !== productIdentifier(result.product)) redirect(productPath(result.product));

  const { product: rawProduct, options } = result;
  const storeSettings = await getStoreSettings();
  const product = (await attachProductTags([rawProduct]))[0];

  if (product.category === 'encomenda') notFound();

  const kitMode = product.slug === 'monte-seu-kit-natalino' ? 'natal' : product.slug === 'monte-seu-kit-religioso' ? 'religioso' : null;
  if (kitMode) {
    const candidateSlugs = kitMode === 'natal'
      ? ['rena-tricotada', 'boneco-de-neve-tricotado', 'papai-noel-tricotado', 'pinguim-tricotado', 'arvore-tricotada', 'ursinho-polar-natalino', 'decoracao-feliz-natal-mini']
      : ['miniatura-jesus-cristo', 'divino-espirito-santo', 'nossa-senhora-aparecida-mini', 'sagrada-familia-minimalista', 'presepio-sagrada-familia', 'presepio-iluminado-estrela-de-belem'];
    const admin = getSupabaseAdmin();
    const { data: candidateData } = await admin.from('products').select('*,product_options(*)').in('slug', candidateSlugs).eq('active', true).order('name');
    const candidates = await Promise.all((candidateData ?? []).map(async candidate => ({
      ...candidate,
      product_options: await loadAvailableProductOptions(admin, (candidate.product_options ?? []) as ProductOption[]),
      customization_sections: await loadEffectiveCustomizationSections(admin, candidate.id, candidate.customization_sections),
    })));
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Link href="/" className="text-sm font-bold text-pink-600">← Voltar</Link><div className="mt-6 grid gap-7 lg:grid-cols-[320px_1fr]"><aside><div className="overflow-hidden rounded-3xl bg-pink-50"><img src={product.image_url ?? ''} alt={product.name} className="aspect-square h-full w-full object-cover" /></div><h1 className="mt-5 text-3xl font-black">{product.name}</h1><ProductSocialProof productId={product.id} orderCount={product.order_count} /><p className="mt-2 text-lg font-black text-pink-600">A partir de {kitMode === 'religioso' ? 'R$ 45,90' : 'R$ 69,90'}</p><p className="mt-3 text-sm leading-6 text-gray-600">{product.description}</p></aside><CustomKitConfigurator mode={kitMode} kitProduct={product} kitOptions={options} products={candidates as unknown as KitSelectableProduct[]} /></div><ProductReviews productId={product.id} /></div>;
  }

  const [related, user] = await Promise.all([
    getRelatedProducts(product.category, product.id, product.type).then(attachProductTags),
    getCurrentUser(),
  ]);

  const price = product.sale_price ?? product.base_price;
  const images = productImages(product);
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainText(product.seo_description || product.description, `${product.name}, produzido sob demanda pela ${storeSettings.identity.name}.`, 500),
    image: images,
    sku: product.sku || product.id,
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }} />
      <nav className="mb-4 text-sm text-gray-600 sm:mb-6 dark:text-gray-400">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">
          Início
        </Link>
        <span className="mx-2">/</span>
        <Link href={product.type === 'digital' ? '/stl' : '/products'} className="hover:text-gray-900 dark:hover:text-gray-100">
          {product.type === 'digital' ? 'Arquivos STL' : 'Catálogo'}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">{product.name}</span>
      </nav>

      <ProductDetail
        product={product}
        options={options}
        freeShippingThreshold={storeSettings.commerce.freeShippingThreshold}
        whatsappUrl={storeSettings.contact.whatsapp ? `https://wa.me/${storeSettings.contact.whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre ${product.name} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}): ${absoluteUrl(productPath(product))}`)}` : undefined}
      />
      <MetaProductView id={product.id} name={product.name} value={price} />

      <ProductReviews productId={product.id} isAdmin={user?.role === 'admin'} />

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Você também pode gostar</h2>
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
