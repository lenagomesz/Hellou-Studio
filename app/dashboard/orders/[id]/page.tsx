'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { OrderStatus } from '@/types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  pending: 'Aprovado',
  approved: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  completed: 'Concluído',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
  rejected: 'Pagamento Recusado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  pending: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  approved: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  paid: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
  completed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  delivered: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  canceled: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  refunded: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  awaiting_payment: '🕐',
  pending: '✅',
  approved: '✅',
  paid: '💳',
  processing: '⚙️',
  completed: '✅',
  shipped: '📦',
  delivered: '📬',
  canceled: '❌',
  refunded: '↩️',
  rejected: '❌',
};

const STATUS_FLOW_PHYSICAL: OrderStatus[] = ['awaiting_payment', 'approved', 'processing', 'shipped', 'delivered'];
const STATUS_FLOW_DIGITAL: OrderStatus[] = ['awaiting_payment', 'approved', 'delivered'];

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  customization_text: string | null;
  product_snapshot: Record<string, unknown> | null;
  product: { id: string; name: string; image_url: string | null; type?: string; file_path?: string } | null;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  shipping_address: Record<string, unknown> | null;
  user: { id: string; email: string; name: string | null } | null;
  items: OrderItem[];
};

type TimelineEvent = {
  id: string;
  order_id: string;
  status: string;
  previous_status: string | null;
  changed_by_name: string | null;
  message: string | null;
  created_at: string;
};

