import Link from 'next/link';
import type { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalogCategories } from '@/lib/catalog-categories';
import type { Product } from '@/types/database';
import { attachProductTags } from '@/lib/product-tags';
import { matchesCatalogSearch } from '@/lib/catalog-search';
import { getStoreSettings } from '@/lib/store-settings';
import { Palette, Search, ShieldCheck, SlidersHorizontal, Sparkles, Truck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo de produtos impressos em 3D',
  description: 'Chaveiros, organizadores, criaturas e peças personalizadas impressas em 3D e produzidas sob demanda.',
  alternates: { canonical: '/products' },
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'name', label: 'Nome (A–Z)' },
];

async function getProductsRaw(filters: {
  category?: string;
  search?: string;
  sort?: string;
  productIds?: string[];
  wholesale?: boolean;
}): Promise<Product[]> {
  console.log('[products/page] getProductsRaw called, filters:', filters);
  console.log('[products/page] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING');

  let admin;
  try {
    admin = getSupabaseAdmin();
    console.log('[products/page] getSupabaseAdmin() OK');
  } catch (err) {
    console.error('[products/page] getSupabaseAdmin() THREW:', err);
    return [];
  }

  let query = admin.from('products').select('*, product_options(price_modifier)').eq('active', true).or('type.eq.physical,type.is.null').neq('category', 'encomenda').not('name', 'ilike', 'Encomenda%');

  if (filters.productIds) {
    if (filters.productIds.length === 0) return [];
    query = query.in('id', filters.productIds);
  }

  if (filters.wholesale) query = query.eq('is_wholesale', true);

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('base_price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('base_price', { ascending: false });
      break;
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  console.log('[products/page] query result - count:', data?.length ?? 0, 'error:', error?.message ?? 'none');
  const products = await attachProductTags((data ?? []) as Product[]);
  if (!filters.search?.trim()) return products;

  return products.filter((product) => matchesCatalogSearch(product, filters.search ?? ''));
}

async function getProducts(filters: {
  category?: string;
  search?: string;
  sort?: string;
  productIds?: string[];
  wholesale?: boolean;
}): Promise<Product[]> {
  return getProductsRaw(filters);
}

export default async function ProductsCatalogPage(
  props: {
    searchParams: Promise<{
      category?: string | string[];
      search?: string | string[];
      sort?: string | string[];
      collection?: string | string[];
      wholesale?: string | string[];
    }>;
  },
) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const search =
    typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const sort =
    typeof searchParams.sort === 'string' ? searchParams.sort : undefined;
  const collectionId =
    typeof searchParams.collection === 'string' ? searchParams.collection : undefined;
  const wholesale = searchParams.wholesale === 'true';

  const [categories, storeSettings] = await Promise.all([
    getCatalogCategories('physical'),
    getStoreSettings(),
  ]);
  const collection = (storeSettings.home.collections ?? []).find((item) => item.id === collectionId && item.active);
  const validCategory = category && categories.some((item) => item.slug === category) ? category : undefined;
  const products = await getProducts({ category: validCategory, search, sort, productIds: collection?.productIds, wholesale });
  const activeCategory = validCategory ?? 'all';
  const categoryTabs = [{ slug: 'all', name: 'Todos' }, ...categories];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#ffffff_38%,#fff9f4_100%)] dark:bg-[linear-gradient(180deg,#111827_0%,#030712_45%,#111827_100%)]">
      <section className="px-3 pt-3 sm:px-5 sm:pt-5" aria-labelledby="catalog-hero-title">
        <div className="relative mx-auto flex min-h-[235px] max-w-[1440px] items-center overflow-hidden rounded-[26px] border border-pink-100 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,.82),transparent_24%),radial-gradient(circle_at_78%_85%,rgba(249,115,22,.18),transparent_27%),linear-gradient(125deg,#ffe4f1_0%,#fff0f3_48%,#fff1df_100%)] px-6 py-9 shadow-[0_24px_70px_-38px_rgba(219,39,119,.42)] sm:min-h-[285px] sm:rounded-[32px] sm:px-12 lg:px-16 dark:border-pink-900/40 dark:bg-[radial-gradient(circle_at_80%_10%,rgba(249,115,22,.12),transparent_30%),linear-gradient(125deg,#25131f,#2b1720_52%,#2c1b12)]">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[42px] border-white/40 sm:right-8" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 right-[16%] h-48 w-48 rounded-full bg-gradient-to-br from-pink-300/20 to-orange-300/35 blur-2xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-pink-600 shadow-sm backdrop-blur sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Feito especialmente para você
            </div>
            <h1 id="catalog-hero-title" className="max-w-2xl text-[2.35rem] font-black leading-[.98] tracking-[-0.055em] text-gray-950 sm:text-5xl lg:text-6xl dark:text-white">
              Ideias que ganham <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">forma.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7 dark:text-gray-300">
              Peças impressas em 3D, produzidas sob demanda com cuidado nos detalhes e personalidade em cada camada.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-gray-700 sm:text-xs dark:text-gray-200">
              <span className="inline-flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-pink-600" /> Produção artesanal</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-orange-500" /> Envio para todo o Brasil</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-pink-600" /> Compra segura</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-3 py-8 sm:px-5 sm:py-10">
        <header className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-pink-600">Catálogo Hellou</p>
            <h2 className="text-2xl font-black tracking-[-0.035em] text-gray-950 sm:text-3xl dark:text-white">
              {collection ? collection.name : wholesale ? 'Seleção para lojistas' : 'Encontre seu favorito'}
            </h2>
            {collection && <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{collection.description}</p>}
            {wholesale && <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">Produtos para comprar em quantidade. O pedido mínimo aparece em cada item.</p>}
          </div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">{products.length}</strong>{' '}
            {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
        </header>

        <form method="get" className="mb-4 grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-pink-100/80 bg-white p-2.5 shadow-[0_12px_38px_-26px_rgba(219,39,119,.4)] sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:gap-3 sm:p-3 dark:border-gray-800 dark:bg-gray-900">
          {validCategory ? <input type="hidden" name="category" value={validCategory} /> : null}
          {collection ? <input type="hidden" name="collection" value={collection.id} /> : null}
          {wholesale ? <input type="hidden" name="wholesale" value="true" /> : null}
          <label className="relative col-span-2 block sm:col-span-1">
            <span className="sr-only">Buscar no catálogo</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-500" />
            <input type="search" name="search" defaultValue={search ?? ''} placeholder="Buscar por nome, descrição ou tag" className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-pink-900/30" />
          </label>
          <label className="relative">
            <span className="sr-only">Ordenar produtos</span>
            <select name="sort" defaultValue={sort ?? 'recent'} className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/70 px-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:ring-pink-900/30">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </label>
          <button type="submit" className="h-11 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 px-5 text-xs font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/20 active:translate-y-0">
            Buscar
          </button>
        </form>

        <nav className="mb-7 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Categorias de produtos">
          {collection && <Link href="/products" className="shrink-0 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-bold text-pink-700 transition hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950/30 dark:text-pink-300">← Catálogo completo</Link>}
          {wholesale && <Link href="/products" className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">← Catálogo completo</Link>}
          {categoryTabs.map((cat) => {
            const params = new URLSearchParams();
            if (cat.slug !== 'all') params.set('category', cat.slug);
            if (search) params.set('search', search);
            if (sort) params.set('sort', sort);
            if (wholesale) params.set('wholesale', 'true');
            const href = `/products${params.toString() ? `?${params}` : ''}`;
            const isActive = activeCategory === cat.slug;
            return (
              <Link key={cat.slug} href={href} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${isActive ? 'border-gray-950 bg-gray-950 text-white shadow-md dark:border-white dark:bg-white dark:text-gray-950' : 'border-gray-200 bg-white text-gray-600 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-pink-800 dark:hover:bg-pink-950/30'}`}>
                {cat.name}
              </Link>
            );
          })}
        </nav>

        {products.length === 0 ? (
          <div className="rounded-[28px] border border-pink-100 bg-white px-6 py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-orange-100 text-pink-600"><Sparkles className="h-5 w-5" /></span>
            <h3 className="mt-4 text-xl font-black text-gray-950 dark:text-white">Nenhum produto por aqui ainda</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">{validCategory || search || collection || wholesale ? 'Tente mudar a busca ou escolher outra categoria.' : 'Estamos preparando novas peças para você. Volte em breve!'}</p>
            {(validCategory || search || collection || wholesale) && <Link href="/products" className="mt-5 inline-flex rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-pink-500/20">Limpar filtros</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} category={categories.find((item) => item.slug === product.category)} catalog />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
