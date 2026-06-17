'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, Search, FileText, Clock } from 'lucide-react';
import type { PrintRequestStatus } from '@/types/database';

const STATUS_LABELS: Record<PrintRequestStatus, string> = {
  pending: 'Pendente',
  needs_info: 'Aguardando info',
  quoted: 'Orçado',
  approved: 'Aprovada',
  paid: 'Pago',
  in_production: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  rejected: 'Rejeitada',
  canceled: 'Cancelada',
};

const STATUS_STYLES: Record<PrintRequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  needs_info: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-indigo-100 text-indigo-700',
  in_production: 'bg-violet-100 text-violet-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',
};

const VALID_STATUSES: PrintRequestStatus[] = ['pending', 'needs_info', 'quoted', 'approved', 'paid', 'in_production', 'shipped', 'delivered', 'rejected', 'canceled'];

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

type RequestRow = {
  id: string;
  title: string;
  status: PrintRequestStatus;
  quoted_price: number | null;
  stl_file_name: string | null;
  created_at: string;
  user: { id: string; email: string; name: string | null } | null;
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast] = useState('');

  async function fetchRequests() {
    setLoading(true);
    const res = await fetch('/api/print-requests?admin=true');
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests ?? data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!r.title.toLowerCase().includes(term) && !r.user?.email?.toLowerCase().includes(term) && !r.user?.name?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const quotedCount = requests.filter(r => r.status === 'quoted').length;
  const inProductionCount = requests.filter(r => r.status === 'in_production' || r.status === 'paid').length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de Impressão</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {requests.length} solicitações · {pendingCount} pendentes · {inProductionCount} em produção
          </p>
        </div>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <p className="text-xs font-medium text-gray-500">Pendentes</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-medium text-gray-500">Orçados</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-600">{quotedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-violet-500" />
            <p className="text-xs font-medium text-gray-500">Em produção</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-violet-600">{inProductionCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, email ou nome..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">Todos os status</option>
          {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <Printer className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <Link
              key={req.id}
              href={`/dashboard/requests/${req.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-pink-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-pink-800"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                  <Printer className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{req.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.user?.name || req.user?.email || 'Cliente'}
                    {req.stl_file_name && ` · ${req.stl_file_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {req.quoted_price !== null && (
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(req.quoted_price)}</span>
                )}
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(req.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