type EmailDelivery = {
  id: string;
  email_type: string;
  recipient_masked: string;
  subject: string;
  status: string;
  attempt_count: number;
  provider_email_id: string | null;
  last_error_message: string | null;
  created_at: string;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [shippingError, setShippingError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [emails, setEmails] = useState<EmailDelivery[]>([]);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        const shipping = data.shipping_address as Record<string, unknown> | null;
        setTrackingCode((shipping?.tracking_code as string) ?? '');
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));

    fetch(`/api/admin/orders/timeline?orderId=${id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setTimeline(data))
      .catch(() => setTimeline([]));

    fetch(`/api/admin/orders/${id}/emails`)
      .then((response) => response.ok ? response.json() : { emails: [] })
      .then((data) => setEmails(data.emails ?? []))
      .catch(() => setEmails([]));
  }, [id]);

  async function resendEmail(emailId: string) {
    setResendingEmailId(emailId);
    setSaveMsg('');
    try {
      const response = await fetch(`/api/admin/email-deliveries/${emailId}/resend`, { method: 'POST' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Falha ao reenviar.');
      setSaveMsg('E-mail reenviado com sucesso!');
      const historyResponse = await fetch(`/api/admin/orders/${id}/emails`, { cache: 'no-store' });
      if (historyResponse.ok) setEmails((await historyResponse.json()).emails ?? []);
    } catch (error) {
      setSaveMsg(`Erro: ${error instanceof Error ? error.message : 'Falha ao reenviar e-mail.'}`);
    } finally {
      setResendingEmailId(null);
    }
  }

  async function updateStatus(status: OrderStatus) {
    if (status === 'shipped' && !trackingCode.trim()) {
      setSaveMsg('');
      setShippingError('Preencha o código de rastreio antes de marcar como enviado');
      return;
    }
    setShippingError('');
    setUpdating(true);
    setSaveMsg('');
    const payload: Record<string, string> = { status };
    if (status === 'shipped') {
      payload.tracking_code = trackingCode.trim();
    }
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok && order) {
      setOrder({ ...order, status });
      setSaveMsg('Status atualizado!');
    } else {
      try {
        const errorData = await res.json() as { error?: string };
        setSaveMsg(`Erro: ${errorData.error || 'Falha ao atualizar status'}`);
        console.error('[order-update-error]', errorData);
      } catch {
        setSaveMsg('Erro ao atualizar status');
      }
    }
    setUpdating(false);
  }

  async function saveTracking() {
    setUpdating(true);
    setSaveMsg('');
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_code: trackingCode }),
    });
    if (res.ok) setSaveMsg('Rastreio salvo!');
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-10 w-72 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          </div>
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
          </svg>
        </div>
        <p className="mt-3 text-sm text-gray-600">Pedido não encontrado.</p>
        <Link href="/dashboard/orders" className="mt-3 text-sm font-medium text-pink-600 hover:text-pink-700 transition">
          &larr; Voltar aos pedidos
        </Link>
      </div>
    );
  }

  const isDigitalOnly = order.items.every(item => item.product?.type === 'digital');
  const STATUS_FLOW = isDigitalOnly ? STATUS_FLOW_DIGITAL : STATUS_FLOW_PHYSICAL;
  const currentStepIndex = STATUS_FLOW.indexOf(order.status);
  const shipping = order.shipping_address as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <div>
          <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-pink-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Pedidos
          </Link>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Ordem de produção</p>
          <h1 className="mt-1 text-3xl font-bold">
            Pedido <span className="font-mono text-slate-500">#{order.id.slice(0, 8)}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{formatDate(order.created_at)}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${STATUS_STYLES[order.status]}`}>
          <span>{STATUS_ICONS[order.status]}</span>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Progress bar */}
      {order.status !== 'canceled' && order.status !== 'refunded' && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center">
            {STATUS_FLOW.map((s, i) => {
              const isDone = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={s} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                      isDone
                        ? isCurrent
                          ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-md shadow-pink-200/50'
                          : 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone && !isCurrent ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      {STATUS_LABELS[s]}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded-full transition ${i < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Items */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Itens do pedido</h2>
              <p className="text-xs text-gray-500">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-orange-50">
                    {item.product?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-pink-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{item.product?.name ?? 'Produto removido'}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity}x &middot; {formatPrice(item.unit_price)} cada
                    </p>
                    {item.customization_text && (
                      <div className="mt-2 rounded-xl border border-pink-100 bg-pink-50 px-3 py-2 text-xs leading-5 text-pink-800 dark:border-pink-900/50 dark:bg-pink-500/10 dark:text-pink-200">
                        <span className="font-semibold">Personalização solicitada:</span> {item.customization_text}
                      </div>
                    )}
                    {item.product?.type === 'digital' && (
                      <button
                        onClick={async () => {
                          if (!item.product?.id) return;
                          try {
                            setDownloadingId(item.product.id);
                            const downloadUrl = `/api/orders/${id}/download/${item.product.id}`;
                            const res = await fetch(downloadUrl);
                            if (!res.ok) {
                              const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
                              console.error('[download-error]', error);
                              alert(`Erro ao baixar: ${error.error || 'Tente novamente'}`);
                              return;
                            }
                            const blob = await res.blob();
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `${item.product.name}.stl`;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            URL.revokeObjectURL(link.href);
                          } catch (error) {
                            console.error('[download-exception]', error);
                            alert('Erro ao baixar o arquivo');
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        disabled={order.status !== 'delivered' || downloadingId === item.product?.id}
                        className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          order.status === 'delivered'
                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50'
                            : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12l4.72-4.72a.75.75 0 0 1 1.06 0l4.72 4.72m-6-6v12" />
                        </svg>
                        {downloadingId === item.product?.id ? 'Baixando...' : order.status === 'delivered' ? 'Baixar' : 'Indisponível'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap dark:text-white">
                    {formatPrice(item.quantity * item.unit_price)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Gerenciar pedido */}
          <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-600">Ação operacional</p>
              <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Atualizar pedido</h2>
              <p className="text-xs text-gray-500 mt-0.5">O próximo passo fica em destaque; as demais etapas continuam disponíveis abaixo.</p>
            </div>

            {/* STL Delivery Button */}
            {isDigitalOnly && order.status !== 'delivered' && (
            <div className="mb-5 rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L3 3m0 0h18M3 3l4.72 4.72a.75.75 0 0 0 1.28-.531V3H7.5m13.5 0v4.191a.75.75 0 0 0 1.28.531L21 3" />
                </svg>
                <span className="text-xs font-semibold text-green-700">Entregar Arquivo STL</span>
              </div>
              <p className="text-xs text-green-600 mb-3">Enviar email de entrega e marcar pedido como entregue</p>
              <button
                type="button"
                onClick={async () => {
                  setUpdating(true);
                  try {
                    const res = await fetch(`/api/orders/${id}/send-stl-delivery`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    if (res.ok) {
                      setOrder({ ...order, status: 'delivered' });
                      setSaveMsg('Email STL enviado e pedido marcado como entregue!');
                    } else {
                      const err = await res.json();
                      setSaveMsg(err.error || 'Erro ao enviar email');
                    }
                  } catch (_err) {
                    setSaveMsg('Erro ao enviar email');
                  } finally {
                    setUpdating(false);
                  }
                }}
                disabled={updating}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                📧 Enviar Email de Entrega
              </button>
            </div>
            )}

            {/* Código de rastreamento - Hidden for digital-only orders */}
            {!isDigitalOnly && (
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-purple-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span className="text-xs font-semibold text-gray-700">Código de rastreamento</span>
                {order.status === 'processing' && (
                  <span className="ml-auto text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Obrigatório para enviar</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => { setTrackingCode(e.target.value); setShippingError(''); }}
                  placeholder="Ex: BR123456789BR"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                    shippingError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-pink-500 focus:ring-pink-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={saveTracking}
                  disabled={updating}
                  className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
              {shippingError && (
                <p className="mt-2 text-xs text-red-600">{shippingError}</p>
              )}
            </div>
            )}

            {/* Próximo passo - Physical products only */}
            {!isDigitalOnly && order.status !== 'canceled' && order.status !== 'refunded' && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Próximo passo:</p>
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <button type="button" disabled={updating} onClick={() => updateStatus('paid')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                      💳 Confirmar pagamento
                    </button>
                  )}
                  {order.status === 'paid' && (
                    <button type="button" disabled={updating} onClick={() => updateStatus('processing')} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50">
                      ⚙️ Iniciar produção
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button type="button" disabled={updating} onClick={() => updateStatus('shipped')} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50">
                      📦 Marcar como enviado
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button type="button" disabled={updating} onClick={() => updateStatus('delivered')} className="rounded-xl bg-green-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
                      ✅ Confirmar entrega
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Outros status */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                {isDigitalOnly ? 'Apenas STL - Status limitado:' : 'Ir para status:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {isDigitalOnly ? (
                  // For digital-only: show minimal statuses
                  <>
                    <button
                      type="button"
                      disabled={updating || order.status === 'awaiting_payment'}
                      onClick={() => updateStatus('awaiting_payment')}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                        order.status === 'awaiting_payment'
                          ? 'border-pink-200 bg-pink-50 text-pink-700 cursor-default'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                      } disabled:opacity-40`}
                    >
                      Aguardando Pagamento
                    </button>
                    <button
                      type="button"
                      disabled={updating || order.status === 'delivered'}
                      onClick={() => updateStatus('delivered')}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                        order.status === 'delivered'
                          ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                      } disabled:opacity-40`}
                    >
                      Entregue
                    </button>
                  </>
                ) : (
                  // For physical: show full status flow
                  STATUS_FLOW.map((s) => {
                    const isCurrent = s === order.status;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={updating || isCurrent}
                        onClick={() => updateStatus(s)}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                          isCurrent
                            ? 'border-pink-200 bg-pink-50 text-pink-700 cursor-default'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                        } disabled:opacity-40`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    );
                  })
                )}
                <div className="w-px bg-gray-200 mx-1 self-stretch" />
                <button type="button" disabled={updating} onClick={() => updateStatus('canceled')} className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                  Cancelar
                </button>
                <button type="button" disabled={updating} onClick={() => updateStatus('refunded')} className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                  Reembolsar
                </button>
              </div>
            </div>

            {saveMsg && (
              <div className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${saveMsg.startsWith('Erro') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                {saveMsg.startsWith('Erro') ? '✕' : '✓'} {saveMsg}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Customer */}
          <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100">
                <span className="text-sm font-bold text-pink-600">
                  {order.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-gray-700">Cliente</h2>
            </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.user?.email ?? '—'}</p>
          </div>

          {/* Shipping - Hidden for digital-only orders */}
          {!isDigitalOnly && (
          <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Entrega</h2>
            {shipping ? (
              <div className="space-y-2">
                {String(shipping.street ?? '') && (
                  <p className="text-sm text-gray-700">{String(shipping.street)}{shipping.number ? `, ${String(shipping.number)}` : ''}</p>
                )}
                {String(shipping.complement ?? '') && (
                  <p className="text-xs text-gray-500">{String(shipping.complement)}</p>
                )}
                {String(shipping.neighborhood ?? '') && (
                  <p className="text-xs text-gray-500">{String(shipping.neighborhood)}</p>
                )}
                {String(shipping.city ?? '') && (
                  <p className="text-sm text-gray-700">{String(shipping.city)} - {String(shipping.state ?? '')}</p>
                )}
                {String(shipping.cep ?? '') && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                    <span className="text-[11px] text-gray-500">CEP</span>
                    <span className="font-mono text-xs font-medium text-gray-700">{String(shipping.cep)}</span>
                  </div>
                )}
                {trackingCode && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-purple-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <span className="font-mono text-xs font-medium text-purple-700">{trackingCode}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sem informações de entrega</p>
            )}
          </div>
          )}

          {/* Etiqueta de envio - Hidden for digital-only orders */}
          {!isDigitalOnly && (
          <div className="rounded-[22px] border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-white/15 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Etiqueta de envio</h2>
              <button
                type="button"
                onClick={() => {
                  const remetente = `REMETENTE:\nhelloustudio\nRua São Paulo, 250\nBairro São Judas\nItajaí - SC\nCEP: 88303-330`;
                  const dest = shipping
                    ? `DESTINATÁRIO:\n${order.user?.name ?? ''}\n${String(shipping.street ?? '')}${shipping.number ? ', ' + String(shipping.number) : ''}${shipping.complement ? ' - ' + String(shipping.complement) : ''}\n${String(shipping.neighborhood ?? '')}\n${String(shipping.city ?? '')} - ${String(shipping.state ?? '')}\nCEP: ${String(shipping.cep ?? '')}`
                    : `DESTINATÁRIO:\n${order.user?.name ?? ''}\n(endereço não informado)`;
                  navigator.clipboard.writeText(`${remetente}\n\n${dest}`);
                }}
                className="text-[11px] font-medium text-pink-600 hover:text-pink-700 transition"
              >
                Copiar tudo
              </button>
            </div>
            <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-100 dark:border-white/10 dark:bg-white/5">
                <p className="font-semibold text-gray-700 mb-1">REMETENTE:</p>
                <p className="text-gray-600">helloustudio</p>
                <p className="text-gray-600">Rua São Paulo, 250</p>
                <p className="text-gray-600">Bairro São Judas</p>
                <p className="text-gray-600">Itajaí - SC</p>
                <p className="text-gray-600 font-mono">CEP: 88303-330</p>
              </div>
              <div className="rounded-lg bg-pink-50 p-3 border border-pink-100">
                <p className="font-semibold text-gray-700 mb-1">DESTINATÁRIO:</p>
                <p className="text-gray-600">{order.user?.name ?? '—'}</p>
                {shipping ? (
                  <>
                    <p className="text-gray-600">
                      {String(shipping.street ?? '')}{shipping.number ? `, ${String(shipping.number)}` : ''}
                      {shipping.complement ? ` - ${String(shipping.complement)}` : ''}
                    </p>
                    <p className="text-gray-600">{String(shipping.neighborhood ?? '')}</p>
                    <p className="text-gray-600">{String(shipping.city ?? '')} - {String(shipping.state ?? '')}</p>
                    <p className="text-gray-600 font-mono">CEP: {String(shipping.cep ?? '')}</p>
                  </>
                ) : (
                  <p className="text-gray-400 italic">Endereço não informado</p>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Payment */}
          <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Pagamento</h2>
            <dl className="space-y-2.5">
              <div className="flex justify-between items-center">
                <dt className="text-xs text-gray-500">Total</dt>
              <dd className="text-base font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs text-gray-500">Status</dt>
                <dd className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </dd>
              </div>
              {!!shipping?.wants_invoice && (
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-gray-500">Nota Fiscal</dt>
                  <dd className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Solicitada
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Histórico de e-mails */}
          <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">E-mails do pedido</h2><p className="mt-0.5 text-[11px] text-gray-400">Envio e entrega confirmados pela Resend</p></div>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">{emails.length}</span>
            </div>
            {emails.length === 0 ? <p className="text-xs text-gray-400">Nenhum envio registrado para este pedido.</p> : (
              <ul className="space-y-3">
                {emails.map((email) => {
                  const failed = ['failed', 'bounced', 'complained', 'suppressed'].includes(email.status);
                  const delivered = email.status === 'delivered';
                  return <li key={email.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100" title={email.subject}>{email.subject}</p><p className="mt-1 text-[10px] text-gray-400">{email.recipient_masked} · {formatDate(email.created_at)} · {email.attempt_count} tentativa(s)</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${delivered ? 'bg-green-100 text-green-700' : failed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{email.status}</span></div>
                    {email.last_error_message && <p className="mt-2 text-[10px] leading-4 text-red-600">{email.last_error_message}</p>}
                    {(failed || email.status === 'delayed') && <button type="button" disabled={!email.provider_email_id || resendingEmailId === email.id} onClick={() => void resendEmail(email.id)} className="mt-2 rounded-lg border border-pink-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-pink-600 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50">{resendingEmailId === email.id ? 'Reenviando...' : 'Reenviar e-mail'}</button>}
                  </li>;
                })}
              </ul>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h2>
            {timeline.length === 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Criado em</span>
                  <span className="text-xs font-medium text-gray-700">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Atualizado em</span>
                  <span className="text-xs font-medium text-gray-700">{formatDate(order.updated_at)}</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                <ul className="space-y-4">
                  {timeline.map((event, idx) => {
                    const statusKey = event.status as OrderStatus;
                    const icon = STATUS_ICONS[statusKey] ?? '●';
                    const label = STATUS_LABELS[statusKey] ?? event.status;
                    const isLatest = idx === timeline.length - 1;
                    return (
                      <li key={event.id} className="relative flex gap-3 pl-0">
                        <div className={`relative z-10 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                          isLatest
                            ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className="text-[8px]">{icon}</span>
                        </div>
                        <div className="flex-1 min-w-0 -mt-0.5">
                      <p className={`text-xs font-medium ${isLatest ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {label}
                          </p>
                          {event.message && (
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{event.message}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{formatDate(event.created_at)}</span>
                            {event.changed_by_name && (
                              <span className="text-[10px] text-gray-400">por {event.changed_by_name}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
