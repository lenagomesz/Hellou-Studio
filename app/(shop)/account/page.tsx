import Link from 'next/link';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  pending: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800',
  pending: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800',
  paid: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',
  processing: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800',
  shipped: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800',
  delivered: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800',
  canceled: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700',
  refunded: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

async function getRecentOrders(userId: string): Promise<Order[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  return (data ?? []) as Order[];
}

async function getOrderStats(userId: string) {
  const admin = getSupabaseAdmin();
  const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['processing', 'shipped']),
  ]);
  return { total: totalCount ?? 0, active: activeCount ?? 0 };
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [recentOrders, stats] = await Promise.all([
    getRecentOrders(user.id),
    getOrderStats(user.id),
  ]);

  const greeting = user.name ? user.name.split(' ')[0] : 'Olá';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white via-white to-pink-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-pink-950/20 p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-base sm:text-lg font-bold text-white shadow-md shadow-pink-200/50">
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              Olá, {greeting}!
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
          {user.role === 'admin' && (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              Painel Admin
            </Link>
          )}
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-pink-50 dark:bg-pink-950/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
            </svg>
          </div>
          <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="mt-0.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{stats.total === 1 ? 'Pedido' : 'Pedidos'}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
          <p className="mt-0.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Andamento</p>
        </div>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {recentOrders.filter(o => o.status === 'delivered').length}
          </p>
          <p className="mt-0.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Entregues</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <Link
          href="/products"
          className="group flex items-center gap-2.5 sm:gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-4 shadow-sm transition hover:border-pink-200 hover:shadow-md"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/50 dark:to-orange-950/50 transition group-hover:from-pink-100 group-hover:to-orange-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Catálogo</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Ver produtos</p>
          </div>
        </Link>
        <Link
          href="/request-print"
          className="group flex items-center gap-2.5 sm:gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-4 shadow-sm transition hover:border-pink-200 hover:shadow-md"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/50 dark:to-orange-950/50 transition group-hover:from-pink-100 group-hover:to-orange-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Encomenda</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Personalizada</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pedidos recentes</h2>
          <Link href="/account/orders" className="text-xs font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700 transition">
            Ver todos →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum pedido ainda</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Explore nosso catálogo e encontre peças incríveis!</p>
            <Link
              href="/products"
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Explorar produtos
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50/80 dark:hover:bg-gray-800/80 sm:px-6 sm:py-4"
                >
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 transition group-hover:bg-gray-100 dark:group-hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{formatPrice(order.total)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(order.created_at)}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ${STATUS_STYLES[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 shrink-0 text-gray-300 transition group-hover:text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
