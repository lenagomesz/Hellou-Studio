import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { subDays } from 'date-fns';
import type { Order, PrintRequest, User, AdminNotification } from '@/types/database';
import { DashboardCharts } from '@/components/admin/charts/DashboardCharts';
import { UrgentAlerts } from '@/components/admin/UrgentAlerts';
import { AdvancedAnalyticsDashboard } from '@/components/admin/analytics/AdvancedAnalyticsDashboard';
import { ArrowUpRight, BarChart3, Box, ClipboardCheck, PackageCheck, Truck, Zap } from 'lucide-react';
import { getCurrentUser } from '@/lib/api';
import { getStoreDateKey, getStoreMonthBounds } from '@/lib/store-time';
import { REVENUE_ORDER_STATUSES, summarizeRevenueOrders } from '@/lib/order-analytics';
import { OrderMiniRowWithPrepare } from '@/app/dashboard/OrderMiniRowWithPrepare';

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
        const { start: thisMonthStart, previousStart: lastMonthStart } = getStoreMonthBounds(now);
        const thirtyDaysAgo = subDays(now, 30);

        const [
          activeRes,
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
        ] = await Promise.all([
          admin.from('products').select('*', { count: 'exact', head: true }).eq('active', true).neq('category', 'encomenda'),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'paid').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'processing').order('created_at', { ascending: true }).limit(10),
          admin.from('orders').select('*, user:users(id, email, name)').eq('status', 'shipped').order('created_at', { ascending: false }).limit(10),
          admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
          admin.from('users').select('created_at', { count: 'exact' }).eq('role', 'user'),
          admin.from('users').select('id, email, name, created_at').order('created_at', { ascending: false }).limit(5),
          admin.from('print_requests').select('*, user:users(id, email, name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
          admin.from('orders').select('total, created_at, status').in('status', [...REVENUE_ORDER_STATUSES]),
          admin.from('orders').select('total, created_at').in('status', [...REVENUE_ORDER_STATUSES]).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
          admin.from('admin_notifications').select('*').eq('priority', 'urgent').eq('read', false).eq('archived', false).neq('type', 'low_stock').order('created_at', { ascending: false }).limit(3),
        ]);

        const allOrders = revenueRes.data ?? [];
        const { totalRevenue, totalOrders, averageTicket: avgTicket } = summarizeRevenueOrders(allOrders);
        const thisMonthRevenue = allOrders.filter(o => new Date(o.created_at) >= thisMonthStart).reduce((sum, o) => sum + (o.total ?? 0), 0);
        const lastMonthRevenue = allOrders.filter(o => { const d = new Date(o.created_at); return d >= lastMonthStart && d < thisMonthStart; }).reduce((sum, o) => sum + (o.total ?? 0), 0);

        const thisMonthOrders = allOrders.filter(o => new Date(o.created_at) >= thisMonthStart).length;
        const lastMonthOrders = allOrders.filter(o => { const d = new Date(o.created_at); return d >= lastMonthStart && d < thisMonthStart; }).length;

        const users = usersRes.data ?? [];
        const totalUsers = usersRes.count ?? 0;
        const newUsersThisMonth = users.filter(u => new Date(u.created_at) >= thisMonthStart).length;
        const newUsersLastMonth = users.filter(u => { const d = new Date(u.created_at); return d >= lastMonthStart && d < thisMonthStart; }).length;

        function growthPercent(current: number, previous: number): number {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        }

        const revenueChartData = new Map<string, { revenue: number; count: number }>();
        for (const order of revenueChartRes.data ?? []) {
          const key = getStoreDateKey(order.created_at);
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

        const processingOrders = (processingOrdersRes.data ?? []) as OrderRow[];
        const toPrepareOrders = processingOrders.filter(o => {
          const shipping = o.shipping_address as Record<string, unknown> | null;
          return !shipping?.prepared_at;
        });
        const readyToShipOrders = processingOrders.filter(o => {
          const shipping = o.shipping_address as Record<string, unknown> | null;
          return !!shipping?.prepared_at;
        });

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
          toPrepareOrders,
          readyToShipOrders,
          processingOrders,
          shippedOrders: (shippedOrdersRes.data ?? []) as OrderRow[],
          pendingRequests: (printRequestsRes.data ?? []) as RequestRow[],
          recentUsers: (recentUsersRes.data ?? []) as Pick<User, 'id' | 'email' | 'name' | 'created_at'>[],
          urgentAlerts: (urgentAlertsRes.data ?? []) as AdminNotification[],
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
      toPrepareOrders: [] as OrderRow[],
      readyToShipOrders: [] as OrderRow[],
      processingOrders: [] as OrderRow[],
      shippedOrders: [] as OrderRow[],
      pendingRequests: [] as RequestRow[],
      recentUsers: [] as Pick<User, 'id' | 'email' | 'name' | 'created_at'>[],
      urgentAlerts: [] as AdminNotification[],
    })),
  ['dashboard-overview-v3'],
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

