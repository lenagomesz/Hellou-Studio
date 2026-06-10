'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PrintRequest, PrintRequestStatus } from '@/types/database';

const STATUS_CONFIG: Record<PrintRequestStatus, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  needs_info: { label: 'Aguardando sua resposta', color: 'bg-amber-100 text-amber-800' },
  quoted: { label: 'Orçado', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Aprovado', color: 'bg-indigo-100 text-indigo-800' },
  paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
  in_production: { label: 'Em produção', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Enviado', color: 'bg-teal-100 text-teal-800' },
  delivered: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
  canceled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function NeedsInfoResponse({ requestId, adminNotes, onSent }: { requestId: string; adminNotes: string | null; onSent: (updated: PrintRequest) => void }) {
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!response.trim()) return;
    setSending(true);
    const res = await fetch(`/api/print-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_response: response.trim() }),
    });
    if (res.ok) {
      const data = (await res.json()) as { request: PrintRequest };
      onSent(data.request);
    }
    setSending(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-3 space-y-2">
      {adminNotes && (
        <div>
          <p className="text-xs font-medium text-amber-700">Mensagem do admin:</p>
          <p className="mt-0.5 text-sm text-amber-900">{adminNotes}</p>
        </div>
      )}
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Escreva sua resposta..."
        rows={2}
        className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={sending || !response.trim()}
        className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {sending ? 'Enviando...' : 'Enviar resposta'}
      </button>
    </div>
  );
}

function ApprovedBuyButton({ requestId, quotedPrice }: { requestId: string; quotedPrice: number | null }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  async function handleAddToCart() {
    setAdding(true);
    setError('');

    const res = await fetch(`/api/print-requests/${requestId}/buy`, {
      method: 'POST',
    });
    if (res.ok) {
      setAdded(true);
      window.location.href = '/cart';
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Erro ao adicionar ao carrinho');
    }
    setAdding(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 p-3">
      <p className="text-sm font-medium text-green-900 dark:text-green-300">
        Sua encomenda foi aprovada!
        {quotedPrice !== null && (
          <span className="ml-1 text-green-700">
            — {formatPrice(quotedPrice)}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={adding || added}
        className="mt-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {added ? 'Adicionado!' : adding ? 'Adicionando...' : 'Prosseguir com a compra'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ReorderButton({ requestId, onReordered }: { requestId: string; onReordered: (req: PrintRequest) => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReorder() {
    setLoading(true);
    const res = await fetch(`/api/print-requests/${requestId}/reorder`, { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { request: PrintRequest };
      onReordered(data.request);
      setDone(true);
    }
    setLoading(false);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleReorder}
        disabled={loading || done}
        className="inline-flex items-center gap-1 rounded-lg border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-semibold text-pink-600 dark:text-pink-400 transition hover:bg-pink-50 dark:hover:bg-pink-950/50 disabled:opacity-50"
      >
        {done ? 'Solicitação enviada!' : loading ? 'Enviando...' : 'Solicitar novamente'}
      </button>
    </div>
  );
}

export default function UserRequestsPage() {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/print-requests')
      .then((res) => res.json())
      .then((data: { requests: PrintRequest[] }) => setRequests(data.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/account" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pink-600 transition">
            ← Minha Conta
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Minhas Solicitações</h1>
        </div>
        <Link
          href="/request-print"
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          + Nova solicitação
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-3xl">
            🖨️
          </div>
          <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Nenhuma solicitação ainda</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Envie seu primeiro arquivo .stl para receber um orçamento.
          </p>
          <Link
            href="/request-print"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Solicitar impressão
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const status = STATUS_CONFIG[req.status];
            return (
              <div
                key={req.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{req.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {req.stl_file_name} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {req.status === 'quoted' && req.quoted_price !== null && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm font-medium text-blue-900">
                      Orçamento: {formatPrice(req.quoted_price)}
                    </p>
                    {req.admin_notes && (
                      <p className="mt-1 text-xs text-blue-700">{req.admin_notes}</p>
                    )}
                  </div>
                )}

                {req.status === 'needs_info' && (
                  <NeedsInfoResponse
                    requestId={req.id}
                    adminNotes={req.admin_notes}
                    onSent={(updated) => {
                      setRequests((prev) =>
                        prev.map((r) => (r.id === updated.id ? updated : r)),
                      );
                    }}
                  />
                )}

                {req.status === 'approved' && (
                  <ApprovedBuyButton requestId={req.id} quotedPrice={req.quoted_price} />
                )}

                {(['paid', 'in_production', 'shipped', 'delivered'] as PrintRequestStatus[]).includes(req.status) && (
                  <ReorderButton
                    requestId={req.id}
                    onReordered={(newReq) => setRequests((prev) => [newReq, ...prev])}
                  />
                )}

                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">Motivo da rejeição:</p>
                    <p className="mt-0.5 text-sm text-red-800 dark:text-red-300">{req.rejection_reason}</p>
                  </div>
                )}

                {req.admin_notes && req.status !== 'quoted' && req.status !== 'rejected' && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                    Obs: {req.admin_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
