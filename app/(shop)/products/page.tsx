import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Category, Product } from '@/types/database';

export const dynamic = 'force-dynamic';

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

  let query = admin.from('products').select('*').eq('active', true).in('category', ['chaveiros', 'escritorio', 'criaturas']).not('name', 'ilike', 'Encomenda%');

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
    <div>
      {/* Full-width Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-10 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Peças exclusivas impressas em 3D
        </h2>
        <p className="mt-2 text-sm text-white/90 sm:text-base">
          Cada item é fabricado sob demanda com acabamento artesanal. Encontre o seu favorito!
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Catálogo</h1>
        <p className="mt-1 text-sm text-gray-600">
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
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        className="mb-8 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_200px_auto]"
      >
        {category ? (
          <input type="hidden" name="category" value={category} />
        ) : null}
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Buscar por nome..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <select
          name="sort"
          defaultValue={sort ?? 'recent'}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Aplicar
        </button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">
            Nenhum produto encontrado com esses filtros.
          </p>
          <Link
            href="/products"
            className="mt-3 inline-block text-sm font-medium text-pink-600 hover:text-pink-700"
          >
            Limpar filtros
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
