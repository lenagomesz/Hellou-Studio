import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Order, OrderStatus, User } from '@/types/database';

export const dynamic = 'force-dynamic';

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

const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'canceled',
  'refunded',
];

function isOrderStatus(value: string): value is OrderStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

type OrderRow = Order & { user?: Pick<User, 'id' | 'email' | 'name'> | null };

async function getOrders(filters: { status?: string; search?: string }) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from('orders')
    .select('*, user:users(id, email, name)')
    .order('created_at', { ascending: false });

  if (filters.status && isOrderStatus(filters.status)) {
    query = query.eq('status', filters.status);
  }

  const { data } = await query;
  let rows = (data ?? []) as OrderRow[];

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter((order) => {
      if (order.id.toLowerCase().includes(term)) return true;
      const email = order.user?.email?.toLowerCase() ?? '';
      const name = order.user?.name?.toLowerCase() ?? '';
      return email.includes(term) || name.includes(term);
    });
  }

  return rows;
}

export default async function OrdersListPage(
  props: PageProps<'/dashboard/orders'>,
) {
  const searchParams = await props.searchParams;
  const status =
    typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const search =
    typeof searchParams.search === 'string' ? searchParams.search : undefined;

  const orders = await getOrders({ status, search });

  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'paid').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const shippedCount = orders.filter((o) => o.status === 'shipped').length;
  const revenue = orders
    .filter((o) => o.status !== 'canceled' && o.status !== 'refunded')
    .reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Gerencie e acompanhe todos os pedidos
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {orders.length} total
          </span>
        </div>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Aguardando</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Em preparo</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{processingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Enviados</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{shippedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Receita</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(revenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <form
        method="get"
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Buscar por ID, email ou nome..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">Todos os status</option>
          {VALID_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Filtrar
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 shadow-sm border border-gray-100 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-gray-600">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100">
          <table className="min-w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Data
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="group transition hover:bg-pink-50/30">
                  <td className="px-4 py-3.5">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 group-hover:bg-pink-100 group-hover:text-pink-700 transition">
                      #{order.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-gray-900">
                      {order.user?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.user?.email ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[order.status]
                      }`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                    >
                      Detalhes
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
