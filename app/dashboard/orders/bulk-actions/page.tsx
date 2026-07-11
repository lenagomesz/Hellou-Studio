'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { OrderStatus } from '@/types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pgto',
  pending: 'Aprovado',
  approved: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  completed: 'Concluido',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  pending: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const TARGET_STATUSES: OrderStatus[] = ['processing', 'shipped', 'delivered', 'canceled'];
const FILTER_STATUSES: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered', 'canceled'];

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

type OrderRow = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  user: { id: string; email: string; name: string | null } | null;
};

export default function BulkActionsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('processing');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  }

  async function executeBulkStatusChange() {
    if (selectedIds.size === 0) return;
    setProcessing(true);

    try {
      const res = await fetch('/api/admin/orders/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          orderIds: Array.from(selectedIds),
          status: targetStatus,
          sendEmails: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setToast({ message: data.message ?? `${data.summary?.updated ?? 0} pedidos atualizados`, type: 'success' });
        await fetchOrders();
        setSelectedIds(new Set());
      } else {
        setToast({ message: data.error ?? 'Erro ao executar acao', type: 'error' });
      }
    } catch {
      setToast({ message: 'Erro de conexao', type: 'error' });
    }

    setProcessing(false);
  }

  const selectedCount = selectedIds.size;
  const selectedOrders = orders.filter(o => selectedIds.has(o.id));
  const totalSelectedValue = selectedOrders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Pedidos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alterar Status em Lote</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Selecione pedidos e altere o status de todos de uma vez
          </p>
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-pink-50 border border-pink-200 px-4 py-2 dark:bg-pink-900/20 dark:border-pink-800">
            <span className="text-sm font-semibold text-pink-700 dark:text-pink-300">
              {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-pink-500">
              ({formatPrice(totalSelectedValue)})
            </span>
          </div>
        )}
      </header>

      {/* Action bar: status dropdown + apply button */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Novo status:</label>
        <select
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {TARGET_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={executeBulkStatusChange}
          disabled={selectedCount === 0 || processing}
          className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {processing ? 'Atualizando...' : `Aplicar${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
        </button>
        <span className="ml-auto text-xs text-gray-400">
          Email enviado automaticamente ao cliente
        </span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setSelectedIds(new Set()); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">Todos os status</option>
          {FILTER_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{orders.length} pedidos</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 shadow-sm border border-gray-100 text-center dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === orders.length && orders.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={`group transition cursor-pointer ${selectedIds.has(order.id) ? 'bg-pink-50/50 dark:bg-pink-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}`}
                  onClick={() => toggleSelect(order.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      #{order.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name ?? '--'}</p>
                    <p className="text-xs text-gray-500">{order.user?.email ?? '--'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
