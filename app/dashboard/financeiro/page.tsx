'use client';

import { useEffect, useState } from 'react';

interface OverviewData {
  totalRevenue: number;
  thisMonthRevenue: number;
  totalOrders: number;
  avgTicket: number;
  activeProducts: number;
  newUsersThisMonth: number;
  totalUsers: number;
  growth: { revenue: number; orders: number; users: number };
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400">—</span>;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

export default function FinanceiroPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics/overview')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const handleExport = (period: string) => {
    window.open(`/api/admin/analytics/export?period=${period}`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const projectedRevenue = currentDay > 0 ? (data.thisMonthRevenue / currentDay) * daysInMonth : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Resumo financeiro e relatórios.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('30d')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Exportar 30 dias
          </button>
          <button
            onClick={() => handleExport('90d')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Exportar 90 dias
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Receita total</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(data.totalRevenue)}</p>
          <p className="mt-2 text-xs text-gray-400">{data.totalOrders} pedidos no total</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Este mês</p>
            <GrowthBadge value={data.growth.revenue} />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(data.thisMonthRevenue)}</p>
          <p className="mt-2 text-xs text-gray-400">vs. mês anterior</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ticket médio</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(data.avgTicket)}</p>
          <p className="mt-2 text-xs text-gray-400">por pedido</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Projeção do mês</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{formatPrice(projectedRevenue)}</p>
          <p className="mt-2 text-xs text-gray-400">baseado na média diária</p>
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Resumo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-3 text-left font-medium text-gray-500">Métrica</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Valor</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              <tr>
                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Receita mensal</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatPrice(data.thisMonthRevenue)}</td>
                <td className="px-6 py-4 text-right"><GrowthBadge value={data.growth.revenue} /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Pedidos no mês</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{data.totalOrders}</td>
                <td className="px-6 py-4 text-right"><GrowthBadge value={data.growth.orders} /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Novos clientes</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{data.newUsersThisMonth}</td>
                <td className="px-6 py-4 text-right"><GrowthBadge value={data.growth.users} /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Ticket médio</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatPrice(data.avgTicket)}</td>
                <td className="px-6 py-4 text-right text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Produtos ativos</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{data.activeProducts}</td>
                <td className="px-6 py-4 text-right text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
