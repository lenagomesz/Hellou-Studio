import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { subDays, subMonths, startOfMonth, format, startOfDay } from 'date-fns';
import type { Order, PrintRequest, User, AdminNotification } from '@/types/database';
import { DashboardCharts } from '@/components/admin/charts/DashboardCharts';
import { UrgentAlerts } from '@/components/admin/UrgentAlerts';
import { AdvancedAnalyticsDashboard } from '@/components/admin/analytics/AdvancedAnalyticsDashboard';
import { getAlertLevel } from '@/lib/inventory';
import type { StockAlertLevel } from '@/types/inventory';

type OrderRow = Order & { user?: Pick<User, 'id' | 'email' | 'name'> | null };
type RequestRow = PrintRequest & { user?: Pick<User, 'id' | 'email' | 'name'> | null };

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const thirtyDaysAgo = subDays(now, 30);

        const [
          activeRes,
          ordersRes,
          paidOrdersRes,
          processingOrdersRes,
          shippedOrdersRes,
          deliveredOrdersRes,
          usersRes,
          recentUsersRes,
          printRequestsRes,
          revenueRes,
          revenueChartRes,
          urgentAlertsRes,
          stockOptionsRes,
        ] = await Promise.all([
          admin.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
          admin.from('orders').select('*', { count: 'exact', head: true }),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'paid').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'processing').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'shipped').order('created_at', { ascending: false }).limit(10),
          admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
          admin.from('users').select('created_at', { count: 'exact' }).eq('role', 'user'),
          admin.from('users').select('id, email, name, created_at').order('created_at', { ascending: false }).limit(5),
          admin.from('print_requests').select('*, user:users(id, email, name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
          admin.from('orders').select('total, created_at, status').in('status', ['paid', 'processing', 'shipped', 'delivered']),
          admin.from('orders').select('total, created_at').in('status', ['paid', 'processing', 'shipped', 'delivered']).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
          admin.from('admin_notifications').select('*').eq('priority', 'urgent').eq('read', false).eq('archived', false).order('created_at', { ascending: false }).limit(3),
          admin.from('product_options').select('id, product_id, name, stock, reorder_point, product:products(name)').order('stock', { ascending: true }).limit(50),
        ]);

        const allOrders = revenueRes.data ?? [];
        const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
        const thisMonthRevenue = allOrders.filter(o => new Date(o.created_at) >= thisMonthStart).reduce((sum, o) => sum + (o.total ?? 0), 0);
        const lastMonthRevenue = allOrders.filter(o => { const d = new Date(o.created_at); return d >= lastMonthStart && d < thisMonthStart; }).reduce((sum, o) => sum + (o.total ?? 0), 0);

        const totalOrders = ordersRes.count ?? 0;
        const thisMonthOrders = allOrders.filter(o => new Date(o.created_at) >= thisMonthStart).length;
        const lastMonthOrders = allOrders.filter(o => { const d = new Date(o.created_at); return d >= lastMonthStart && d < thisMonthStart; }).length;

        const users = usersRes.data ?? [];
        const totalUsers = usersRes.count ?? 0;
        const newUsersThisMonth = users.filter(u => new Date(u.created_at) >= thisMonthStart).length;
        const newUsersLastMonth = users.filter(u => { const d = new Date(u.created_at); return d >= lastMonthStart && d < thisMonthStart; }).length;

        const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        function growthPercent(current: number, previous: number): number {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        }

        const revenueChartData = new Map<string, { revenue: number; count: number }>();
        for (const order of revenueChartRes.data ?? []) {
          const key = format(startOfDay(new Date(order.created_at)), 'yyyy-MM-dd');
          const entry = revenueChartData.get(key) ?? { revenue: 0, count: 0 };
          entry.revenue += order.total ?? 0;
          entry.count += 1;
          revenueChartData.set(key, entry);
        }
        const chartData = Array.from(revenueChartData.entries()).map(([date, v]) => ({
          date,
          revenue: Math.round(v.revenue * 100) / 100,
          count: v.count,
        }));

        // Process stock alerts
        const stockOptions = (stockOptionsRes.data ?? []) as unknown as Array<{
          id: string; product_id: string; name: string; stock: number; reorder_point: number;
          product: { name: string } | null;
        }>;
        const stockAlerts = stockOptions
          .filter(o => o.stock <= o.reorder_point)
          .map(o => ({
            product_option_id: o.id,
            product_name: o.product?.name || 'Unknown',
            option_name: o.name,
            current_stock: o.stock,
            reorder_point: o.reorder_point,
            level: getAlertLevel(o.stock, o.reorder_point),
          }));

        return {
          activeProducts: activeRes.count ?? 0,
          totalOrders,
          deliveredOrders: deliveredOrdersRes.count ?? 0,
          totalUsers,
          totalRevenue,
          thisMonthRevenue,
          avgTicket,
          newUsersThisMonth,
          growth: {
            revenue: growthPercent(thisMonthRevenue, lastMonthRevenue),
            orders: growthPercent(thisMonthOrders, lastMonthOrders),
            users: growthPercent(newUsersThisMonth, newUsersLastMonth),
          },
          chartData,
          paidOrders: (paidOrdersRes.data ?? []) as OrderRow[],
          processingOrders: (processingOrdersRes.data ?? []) as OrderRow[],
          shippedOrders: (shippedOrdersRes.data ?? []) as OrderRow[],
          pendingRequests: (printRequestsRes.data ?? []) as RequestRow[],
          recentUsers: (recentUsersRes.data ?? []) as Pick<User, 'id' | 'email' | 'name' | 'created_at'>[],
          urgentAlerts: (urgentAlertsRes.data ?? []) as AdminNotification[],
          stockAlerts,
        };
      })(),
    ).catch(() => ({
      activeProducts: 0,
      totalOrders: 0,
      deliveredOrders: 0,
      totalUsers: 0,
      totalRevenue: 0,
      thisMonthRevenue: 0,
      avgTicket: 0,
      newUsersThisMonth: 0,
      growth: { revenue: 0, orders: 0, users: 0 },
      chartData: [] as { date: string; revenue: number; count: number }[],
      paidOrders: [] as OrderRow[],
      processingOrders: [] as OrderRow[],
      shippedOrders: [] as OrderRow[],
      pendingRequests: [] as RequestRow[],
      recentUsers: [] as Pick<User, 'id' | 'email' | 'name' | 'created_at'>[],
      urgentAlerts: [] as AdminNotification[],
      stockAlerts: [] as { product_option_id: string; product_name: string; option_name: string; current_stock: number; reorder_point: number; level: StockAlertLevel }[],
    })),
  ['dashboard-overview-v2'],
  { revalidate: 15 },
);

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

