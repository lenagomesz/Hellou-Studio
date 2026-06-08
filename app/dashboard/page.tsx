import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import type { Order, OrderStatus, PrintRequest, PrintRequestStatus, User } from '@/types/database';

type OrderRow = Order & { user?: Pick<User, 'id' | 'email' | 'name'> | null };
type RequestRow = PrintRequest & { user?: Pick<User, 'id' | 'email' | 'name'> | null };

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  processing: 'Em preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  canceled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

const getDashboardData = unstable_cache(
  () =>
    withTimeout(
      (async () => {
        const admin = getSupabaseAdmin();

        const [
          productsRes,
          activeRes,
          ordersRes,
          pendingOrdersRes,
          paidOrdersRes,
          processingOrdersRes,
          shippedOrdersRes,
          deliveredOrdersRes,
          usersRes,
          recentUsersRes,
          printRequestsRes,
          approvedRequestsRes,
          rejectedRequestsRes,
          revenueRes,
        ] = await Promise.all([
          admin.from('products').select('*', { count: 'exact', head: true }),
          admin.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
          admin.from('orders').select('*', { count: 'exact', head: true }),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'pending').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'paid').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'processing').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'shipped').order('created_at', { ascending: false }).limit(10),
          admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
          admin.from('users').select('*', { count: 'exact', head: true }),
          admin.from('users').select('id, email, name, created_at').order('created_at', { ascending: false }).limit(5),
          admin.from('print_requests').select('*, user:users(id, email, name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
          admin.from('print_requests').select('*, user:users(id, email, name)').eq('status', 'approved').order('created_at', { ascending: false }).limit(10),
          admin.from('print_requests').select('*, user:users(id, email, name)').eq('status', 'rejected').order('created_at', { ascending: false }).limit(10),
          admin.from('orders').select('total').in('status', ['paid', 'processing', 'shipped', 'delivered']),
        ]);

        const totalRevenue = (revenueRes.data ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0);

        return {
          products: productsRes.count ?? 0,
          activeProducts: activeRes.count ?? 0,
          totalOrders: ordersRes.count ?? 0,
          deliveredOrders: deliveredOrdersRes.count ?? 0,
          totalUsers: usersRes.count ?? 0,
          totalRevenue,
          pendingOrders: (pendingOrdersRes.data ?? []) as OrderRow[],
          paidOrders: (paidOrdersRes.data ?? []) as OrderRow[],
          processingOrders: (processingOrdersRes.data ?? []) as OrderRow[],
          shippedOrders: (shippedOrdersRes.data ?? []) as OrderRow[],
          pendingRequests: (printRequestsRes.data ?? []) as RequestRow[],
          approvedRequests: (approvedRequestsRes.data ?? []) as RequestRow[],
          rejectedRequests: (rejectedRequestsRes.data ?? []) as RequestRow[],
          recentUsers: (recentUsersRes.data ?? []) as Pick<User, 'id' | 'email' | 'name' | 'created_at'>[],
        };
      })(),
    ).catch(() => ({
      products: 0,
      activeProducts: 0,
      totalOrders: 0,
      deliveredOrders: 0,
      totalUsers: 0,
      totalRevenue: 0,
      pendingOrders: [] as OrderRow[],
      paidOrders: [] as OrderRow[],
      processingOrders: [] as OrderRow[],
      shippedOrders: [] as OrderRow[],
      pendingRequests: [] as RequestRow[],
      approvedRequests: [] as RequestRow[],
      rejectedRequests: [] as RequestRow[],
      recentUsers: [] as Pick<User, 'id' | 'email' | 'name' | 'created_at'>[],
    })),
  ['dashboard-overview'],
  { revalidate: 15 },
);

function OrderMiniRow({ order }: { order: OrderRow }) {
  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {order.user?.name || order.user?.email || 'Cliente'}
        </p>
        <p className="text-xs text-gray-400">
          #{order.id.slice(0, 8)} · {timeAgo(order.created_at)}
        </p>
      </div>
      <span className="text-sm font-semibold text-gray-700">{formatPrice(order.total)}</span>
    </Link>
  );
}

