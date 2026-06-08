'use client';

import { RevenueChart } from './RevenueChart';
import { OrdersChart } from './OrdersChart';

interface Props {
  data: { date: string; revenue: number; count: number }[];
}

export function DashboardCharts({ data }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receita (últimos 30 dias)</h3>
        <RevenueChart data={data} groupBy="day" />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pedidos por dia</h3>
        <OrdersChart data={data} groupBy="day" />
      </div>
    </div>
  );
}
