'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Users } from 'lucide-react';
import type { CustomerMetrics, CustomerSegment } from '@/lib/customer-analytics';
import {
  SEGMENT_LABELS,
  SEGMENT_COLORS,
} from '@/lib/customer-analytics';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface SegmentData {
  segment: CustomerSegment;
  customers: CustomerMetrics[];
  count: number;
  avgLtv: number;
  avgFrequency: number;
  totalRevenue: number;
  percentage: number;
}

export default function SegmentsDashboardPage() {
  const [customers, setCustomers] = useState<CustomerMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);

  useEffect(() => {
    fetch('/api/admin/analytics/customers')
      .then(r => r.json())
      .then(data => setCustomers(data.customers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const segments = useMemo((): SegmentData[] => {
    const segMap = new Map<CustomerSegment, CustomerMetrics[]>();
    for (const c of customers) {
      if (!segMap.has(c.rfm.segment)) segMap.set(c.rfm.segment, []);
      segMap.get(c.rfm.segment)!.push(c);
    }

    const total = customers.length;
    const result: SegmentData[] = [];

    for (const seg of ['champion', 'loyal', 'potential', 'at_risk', 'lost'] as CustomerSegment[]) {
      const segs = segMap.get(seg) ?? [];
      result.push({
        segment: seg,
        customers: segs,
        count: segs.length,
        avgLtv: segs.length > 0 ? segs.reduce((s, c) => s + c.ltv, 0) / segs.length : 0,
        avgFrequency: segs.length > 0 ? segs.reduce((s, c) => s + c.totalOrders, 0) / segs.length : 0,
        totalRevenue: segs.reduce((s, c) => s + c.totalSpent, 0),
        percentage: total > 0 ? Math.round((segs.length / total) * 100) : 0,
      });
    }

    return result;
  }, [customers]);

  const selectedData = useMemo(
    () => selectedSegment ? segments.find(s => s.segment === selectedSegment) : null,
    [segments, selectedSegment],
  );

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4" /> Analytics
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-500" />
          Segmentação de clientes
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visualização de segmentos baseada em comportamento de compra
        </p>
      </header>

      {loading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : (
        <>
          {/* Bubble Visualization */}
          <div className="rounded-2xl bg-white border border-gray-100 p-8 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-center gap-8">
              {segments.map((seg) => {
                const maxCount = Math.max(...segments.map(s => s.count), 1);
                const size = Math.max(60, Math.min(200, (seg.count / maxCount) * 200));
                const isSelected = selectedSegment === seg.segment;

                return (
                  <button
                    key={seg.segment}
                    onClick={() => setSelectedSegment(isSelected ? null : seg.segment)}
                    className="group flex flex-col items-center gap-2 transition-transform hover:scale-105"
                    style={{ transform: isSelected ? 'scale(1.1)' : undefined }}
                  >
                    <div
                      className={`rounded-full flex items-center justify-center transition-all ${
                        isSelected ? 'ring-4 ring-offset-2' : ''
                      }`}
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: SEGMENT_COLORS[seg.segment] + '20',
                        borderColor: SEGMENT_COLORS[seg.segment],
                        border: `3px solid ${SEGMENT_COLORS[seg.segment]}`,
                      }}
                    >
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: SEGMENT_COLORS[seg.segment] }}>
                          {seg.count}
                        </p>
                        <p className="text-[10px] font-medium text-gray-500">{seg.percentage}%</p>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {SEGMENT_LABELS[seg.segment]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segment Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {segments.map(seg => (
              <div
                key={seg.segment}
                className={`rounded-xl border p-4 ${
                  selectedSegment === seg.segment ? 'ring-2' : ''
                } bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800`}
                style={{ outlineColor: selectedSegment === seg.segment ? SEGMENT_COLORS[seg.segment] : undefined }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[seg.segment] }} />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{SEGMENT_LABELS[seg.segment]}</p>
                </div>
                <p className="text-sm text-gray-500">
                  {seg.percentage}% ({seg.count} clientes)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  LTV medio: {formatPrice(seg.avgLtv)}
                </p>
                <p className="text-xs text-gray-400">
                  Freq. média: {seg.avgFrequency.toFixed(1)} pedidos
                </p>
              </div>
            ))}
          </div>

          {/* Selected Segment Customers */}
          {selectedData && (
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Clientes: {SEGMENT_LABELS[selectedData.segment]} ({selectedData.count})
                </h3>
                <button
                  onClick={() => setSelectedSegment(null)}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Fechar
                </button>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Cliente</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">LTV</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Pedidos</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Total Gasto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {selectedData.customers.slice(0, 50).map(c => (
                      <tr key={c.userId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2">
                          <Link href={`/dashboard/users/${c.userId}`} className="text-sm text-gray-900 dark:text-white hover:text-pink-600 flex items-center gap-1">
                            {c.name || c.email.split('@')[0]}
                            {c.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{formatPrice(c.ltv)}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{c.totalOrders}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{formatPrice(c.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
