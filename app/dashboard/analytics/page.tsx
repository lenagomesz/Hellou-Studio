'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RevenueChart } from '@/components/admin/charts/RevenueChart';
import { OrdersChart } from '@/components/admin/charts/OrdersChart';
import { CategoryPieChart } from '@/components/admin/charts/CategoryPieChart';
import { TopProductsChart } from '@/components/admin/charts/TopProductsChart';
import { TopViewedTable } from '@/components/admin/charts/TopViewedTable';
import { UsersChart } from '@/components/admin/charts/UsersChart';

type Period = '7d' | '30d' | '90d' | '12m';

interface RevenueData { date: string; revenue: number; count: number }
interface CategoryData { name: string; revenue: number; units: number }
interface ProductData { name: string; revenue: number; units: number; category: string }
interface UserData { date: string; count: number }
interface TopViewedProduct { id: string; name: string; category: string; views: number; revenue: number; units_sold: number }

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [revenueData, setRevenueData] = useState<{ data: RevenueData[]; groupBy: string }>({ data: [], groupBy: 'day' });
  const [productsData, setProductsData] = useState<{ topProducts: ProductData[]; categories: CategoryData[] }>({ topProducts: [], categories: [] });
  const [usersData, setUsersData] = useState<{ data: UserData[]; groupBy: string }>({ data: [], groupBy: 'day' });
  const [topViewedData, setTopViewedData] = useState<TopViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all([
        fetch(`/api/admin/analytics/revenue?period=${period}`, { signal }),
        fetch(`/api/admin/analytics/products?period=${period}`, { signal }),
        fetch(`/api/admin/analytics/users?period=${period}`, { signal }),
        fetch(`/api/admin/analytics/top-viewed?period=${period}`, { signal }),
      ]);
      const payloads = await Promise.all(responses.map(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os indicadores.');
        return payload;
      }));
      const [rev, prod, usr, topViewed] = payloads;
      setRevenueData(rev);
      setProductsData(prod);
      setUsersData(usr);
      setTopViewedData(topViewed.products ?? []);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os indicadores.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  const handleExport = () => {
    window.open(`/api/admin/analytics/export?period=${period}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Métricas detalhadas da sua loja.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="12m">12 meses</option>
          </select>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadAnalytics()} className="rounded-lg bg-white px-3 py-1.5 font-bold shadow-sm hover:bg-red-100">Tentar novamente</button>
        </div>
      )}

      <nav aria-label="Análises especializadas" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { href: '/dashboard/analytics/traffic', title: 'Tráfego do site', description: 'Visitantes anônimos, origens e páginas mais acessadas', color: 'from-blue-500 to-violet-500' },
          { href: '/dashboard/analytics/segments', title: 'Segmentos de clientes', description: 'Grupos de comportamento para campanhas e relacionamento', color: 'from-pink-500 to-orange-400' },
          { href: '/dashboard/analytics/rfm', title: 'RFM e melhores clientes', description: 'Recência, frequência e valor das compras', color: 'from-emerald-500 to-teal-500' },
          { href: '/dashboard/analytics/churn', title: 'Risco de abandono', description: 'Clientes que podem precisar de reativação', color: 'from-amber-500 to-orange-500' },
          { href: '/dashboard/analytics/ltv', title: 'Valor do cliente', description: 'LTV atual e potencial de longo prazo', color: 'from-violet-500 to-fuchsia-500' },
          { href: '/dashboard/analytics/cohorts', title: 'Retenção por coorte', description: 'Acompanhe recorrência ao longo dos meses', color: 'from-slate-600 to-slate-900' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`block h-1.5 w-12 rounded-full bg-gradient-to-r ${item.color}`} />
            <p className="mt-4 text-sm font-bold text-slate-900 group-hover:text-pink-600">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
          </Link>
        ))}
      </nav>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          {/* Revenue & Orders */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receita</h3>
              <RevenueChart data={revenueData.data} groupBy={revenueData.groupBy} />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pedidos</h3>
              <OrdersChart data={revenueData.data} groupBy={revenueData.groupBy} />
            </div>
          </div>

          {/* Users & Categories */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Novos usuários</h3>
              <UsersChart data={usersData.data} groupBy={usersData.groupBy} />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receita por categoria</h3>
              <CategoryPieChart data={productsData.categories} />
            </div>
          </div>

          {/* Top Products by Revenue */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Top 10 produtos (receita)</h3>
            <TopProductsChart data={productsData.topProducts} />
          </div>

          {/* Top Products by Views */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Produtos Mais Vistos</h3>
            <TopViewedTable data={topViewedData} />
          </div>
        </>
      )}
    </div>
  );
}
