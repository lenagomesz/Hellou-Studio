'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryData {
  name: string;
  revenue: number;
  units: number;
}

interface Props {
  data: CategoryData[];
}

const COLORS = ['#ec4899', '#f97316', '#8b5cf6', '#06b6d4', '#10b981'];

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
  encomenda: 'Encomendas',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Sem dados
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    label: CATEGORY_LABELS[d.name] ?? d.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="revenue"
          nameKey="label"
          paddingAngle={2}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
