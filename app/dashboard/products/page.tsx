import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isCategory, VALID_CATEGORIES } from '@/lib/api';
import type { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

async function getProducts(filters: { category?: string; search?: string; status?: string }) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.category && isCategory(filters.category)) {
    query = query.eq('category', filters.category);
  }
  if (filters.status === 'active') {
    query = query.eq('active', true);
  } else if (filters.status === 'inactive') {
    query = query.eq('active', false);
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data } = await query;
  return (data ?? []) as Product[];
}

export default async function ProductsListPage(props: PageProps<'/dashboard/products'>) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;

  const products = await getProducts({ category, search, status });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="mt-1 text-sm text-gray-600">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
        >
          Novo produto
        </Link>
      </header>

      <form
        method="get"
        className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]"
      >
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Buscar por nome..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <select
          name="category"
          defaultValue={category ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">Todas as categorias</option>
          {VALID_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Filtrar
        </button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-600">Nenhum produto encontrado.</p>
          <Link
            href="/dashboard/products/new"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            Criar primeiro produto
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100">
          <table className="min-w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Produto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Preço base
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-100 to-orange-100" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 max-w-md">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {formatPrice(product.base_price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="text-sm font-medium text-pink-600 hover:text-pink-700"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
