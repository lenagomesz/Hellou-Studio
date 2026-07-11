import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductReviews } from '@/components/shop/ProductReviews';
import { getCurrentUser } from '@/lib/api';
import type { Product, ProductOption } from '@/types/database';

function getProductWithOptions(id: string) {
  return unstable_cache(
    () =>
      withTimeout(
        (async () => {
          const admin = getSupabaseAdmin();
          const [productRes, optionsRes] = await Promise.all([
            admin
              .from('products')
              .select('*')
              .eq('id', id)
              .eq('active', true)
              .maybeSingle(),
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
        })(),
      ).catch(() => null),
    [`product-${id}`],
    { revalidate: 60 },
  )();
}

function getRelatedProducts(category: string, excludeId: string, productType: string) {
  return unstable_cache(
    () =>
      withTimeout(
        (async () => {
          const admin = getSupabaseAdmin();
          let query = admin
            .from('products')
            .select('*')
            .eq('active', true)
            .eq('category', category)
            .neq('id', excludeId);

          if (productType === 'digital') {
            query = query.eq('type', 'digital');
          } else {
            query = query.neq('type', 'digital');
          }

          const { data } = await query
            .in('category', ['chaveiros', 'escritorio', 'criaturas'])
            .not('name', 'ilike', 'Encomenda%')
            .order('created_at', { ascending: false })
            .limit(4);
          return (data ?? []) as Product[];
        })(),
      ).catch(() => [] as Product[]),
    [`related-${category}-${excludeId}-${productType}`],
    { revalidate: 60 },
  )();
}

export default async function ProductDetailPage(
  props: PageProps<'/products/[id]'>,
) {
  const { id } = await props.params;
  const result = await getProductWithOptions(id);
  if (!result) notFound();

  const { product, options } = result;

  if (product.category === 'encomenda') notFound();

  const [related, user] = await Promise.all([
    getRelatedProducts(product.category, product.id, product.type),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">
          Início
        </Link>
        <span className="mx-2">/</span>
        <Link href={product.type === 'digital' ? '/stl' : '/products'} className="hover:text-gray-900 dark:hover:text-gray-100">
          {product.type === 'digital' ? 'Arquivos STL' : 'Catálogo'}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">{product.name}</span>
      </nav>

      <ProductDetail product={product} options={options} />

      <ProductReviews productId={product.id} isAdmin={user?.role === 'admin'} />

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Você também pode gostar</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
