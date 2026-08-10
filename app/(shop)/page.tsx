import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { FeaturedProductsClient } from '@/components/shop/FeaturedProducts';
import { ProductCard } from '@/components/shop/ProductCard';
import { HeroCarousel } from '@/components/shop/HeroCarousel';
import { HomeHeroCarousel } from '@/components/shop/HomeHeroCarousel';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
// import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Marquee } from '@/components/ui/Marquee';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { getCatalogCategories } from '@/lib/catalog-categories';
import type { Product } from '@/types/database';
import { attachProductTags } from '@/lib/product-tags';
import { DEFAULT_PRODUCTION_LEAD_TIME } from '@/lib/production';

export const metadata: Metadata = {
  title: { absolute: 'Hellou Studio' },
  description: 'Descubra produtos impressos em 3D, peças personalizadas feitas sob demanda e arquivos STL prontos para seus projetos.',
  alternates: { canonical: '/' },
};

const FEATURES = [
  {
    emoji: '🎨',
    title: 'Personalização Total',
    description:
      'Escolha cores, tamanhos e acabamentos únicos para cada produto.',
  },
  {
    emoji: '⚡',
    title: 'Sob Demanda',
    description:
      'Cada peça é fabricada especialmente para você após o pedido.',
  },
  {
    emoji: '💎',
    title: 'Qualidade Premium',
    description:
      'Impressão 3D de alta resolução com acabamento impecável.',
  },
  {
    emoji: '🚀',
    title: 'Envio Rápido',
    description:
      `Produção em ${DEFAULT_PRODUCTION_LEAD_TIME} e envio com rastreamento.`,
  },
];

// const STATS = [
//   { value: '500+', label: 'Produtos criados' },
//   { value: '2000+', label: 'Clientes felizes' },
//   { value: '98%', label: 'Avaliações positivas' },
//   { value: '5 dias', label: 'Prazo de produção' },
// ];

const MARQUEE_ITEMS = [
  'Impressão 3D de alta resolução',
  'Personalização sob demanda',
  'Envio para todo o Brasil',
  'Materiais sustentáveis',
  'Acabamento premium',
  'Design exclusivo',
  'Atendimento humanizado',
  'Embalagem especial',
];

const getFeaturedProducts = unstable_cache(
  async (type: 'physical' | 'digital'): Promise<Product[]> => {
    console.log('[home/page] getFeaturedProducts called with type:', type);
    return withTimeout(
      (async () => {
        let admin;
        try {
          admin = getSupabaseAdmin();
        } catch (err) {
          console.error('[home/page] getSupabaseAdmin() THREW:', err);
          return [] as Product[];
        }

        let query = admin
          .from('products')
          .select('*, product_options(price_modifier)')
          .eq('active', true);

        if (type === 'physical') {
          query = query.or('type.eq.physical,type.is.null').neq('category', 'encomenda').not('name', 'ilike', 'Encomenda%');
        } else {
          query = query.eq('type', 'digital');
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) return [];
        return attachProductTags((data ?? []) as Product[]);
      })(),
    ).catch((err) => { console.error('[home/page] withTimeout catch:', err); return [] as Product[]; });
  },
  ['featured-products-limit-6'],
  { revalidate: 60 },
);

async function FeaturedProducts() {
  const [physicalProducts, digitalProducts, physicalCategories, digitalCategories] = await Promise.all([
    getFeaturedProducts('physical'),
    getFeaturedProducts('digital'),
    getCatalogCategories('physical'),
    getCatalogCategories('digital'),
  ]);

  if (physicalProducts.length === 0 && digitalProducts.length === 0) return null;

  return (
    <FeaturedProductsClient
      physicalProducts={physicalProducts}
      digitalProducts={digitalProducts}
      categories={[...physicalCategories, ...digitalCategories].filter((category, index, all) => all.findIndex((item) => item.slug === category.slug) === index)}
    />
  );
}

const getWholesaleProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('products')
        .select('*, product_options(price_modifier)')
        .eq('active', true)
        .eq('is_wholesale', true)
        .or('type.eq.physical,type.is.null')
        .neq('category', 'encomenda')
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) return [];
      return attachProductTags((data ?? []) as Product[]);
    } catch {
      return [];
    }
  },
  ['wholesale-products-home'],
  { revalidate: 60 },
);

