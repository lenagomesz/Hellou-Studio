'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  ShoppingCart,
  Clock,
  Truck,
  AlertTriangle,
  Printer,
  MessageSquare,
  Plus,
  CheckCheck,
  Eye,
  Archive,
  ChevronLeft,
  ChevronRight,
  X,
  PackageOpen,
} from 'lucide-react';

// --- Types ---

type NotificationType =
  | 'new_order'
  | 'production_reminder'
  | 'shipping_reminder'
  | 'low_stock'
  | 'new_print_request'
  | 'custom'
  | 'order_overdue';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface AdminNotification {
  id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  archived: boolean;
  related_order_id: string | null;
  related_product_id: string | null;
  related_product_option_id: string | null;
  due_date: string | null;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// --- Constants ---

const TYPE_OPTIONS: { value: NotificationType | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'new_order', label: 'Novo pedido' },
  { value: 'production_reminder', label: 'Lembrete de produção' },
  { value: 'shipping_reminder', label: 'Lembrete de envio' },
  { value: 'low_stock', label: 'Estoque baixo' },
  { value: 'new_print_request', label: 'Nova solicitação de impressão' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'order_overdue', label: 'Pedido atrasado' },
];

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

// --- Helpers ---

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'new_order':
      return <ShoppingCart className="h-5 w-5 text-green-500" />;
    case 'production_reminder':
      return <Clock className="h-5 w-5 text-indigo-500" />;
    case 'shipping_reminder':
      return <Truck className="h-5 w-5 text-purple-500" />;
    case 'low_stock':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'new_print_request':
      return <Printer className="h-5 w-5 text-blue-500" />;
    case 'custom':
      return <MessageSquare className="h-5 w-5 text-gray-500" />;
    case 'order_overdue':
      return <PackageOpen className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}sem`;
  const months = Math.floor(days / 30);
  return `${months}m`;
}

// --- Component ---

export default function AdminAlertsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [toast, setToast] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (unreadOnly) params.set('unread', 'true');
      if (typeFilter) params.set('type', typeFilter);

      try {
        const res = await fetch(`/api/admin/notifications?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications ?? []);
          setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 });
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    },
    [unreadOnly, typeFilter],
  );

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(pagination.page);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications, pagination.page]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function markAsRead(id: string) {
    const res = await fetch(`/api/admin/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      showToast('Notificação marcada como lida');
    }
  }

  async function archiveNotification(id: string) {
    const res = await fetch(`/api/admin/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      showToast('Notificação arquivada');
    }
  }

  async function markAllAsRead() {
    const res = await fetch('/api/admin/notifications/mark-all-read', {
      method: 'POST',
    });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('Todas marcadas como lidas');
    }
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > pagination.pages) return;
    fetchNotifications(newPage);
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Central de Alertas
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Gerencie notificações e lembretes do admin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            Novo Lembrete
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={unreadOnly ? 'unread' : 'all'}
          onChange={(e) => setUnreadOnly(e.target.value === 'unread')}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">Todas as notificações</option>
          <option value="unread">Apenas não lidas</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">
          Atualização automática a cada 60s
        </span>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Bell className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Nenhuma notificação encontrada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-xl border bg-white p-4 shadow-sm transition dark:bg-gray-900 ${
                notif.read
                  ? 'border-gray-100 dark:border-gray-800'
                  : 'border-pink-200 bg-pink-50/30 dark:border-pink-900/40 dark:bg-pink-950/10'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
                  {getTypeIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-sm font-semibold ${
                        notif.read
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[notif.priority]}`}
                    >
                      {PRIORITY_LABELS[notif.priority]}
                    </span>
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-pink-500" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-400">
                      {relativeTime(notif.created_at)}
                    </span>
                    {notif.related_order_id && (
                      <Link
                        href={`/dashboard/orders/${notif.related_order_id}`}
                        className="text-xs font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400"
                      >
                        Ver pedido
                      </Link>
                    )}
                    {notif.related_product_id && (
                      <Link
                        href={`/dashboard/products/${notif.related_product_id}`}
                        className="text-xs font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400"
                      >
                        Ver produto
                      </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-1">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      title="Marcar como lida"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => archiveNotification(notif.id)}
                    title="Arquivar"
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <CreateReminderModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchNotifications(1);
            showToast('Lembrete criado com sucesso');
          }}
        />
      )}
    </div>
  );
}

// --- Create Reminder Modal ---

function CreateReminderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NotificationType>('custom');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload: Record<string, string | undefined> = {
      title: title.trim(),
      body: description.trim() || undefined,
      type,
      priority,
      due_date: dueDate || undefined,
      related_order_id: relatedOrderId.trim() || undefined,
    };

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar lembrete');
      }
    } catch {
      setError('Erro de conexão');
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Novo Lembrete
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Verificar pedido #1234"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {TYPE_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Data de vencimento (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Related Order */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              ID do pedido relacionado (opcional)
            </label>
            <input
              type="text"
              value={relatedOrderId}
              onChange={(e) => setRelatedOrderId(e.target.value)}
              placeholder="UUID do pedido"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar Lembrete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
