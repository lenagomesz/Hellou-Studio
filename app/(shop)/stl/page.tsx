import { getSupabaseAdmin } from '@/lib/supabase';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalogCategories } from '@/lib/catalog-categories';
import type { Product } from '@/types/database';

export const metadata: Metadata = {
  title: 'Arquivos STL para impressão 3D',
  description: 'Compre arquivos STL digitais prontos para baixar e imprimir em sua impressora 3D.',
  alternates: { canonical: '/stl' },
};

async function getSTLProducts(category?: string): Promise<Product[]> {
  try {
    const admin = getSupabaseAdmin();
    let query = admin
      .from('products')
      .select('*')
      .eq('type', 'digital')
      .eq('active', true);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[stl-page] Query error:', error);
      return [];
    }

    console.log('[stl-page] Loaded digital products:', data?.length || 0);
    return (data || []) as Product[];
  } catch (error) {
    console.error('[stl-page] Error loading products:', error);
    return [];
  }
}

export default async function STLMarketplacePage(props: { searchParams: Promise<{ category?: string | string[] }> }) {
  const searchParams = await props.searchParams;
  const requestedCategory = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const categories = await getCatalogCategories('digital');
  const activeCategory = requestedCategory && categories.some((item) => item.slug === requestedCategory) ? requestedCategory : undefined;
  const products = await getSTLProducts(activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Full-width Banner */}
      <div className="flex h-40 flex-col items-center justify-center bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-6 py-4 text-center sm:h-44 sm:px-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Bem-vindos, makers! 🎨
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
          Compre arquivos STL prontos para imprimir em sua impressora 3D.
        </p>
      </div>


      {/* Info Cards */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-2xl mb-1">🔧</div>
            <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Pronto para Imprimir</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Modelos otimizados para impressoras 3D FDM.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-2xl mb-1">📥</div>
            <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Download Imediato</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Receba via email e acesse na sua conta.
            </p>
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Modelos Disponíveis</h1>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            {products.length}{' '}
            {products.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
          </p>
        </header>

        {categories.length > 0 && (
          <nav aria-label="Categorias de arquivos STL" className="mb-6 flex flex-wrap gap-2">
            <Link href="/stl" style={!activeCategory ? { backgroundColor: '#EC4899' } : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!activeCategory ? 'text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>Todos</Link>
            {categories.map((category) => (
              <Link key={category.id} href={`/stl?category=${encodeURIComponent(category.slug)}`} style={activeCategory === category.slug ? { backgroundColor: category.color } : { borderColor: `${category.color}55` }} className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${activeCategory === category.slug ? 'text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300'}`}>{category.name}</Link>
            ))}
          </nav>
        )}

        {products.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
            <span className="text-5xl">✨🎨</span>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Opa! Ainda não chegaram modelos...
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Estamos preparando arquivos incríveis pra você! 🚀<br />
              Volte em breve, novidades a caminho!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} basePath="/stl" category={categories.find((category) => category.slug === product.category)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
