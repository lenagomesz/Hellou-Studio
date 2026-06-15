import Link from 'next/link';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Order, OrderItem, Product, OrderStatus } from '@/types/database';

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
  awaiting_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  pending: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
}

type OrderItemRow = OrderItem & { product: Pick<Product, 'id' | 'name' | 'image_url'> | null };
type OrderRow = Order & { items: OrderItemRow[] };

async function getUserOrders(userId: string): Promise<OrderRow[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('orders')
    .select('*, items:order_items(*, product:products(id, name, image_url))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as OrderRow[];
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await getUserOrders(user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Pedidos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} no total
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-orange-50 text-pink-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
            </svg>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Você ainda não fez nenhum pedido.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="block rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-gray-400">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800">
                          {item.product?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-pink-100 to-orange-100" />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="ml-auto h-4 w-4 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
