'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { OrderStatus } from '@/types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pgto',
  pending: 'Aprovado',
  approved: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  completed: 'Concluído',
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

const VALID_STATUSES: OrderStatus[] = ['approved', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'];

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

export default function OrdersListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number }>({ page: 1, limit: 20, total: 0, pages: 0 });

  async function fetchOrders(currentPage = page) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', '20');
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);

    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders(page);
  }, [statusFilter, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchOrders(1);
  }

  async function quickUpdateStatus(orderId: string, newStatus: OrderStatus, trackingCode?: string) {
    setUpdatingId(orderId);
    const payload: Record<string, string> = { status: newStatus };
    if (trackingCode) payload.tracking_code = trackingCode;
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setToast(`Pedido #${orderId.slice(0, 8)} → ${STATUS_LABELS[newStatus]}`);
      setTimeout(() => setToast(''), 3000);
    }
    setUpdatingId(null);
  }

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'paid').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const shippedCount = orders.filter(o => o.status === 'shipped').length;
  const revenue = orders.filter(o => o.status !== 'canceled' && o.status !== 'refunded').reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-[fade-in_0.2s] rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Gerencie e atualize status rapidamente
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
          {pagination.total} total
        </span>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">Aguardando</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">Em preparo</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{processingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">Enviados</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{shippedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">Receita</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{formatPrice(revenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, email ou nome..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">Todos os status</option>
          {VALID_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800">
          Filtrar
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Ação rápida</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {orders.map((order) => (
                <tr key={order.id} className="group transition hover:bg-pink-50/30 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3.5">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      #{order.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{order.user?.email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <QuickStatusSelect
                      currentStatus={order.status}
                      orderId={order.id}
                      updating={updatingId === order.id}
                      onUpdate={quickUpdateStatus}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      Detalhes →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pagina {pagination.page} de {pagination.pages}
            <span className="ml-2 text-xs text-gray-400">({pagination.total} pedidos)</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStatusSelect({
  currentStatus,
  orderId,
  updating,
  onUpdate,
}: {
  currentStatus: OrderStatus;
  orderId: string;
  updating: boolean;
  onUpdate: (id: string, status: OrderStatus, trackingCode?: string) => void;
}) {
  const [showTracking, setShowTracking] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingError, setTrackingError] = useState('');

  const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
    awaiting_payment: ['approved', 'canceled'],
    pending: ['processing', 'canceled'],
    approved: ['processing', 'canceled'],
    paid: ['processing', 'canceled', 'refunded'],
    processing: ['shipped', 'canceled'],
    completed: [],
    shipped: ['delivered'],
    delivered: [],
    canceled: [],
    refunded: [],
  };

  const options = nextStatuses[currentStatus];
  if (options.length === 0) return <span className="text-xs text-gray-400">—</span>;

  function handleChange(value: string) {
    if (!value) return;
    if (value === 'shipped') {
      setShowTracking(true);
      setTrackingError('');
      return;
    }
    onUpdate(orderId, value as OrderStatus);
  }

  function handleShip() {
    if (!trackingCode.trim()) {
      setTrackingError('Preencha o código de rastreio');
      return;
    }
    onUpdate(orderId, 'shipped', trackingCode.trim());
    setShowTracking(false);
    setTrackingCode('');
  }

  if (showTracking) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={trackingCode}
          onChange={(e) => { setTrackingCode(e.target.value); setTrackingError(''); }}
          placeholder="Código de rastreio"
          className={`w-32 rounded-lg border px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:text-white ${trackingError ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
          autoFocus
        />
        <button
          onClick={handleShip}
          disabled={updating}
          className="rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition disabled:opacity-50"
        >
          Enviar
        </button>
        <button
          onClick={() => { setShowTracking(false); setTrackingCode(''); }}
          className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      disabled={updating}
      value=""
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    >
      <option value="">Avançar →</option>
      {options.map(s => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
