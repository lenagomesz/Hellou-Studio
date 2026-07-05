'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

export default function STLMarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSTLProducts();
  }, []);

  const loadSTLProducts = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'digital')
        .order('created_at', { ascending: false });

      setProducts(data || []);
    } catch (error) {
      console.error('[stl-page] Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-500 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            🎨 Hellou Studio
          </h1>
          <p className="text-lg text-white mb-4">
            Bem-vindos, Makers!
          </p>
          <p className="text-lg text-white mb-6 max-w-2xl mx-auto">
            Aqui você pode comprar as criações da <strong>hellou studio</strong>. Arquivos STL prontos para imprimir em sua impressora 3D.
          </p>
          <Link
            href="#marketplace"
            className="inline-block px-6 py-2 bg-white text-pink-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Ver Modelos
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">🔧</div>
            <h3 className="font-semibold text-lg mb-2">Pronto para Imprimir</h3>
            <p className="text-gray-600 text-sm">
              Modelos otimizados para impressoras 3D FDM. Arquivos em formato STL de alta qualidade.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">📥</div>
            <h3 className="font-semibold text-lg mb-2">Download Imediato</h3>
            <p className="text-gray-600 text-sm">
              Receba seu arquivo via email e baixe quantas vezes quiser da sua conta.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">💳</div>
            <h3 className="font-semibold text-lg mb-2">Pagamento Seguro</h3>
            <p className="text-gray-600 text-sm">
              Compre com cartão ou Pix. Processamento seguro via Mercado Pago.
            </p>
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div id="marketplace" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Modelos Disponíveis</h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando modelos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-800">
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
                <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-200">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 overflow-hidden relative">
                    <img
                      src={product.image_url || 'https://via.placeholder.com/300'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      📥 Digital
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-pink-600">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(product.price)}
                      </span>
                      <button className="px-3 py-1 bg-pink-500 text-white text-xs font-semibold rounded hover:bg-pink-600 transition">
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
