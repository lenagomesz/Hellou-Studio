'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/analytics/revenue?period=${period}`).then(r => r.json()),
      fetch(`/api/admin/analytics/products?period=${period}`).then(r => r.json()),
      fetch(`/api/admin/analytics/users?period=${period}`).then(r => r.json()),
      fetch(`/api/admin/analytics/top-viewed?period=${period}`).then(r => r.json()),
    ]).then(([rev, prod, usr, topViewed]) => {
      setRevenueData(rev);
      setProductsData(prod);
      setUsersData(usr);
      setTopViewedData(topViewed.products ?? []);
    }).finally(() => setLoading(false));
  }, [period]);

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
