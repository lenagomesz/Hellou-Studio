'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StockForecastData } from '@/types/inventory';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<StockForecastData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecasts();
  }, []);

  async function fetchForecasts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/forecast');
      const data = await res.json();
      setForecasts(data.forecasts ?? []);
    } catch {
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  }

  // Sort by urgency: items running out soonest first
  const sortedForecasts = [...forecasts].sort((a, b) => {
    if (!a.stock_out_date && !b.stock_out_date) return 0;
    if (!a.stock_out_date) return 1;
    if (!b.stock_out_date) return -1;
    return a.stock_out_date.localeCompare(b.stock_out_date);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Previsão de Demanda</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Forecast baseado no histórico de vendas dos últimos 6 meses.
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          ← Voltar
        </Link>
      </header>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Carregando previsões...</div>
      ) : sortedForecasts.length === 0 ? (
        <div className="py-20 text-center text-gray-400">Nenhuma previsão disponível. Precisa de histórico de vendas.</div>
      ) : (
        <div className="space-y-4">
          {sortedForecasts.map(f => (
            <div key={f.product_option_id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{f.product_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{f.option_name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Estoque atual</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{f.current_stock}</p>
                  </div>
                  {f.stock_out_date && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Esgota em</p>
                      <p className="text-sm font-semibold text-red-600">
                        {new Date(f.stock_out_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly sales chart (simple bar representation) */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-400 uppercase mb-2">Vendas Mensais (últimos 6 meses)</p>
                <div className="flex items-end gap-1 h-16">
                  {f.monthly_sales.map(m => {
                    const maxQty = Math.max(...f.monthly_sales.map(s => s.quantity), 1);
                    const height = (m.quantity / maxQty) * 100;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-400">{m.quantity}</span>
                        <div
                          className="w-full rounded-t bg-pink-400/70"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <span className="text-[9px] text-gray-400">{m.month.slice(5)}</span>
                      </div>
                    );
                  })}
                  {/* Forecast bars */}
                  {f.forecast.map(m => {
                    const maxQty = Math.max(...f.monthly_sales.map(s => s.quantity), ...f.forecast.map(fc => fc.predicted_quantity), 1);
                    const height = (m.predicted_quantity / maxQty) * 100;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-orange-500">{m.predicted_quantity}</span>
                        <div
                          className="w-full rounded-t bg-orange-300/70 border border-dashed border-orange-400"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <span className="text-[9px] text-orange-500 font-medium">{m.month.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2 rounded bg-pink-400/70" /> Histórico
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2 rounded bg-orange-300/70 border border-dashed border-orange-400" /> Previsão
                  </span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Recomendacao:</strong> Encomendar <strong>{f.recommended_order_qty}</strong> unidades
                  {f.forecast[0] && (
                    <> para cobrir demanda prevista de {f.forecast.reduce((s, fc) => s + fc.predicted_quantity, 0)} un. nos proximos 2 meses.</>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
