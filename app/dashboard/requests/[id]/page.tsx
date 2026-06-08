'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { PrintRequest, PrintRequestStatus } from '@/types/database';

const ADMIN_STATUS_OPTIONS: { value: PrintRequestStatus; label: string }[] = [
  { value: 'needs_info', label: 'Preciso de mais informações' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  needs_info: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  approved: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  in_production: 'bg-purple-100 text-purple-700',
  shipped: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  needs_info: 'Aguardando informações',
  quoted: 'Orçado',
  approved: 'Aprovado',
  paid: 'Pago',
  in_production: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  rejected: 'Rejeitado',
  canceled: 'Cancelado',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type RequestWithUser = PrintRequest & { user?: { id: string; email: string; name: string | null } | null };

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();

  const [request, setRequest] = useState<RequestWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [status, setStatus] = useState<PrintRequestStatus>('approved');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetch(`/api/print-requests/${params.id}`)
      .then((res) => res.json())
      .then((data: { request?: RequestWithUser }) => {
        if (data.request) {
          setRequest(data.request);
          const s = data.request.status;
          if (s === 'approved' || s === 'rejected' || s === 'needs_info') {
            setStatus(s);
          } else {
            setStatus('approved');
          }
          setQuotedPrice(data.request.quoted_price?.toString() ?? '');
          setAdminNotes(data.request.admin_notes ?? '');
          setRejectionReason(data.request.rejection_reason ?? '');
        }
      })
      .catch(() => setError('Erro ao carregar solicitação'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    const body: Record<string, unknown> = { status };

    if (status === 'approved') {
      const price = quotedPrice.trim();
      if (price === '') {
        setError('Informe o valor para aprovar');
        setSaving(false);
        return;
      }
      const parsed = parseFloat(price.replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        setError('Preço inválido');
        setSaving(false);
        return;
      }
      body.quoted_price = parsed;
    } else {
      body.quoted_price = null;
    }

    body.admin_notes = adminNotes.trim() || null;
    body.rejection_reason = status === 'rejected' ? (rejectionReason.trim() || null) : null;

    const res = await fetch(`/api/print-requests/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao salvar');
      setSaving(false);
      return;
    }

    const data = (await res.json()) as { request: RequestWithUser };
    setRequest(data.request);
    setSuccess('Salvo com sucesso!');
    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="rounded-2xl bg-white p-10 shadow-sm border border-gray-100 text-center">
        <p className="text-gray-600">Solicitação não encontrada.</p>
        <Link href="/dashboard/requests" className="mt-3 inline-block text-sm text-pink-600 hover:text-pink-700">
          ← Voltar
        </Link>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[request.status] ?? request.status;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/requests" className="text-sm text-gray-500 hover:text-pink-600 transition">
          ← Impressões
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            ID: {request.id.slice(0, 8)} · Criado em {formatDate(request.created_at)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[request.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {statusLabel}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Detalhes</h2>

          {/* Cliente */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Cliente</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {request.user?.name ?? '—'}
            </p>
            <p className="text-xs text-gray-600">{request.user?.email ?? '—'}</p>
          </div>

          {request.description && (
            <div>
              <p className="text-xs font-medium text-gray-500">Descrição</p>
              <p className="mt-0.5 text-sm text-gray-800">{request.description}</p>
            </div>
          )}

          {request.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500">Observações do cliente</p>
              <p className="mt-0.5 text-sm text-gray-800">{request.notes}</p>
            </div>
          )}

          {request.user_response && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">Resposta do cliente</p>
              <p className="mt-0.5 text-sm text-amber-900">{request.user_response}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500">Arquivo STL</p>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{request.stl_file_name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(request.stl_file_size)}</p>
              </div>
              <a
                href={request.stl_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Download
              </a>
            </div>
          </div>

          {request.quoted_price !== null && request.status === 'approved' && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-900">
                Valor aprovado: {formatPrice(request.quoted_price)}
              </p>
            </div>
          )}
        </div>

        {/* Admin Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Gerenciar</h2>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Decisão
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PrintRequestStatus)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {ADMIN_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {status === 'approved' && (
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Valor (R$) *
              </label>
              <input
                id="price"
                type="text"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                placeholder="Ex: 89.90"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          )}

          {status === 'rejected' && (
            <div>
              <label htmlFor="rejection_reason" className="block text-sm font-medium text-red-700">
                Motivo da rejeição
              </label>
              <textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique ao cliente por que a solicitação foi rejeitada..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-red-300 bg-red-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              {status === 'needs_info' ? 'O que precisa saber do cliente?' : 'Notas'}
            </label>
            <textarea
              id="notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={
                status === 'needs_info'
                  ? 'Descreva o que você precisa que o cliente informe...'
                  : 'Observações para o cliente...'
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
