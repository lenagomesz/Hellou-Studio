'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataPoint {
  date: string;
  revenue: number;
  count: number;
}

interface Props {
  data: DataPoint[];
  groupBy: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string, groupBy: string) {
  const date = parseISO(dateStr);
  if (groupBy === 'month') return format(date, 'MMM/yy', { locale: ptBR });
  return format(date, 'dd/MM', { locale: ptBR });
}

export function RevenueChart({ data, groupBy }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={(val) => formatDate(val, groupBy)}
          fontSize={12}
          stroke="#9ca3af"
        />
        <YAxis
          tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
          fontSize={12}
          stroke="#9ca3af"
          width={60}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
          labelFormatter={(label) => formatDate(label, groupBy)}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#ec4899"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
