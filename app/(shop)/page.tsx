import Link from 'next/link';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { HeroCarousel } from '@/components/shop/HeroCarousel';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
// import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Marquee } from '@/components/ui/Marquee';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types/database';

const CATEGORIES = [
  {
    slug: 'chaveiros',
    label: 'Chaveiros',
    emoji: '🔑',
    description: 'Chaveiros personalizáveis para todos os estilos.',
    color: 'from-pink-400 to-orange-400',
  },
  {
    slug: 'escritorio',
    label: 'Escritório',
    emoji: '🖊️',
    description: 'Organizadores e acessórios 3D para seu desk.',
    color: 'from-orange-400 to-pink-400',
  },
  {
    slug: 'criaturas',
    label: 'Criaturas',
    emoji: '🦊',
    description: 'Personagens adoráveis feitos com carinho.',
    color: 'from-pink-500 to-orange-400',
  },
];

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
      'Produção em até 3 dias úteis e envio com rastreamento.',
  },
];

// const STATS = [
//   { value: '500+', label: 'Produtos criados' },
//   { value: '2000+', label: 'Clientes felizes' },
//   { value: '98%', label: 'Avaliações positivas' },
//   { value: '3 dias', label: 'Prazo de produção' },
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
  async (): Promise<Product[]> => {
    console.log('[home/page] getFeaturedProducts called');
    console.log('[home/page] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING');
    console.log('[home/page] SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    return withTimeout(
      (async () => {
        let admin;
        try {
          admin = getSupabaseAdmin();
          console.log('[home/page] getSupabaseAdmin() OK');
        } catch (err) {
          console.error('[home/page] getSupabaseAdmin() THREW:', err);
          return [] as Product[];
        }
        const { data, error } = await admin
          .from('products')
          .select('*')
          .eq('active', true)
          .in('category', ['chaveiros', 'escritorio', 'criaturas'])
          .not('name', 'ilike', 'Encomenda%')
          .order('created_at', { ascending: false })
          .limit(8);
        console.log('[home/page] featured query - count:', data?.length ?? 0, 'error:', error?.message ?? 'none');
        if (error) return [];
        return (data ?? []) as Product[];
      })(),
    ).catch((err) => { console.error('[home/page] withTimeout catch:', err); return [] as Product[]; });
  },
  ['featured-products'],
  { revalidate: 60 },
);

