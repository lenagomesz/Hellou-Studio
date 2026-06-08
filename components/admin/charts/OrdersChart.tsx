'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataPoint {
  date: string;
  count: number;
}

interface Props {
  data: DataPoint[];
  groupBy: string;
}

function formatDate(dateStr: string, groupBy: string) {
  const date = parseISO(dateStr);
  if (groupBy === 'month') return format(date, 'MMM/yy', { locale: ptBR });
  return format(date, 'dd/MM', { locale: ptBR });
}

export function OrdersChart({ data, groupBy }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={(val) => formatDate(val, groupBy)}
          fontSize={12}
          stroke="#9ca3af"
        />
        <YAxis fontSize={12} stroke="#9ca3af" width={40} />
        <Tooltip
          formatter={(value) => [Number(value), 'Pedidos']}
          labelFormatter={(label) => formatDate(label, groupBy)}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
