import Link from 'next/link';
import type { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalogCategories } from '@/lib/catalog-categories';
import type { Product } from '@/types/database';
import { attachProductTags } from '@/lib/product-tags';
import { matchesCatalogSearch } from '@/lib/catalog-search';
import { getStoreSettings } from '@/lib/store-settings';

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
  const category = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : undefined;
  const collectionId = typeof searchParams.collection === 'string' ? searchParams.collection : undefined;
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="flex h-40 flex-col items-center justify-center bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-6 py-4 text-center sm:h-44 sm:px-10">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Peças exclusivas impressas em 3D</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
          Cada item é fabricado sob demanda com acabamento artesanal. Encontre o seu favorito!
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-3 py-8 sm:px-5 sm:py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{collection ? collection.name : wholesale ? 'Para lojistas' : 'Catálogo'}</h1>
          {collection && <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{collection.description}</p>}
          {wholesale && <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">Produtos para comprar em quantidade. O pedido mínimo aparece em cada item.</p>}
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {products.length} {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {collection && <Link href="/products" className="shrink-0 rounded-full border border-pink-200 bg-pink-50 px-4 py-1.5 text-sm font-semibold text-pink-700 transition hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950/30 dark:text-pink-300">← Ver catálogo completo</Link>}
          {wholesale && <Link href="/products" className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">← Ver catálogo completo</Link>}
          {categoryTabs.map((cat) => {
            const params = new URLSearchParams();
            if (cat.slug !== 'all') params.set('category', cat.slug);
            if (search) params.set('search', search);
            if (sort) params.set('sort', sort);
            if (wholesale) params.set('wholesale', 'true');
            const href = `/products${params.toString() ? `?${params}` : ''}`;
            const isActive = activeCategory === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={href}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${isActive ? 'bg-pink-500 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-700 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        <form method="get" className="mb-8 grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px_auto] sm:p-5 dark:border-gray-800 dark:bg-gray-900">
          {validCategory ? <input type="hidden" name="category" value={validCategory} /> : null}
          {collection ? <input type="hidden" name="collection" value={collection.id} /> : null}
          {wholesale ? <input type="hidden" name="wholesale" value="true" /> : null}
          <div className="relative col-span-2 sm:col-span-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-pink-500" aria-hidden="true">⌕</span>
            <input
              type="search"
              name="search"
              defaultValue={search ?? ''}
              placeholder="Buscar por nome, descrição ou tag..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-700"
            />
          </div>
          <select name="sort" defaultValue={sort ?? 'recent'} className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 sm:px-4 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-700">
            {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/20 active:translate-y-0">Buscar</button>
        </form>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {validCategory || search || collection || wholesale ? (
              <><p className="text-gray-600 dark:text-gray-400">Nenhum produto encontrado com esses filtros.</p><Link href="/products" className="mt-3 inline-block text-sm font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300">Limpar filtros</Link></>
            ) : (
              <><span className="text-5xl">✨🎨</span><h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Opa! Ainda não chegaram novidades...</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Estamos preparando peças incríveis pra você! 🚀<br />Volte em breve, novidades a caminho!</p></>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => <ProductCard key={product.id} product={product} category={categories.find((item) => item.slug === product.category)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
