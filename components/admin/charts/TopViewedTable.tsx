'use client';

import Link from 'next/link';

interface TopViewedProduct {
  id: string;
  name: string;
  category: string;
  views: number;
  revenue: number;
  units_sold: number;
}

interface Props {
  data: TopViewedProduct[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCategory(category: string) {
  const map: Record<string, string> = {
    chaveiros: 'Chaveiros',
    escritorio: 'Escritorio',
    criaturas: 'Criaturas',
  };
  return map[category] ?? category;
}

function conversionRate(views: number, units: number): string {
  if (views === 0) return '0%';
  return ((units / views) * 100).toFixed(1) + '%';
}

export function TopViewedTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Sem dados de visualização no período
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
            <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Produto</th>
            <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Categoria</th>
            <th className="pb-3 text-right font-medium text-gray-500 dark:text-gray-400">Views</th>
            <th className="pb-3 text-right font-medium text-gray-500 dark:text-gray-400">Receita</th>
            <th className="pb-3 text-right font-medium text-gray-500 dark:text-gray-400">Vendidos</th>
            <th className="pb-3 text-right font-medium text-gray-500 dark:text-gray-400">Conversao</th>
          </tr>
        </thead>
        <tbody>
          {data.map((product, index) => (
            <tr
              key={product.id}
              className="border-b border-gray-50 last:border-0 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="py-3 text-gray-400 dark:text-gray-500">{index + 1}</td>
              <td className="py-3">
                <Link
                  href={`/products/${product.id}`}
                  className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {product.name}
                </Link>
              </td>
              <td className="py-3 text-gray-600 dark:text-gray-400">
                {formatCategory(product.category)}
              </td>
              <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                {product.views.toLocaleString('pt-BR')}
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(product.revenue)}
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                {product.units_sold}
              </td>
              <td className="py-3 text-right">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  product.units_sold > 0
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {conversionRate(product.views, product.units_sold)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
