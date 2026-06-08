import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductForm } from '@/components/admin/ProductForm';
import type { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data as Product | null;
}

export default async function EditProductPage(
  props: PageProps<'/dashboard/products/[id]/edit'>,
) {
  const { id } = await props.params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/dashboard/products/${product.id}`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Voltar para o produto
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Editar produto</h1>
        <p className="mt-1 text-sm text-gray-600">{product.name}</p>
      </header>

      <ProductForm mode="edit" product={product} />
    </div>
  );
}
