import Link from 'next/link';
import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalogCategories } from '@/lib/catalog-categories';
import type { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Meus favoritos',
  robots: { index: false, follow: false, noarchive: true },
};

async function getFavoriteProducts(userId: string): Promise<Product[]> {
  const admin = getSupabaseAdmin();
  const { data: favorites, error: favoriteError } = await admin
    .from('product_favorites')
    .select('product_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (favoriteError || !favorites?.length) return [];
  const productIds = favorites.map((favorite) => favorite.product_id);
  const { data: products, error: productError } = await admin
    .from('products')
    .select('*, product_options(price_modifier)')
    .in('id', productIds)
    .eq('active', true);

  if (productError) return [];
  const byId = new Map((products ?? []).map((product) => [product.id, product as Product]));
  return productIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
}

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [products, physicalCategories, digitalCategories] = await Promise.all([
    getFavoriteProducts(user.id),
    getCatalogCategories('physical'),
    getCatalogCategories('digital'),
  ]);
  const categories = [...physicalCategories, ...digitalCategories].filter(
    (category, index, list) => list.findIndex((item) => item.id === category.id) === index,
  );

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-gray-950 px-5 py-6 text-white shadow-xl shadow-pink-950/10 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 shadow-lg shadow-pink-900/30">
            <Heart className="h-5 w-5 fill-white" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-300">Sua seleção</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Meus favoritos</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">
              {products.length === 0 ? 'Guarde aqui as peças que mais combinam com você.' : `${products.length} ${products.length === 1 ? 'produto salvo' : 'produtos salvos'} para encontrar quando quiser.`}
            </p>
          </div>
        </div>
      </header>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              basePath={product.type === 'digital' ? '/stl' : '/products'}
              category={categories.find((category) => category.slug === product.category)}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-pink-200 bg-gradient-to-br from-white to-pink-50/60 px-6 py-12 text-center dark:border-pink-900 dark:from-gray-900 dark:to-pink-950/20">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-pink-400 shadow-sm dark:bg-gray-800"><Heart className="h-6 w-6" /></span>
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Sua lista ainda está vazia</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">Toque no coração de qualquer produto. Ele ficará salvo aqui para você voltar depois.</p>
          <Link href="/products" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:shadow-xl">Explorar o catálogo</Link>
        </section>
      )}
    </div>
  );
}
