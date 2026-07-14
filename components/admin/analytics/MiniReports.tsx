'use client';

import Link from 'next/link';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface MiniReportData {
  revenue: { current: number; history: number[] };
  orders: { current: number; history: number[] };
  users: { current: number; history: number[] };
}

interface MiniReportsProps {
  data: MiniReportData;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

interface SparklineProps {
  data: number[];
  color: string;
}

function Sparkline({ data, color }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#fff',
          }}
          formatter={(value) => [String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), '']}
          labelFormatter={() => ''}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function MiniReports({ data }: MiniReportsProps) {
  const cards = [
    {
      title: 'Receita',
      current: formatCurrency(data.revenue.current),
      history: data.revenue.history,
      color: '#ec4899',
      href: '/dashboard/analytics',
    },
    {
      title: 'Pedidos',
      current: data.orders.current.toLocaleString('pt-BR'),
      history: data.orders.history,
      color: '#6366f1',
      href: '/dashboard/orders',
    },
    {
      title: 'Usuários',
      current: data.users.current.toLocaleString('pt-BR'),
      history: data.users.history,
      color: '#22c55e',
      href: '/dashboard/users',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {card.title}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {card.current}
          </p>
          <div className="mt-3">
            <Sparkline data={card.history} color={card.color} />
          </div>
        </Link>
      ))}
    </div>
  );
}
