import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductForm } from '@/components/admin/ProductForm';
import { ProductTypeTabs } from '@/components/admin/ProductTypeTabs';
import { STLProductForm } from '@/components/admin/STLProductForm';
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
      .order('sort_order', { ascending: true })
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

        <ProductTypeTabs active="digital" />
        <STLProductForm mode="edit" product={product} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <header className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <Link
          href={`/dashboard/products/${product.id}`}
          className="text-sm text-slate-500 hover:text-pink-600"
        >
          ← Voltar para o produto
        </Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Catálogo inteligente</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Editar produto físico</h1>
        <p className="mt-2 text-sm text-slate-600">{product.name}</p>
      </header>

      <ProductTypeTabs active="physical" />
      <ProductForm mode="edit" product={product} productOptions={options} />
    </div>
  );
}
