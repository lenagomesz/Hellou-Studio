'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProductData {
  name: string;
  revenue: number;
  units: number;
  category: string;
}

interface Props {
  data: ProductData[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function TopProductsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Sem dados
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    shortName: d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
        <XAxis type="number" tickFormatter={(val) => `R$${val}`} fontSize={12} stroke="#9ca3af" />
        <YAxis type="category" dataKey="shortName" width={140} fontSize={11} stroke="#9ca3af" />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
