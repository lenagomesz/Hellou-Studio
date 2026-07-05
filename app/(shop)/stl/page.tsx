'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { ImageCarousel } from '@/components/shop/ImageCarousel';

export default function STLMarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSTLProducts();
  }, []);

  const loadSTLProducts = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'digital')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[stl-page] Query error:', error);
      }
      setProducts(data || []);
    } catch (error) {
      console.error('[stl-page] Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div id="marketplace" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Modelos Disponíveis</h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Carregando modelos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 text-center">
            <p className="text-yellow-800 dark:text-yellow-300">
              Nenhum modelo disponível no momento. Volte em breve!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group"
              >
                <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-200 dark:border-gray-800">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                    <ImageCarousel
                      image1={product.image_url || 'https://via.placeholder.com/300'}
                      image2={product.image_url_2}
                      alt={product.name}
                    />
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      📥 Digital
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-gray-900 dark:text-white">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(product.price)}
                      </span>
                      <button className="px-3 py-1 bg-pink-500 hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-700 text-white text-xs font-semibold rounded transition">
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
