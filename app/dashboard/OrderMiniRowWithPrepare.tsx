'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Order, User } from '@/types/database';

type OrderRow = Order & { user?: Pick<User, 'id' | 'email' | 'name'> | null };

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function OrderMiniRowWithPrepare({ order }: { order: OrderRow }) {
  const [marking, setMarking] = useState(false);

  const handleMarkPrepared = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMarking(true);

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prepared: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao marcar como preparado');
      } else {
        location.reload();
      }
    } catch (err) {
      alert('Erro na requisição');
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800 group"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
          {order.user?.name || order.user?.email || 'Cliente'}
        </p>
        <p className="text-xs text-gray-400">
          #{order.id.slice(0, 8)} · {timeAgo(order.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatPrice(order.total)}</span>
        <button
          onClick={handleMarkPrepared}
          disabled={marking}
          className="ml-2 opacity-0 group-hover:opacity-100 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
          title="Marcar como preparado"
        >
          {marking ? 'Marcando...' : '✓ Preparado'}
        </button>
      </div>
    </Link>
  );
}
