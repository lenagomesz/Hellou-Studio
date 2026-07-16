'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Mail,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { CustomerMetrics, CustomerSegment } from '@/lib/customer-analytics';
import {
  SEGMENT_LABELS,
  SEGMENT_BG_CLASSES,
  getRfmScoreColor,
} from '@/lib/customer-analytics';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function RFMAnalysisPage() {
  const [customers, setCustomers] = useState<CustomerMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics/customers')
      .then(r => r.json())
      .then(data => setCustomers(data.customers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = customers;
    if (segmentFilter !== 'all') {
      result = result.filter(c => c.rfm.segment === segmentFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        c => c.email.toLowerCase().includes(q) || (c.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return result.sort((a, b) => b.rfm.score - a.rfm.score);
  }, [customers, segmentFilter, search]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of customers) {
      counts[c.rfm.segment] = (counts[c.rfm.segment] ?? 0) + 1;
    }
    return counts;
  }, [customers]);

  async function sendBulkEmail(segment: CustomerSegment) {
    const segmentCustomers = customers.filter(c => c.rfm.segment === segment);
    const emails = segmentCustomers.map(c => c.email);
    // Copy emails to clipboard as a quick action
    await navigator.clipboard.writeText(emails.join(', '));
    setToast(`${emails.length} emails copiados para o clipboard (segmento: ${SEGMENT_LABELS[segment]})`);
    setTimeout(() => setToast(''), 4000);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header>
        <Link href="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4" /> Analytics
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-pink-500" />
              Análise RFM
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Recency, Frequency, Monetary - Score de 0 a 5 para cada dimensao
            </p>
          </div>
        </div>
      </header>

      {/* Segment Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['champion', 'loyal', 'potential', 'at_risk', 'lost'] as CustomerSegment[]).map(seg => (
          <button
            key={seg}
            onClick={() => setSegmentFilter(segmentFilter === seg ? 'all' : seg)}
            className={`rounded-xl border p-3 text-left transition ${
              segmentFilter === seg
                ? 'border-pink-500 ring-2 ring-pink-500/20'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300'
            } bg-white dark:bg-gray-900`}
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{SEGMENT_LABELS[seg]}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{segmentCounts[seg] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2">
        <p className="text-xs font-medium text-gray-500 self-center mr-2">Enviar email para:</p>
        {(['champion', 'loyal', 'potential', 'at_risk', 'lost'] as CustomerSegment[]).map(seg => (
          <button
            key={seg}
            onClick={() => sendBulkEmail(seg)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <Mail className="h-3 w-3" />
            {SEGMENT_LABELS[seg]} ({segmentCounts[seg] ?? 0})
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">Todos os segmentos</option>
          <option value="champion">Champions</option>
          <option value="loyal">Loyal</option>
          <option value="potential">Potential</option>
          <option value="at_risk">At Risk</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">R</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">F</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">M</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Segmento</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Última compra</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Pedidos</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Total Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((customer) => (
                <tr key={customer.userId} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/users/${customer.userId}`} className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-xs font-bold text-pink-600">
                        {(customer.name ?? customer.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          {customer.name || customer.email.split('@')[0]}
                          {customer.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        </p>
                        <p className="truncate text-xs text-gray-500">{customer.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RFMCell value={customer.rfm.recency} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RFMCell value={customer.rfm.frequency} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RFMCell value={customer.rfm.monetary} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${getRfmScoreColor(customer.rfm.score)}`}>
                      {customer.rfm.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEGMENT_BG_CLASSES[customer.rfm.segment]}`}>
                      {SEGMENT_LABELS[customer.rfm.segment]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {customer.daysSinceLastPurchase !== null ? `${customer.daysSinceLastPurchase}d atras` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {customer.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatPrice(customer.totalSpent)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} clientes exibidos de {customers.length} total
      </p>
    </div>
  );
}

function RFMCell({ value }: { value: number }) {
  let bg = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (value >= 4) bg = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  else if (value >= 2) bg = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${bg}`}>
      {value}
    </span>
  );
}
