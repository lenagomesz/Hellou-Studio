'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import type { CohortData } from '@/lib/customer-analytics';

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics/cohorts')
      .then(r => r.json())
      .then(data => setCohorts(data.cohorts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const insights = useMemo(() => {
    if (cohorts.length < 2) return [];
    const result: string[] = [];

    // Find best and worst retention at 3 months
    let best3m = { month: '', retention: 0 };
    let worst3m = { month: '', retention: 100 };

    for (const c of cohorts) {
      const r3 = c.retention[3] ?? 0;
      if (r3 > best3m.retention) best3m = { month: c.cohortMonth, retention: r3 };
      if (r3 < worst3m.retention && c.cohortSize > 0) worst3m = { month: c.cohortMonth, retention: r3 };
    }

    if (best3m.month) {
      result.push(`Coorte de ${formatMonth(best3m.month)} tem ${best3m.retention}% de retenção em 3 meses (melhor)`);
    }
    if (worst3m.month && worst3m.month !== best3m.month) {
      result.push(`Coorte de ${formatMonth(worst3m.month)} tem ${worst3m.retention}% de retenção em 3 meses (pior)`);
    }

    // Average retention
    const avgRetention1m = cohorts.reduce((s, c) => s + (c.retention[1] ?? 0), 0) / cohorts.length;
    result.push(`Retenção média no 1º mês: ${Math.round(avgRetention1m)}%`);

    return result;
  }, [cohorts]);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4" /> Analytics
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-500" />
          Análise de coortes
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Retenção de clientes agrupados por mês da primeira compra ou cadastro
        </p>
      </header>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 dark:bg-indigo-900/20 dark:border-indigo-800">
          <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Insights</p>
          <ul className="space-y-1">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-indigo-700 dark:text-indigo-300">{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cohort Table */}
      {loading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : cohorts.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-500">Dados insuficientes para análise de coortes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sticky left-0 bg-white dark:bg-gray-900">
                  Coorte
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Tamanho
                </th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <th key={m} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                    M{m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {cohorts.map((cohort) => (
                <tr key={cohort.cohortMonth} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900 whitespace-nowrap">
                    {formatMonth(cohort.cohortMonth)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                    {cohort.cohortSize}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                    const value = cohort.retention[m];
                    return (
                      <td key={m} className="px-3 py-3 text-center">
                        {value !== undefined ? (
                          <RetentionCell value={value} />
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-green-500" /> 30%+
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-500" /> 10-29%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-400" /> &lt;10%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-gray-200" /> 0%
        </span>
        <span className="text-gray-400">M1–M12 = meses após o cadastro</span>
      </div>
    </div>
  );
}

function RetentionCell({ value }: { value: number }) {
  let bg = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  if (value >= 30) bg = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  else if (value >= 10) bg = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  else if (value > 0) bg = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300';

  return (
    <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium ${bg}`}>
      {value}%
    </span>
  );
}

function formatMonth(ym: string) {
  const [year, month] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year}`;
}
