import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Product } from '@/types/database';

async function getSTLProducts(): Promise<Product[]> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('products')
      .select('*')
      .eq('type', 'digital')
      .eq('active', true)
      .order('created_at', { ascending: false });

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

export default async function STLMarketplacePage() {
  const products = await getSTLProducts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Full-width Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-6 py-10 text-center sm:px-10 sm:py-14">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Bem-vindo, Makers!
        </h1>
        <p className="mt-2 text-sm text-white/90 sm:text-base">
          Compre arquivos STL prontos para imprimir em sua impressora 3D.
        </p>
      </div>

      {/* Purpose Clarification Card */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/20 p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="text-3xl">💾</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">
                Arquivos STL para Impressão 3D
              </h3>
              <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                Aqui você compra <strong>arquivos digitais STL</strong> para imprimir em sua própria impressora 3D. Você faz o download, personaliza como quiser e imprime quantas cópias precisar!
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400">
                💡 <strong>Procurando produtos já prontos?</strong> Acesse nosso <Link href="/products" className="font-semibold hover:underline">Catálogo de Produtos</Link> para ver peças impressas e enviadas prontas para usar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-3xl mb-2">🔧</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Pronto para Imprimir</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Modelos otimizados para impressoras 3D FDM. Arquivos em formato STL de alta qualidade.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-3xl mb-2">📥</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Download Imediato</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Receba seu arquivo via email e baixe quantas vezes quiser da sua conta.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-3xl mb-2">💳</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Pagamento Seguro</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Compre com cartão ou Pix. Processamento seguro via Mercado Pago.
            </p>
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Modelos Disponíveis</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {products.length}{' '}
            {products.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
          </p>
        </header>

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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
