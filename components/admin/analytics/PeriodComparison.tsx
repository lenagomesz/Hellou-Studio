'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PeriodData {
  revenue: number;
  orders: number;
  newUsers: number;
  avgTicket: number;
}

interface PeriodComparisonProps {
  thisMonth: PeriodData;
  lastMonth: PeriodData;
  thisWeek: PeriodData;
  lastWeek: PeriodData;
  dailyComparison: { date: string; thisMonthRevenue: number; lastMonthRevenue: number }[];
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function growthPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

type MetricKey = 'revenue' | 'orders' | 'newUsers' | 'avgTicket';

const metrics: { key: MetricKey; label: string; isCurrency: boolean }[] = [
  { key: 'revenue', label: 'Receita', isCurrency: true },
  { key: 'orders', label: 'Pedidos', isCurrency: false },
  { key: 'newUsers', label: 'Novos Usuários', isCurrency: false },
  { key: 'avgTicket', label: 'Ticket Medio', isCurrency: true },
];

function ComparisonCard({
  label,
  current,
  previous,
  isCurrency,
}: {
  label: string;
  current: number;
  previous: number;
  isCurrency: boolean;
}) {
  const percent = growthPercent(current, previous);
  const isPositive = percent >= 0;

  const formattedCurrent = isCurrency ? formatPrice(current) : current.toLocaleString('pt-BR');
  const formattedPrevious = isCurrency ? formatPrice(previous) : previous.toLocaleString('pt-BR');

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formattedCurrent}</p>
      <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Anterior: {formattedPrevious}</p>
      <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span>{Math.abs(percent)}%</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatPrice(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function PeriodComparison({
  thisMonth,
  lastMonth,
  thisWeek,
  lastWeek,
  dailyComparison,
}: PeriodComparisonProps) {
  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('monthly');

  const currentData = activeTab === 'monthly' ? thisMonth : thisWeek;
  const previousData = activeTab === 'monthly' ? lastMonth : lastWeek;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Semanal
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <ComparisonCard
            key={metric.key}
            label={metric.label}
            current={currentData[metric.key]}
            previous={previousData[metric.key]}
            isCurrency={metric.isCurrency}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Comparativo de Receita Diaria
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyComparison} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatPrice(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="thisMonthRevenue" name="Este Mes" fill="#ec4899" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lastMonthRevenue" name="Mes Anterior" fill="#9ca3af" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
