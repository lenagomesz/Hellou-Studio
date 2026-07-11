'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';

interface RealTimeWidgetsProps {
  initialData: {
    ordersToday: number;
    revenueToday: number;
    criticalStock: number;
  };
}

export default function RealTimeWidgets({ initialData }: RealTimeWidgetsProps) {
  const [data, setData] = useState(initialData);
  const [highlight, setHighlight] = useState<Record<string, boolean>>({});
  const prevDataRef = useRef(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/analytics/advanced');
        if (res.ok) {
          const json = await res.json();
          if (json.realtime) {
            const newData = {
              ordersToday: json.realtime.ordersToday,
              revenueToday: json.realtime.revenueToday,
              criticalStock: json.realtime.criticalStock,
            };

            const changed: Record<string, boolean> = {};
            if (newData.ordersToday !== prevDataRef.current.ordersToday) {
              changed.orders = true;
            }
            if (newData.revenueToday !== prevDataRef.current.revenueToday) {
              changed.revenue = true;
            }
            if (newData.criticalStock !== prevDataRef.current.criticalStock) {
              changed.stock = true;
            }

            if (Object.keys(changed).length > 0) {
              setHighlight(changed);
              setTimeout(() => setHighlight({}), 1000);
            }

            prevDataRef.current = newData;
            setData(newData);
          }
        }
      } catch {
        // silently ignore fetch errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Pedidos Hoje */}
      <div
        className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-colors ${
          highlight.orders ? 'ring-2 ring-green-300 dark:ring-green-700' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <ShoppingCart className="h-4 w-4" />
            <span>Pedidos Hoje</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {data.ordersToday}
        </p>
      </div>

      {/* Receita Hoje */}
      <div
        className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-colors ${
          highlight.revenue ? 'ring-2 ring-green-300 dark:ring-green-700' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <DollarSign className="h-4 w-4" />
            <span>Receita Hoje</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(data.revenueToday)}
        </p>
      </div>

      {/* Estoque Critico */}
      <div
        className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-colors ${
          highlight.stock ? 'ring-2 ring-red-300 dark:ring-red-700' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Estoque Critico</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
        </div>
        <p
          className={`mt-2 text-2xl font-bold ${
            data.criticalStock > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {data.criticalStock}{' '}
          <span className="text-sm font-normal text-gray-500">itens</span>
        </p>
      </div>
    </div>
  );
}
