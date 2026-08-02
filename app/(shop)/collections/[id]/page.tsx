import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getStoreSettings } from '@/lib/store-settings';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Product } from '@/types/database';

/* eslint-disable @next/next/no-img-element -- Collection images are uploaded and stored as public URLs. */

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const settings = await getStoreSettings();
  const collection = settings.home.collections.find((item) => item.id === id && item.active);
  if (!collection) notFound();

  let products: Product[] = [];
  if (collection.productIds.length > 0) {
    const { data } = await getSupabaseAdmin()
      .from('products')
      .select('*')
      .in('id', collection.productIds)
      .eq('active', true);
    const order = new Map(collection.productIds.map((productId, index) => [productId, index]));
    products = ((data ?? []) as Product[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  return (
    <main className="min-h-screen bg-white py-12 dark:bg-gray-950 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          {collection.imageUrl && <img src={collection.imageUrl} alt="" className="mx-auto mb-6 max-h-72 w-full rounded-3xl object-cover" />}
          <span className="text-4xl" aria-hidden="true">{collection.emoji}</span>
          <h1 className="mt-4 text-3xl font-black text-gray-950 dark:text-white sm:text-5xl">{collection.name}</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{collection.description}</p>
        </header>
        {products.length > 0 ? <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-12 rounded-2xl bg-pink-50 p-8 text-center text-sm text-pink-700 dark:bg-pink-950/20 dark:text-pink-300">Nenhum produto foi vinculado a esta coleção ainda.</p>}
      </div>
    </main>
  );
}