function OrderMiniRow({ order }: { order: OrderRow }) {
  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
          {order.user?.name || order.user?.email || 'Cliente'}
        </p>
        <p className="text-xs text-gray-400">
          #{order.id.slice(0, 8)} · {timeAgo(order.created_at)}
        </p>
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatPrice(order.total)}</span>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel de Controle</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Acompanhe vendas, pedidos e desempenho da loja em tempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Ver analytics
          </Link>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            + Novo produto
          </Link>
        </div>
      </header>

      {/* Urgent Alerts */}
      <UrgentAlerts alerts={data.urgentAlerts} />

      {/* KPI Cards with growth */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/orders" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Receita do mês</p>
            <GrowthBadge value={data.growth.revenue} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(data.thisMonthRevenue)}</p>
          <p className="mt-1 text-xs text-gray-400">Total: {formatPrice(data.totalRevenue)}</p>
        </Link>

        <Link href="/dashboard/orders" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pedidos</p>
            <GrowthBadge value={data.growth.orders} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.totalOrders}</p>
          <p className="mt-1 text-xs text-gray-400">{data.deliveredOrders} entregues</p>
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ticket médio</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(data.avgTicket)}</p>
          <p className="mt-1 text-xs text-gray-400">{data.activeProducts} produtos ativos</p>
        </div>

        <Link href="/dashboard/users" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Usuários</p>
            <GrowthBadge value={data.growth.users} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.totalUsers}</p>
          <p className="mt-1 text-xs text-gray-400">+{data.newUsersThisMonth} este mes</p>
        </Link>
      </div>

      {/* Main grid: Action sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Para preparar */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-50 text-sm dark:bg-yellow-900/30">⚡</span>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Para preparar</h2>
              {todoCount > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                  {todoCount}
                </span>
              )}
            </div>
            <Link href="/dashboard/orders?status=paid" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2 dark:divide-gray-800">
            {data.paidOrders.length === 0 && data.pendingRequests.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhuma ação pendente</p>
            ) : (
              <>
                {data.paidOrders.map((order) => (
                  <OrderMiniRow key={order.id} order={order} />
                ))}
                {data.pendingRequests.map((req) => (
                  <Link
                    key={req.id}
                    href={`/dashboard/requests/${req.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-sm dark:bg-violet-900/30">🖨️</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{req.title}</p>
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
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-sm dark:bg-indigo-900/30">📤</span>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Para enviar</h2>
              {toShipCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {toShipCount}
                </span>
              )}
            </div>
            <Link href="/dashboard/orders?status=processing" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2 dark:divide-gray-800">
            {data.processingOrders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nada para enviar no momento</p>
            ) : (
              data.processingOrders.map((order) => (
                <OrderMiniRow key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Em transito */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-sm dark:bg-purple-900/30">🚚</span>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Em trânsito</h2>
              {data.shippedOrders.length > 0 && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  {data.shippedOrders.length}
                </span>
              )}
            </div>
            <Link href="/dashboard/orders?status=shipped" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2 dark:divide-gray-800">
            {data.shippedOrders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhum envio em trânsito</p>
            ) : (
              data.shippedOrders.map((order) => (
                <OrderMiniRow key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Usuarios recentes */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-sm dark:bg-green-900/30">👤</span>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Novos usuários</h2>
            </div>
            <Link href="/dashboard/users" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2 dark:divide-gray-800">
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
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{user.name || '—'}</p>
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

      {/* Charts section */}
      <DashboardCharts data={data.chartData} />

      {/* Advanced Analytics Dashboard */}
      <AdvancedAnalyticsDashboard />

      {/* Stock Alerts Widget */}
      {data.stockAlerts.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-sm dark:bg-red-900/30">📦</span>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Alertas de Estoque</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300">
                {data.stockAlerts.length}
              </span>
            </div>
            <Link href="/dashboard/inventory" className="text-xs font-medium text-pink-500 hover:text-pink-600">
              Ver estoque →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 px-2 py-2 dark:divide-gray-800">
            {data.stockAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.product_option_id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${alert.level === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{alert.product_name}</p>
                    <p className="text-xs text-gray-400">{alert.option_name}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  alert.level === 'critical'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {alert.current_stock} un.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
