'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Star, Mail, Settings } from 'lucide-react';
import type { CustomerMetrics } from '@/lib/customer-analytics';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ChurnDetectionPage() {
  const [customers, setCustomers] = useState<CustomerMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [churnThreshold, setChurnThreshold] = useState(90);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');

  function loadData(threshold: number) {
    setLoading(true);
    fetch(`/api/admin/analytics/customers?churn_threshold=${threshold}`)
      .then(r => r.json())
      .then(data => setCustomers(data.customers ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(churnThreshold); }, [churnThreshold]);

  const atRisk = useMemo(
    () => customers.filter(c => c.churnRisk >= 40).sort((a, b) => b.churnRisk - a.churnRisk),
    [customers],
  );

  const critical = atRisk.filter(c => c.churnRisk >= 70);
  const moderate = atRisk.filter(c => c.churnRisk >= 40 && c.churnRisk < 70);

  function getRecommendation(customer: CustomerMetrics): string {
    if (customer.churnRisk >= 80) {
      return `Enviar desconto de reativação em ${customer.topCategory ?? 'produtos favoritos'}`;
    }
    if (customer.churnRisk >= 60) {
      return 'Enviar email de "sentimos sua falta" com novidades';
    }
    if (customer.churnRisk >= 40) {
      return 'Enviar survey de satisfacao ou newsletter personalizada';
    }
    return 'Manter engajamento normal';
  }

  async function copyEmails(list: CustomerMetrics[]) {
    const emails = list.map(c => c.email).join(', ');
    await navigator.clipboard.writeText(emails);
    setToast(`${list.length} e-mails copiados para reativação`);
    setTimeout(() => setToast(''), 3000);
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
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Deteccao de Churn
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Clientes com risco de abandono - Score de 0 a 100
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <Settings className="h-4 w-4" /> Configurar
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Limiar de inatividade (dias sem compra para ser considerado risco)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={14}
              max={365}
              value={churnThreshold}
              onChange={(e) => setChurnThreshold(parseInt(e.target.value) || 90)}
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-gray-500">dias</span>
            <button
              onClick={() => loadData(churnThreshold)}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 transition"
            >
              Recalcular
            </button>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      {critical.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {critical.length} cliente{critical.length > 1 ? 's' : ''} em risco crítico de churn
              </p>
            </div>
            <button
              onClick={() => copyEmails(critical)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition"
            >
              <Mail className="h-3 w-3" /> Copiar emails
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-xs text-gray-500">Total em Risco</p>
          <p className="text-2xl font-bold text-red-600">{atRisk.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-xs text-gray-500">Risco Crítico (70+)</p>
          <p className="text-2xl font-bold text-red-600">{critical.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-xs text-gray-500">Risco Moderado (40-69)</p>
          <p className="text-2xl font-bold text-amber-600">{moderate.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-xs text-gray-500">Receita em Risco</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPrice(atRisk.reduce((s, c) => s + c.totalSpent, 0))}
          </p>
        </div>
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
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Risco</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Última compra</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Pedidos</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Total Gasto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Fatores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Sugestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {atRisk.map((customer) => (
                <tr key={customer.userId} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/users/${customer.userId}`} className="flex items-center gap-2">
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
                    <ChurnBadge risk={customer.churnRisk} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {customer.daysSinceLastPurchase !== null ? `${customer.daysSinceLastPurchase}d` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {customer.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {formatPrice(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5">
                      {customer.churnFactors.slice(0, 2).map((f, i) => (
                        <li key={i} className="text-xs text-gray-500 dark:text-gray-400">{f}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {getRecommendation(customer)}
                    </p>
                  </td>
                </tr>
              ))}
              {atRisk.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum cliente em risco de churn. Excelente!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChurnBadge({ risk }: { risk: number }) {
  let bg = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (risk >= 70) bg = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  else if (risk >= 40) bg = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${bg}`}>
      {risk}%
    </span>
  );
}
