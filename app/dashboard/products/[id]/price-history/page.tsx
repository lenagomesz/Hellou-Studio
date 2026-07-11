'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, User, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type PriceHistoryEntry = {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  price_type: string;
  changed_by: string | null;
  changed_at: string;
  changed_by_user?: { name: string | null; email: string } | null;
};

type ProductInfo = {
  id: string;
  name: string;
  base_price: number;
  sale_price: number | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PriceHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then((r) => r.json()),
      fetch(`/api/admin/products/price-history?product_id=${id}`).then((r) => r.json()),
    ])
      .then(([productData, historyData]) => {
        setProduct(productData.product ?? null);
        setHistory(historyData.history ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  // Build chart data from history (chronological)
  const chartData = [...history]
    .reverse()
    .map((entry) => ({
      date: new Date(entry.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      preco: entry.new_price,
      tipo: entry.price_type === 'base_price' ? 'Base' : 'Promocional',
    }));

  // Separate base and sale price chart data
  const basePriceHistory = history
    .filter((h) => h.price_type === 'base_price')
    .reverse()
    .map((entry) => ({
      date: new Date(entry.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      preco: entry.new_price,
    }));

  const salePriceHistory = history
    .filter((h) => h.price_type === 'sale_price')
    .reverse()
    .map((entry) => ({
      date: new Date(entry.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      preco: entry.new_price,
    }));

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/products/${id}/edit`}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historico de Precos</h1>
          {product && <p className="text-sm text-gray-500">{product.name}</p>}
        </div>
      </header>

      {/* Current Prices */}
      {product && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 uppercase">Preco Base Atual</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {formatPrice(product.base_price)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 uppercase">Preco Promocional Atual</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {product.sale_price ? formatPrice(product.sale_price) : 'Sem promocao'}
            </p>
          </div>
        </div>
      )}

      {/* Price Chart */}
      {history.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Evolucao de Preco</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value) => [formatPrice(Number(value)), 'Preco']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                {basePriceHistory.length > 0 && (
                  <Line
                    data={basePriceHistory}
                    type="stepAfter"
                    dataKey="preco"
                    name="Preco Base"
                    stroke="#EC4899"
                    strokeWidth={2}
                    dot={{ fill: '#EC4899', r: 4 }}
                  />
                )}
                {salePriceHistory.length > 0 && (
                  <Line
                    data={salePriceHistory}
                    type="stepAfter"
                    dataKey="preco"
                    name="Preco Promocional"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={{ fill: '#F97316', r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nenhuma alteracao de preco registrada</p>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Historico Completo ({history.length} alteracoes)
            </h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {history.map((entry) => {
              const diff = entry.new_price - entry.old_price;
              const isIncrease = diff > 0;
              const isDecrease = diff < 0;

              return (
                <div key={entry.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-shrink-0">
                    {isIncrease ? (
                      <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                        <TrendingUp className="h-4 w-4 text-red-600" />
                      </div>
                    ) : isDecrease ? (
                      <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                        <Minus className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPrice(entry.old_price)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className={`text-sm font-bold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                        {formatPrice(entry.new_price)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isIncrease ? 'bg-red-100 text-red-700' : isDecrease ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {isIncrease ? '+' : ''}{formatPrice(diff)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(entry.changed_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.changed_by_user?.name ?? entry.changed_by_user?.email ?? 'Sistema'}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium dark:bg-gray-800">
                        {entry.price_type === 'base_price' ? 'Base' : 'Promocional'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
