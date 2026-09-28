import { getSupabaseAdmin } from '@/lib/supabase';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalogCategories } from '@/lib/catalog-categories';
import type { Product } from '@/types/database';
import { attachProductTags } from '@/lib/product-tags';

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
      .select('*, product_options(price_modifier)')
      .eq('type', 'digital')
      .eq('active', true);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[stl-page] Query error:', error);
      return [];
    }

    console.log('[stl-page] Loaded digital products:', data?.length || 0);
    return attachProductTags((data || []) as Product[]);
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
      <header className="mx-auto max-w-6xl px-4 pb-2 pt-8 sm:px-6 sm:pt-12">
        <div className="overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-orange-50 px-5 py-7 shadow-sm dark:border-pink-950/70 dark:from-pink-950/30 dark:via-gray-900 dark:to-orange-950/20 sm:px-8 sm:py-9">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 dark:text-pink-400">Para makers</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">Arquivos para imprimir do seu jeito</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">Modelos digitais para baixar após a aprovação do pagamento e imprimir na sua própria máquina.</p>
          <ul className="mt-5 grid gap-2 text-xs text-gray-600 sm:grid-cols-3 dark:text-gray-300">
            <li className="rounded-xl bg-white/80 px-3 py-2.5 shadow-sm ring-1 ring-pink-100/80 dark:bg-gray-900/80 dark:ring-pink-950/60"><span aria-hidden="true">🧩 </span>Arquivo STL ou 3MF</li>
            <li className="rounded-xl bg-white/80 px-3 py-2.5 shadow-sm ring-1 ring-pink-100/80 dark:bg-gray-900/80 dark:ring-pink-950/60"><span aria-hidden="true">⚡ </span>Download na sua conta</li>
            <li className="rounded-xl bg-white/80 px-3 py-2.5 shadow-sm ring-1 ring-pink-100/80 dark:bg-gray-900/80 dark:ring-pink-950/60"><span aria-hidden="true">🖨️ </span>Feito para você imprimir</li>
          </ul>
        </div>
      </header>

      {/* Marketplace */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
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
              <Link key={category.id} href={`/stl?category=${encodeURIComponent(category.slug)}`} style={activeCategory === category.slug ? { backgroundColor: '#EC4899' } : { borderColor: '#EC489955' }} className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${activeCategory === category.slug ? 'text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300'}`}>{category.name}</Link>
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
