'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Package,
  Truck,
  Clock,
  Archive,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import type { AdminNotification } from '@/types/database';

function getAlertIcon(type: AdminNotification['type']) {
  switch (type) {
    case 'production_reminder':
      return <Package className="h-5 w-5 text-red-600" />;
    case 'shipping_reminder':
      return <Truck className="h-5 w-5 text-red-600" />;
    case 'order_overdue':
      return <Clock className="h-5 w-5 text-red-600" />;
    case 'low_stock':
      return <Archive className="h-5 w-5 text-red-600" />;
    case 'new_print_request':
      return <Printer className="h-5 w-5 text-red-600" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
  }
}

function getAlertLink(alert: AdminNotification): string | null {
  if (alert.related_order_id) {
    return `/dashboard/orders/${alert.related_order_id}`;
  }
  if (alert.related_product_id) {
    return `/dashboard/products/${alert.related_product_id}`;
  }
  return null;
}

export function UrgentAlerts({ alerts: initialAlerts }: { alerts: AdminNotification[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleResolve(id: string) {
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      // silently fail - user can retry
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Nenhum alerta urgente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/30">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Alertas Urgentes
        </h2>
        <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-800 dark:text-red-200">
          {alerts.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => {
          const link = getAlertLink(alert);

          return (
            <div
              key={alert.id}
              className="flex flex-col gap-3 rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-800 dark:bg-gray-900"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Urgent
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {alert.title}
                  </p>
                  {alert.body && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {alert.body}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {link && (
                  <Link
                    href={link}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    Ver detalhes
                  </Link>
                )}
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolver
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