function getGreeting(hour: number): string {
  if (hour < 6) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getTimeBasedSubtitle(todoCount: number): string {
  if (todoCount === 0) return 'Tudo em dia! Nenhum pedido pendente.';
  if (todoCount === 1) return 'Você tem 1 pedido para preparar.';
  return `Você tem ${todoCount} pedidos aguardando preparação.`;
}

export default async function DashboardHome() {
  const data = await getDashboardData();
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.accessLevel !== 'partner';

  const todoCount = data.paidOrders.length + data.toPrepareOrders.length + data.pendingRequests.length;
  const toShipCount = data.readyToShipOrders.length;
  const hour = new Date().getHours();
  const greeting = getGreeting(hour);
  const userName = currentUser?.name ?? 'você';

  return (
    <div className="space-y-8">
      {/* Operation hero */}
      <header className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> Operação ao vivo
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{greeting}, {userName}! 👋</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{getTimeBasedSubtitle(todoCount)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && <Link href="/dashboard/ai-dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-amber-200 hover:bg-amber-50">
              <Zap className="h-4 w-4 text-amber-500" /> AI Dashboard
            </Link>}
            {isOwner && <Link href="/dashboard/analytics" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-pink-200 hover:bg-pink-50">
              <BarChart3 className="h-4 w-4" /> Ver desempenho
            </Link>}
            <Link href="/dashboard/orders" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-pink-100">
              Abrir pedidos <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative mt-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/dashboard/orders?status=paid" className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 shadow-sm transition hover:border-yellow-200 hover:bg-yellow-50/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700"><ClipboardCheck className="h-5 w-5" /></span>
            <span><span className="block text-xl font-bold">{todoCount}</span><span className="text-xs text-slate-500">para preparar</span></span>
          </Link>
          <Link href="/dashboard/orders?status=processing" className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><PackageCheck className="h-5 w-5" /></span>
            <span><span className="block text-xl font-bold">{toShipCount}</span><span className="text-xs text-slate-500">para enviar</span></span>
          </Link>
          <Link href="/dashboard/orders?status=shipped" className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 shadow-sm transition hover:border-purple-200 hover:bg-purple-50/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><Truck className="h-5 w-5" /></span>
            <span><span className="block text-xl font-bold">{data.shippedOrders.length}</span><span className="text-xs text-slate-500">em trânsito</span></span>
          </Link>
          <Link href="/dashboard/products" className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 shadow-sm transition hover:border-pink-200 hover:bg-pink-50/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-700"><Box className="h-5 w-5" /></span>
            <span><span className="block text-xl font-bold">{data.activeProducts}</span><span className="text-xs text-slate-500">produtos ativos</span></span>
          </Link>
        </div>
      </header>

      {/* Urgent Alerts */}
      <UrgentAlerts alerts={data.urgentAlerts} />

      {/* KPI Cards with growth */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isOwner ? <Link href="/dashboard/financeiro" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Receita do mês</p>
            <GrowthBadge value={data.growth.revenue} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(data.thisMonthRevenue)}</p>
          <p className="mt-1 text-xs text-gray-400">Total: {formatPrice(data.totalRevenue)}</p>
        </Link> : <Link href="/dashboard/orders?status=paid" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md"><p className="text-xs font-medium uppercase tracking-wide text-gray-400">Prioridade de produção</p><p className="mt-2 text-2xl font-bold text-gray-900">{todoCount}</p><p className="mt-1 text-xs text-gray-400">pedidos e encomendas para preparar</p></Link>}

        <Link href="/dashboard/orders" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pedidos</p>
            <GrowthBadge value={data.growth.orders} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.totalOrders}</p>
          <p className="mt-1 text-xs text-gray-400">{data.deliveredOrders} entregues</p>
        </Link>

        {isOwner ? <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ticket médio</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(data.avgTicket)}</p>
          <p className="mt-1 text-xs text-gray-400">{data.activeProducts} produtos ativos</p>
        </div> : <Link href="/dashboard/products" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md"><p className="text-xs font-medium uppercase tracking-wide text-gray-400">Produtos ativos</p><p className="mt-2 text-2xl font-bold text-gray-900">{data.activeProducts}</p><p className="mt-1 text-xs text-gray-400">itens disponíveis na loja</p></Link>}

        <Link href="/dashboard/users" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Usuários</p>
            <GrowthBadge value={data.growth.users} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.totalUsers}</p>
          <p className="mt-1 text-xs text-gray-400">+{data.newUsersThisMonth} este mês</p>
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
            {data.paidOrders.length === 0 && data.toPrepareOrders.length === 0 && data.pendingRequests.length === 0 ? (
              <>
                <p className="px-3 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Tudo em dia! 🎉</p>
                <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhum pedido pendente no momento</p>
              </>
            ) : (
              <>
                <p className="px-3 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  Você tem {todoCount} {todoCount === 1 ? 'pedido' : 'pedidos'} aguardando preparação
                </p>
                {data.paidOrders.map((order) => (
                  <OrderMiniRow key={order.id} order={order} />
                ))}
                {data.toPrepareOrders.map((order: OrderRow) => (
                  <OrderMiniRowWithPrepare key={order.id} order={order} />
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
            {data.readyToShipOrders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nada para enviar no momento</p>
            ) : (
              data.readyToShipOrders.map((order: OrderRow) => (
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
      {isOwner && <DashboardCharts data={data.chartData} />}

      {/* Advanced Analytics Dashboard */}
      {isOwner && <AdvancedAnalyticsDashboard />}

    </div>
  );
}