export default async function DashboardHome() {
  const data = await getDashboardData();

  const todoCount = data.paidOrders.length + data.pendingRequests.length;
  const toShipCount = data.processingOrders.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visão geral</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie pedidos, envios e acompanhe a loja.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Novo produto
          </Link>
        </div>
      </header>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Receita total', value: formatPrice(data.totalRevenue), icon: '💰', href: '/dashboard/orders' },
          { label: 'Pedidos', value: data.totalOrders, icon: '📦', href: '/dashboard/orders' },
          { label: 'Entregues', value: data.deliveredOrders, icon: '✅', href: '/dashboard/orders?status=delivered' },
          { label: 'Usuários', value: data.totalUsers, icon: '👥', href: '/dashboard/users' },
          { label: 'Produtos ativos', value: data.activeProducts, icon: '🛍️', href: '/dashboard/products' },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-xl transition group-hover:bg-pink-50 group-hover:scale-110">
              {card.icon}
            </span>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{card.label}</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main grid: Action sections */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* O que precisa fazer */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-50 text-sm">⚡</span>
              <h2 className="font-semibold text-gray-800">Para preparar</h2>
              {todoCount > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                  {todoCount}
                </span>
              )}
            </div>
            <Link href="/dashboard/orders?status=paid" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.paidOrders.length === 0 && data.pendingRequests.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhuma ação pendente 🎉</p>
            ) : (
              <>
                {data.paidOrders.map((order) => (
                  <OrderMiniRow key={order.id} order={order} />
                ))}
                {data.pendingRequests.map((req) => (
                  <Link
                    key={req.id}
                    href={`/dashboard/requests/${req.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-sm">🖨️</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{req.title}</p>
                        <p className="text-xs text-gray-400">{req.user?.name || req.user?.email || 'Cliente'}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pendente</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Para enviar */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-sm">📤</span>
              <h2 className="font-semibold text-gray-800">Para enviar</h2>
              {toShipCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {toShipCount}
                </span>
              )}
            </div>
            <Link href="/dashboard/orders?status=processing" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.processingOrders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nada para enviar no momento</p>
            ) : (
              data.processingOrders.map((order) => (
                <OrderMiniRow key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Enviados (em trânsito) */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-sm">🚚</span>
              <h2 className="font-semibold text-gray-800">Em trânsito</h2>
              {data.shippedOrders.length > 0 && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                  {data.shippedOrders.length}
                </span>
              )}
            </div>
            <Link href="/dashboard/orders?status=shipped" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.shippedOrders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhum envio em trânsito</p>
            ) : (
              data.shippedOrders.map((order) => (
                <OrderMiniRow key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Usuários recentes */}
        <div id="users" className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-sm">👤</span>
              <h2 className="font-semibold text-gray-800">Novos usuários</h2>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                {data.totalUsers}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.recentUsers.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhum usuário cadastrado</p>
            ) : (
              data.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-xs font-bold text-pink-600">
                      {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{user.name || '—'}</p>
                      <p className="truncate text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{timeAgo(user.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pedidos pendentes (aguardando pagamento) */}
      {data.pendingOrders.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-sm">⏳</span>
              <h2 className="font-semibold text-gray-800">Aguardando pagamento</h2>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                {data.pendingOrders.length}
              </span>
            </div>
            <Link href="/dashboard/orders?status=pending" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.pendingOrders.map((order) => (
              <OrderMiniRow key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Solicitações aprovadas/rejeitadas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Aprovadas */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-sm">✅</span>
              <h2 className="font-semibold text-gray-800">Solicitações aprovadas</h2>
              {data.approvedRequests.length > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                  {data.approvedRequests.length}
                </span>
              )}
            </div>
            <Link href="/dashboard/requests?status=approved" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.approvedRequests.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhuma solicitação aprovada</p>
            ) : (
              data.approvedRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard/requests/${req.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{req.title}</p>
                    <p className="text-xs text-gray-400">{req.user?.name || req.user?.email || 'Cliente'}</p>
                  </div>
                  {req.quoted_price !== null && (
                    <span className="shrink-0 text-sm font-semibold text-green-700">{formatPrice(req.quoted_price)}</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Rejeitadas */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-sm">❌</span>
              <h2 className="font-semibold text-gray-800">Solicitações rejeitadas</h2>
              {data.rejectedRequests.length > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {data.rejectedRequests.length}
                </span>
              )}
            </div>
            <Link href="/dashboard/requests?status=rejected" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2">
            {data.rejectedRequests.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhuma solicitação rejeitada</p>
            ) : (
              data.rejectedRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard/requests/${req.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{req.title}</p>
                    <p className="text-xs text-gray-400">{req.user?.name || req.user?.email || 'Cliente'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Rejeitado</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick stats bottom */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Entregues</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{data.deliveredOrders}</p>
          <p className="mt-1 text-xs text-gray-400">pedidos concluídos</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Produtos</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{data.products}</p>
          <p className="mt-1 text-xs text-gray-400">{data.activeProducts} ativos</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Encomendas 3D</p>
          <p className="mt-1 text-2xl font-bold text-violet-600">{data.pendingRequests.length}</p>
          <p className="mt-1 text-xs text-gray-400">aguardando orçamento</p>
        </div>
      </div>
    </div>
  );
}
