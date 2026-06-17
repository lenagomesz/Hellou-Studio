import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OptionsManager } from '@/components/admin/OptionsManager';
import type { Product, ProductOption } from '@/types/database';

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

async function getProductWithOptions(id: string) {
  const admin = getSupabaseAdmin();
  const [productRes, optionsRes] = await Promise.all([
    admin.from('products').select('*').eq('id', id).maybeSingle(),
    admin
      .from('product_options')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!productRes.data) return null;
  return {
    product: productRes.data as Product,
    options: (optionsRes.data ?? []) as ProductOption[],
  };
}

export default async function ProductDetailPage(
  props: PageProps<'/dashboard/products/[id]'>,
) {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) notFound();

  const { product, options } = result;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link href="/dashboard/products" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          ← Voltar para produtos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{CATEGORY_LABELS[product.category] ?? product.category}</span>
              <span>·</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(product.base_price)}</span>
              <span>·</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  product.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {product.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            Editar produto
          </Link>
        </div>
      </header>

      <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes</h2>
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-600 dark:text-gray-400">Descrição</dt>
            <dd className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
              {product.description ?? <span className="text-gray-400 dark:text-gray-500">—</span>}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600 dark:text-gray-400">Imagem</dt>
            <dd className="mt-1">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-32 w-32 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <span className="text-gray-400 dark:text-gray-500">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tamanhos e variações</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Adicione tamanhos (P, M, G) ou outras variações com modificadores de preço e controle de estoque.
        </p>
        <div className="mt-4">
          <OptionsManager productId={product.id} initialOptions={options} />
        </div>
      </div>
    </div>
  );
}
