'use client';

import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendForecastProps {
  historical: { date: string; revenue: number }[];
  forecast: { date: string; revenue: number; lower: number; upper: number }[];
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface DataPoint {
  date: string;
  revenue: number;
  historicalRevenue?: number;
  forecastRevenue?: number;
  upper?: number;
  lower?: number;
  type: 'historical' | 'forecast';
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: unknown[];
  label?: string | number;
  data: DataPoint[];
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

function formatXAxis(value: string | number) {
  const dateString = String(value);
  try {
    return format(parseISO(dateString), 'dd/MM');
  } catch {
    return dateString;
  }
}

function TrendTooltip({ active, payload, label, data }: TrendTooltipProps) {
  if (!active || !payload?.length || label == null) return null;
  const dataPoint = data.find((point) => point.date === String(label));
  const isForecast = dataPoint?.type === 'forecast';

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
        {formatXAxis(label)} {isForecast ? '(Previsão)' : '(Histórico)'}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {formatCurrency(dataPoint?.revenue ?? 0)}
      </p>
      {isForecast && dataPoint?.lower != null && dataPoint?.upper != null && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Intervalo: {formatCurrency(dataPoint.lower)} - {formatCurrency(dataPoint.upper)}
        </p>
      )}
    </div>
  );
}

export default function TrendForecast({
  historical,
  forecast,
  trend,
  trendPercent,
}: TrendForecastProps) {
  const combinedData: DataPoint[] = [
    ...historical.map((item) => ({
      date: item.date,
      revenue: item.revenue,
      historicalRevenue: item.revenue,
      forecastRevenue: undefined,
      upper: undefined,
      lower: undefined,
      type: 'historical' as const,
    })),
    ...forecast.map((item) => ({
      date: item.date,
      revenue: item.revenue,
      historicalRevenue: undefined,
      forecastRevenue: item.revenue,
      upper: item.upper,
      lower: item.lower,
      type: 'forecast' as const,
    })),
  ];

  const getTrendBadge = () => {
    if (trend === 'up') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <TrendingUp className="h-3.5 w-3.5" />
          Tendencia: em alta +{trendPercent}%
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <TrendingDown className="h-3.5 w-3.5" />
          Tendencia: em baixa -{trendPercent}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <Minus className="h-3.5 w-3.5" />
        Tendencia: estavel
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Previsão de Tendencia
        </h3>
        {getTrendBadge()}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              className="text-gray-500"
            />
            <YAxis
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
              className="text-gray-500"
            />
            <Tooltip content={<TrendTooltip data={combinedData} />} />

            {/* Confidence interval upper bound */}
            <Area
              dataKey="upper"
              stroke="none"
              fill="#ec489920"
              fillOpacity={1}
              type="monotone"
            />

            {/* Confidence interval lower bound (masks the area below) */}
            <Area
              dataKey="lower"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              type="monotone"
            />

            {/* Historical area fill */}
            <Area
              dataKey="historicalRevenue"
              stroke="none"
              fill="#ec489915"
              fillOpacity={1}
              type="monotone"
            />

            {/* Historical solid line */}
            <Line
              dataKey="historicalRevenue"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
              type="monotone"
              connectNulls={false}
            />

            {/* Forecast dashed line */}
            <Line
              dataKey="forecastRevenue"
              stroke="#ec4899"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              type="monotone"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        A previsão é baseada nos dados históricos dos últimos {historical.length} dias. A área
        sombreada representa o intervalo de confianca da projecao.
      </p>
    </div>
  );
}
