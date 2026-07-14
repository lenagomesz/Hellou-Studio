'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { StockMovementReason, StockMovementWithDetails } from '@/types/inventory';

const REASON_LABELS: Record<StockMovementReason, string> = {
  venda: 'Venda',
  devolucao: 'Devolucao',
  ajuste_manual: 'Ajuste Manual',
  reposicao: 'Reposição',
  quebra: 'Quebra',
  perda: 'Perda',
  transferencia: 'Transferencia',
};

const REASON_COLORS: Record<StockMovementReason, string> = {
  venda: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  devolucao: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ajuste_manual: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  reposicao: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  quebra: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  perda: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  transferencia: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovementWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reasonFilter, setReasonFilter] = useState<string>('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (reasonFilter) params.set('reason', reasonFilter);

      const res = await fetch(`/api/admin/inventory/movements?${params}`);
      const data = await res.json();
      setMovements(data.movements ?? []);
      setTotalPages(data.pagination?.pages ?? 1);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [page, reasonFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimentações de Estoque</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Histórico completo de todas as entradas e saídas.
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          ← Voltar
        </Link>
      </header>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={reasonFilter}
          onChange={e => { setReasonFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">Todos os motivos</option>
          {Object.entries(REASON_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-x-auto dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variação</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">Motivo</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Quantidade</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Antes → Depois</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Notas</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Usuário</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-gray-400">Carregando...</td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-gray-400">Nenhuma movimentacao encontrada.</td>
              </tr>
            ) : (
              movements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')} {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 text-gray-800 dark:text-gray-200 font-medium">
                    {m.product_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                    {m.option_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${REASON_COLORS[m.reason]}`}>
                      {REASON_LABELS[m.reason]}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right font-mono font-semibold ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500 dark:text-gray-400 font-mono">
                    {m.stock_before} → {m.stock_after}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                    {m.notes || '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                    {m.user_email || 'Sistema'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}
