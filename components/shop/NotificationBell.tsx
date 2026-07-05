'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Notification } from '@/types/database';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getNotificationHref(n: Notification): string {
  const meta = n.metadata as Record<string, unknown> | null;
  switch (n.type) {
    case 'order_status':
      if (meta?.order_id) return `/account/orders/${meta.order_id}`;
      return '/account/orders';
    case 'print_request_status':
      return '/account/requests';
    case 'announcement':
    default:
      return '/products';
  }
}

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json() as { notifications: Notification[]; unread_count: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [session, fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  if (!session?.user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-gray-600 transition hover:bg-pink-50/60 hover:text-pink-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-pink-400"
        aria-label="Notificações"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-[11px] font-bold leading-none text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 max-w-sm mx-auto sm:mx-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-pink-600 hover:text-pink-800 dark:text-pink-400 dark:hover:text-pink-300 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                Nenhuma notificação
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                    setOpen(false);
                    router.push(getNotificationHref(n));
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    !n.read ? 'bg-pink-50/30 dark:bg-pink-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
