'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, DollarSign } from 'lucide-react';
import type { CustomerMetrics } from '@/lib/customer-analytics';
import { getLtvLevelColor } from '@/lib/customer-analytics';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const LTV_LEVEL_LABELS = { high: 'Alto', medium: 'Medio', low: 'Baixo' };
const LTV_LEVEL_BG = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function LTVPage() {
  const [customers, setCustomers] = useState<CustomerMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/admin/analytics/customers')
      .then(r => r.json())
      .then(data => setCustomers(data.customers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    let result = [...customers].sort((a, b) => b.ltv - a.ltv);
    if (levelFilter !== 'all') {
      result = result.filter(c => c.ltvLevel === levelFilter);
    }
    return result;
  }, [customers, levelFilter]);

  const top50 = useMemo(() => sorted.slice(0, 50), [sorted]);

  const stats = useMemo(() => {
    const high = customers.filter(c => c.ltvLevel === 'high');
    const medium = customers.filter(c => c.ltvLevel === 'medium');
    const low = customers.filter(c => c.ltvLevel === 'low');
    const avgLtv = customers.length > 0 ? customers.reduce((s, c) => s + c.ltv, 0) / customers.length : 0;
    return { high: high.length, medium: medium.length, low: low.length, avgLtv };
  }, [customers]);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4" /> Analytics
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-green-500" />
          Customer Lifetime Value (LTV)
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Valor projetado de cada cliente ao longo do relacionamento
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-xs text-gray-500">LTV Medio</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.avgLtv)}</p>
        </div>
        <button
          onClick={() => setLevelFilter(levelFilter === 'high' ? 'all' : 'high')}
          className={`rounded-xl border p-4 text-left transition ${levelFilter === 'high' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-100 dark:border-gray-800'} bg-white dark:bg-gray-900`}
        >
          <p className="text-xs text-gray-500">Alto</p>
          <p className="text-xl font-bold text-green-600">{stats.high}</p>
        </button>
        <button
          onClick={() => setLevelFilter(levelFilter === 'medium' ? 'all' : 'medium')}
          className={`rounded-xl border p-4 text-left transition ${levelFilter === 'medium' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-100 dark:border-gray-800'} bg-white dark:bg-gray-900`}
        >
          <p className="text-xs text-gray-500">Medio</p>
          <p className="text-xl font-bold text-amber-600">{stats.medium}</p>
        </button>
        <button
          onClick={() => setLevelFilter(levelFilter === 'low' ? 'all' : 'low')}
          className={`rounded-xl border p-4 text-left transition ${levelFilter === 'low' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-100 dark:border-gray-800'} bg-white dark:bg-gray-900`}
        >
          <p className="text-xs text-gray-500">Baixo</p>
          <p className="text-xl font-bold text-red-600">{stats.low}</p>
        </button>
      </div>

      {/* Top 50 Customers by LTV */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Top 50 Clientes por LTV
              {levelFilter !== 'all' && <span className="ml-2 text-xs text-gray-500">(filtro: {LTV_LEVEL_LABELS[levelFilter as keyof typeof LTV_LEVEL_LABELS]})</span>}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">LTV Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Projecao 12m</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Já gasto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Nível</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Ticket Medio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {top50.map((customer, idx) => (
                  <tr key={customer.userId} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/users/${customer.userId}`} className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                            {customer.name || customer.email.split('@')[0]}
                            {customer.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                          </p>
                          <p className="truncate text-xs text-gray-500">{customer.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${getLtvLevelColor(customer.ltvLevel)}`}>
                      {formatPrice(customer.ltv)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {formatPrice(customer.ltvProjected12m)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LTV_LEVEL_BG[customer.ltvLevel]}`}>
                        {LTV_LEVEL_LABELS[customer.ltvLevel]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {customer.totalOrders}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {formatPrice(customer.averageTicket)}
                    </td>
                  </tr>
                ))}
                {top50.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