async function WholesaleProducts() {
  const [products, categories] = await Promise.all([
    getWholesaleProducts(),
    getCatalogCategories('physical'),
  ]);
  if (products.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-orange-50 via-white to-pink-50 py-12 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal direction="scale">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">Atacado</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Para lojistas</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">Produtos selecionados para comprar em quantidade e abastecer sua loja.</p>
            </div>
            <Link href="/products?wholesale=true" className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 sm:mt-0">Ver todos <span aria-hidden="true">→</span></Link>
          </div>
        </ScrollReveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product, index) => (
            <ScrollReveal key={product.id} delay={index * 100} direction="up">
              <ProductCard product={product} category={categories.find((category) => category.slug === product.category)} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedSkeleton() {
  return (
    <section className="bg-white/80 dark:bg-gray-950/80 py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-pink-200/60" />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { getStoreSettings } = await import('@/lib/store-settings');
  const storeSettings = await getStoreSettings();
  const collections = (storeSettings.home.collections ?? []).filter((collection) => collection.active);
  return (
    <div className="overflow-x-hidden bg-white dark:bg-gray-950">
      {/* Promo banner */}
      <div className="home-promo flex min-h-10 items-center justify-center overflow-hidden bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-3 py-2 text-center sm:min-h-14 sm:px-4 sm:py-3">
        <p className="w-full whitespace-nowrap text-center text-[10px] font-medium leading-5 text-white min-[360px]:text-[11px] sm:hidden">
          🚚 <strong className="font-semibold">Frete grátis</strong> +{storeSettings.commerce.freeShippingThreshold.toLocaleString(storeSettings.commerce.locale, { style: 'currency', currency: storeSettings.commerce.currency, maximumFractionDigits: 0 })} <span aria-hidden="true" className="mx-1 text-white/75">·</span> 🎉 <strong className="font-semibold">{storeSettings.commerce.firstOrderDiscount}% OFF</strong> na 1ª compra
        </p>
        <p className="hidden shrink-0 items-center gap-2 whitespace-nowrap text-center text-sm font-medium leading-5 text-white sm:inline-flex">
          <span>🚚 <strong className="font-semibold">Frete grátis</strong> acima de {storeSettings.commerce.freeShippingThreshold.toLocaleString(storeSettings.commerce.locale, { style: 'currency', currency: storeSettings.commerce.currency, maximumFractionDigits: 0 })}</span>
          <span aria-hidden="true" className="text-white/75">·</span>
          <span>🎉 <strong className="font-semibold">{storeSettings.commerce.firstOrderDiscount}% OFF</strong> na sua primeira compra</span>
        </p>
      </div>

      <HomeHeroCarousel settings={storeSettings} />

      {/* =========================================== */}
      {/* MARQUEE STRIP */}
      {/* =========================================== */}
      <div className="border-y border-orange-200/40 dark:border-gray-800 bg-white dark:bg-gray-950">
        <Marquee items={MARQUEE_ITEMS} speed={35} />
      </div>

      {/* =========================================== */}
      {/* CATEGORIES */}
      {/* =========================================== */}
      <section className="bg-white/80 dark:bg-gray-950/80 py-12 sm:py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal direction="scale">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-800/50">
                Coleções
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Explore Nossas{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
                  Coleções
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Cada coleção foi pensada com carinho para atender diferentes estilos e necessidades.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4 sm:gap-6">
            {collections.map((collection, i) => (
              <ScrollReveal key={collection.id} delay={i * 150} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'} className="h-full">
                <Link
                  href={`/products?collection=${encodeURIComponent(collection.id)}`}
                  style={{ borderColor: '#EC489944', backgroundImage: 'linear-gradient(135deg, #EC489914, transparent 65%)' }}
                  className={`group relative h-full overflow-hidden rounded-2xl border bg-white text-center transition-all duration-500 hover-lift dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800 sm:rounded-3xl ${collection.imageOnly && collection.imageUrl ? 'block p-0' : 'flex items-center justify-center p-4 sm:p-8'}`}
                >
                  {collection.imageOnly && collection.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={collection.imageUrl} alt={collection.name} className="h-full min-h-48 w-full object-cover sm:min-h-72" />
                  ) : (
                  <>
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ backgroundImage: 'linear-gradient(135deg, #EC489918, transparent)' }} />
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-pink-500 opacity-0 blur-2xl transition-all duration-700 group-hover:right-0 group-hover:top-0 group-hover:opacity-30" />

                  <div className="relative">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 text-xl shadow-sm transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-lg sm:h-16 sm:w-16 sm:rounded-2xl sm:text-3xl sm:group-hover:scale-125">
                      {collection.emoji}
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-gray-900 transition-colors duration-300 group-hover:text-pink-700 dark:text-white dark:group-hover:text-pink-400 sm:mt-5 sm:text-lg">
                      {collection.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm sm:leading-relaxed">
                      {collection.description}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 transition-all duration-300 group-hover:gap-2 sm:mt-5 sm:gap-1.5 sm:text-sm sm:group-hover:gap-3">
                      Ver produtos
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </p>
                  </div>
                  </>
                  )}
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* CAROUSEL BANNER */}
      {/* =========================================== */}
      <section className="bg-white dark:bg-gray-950 py-8 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <ScrollReveal direction="scale">
            <HeroCarousel />
          </ScrollReveal>
        </div>
      </section>

      {/* =========================================== */}
      {/* FEATURED PRODUCTS */}
      {/* =========================================== */}
      <Suspense fallback={<FeaturedSkeleton />}>
        <FeaturedProducts />
      </Suspense>

      <Suspense fallback={null}>
        <WholesaleProducts />
      </Suspense>

      {/* =========================================== */}
      {/* STL MARKETPLACE BANNER */}
      {/* =========================================== */}
      <section className="bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 py-12 sm:py-20 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal direction="scale">
            <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
              {/* Esquerda - Content */}
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/25 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white ring-1 ring-white/40 mb-3">
                  <span>📥</span>
                  <span>Modelos 3D</span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                  Arquivos STL<br className="hidden md:block" />
                  <span className="text-white/90">da Hellou Studio</span>
                </h2>

                <p className="text-sm sm:text-base md:text-lg text-white/90 mb-4 sm:mb-6 leading-relaxed">
                  Modelos 3D prontos para imprimir. Originais, personalizáveis e com uso comercial livre.
                </p>

                {/* Benefícios em cards - Otimizado para mobile */}
                <div className="space-y-2 mb-5 sm:mb-7">
                  <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg p-2.5 sm:p-3">
                    <span className="text-lg sm:text-xl mt-0.5 flex-shrink-0">✓</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-xs sm:text-sm">Uso comercial livre</p>
                      <p className="text-xs text-white/80 hidden sm:block">Imprima e venda sem restrições</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg p-2.5 sm:p-3">
                    <span className="text-lg sm:text-xl mt-0.5 flex-shrink-0">✓</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-xs sm:text-sm">Prontos para FDM</p>
                      <p className="text-xs text-white/80 hidden sm:block">Otimizados para impressoras 3D</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg p-2.5 sm:p-3">
                    <span className="text-lg sm:text-xl mt-0.5 flex-shrink-0">✓</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-xs sm:text-sm">Personalizáveis</p>
                      <p className="text-xs text-white/80 hidden sm:block">Adapte cores, tamanhos e detalhes</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/stl"
                  className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-full bg-white text-pink-600 px-5 sm:px-6 py-2.5 sm:py-3 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm sm:text-base"
                >
                  Ver Modelos
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>

              {/* Direita - Visual */}
              <div className="hidden md:flex justify-center items-center">
                <div className="relative">
                  {/* Card principal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-3xl border border-white/30 transform scale-100 group-hover:scale-105 transition" />

                  <div className="relative h-80 w-80 flex items-center justify-center rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />

                    {/* Ícone grande */}
                    <div className="relative z-10 text-center">
                      <div className="text-8xl mb-4 animate-float">📥</div>
                      <div className="text-white/80 text-sm font-medium">Arquivo STL</div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* =========================================== */}
      {/* WHY CHOOSE US */}
      {/* =========================================== */}
      <section className="bg-white/80 dark:bg-gray-950/80 py-12 sm:py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal direction="right">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 dark:bg-pink-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pink-600 dark:text-pink-400 ring-1 ring-pink-100 dark:ring-pink-800/50">
                Diferenciais
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Por que escolher{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
                  helloustudio
                </span>
                ?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Cada peça é produzida com tecnologia de ponta e atenção a cada detalhe.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat, i) => (
              <ScrollReveal key={feat.title} delay={i * 120} direction={i < 2 ? 'left' : 'right'} className="h-full">
                <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-orange-100/60 dark:border-gray-800 bg-gradient-to-br from-orange-50/50 to-pink-50/30 dark:from-gray-900 dark:to-gray-900 p-7 text-center transition-all duration-500 hover:border-pink-200 dark:hover:border-pink-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-orange-400/0 transition-all duration-500 group-hover:from-pink-500/[0.03] group-hover:to-orange-400/[0.05]" />
                  <div className="relative flex flex-1 flex-col">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-orange-100 text-2xl shadow-sm transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 group-hover:shadow-lg mx-auto">
                      {feat.emoji}
                    </span>
                    <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white transition-colors duration-300 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                      {feat.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* STATS — comentado até ter dados reais */}
      {/* =========================================== */}
      {/*
      <section className="relative overflow-hidden bg-gradient-to-r from-pink-50 via-orange-50 to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl animate-float" />
          <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-4 text-center">
            {STATS.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 120} direction="scale">
                <div className="group rounded-2xl bg-white/60 dark:bg-gray-900/60 p-6 backdrop-blur-sm transition-all duration-500 hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg hover:scale-105">
                  <AnimatedCounter
                    target={stat.value}
                    className="text-3xl font-bold text-gray-800 dark:text-white sm:text-4xl"
                  />
                  <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* =========================================== */}
      {/* SOCIAL PROOF / REVIEWS — comentado até ter depoimentos reais */}
      {/* =========================================== */}
      {/*
      <section className="bg-white/80 dark:bg-gray-950/80 py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal direction="scale">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-800/50">
                Depoimentos
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                O que nossos clientes{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
                  dizem
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Centenas de clientes satisfeitos com produtos únicos e personalizados.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { name: 'Mariana S.', text: 'Amei o chaveiro personalizado! A qualidade é incrível e chegou super rápido.', stars: 5 },
              { name: 'Lucas R.', text: 'O organizador de desk ficou perfeito no meu setup. Já quero mais peças!', stars: 5 },
              { name: 'Ana P.', text: 'As criaturas são lindas demais! Comprei pra dar de presente e foi um sucesso.', stars: 5 },
            ].map((review, i) => (
              <ScrollReveal key={review.name} delay={i * 150} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'}>
                <div className="group relative overflow-hidden rounded-3xl border border-orange-100/60 dark:border-gray-800 bg-gradient-to-br from-orange-50/50 to-pink-50/30 dark:from-gray-900 dark:to-gray-900 p-7 transition-all duration-500 hover:shadow-xl hover:border-pink-200 dark:hover:border-pink-800 hover:bg-white dark:hover:bg-gray-800 hover:-translate-y-2">
                  <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-gradient-to-br from-orange-200/30 to-pink-200/30 blur-xl opacity-0 transition-all duration-500 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.stars }).map((_, j) => (
                        <span key={j} className="text-amber-400 text-base transition-transform duration-300 group-hover:scale-110" style={{ transitionDelay: `${j * 50}ms` }}>★</span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                      &ldquo;{review.text}&rdquo;
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-xs font-bold text-orange-700 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110">
                        {review.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{review.name}</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* =========================================== */}
      {/* CTA FINAL — Catálogo + Sob Demanda */}
      {/* =========================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-pink-50/40 to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 top-0 h-64 w-64 rounded-full bg-pink-200/30 blur-3xl dark:bg-pink-500/10" />
          <div className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-500/10" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <ScrollReveal direction="up">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
                Pronto para criar algo{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                  único
                </span>
                ?
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base text-gray-600 dark:text-gray-300 leading-relaxed sm:text-lg">
                Explore nosso catálogo ou envie seu próprio modelo 3D.
                Cada peça é impressa com carinho especialmente para você.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {/* Card — Explorar catálogo */}
              <Link
                href="/products"
                className="group relative overflow-hidden rounded-2xl border border-pink-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-pink-100/50 dark:hover:shadow-pink-900/20 hover:-translate-y-1"
              >
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-pink-100 to-orange-100 opacity-60 blur-2xl transition-opacity group-hover:opacity-100 dark:from-pink-900/30 dark:to-orange-900/20" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                    Explorar catálogo
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Chaveiros, miniaturas, itens de escritório e muito mais. Prontos para você escolher e personalizar.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-600 dark:text-pink-400 transition-colors group-hover:text-orange-500">
                    Ver produtos
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>

              {/* Card — Impressão sob demanda */}
              <Link
                href="/request-print"
                className="group relative overflow-hidden rounded-2xl border border-orange-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-orange-100/50 dark:hover:shadow-orange-900/20 hover:-translate-y-1"
              >
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 opacity-60 blur-2xl transition-opacity group-hover:opacity-100 dark:from-orange-900/30 dark:to-pink-900/20" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
                    </svg>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                    Impressão sob demanda
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Envie seu arquivo .STL e receba um orçamento grátis. Imprimimos qualquer modelo 3D nas cores que quiser.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 dark:text-orange-400 transition-colors group-hover:text-pink-500">
                    Solicitar impressão
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

