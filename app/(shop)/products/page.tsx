import Link from 'next/link';
import type { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Category, Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo de produtos impressos em 3D',
  description: 'Chaveiros, organizadores, criaturas e peças personalizadas impressas em 3D e produzidas sob demanda.',
  alternates: { canonical: '/products' },
};

const CATEGORIES: { slug: Category | 'all'; label: string }[] = [
  { slug: 'all', label: 'Todos' },
  { slug: 'chaveiros', label: 'Chaveiros' },
  { slug: 'escritorio', label: 'Escritório' },
  { slug: 'criaturas', label: 'Criaturas' },
];

const VALID_CATEGORIES: Category[] = ['chaveiros', 'escritorio', 'criaturas'];

function isCategory(value: string): value is Category {
  return (VALID_CATEGORIES as string[]).includes(value);
}

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
}): Promise<Product[]> {
  console.log('[products/page] getProductsRaw called, filters:', filters);
  console.log('[products/page] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING');
  console.log('[products/page] SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  let admin;
  try {
    admin = getSupabaseAdmin();
    console.log('[products/page] getSupabaseAdmin() OK');
  } catch (err) {
    console.error('[products/page] getSupabaseAdmin() THREW:', err);
    return [];
  }

  let query = admin.from('products').select('*').eq('active', true).in('category', ['chaveiros', 'escritorio', 'criaturas']).not('name', 'ilike', 'Encomenda%').neq('type', 'digital');

  if (filters.category && isCategory(filters.category)) {
    query = query.eq('category', filters.category);
  }

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
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
  return (data ?? []) as Product[];
}

async function getProducts(filters: {
  category?: string;
  search?: string;
  sort?: string;
}): Promise<Product[]> {
  return getProductsRaw(filters);
}

export default async function ProductsCatalogPage(
  props: PageProps<'/products'>,
) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const search =
    typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const sort =
    typeof searchParams.sort === 'string' ? searchParams.sort : undefined;

  const products = await getProducts({ category, search, sort });
  const activeCategory = category && isCategory(category) ? category : 'all';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Full-width Banner */}
      <div className="flex h-40 flex-col items-center justify-center bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-6 py-4 text-center sm:h-44 sm:px-10">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Peças exclusivas impressas em 3D
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
          Cada item é fabricado sob demanda com acabamento artesanal. Encontre o seu favorito!
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Catálogo</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {products.length}{' '}
          {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const params = new URLSearchParams();
          if (cat.slug !== 'all') params.set('category', cat.slug);
          if (search) params.set('search', search);
          if (sort) params.set('sort', sort);
          const href = `/products${params.toString() ? `?${params}` : ''}`;
          const isActive = activeCategory === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-sm'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        className="mb-8 grid gap-3 grid-cols-[1fr_auto] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-sm sm:grid-cols-[1fr_180px_auto]"
      >
        {category ? (
          <input type="hidden" name="category" value={category} />
        ) : null}
        <div className="relative col-span-2 sm:col-span-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Buscar por nome..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all focus:bg-white dark:focus:bg-gray-700 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
          />
        </div>
        <select
          name="sort"
          defaultValue={sort ?? 'recent'}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3 sm:px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 transition-all focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:focus:bg-gray-700"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="dark:bg-gray-800 dark:text-gray-100">
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-500/20 transition-all hover:shadow-lg hover:shadow-pink-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          Buscar
        </button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          {category || search ? (
            <>
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum produto encontrado com esses filtros.
              </p>
              <Link
                href="/products"
                className="mt-3 inline-block text-sm font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300"
              >
                Limpar filtros
              </Link>
            </>
          ) : (
            <>
              <span className="text-5xl">✨🎨</span>
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                Opa! Ainda não chegaram novidades...
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Estamos preparando peças incríveis pra você! 🚀<br />
                Volte em breve, novidades a caminho!
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
