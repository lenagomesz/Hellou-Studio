import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductEditor } from '@/components/admin/ProductEditor/ProductEditor';
import { STLProductForm } from '@/components/admin/STLProductForm';
import Link from 'next/link';
import type { Product, ProductOption } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('products').select('*').eq('id', id).maybeSingle();
  return data as Product | null;
}

async function getProductOptions(productId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('product_options')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')
    .order('created_at');
  return (data || []) as ProductOption[];
}

export default async function EditProductPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const product = await getProduct(id);
  if (!product) notFound();

  if (product.type === 'digital') {
    return (
      <div className="w-full space-y-6">
        <header className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
          <Link href={`/dashboard/products/${product.id}`} className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Voltar para o produto
          </Link>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Produto digital</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Editar produto STL</h1>
          <p className="mt-2 text-sm text-slate-600">{product.name}</p>
        </header>
        <STLProductForm mode="edit" product={product} />
      </div>
    );
  }

  const productOptions = await getProductOptions(id);
  return <ProductEditor mode="edit" product={product} productOptions={productOptions} />;
}
