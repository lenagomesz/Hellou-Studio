'use client';

import { useEffect, useState } from 'react';
import PeriodComparison from './PeriodComparison';
import TrendForecast from './TrendForecast';
import AnomalyDetection from './AnomalyDetection';
import CustomizableKPIs from './CustomizableKPIs';
import MiniReports from './MiniReports';
import RealTimeWidgets from './RealTimeWidgets';
import ExportDashboard from './ExportDashboard';

interface AdvancedData {
  periodComparison: {
    thisMonth: { revenue: number; orders: number; newUsers: number; avgTicket: number };
    lastMonth: { revenue: number; orders: number; newUsers: number; avgTicket: number };
    thisWeek: { revenue: number; orders: number; newUsers: number; avgTicket: number };
    lastWeek: { revenue: number; orders: number; newUsers: number; avgTicket: number };
    dailyComparison: { date: string; thisMonthRevenue: number; lastMonthRevenue: number }[];
  };
  trendForecast: {
    historical: { date: string; revenue: number }[];
    forecast: { date: string; revenue: number; lower: number; upper: number }[];
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
  };
  anomalies: {
    type: 'high_revenue' | 'low_revenue' | 'product_drop' | 'conversion_drop';
    message: string;
    severity: 'warning' | 'critical';
    date: string;
    value: number;
    expected: number;
  }[];
  realtime: {
    ordersToday: number;
    revenueToday: number;
    criticalStock: number;
  };
}

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AdvancedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/analytics/advanced')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Nao foi possivel carregar os dados avancados de analytics. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  // Prepare KPI data
  const kpiData = {
    revenue: data.periodComparison.thisMonth.revenue,
    orders: data.periodComparison.thisMonth.orders,
    newUsers: data.periodComparison.thisMonth.newUsers,
    avgTicket: data.periodComparison.thisMonth.avgTicket,
    activeProducts: 0, // will be populated from parent if needed
    totalRevenue: data.trendForecast.historical.reduce((sum, h) => sum + h.revenue, 0),
    conversionRate: 0,
    ordersToday: data.realtime.ordersToday,
  };

  // Prepare mini reports data from historical
  const historical = data.trendForecast.historical;
  const miniReportsData = {
    revenue: {
      current: data.periodComparison.thisMonth.revenue,
      history: historical.map((h) => h.revenue),
    },
    orders: {
      current: data.periodComparison.thisMonth.orders,
      history: historical.map((_, i) => {
        // Estimate daily orders from daily comparison data if available
        const dc = data.periodComparison.dailyComparison[i];
        return dc ? Math.round(dc.thisMonthRevenue / (data.periodComparison.thisMonth.avgTicket || 1)) : 0;
      }),
    },
    users: {
      current: data.periodComparison.thisMonth.newUsers,
      history: historical.map(() => Math.max(0, Math.round(data.periodComparison.thisMonth.newUsers / 30))),
    },
  };

  return (
    <div className="space-y-8">
      {/* Anomaly Detection Banner */}
      <AnomalyDetection anomalies={data.anomalies} />

      {/* Real-time Widgets */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Tempo Real
        </h2>
        <RealTimeWidgets initialData={data.realtime} />
      </section>

      {/* Mini Reports with Sparklines */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Resumo Rapido
        </h2>
        <MiniReports data={miniReportsData} />
      </section>

      {/* Customizable KPIs */}
      <section>
        <CustomizableKPIs data={kpiData} />
      </section>

      {/* Period Comparison */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comparativo de Periodos
          </h2>
          <ExportDashboard />
        </div>
        <PeriodComparison
          thisMonth={data.periodComparison.thisMonth}
          lastMonth={data.periodComparison.lastMonth}
          thisWeek={data.periodComparison.thisWeek}
          lastWeek={data.periodComparison.lastWeek}
          dailyComparison={data.periodComparison.dailyComparison}
        />
      </section>

      {/* Trend Forecast */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Projecao de Tendencia
        </h2>
        <TrendForecast
          historical={data.trendForecast.historical}
          forecast={data.trendForecast.forecast}
          trend={data.trendForecast.trend}
          trendPercent={data.trendForecast.trendPercent}
        />
      </section>
    </div>
  );
}
