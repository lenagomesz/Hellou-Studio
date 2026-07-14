import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductForm } from '@/components/admin/ProductForm';
import { OptionsManager } from '@/components/admin/OptionsManager';
import type { Product, ProductOption } from '@/types/database';

export const dynamic = 'force-dynamic';

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

export default async function EditProductPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) notFound();

  const { product, options } = result;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/dashboard/products/${product.id}`}
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← Voltar para o produto
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Editar produto</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{product.name}</p>
      </header>

      <ProductForm mode="edit" product={product} />

      <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tamanhos e variações</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Adicione tamanhos (P, M, G), cores ou outras variações com modificadores de preço e controle de estoque.
        </p>
        <div className="mt-4">
          <OptionsManager productId={product.id} initialOptions={options} />
        </div>
      </div>
    </div>
  );
}