async function FeaturedProducts() {
  const featured = await getFeaturedProducts();
  if (featured.length === 0) return null;
  return (
    <section className="bg-white/80 dark:bg-gray-950/80 py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal direction="left">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-800">
                Destaques
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl md:text-4xl">
                Lançamentos{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
                  Recentes
                </span>
              </h2>
            </div>
            <Link
              href="/products"
              className="group flex items-center gap-1.5 rounded-full border border-orange-200/60 dark:border-orange-800/40 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-semibold text-orange-600 dark:text-orange-400 shadow-sm transition-all duration-300 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400 hover:shadow-md hover:scale-[1.03] active:scale-[0.98]"
            >
              Ver tudo
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featured.map((product, i) => (
            <ScrollReveal key={product.id} delay={i * 100} direction={i % 2 === 0 ? 'up' : 'scale'}>
              <div className="hover-lift transition-all duration-500">
                <ProductCard product={product} />
              </div>
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
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="overflow-x-hidden bg-white dark:bg-gray-950">
      {/* Promo banner */}
      <div className="bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-4 py-2.5 text-center">
        <p className="text-xs font-medium text-white sm:text-sm">
          🚚 <span className="font-semibold">Frete grátis</span> acima de R$99 &nbsp;·&nbsp; 🎉 <span className="font-semibold">10% OFF</span> na sua primeira compra
        </p>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* HERO */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-pink-950/10 dark:to-gray-900" />
        <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200/40 to-orange-200/30 dark:from-pink-900/20 dark:to-orange-900/10 blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 h-56 w-56 rounded-full bg-gradient-to-br from-orange-200/30 to-pink-100/20 dark:from-orange-900/15 dark:to-pink-900/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-orange-100/30 to-pink-100/20 dark:from-pink-900/10 dark:to-orange-900/10 blur-3xl animate-pulse-soft" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          {/* Badge */}
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 dark:border-orange-800/40 bg-white/80 dark:bg-gray-900/80 px-4 py-2 text-xs font-semibold text-orange-700 dark:text-orange-400 shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              Novidades toda semana
            </span>
          </div>

          {/* Title */}
          <h1
            className="mx-auto mt-8 max-w-4xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
              Produtos Únicos
            </span>
            <br />
            <span className="text-gray-900 dark:text-white">Fabricados em 3D</span>
          </h1>

          {/* Subtitle */}
          <p
            className="mx-auto mt-6 max-w-xl text-lg text-gray-600 dark:text-gray-300 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Descubra uma coleção exclusiva de chaveiros, itens de escritório e
            criaturas fofas, todos impressos sob demanda com a sua cara.
          </p>

          {/* CTAs */}
          <div
            className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              href="/products"
              className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-pink-200/30 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-200/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <span className="relative">Explorar Catálogo</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/products?category=criaturas"
              className="group inline-flex items-center rounded-full border border-pink-200/60 dark:border-pink-800/40 bg-white/80 dark:bg-gray-900/80 px-7 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 backdrop-blur-sm transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 hover:border-orange-200 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="mr-2 transition-transform duration-300 group-hover:scale-110">🦊</span>
              Ver Criaturas
            </Link>
          </div>

          {/* Trust badges */}
          <div
            className="mt-14 flex flex-wrap justify-center gap-6 animate-fade-in"
            style={{ animationDelay: '500ms' }}
          >
            {['Atendimento humanizado', 'Bom acabamento', 'Pagamento seguro'].map((text) => (
              <span key={text} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* MARQUEE STRIP */}
      {/* ═══════════════════════════════════════════ */}
      <div className="border-y border-orange-200/40 dark:border-gray-800 bg-white dark:bg-gray-950">
        <Marquee items={MARQUEE_ITEMS} speed={35} />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* CATEGORIES */}
      {/* ═══════════════════════════════════════════ */}
      <section className="bg-white/80 dark:bg-gray-950/80 py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal direction="scale">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-800/50">
                Categorias
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Explore Nossa{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
                  Coleção
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Cada categoria foi pensada com carinho para atender diferentes estilos e necessidades.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {CATEGORIES.map((cat, i) => (
              <ScrollReveal key={cat.slug} delay={i * 150} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'}>
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="group relative overflow-hidden rounded-3xl border border-orange-100/60 dark:border-gray-800 bg-gradient-to-br from-orange-50/50 to-pink-50/30 dark:from-gray-900 dark:to-gray-900 p-8 text-center hover-lift block transition-all duration-500 hover:border-pink-200 dark:hover:border-pink-800 hover:bg-white dark:hover:bg-gray-800"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]`} />
                  <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${cat.color} opacity-0 blur-2xl transition-all duration-700 group-hover:opacity-30 group-hover:top-0 group-hover:right-0`} />

                  <div className="relative">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 text-3xl shadow-sm transition-all duration-500 group-hover:scale-125 group-hover:shadow-lg group-hover:-rotate-6">
                      {cat.emoji}
                    </span>
                    <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300 group-hover:text-pink-700 dark:group-hover:text-pink-400">
                      {cat.label}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {cat.description}
                    </p>
                    <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-600 dark:text-pink-400 transition-all duration-300 group-hover:gap-3">
                      Ver produtos
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* CAROUSEL BANNER */}
      {/* ═══════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <ScrollReveal direction="scale">
            <HeroCarousel />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* FEATURED PRODUCTS */}
      {/* ═══════════════════════════════════════════ */}
      <Suspense fallback={<FeaturedSkeleton />}>
        <FeaturedProducts />
      </Suspense>

      {/* ═══════════════════════════════════════════ */}
      {/* WHY CHOOSE US */}
      {/* ═══════════════════════════════════════════ */}
      <section className="bg-white/80 dark:bg-gray-950/80 py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
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

      {/* ═══════════════════════════════════════════ */}
      {/* STATS — comentado até ter dados reais */}
      {/* ═══════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════ */}
      {/* SOCIAL PROOF / REVIEWS — comentado até ter depoimentos reais */}
      {/* ═══════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════ */}
      {/* CTA FINAL — Catálogo + Sob Demanda */}
      {/* ═══════════════════════════════════════════ */}
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
