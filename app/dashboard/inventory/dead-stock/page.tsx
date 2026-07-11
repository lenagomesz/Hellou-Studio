'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DeadStockItem } from '@/types/inventory';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const SUGGESTION_LABELS: Record<string, { label: string; color: string }> = {
  promote: { label: 'Promover', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  discount: { label: 'Desconto', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  deactivate: { label: 'Desativar', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  remove: { label: 'Remover', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function DeadStockPage() {
  const [items, setItems] = useState<DeadStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    fetchDeadStock();
  }, [days]);

  async function fetchDeadStock() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/dead-stock?days=${days}`);
      const data = await res.json();
      setItems(data.dead_stock ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const totalHoldingCost = items.reduce((s, i) => s + i.holding_cost_estimate, 0);
  const totalRevenuePotential = items.reduce((s, i) => s + i.revenue_potential, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estoque Parado (Dead Stock)</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Produtos sem venda ha {days}+ dias. Considere promover, descontar ou remover.
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          ← Voltar
        </Link>
      </header>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-400">Dias sem venda:</label>
        <select
          value={days}
          onChange={e => setDays(parseInt(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="30">30 dias</option>
          <option value="60">60 dias</option>
          <option value="90">90 dias</option>
          <option value="120">120 dias</option>
          <option value="180">180 dias</option>
        </select>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-400 uppercase">Itens parados</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-400 uppercase">Custo de manter (estimado)</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{formatPrice(totalHoldingCost)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-400 uppercase">Receita potencial</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{formatPrice(totalRevenuePotential)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-x-auto dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variacao</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Estoque</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Dias parado</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Custo manter</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Receita potencial</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">Sugestao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400">Carregando...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                  Nenhum item parado encontrado. Otimo sinal!
                </td>
              </tr>
            ) : (
              items.map(item => {
                const sug = SUGGESTION_LABELS[item.suggestion];
                return (
                  <tr key={item.product_option_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-200 font-medium">{item.product_name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{item.option_name}</td>
                    <td className="px-5 py-3 text-right font-mono">{item.current_stock}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{item.days_since_last_sale === 999 ? 'Nunca vendeu' : `${item.days_since_last_sale}d`}</td>
                    <td className="px-5 py-3 text-right text-red-600">{formatPrice(item.holding_cost_estimate)}</td>
                    <td className="px-5 py-3 text-right text-green-600">{formatPrice(item.revenue_potential)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sug.color}`}>
                        {sug.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
