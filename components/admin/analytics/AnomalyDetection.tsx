'use client';

import { AlertTriangle, TrendingDown, ShoppingCart, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface Anomaly {
  type: 'high_revenue' | 'low_revenue' | 'product_drop' | 'conversion_drop';
  message: string;
  severity: 'warning' | 'critical';
  date: string;
  value: number;
  expected: number;
}

interface AnomalyDetectionProps {
  anomalies: Anomaly[];
}

function getIcon(type: Anomaly['type']) {
  switch (type) {
    case 'high_revenue':
    case 'low_revenue':
      return AlertTriangle;
    case 'product_drop':
      return ShoppingCart;
    case 'conversion_drop':
      return Activity;
    default:
      return TrendingDown;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function calculateDeviation(value: number, expected: number): string {
  if (expected === 0) return '0';
  const deviation = ((value - expected) / expected) * 100;
  return deviation.toFixed(1);
}

export default function AnomalyDetection({ anomalies }: AnomalyDetectionProps) {
  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Nenhuma anomalia detectada - tudo normal
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...anomalies].sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      {sorted.map((anomaly, index) => {
        const Icon = getIcon(anomaly.type);
        const isCritical = anomaly.severity === 'critical';
        const deviation = calculateDeviation(anomaly.value, anomaly.expected);

        return (
          <div
            key={index}
            className={`rounded-xl border p-4 ${
              isCritical
                ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    isCritical
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                        isCritical
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}
                    >
                      {isCritical ? 'CRÍTICO' : 'ALERTA'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(parseISO(anomaly.date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <p
                    className={`text-sm font-medium ${
                      isCritical
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {anomaly.message}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Valor: {formatCurrency(anomaly.value)} | Esperado:{' '}
                    {formatCurrency(anomaly.expected)} | Desvio: {deviation}%
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/analytics?filter=${anomaly.type}`}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCritical
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/70'
                }`}
              >
                Investigar
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
