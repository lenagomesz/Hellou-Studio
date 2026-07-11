import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Order, OrderItem, Product, ProductOption, OrderStatus } from '@/types/database';
import ConfirmDeliveryButton from './ConfirmDeliveryButton';
import DownloadButton from './DownloadButton';
import PixPaymentSection from './PixPaymentSection';
import EditableShippingAddress from './EditableShippingAddress';
import { ProductRecommendations } from '@/components/shop/ProductRecommendations';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  pending: 'Aprovado',
  paid: 'Pago',
  approved: 'Aprovado',
  processing: 'Em preparo',
  completed: 'Concluído',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  pending: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  paid: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  approved: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  processing: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  completed: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  delivered: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  canceled: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  refunded: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

const STATUS_ORDER_DIGITAL: OrderStatus[] = ['awaiting_payment', 'approved', 'delivered'];
const STATUS_ORDER_PHYSICAL: OrderStatus[] = ['awaiting_payment', 'approved', 'processing', 'shipped', 'delivered'];

function getStatusOrder(isDigitalOnly: boolean): OrderStatus[] {
  return isDigitalOnly ? STATUS_ORDER_DIGITAL : STATUS_ORDER_PHYSICAL;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

type OrderItemRow = OrderItem & {
  product: Pick<Product, 'id' | 'name' | 'image_url' | 'type'> | null;
  option: Pick<ProductOption, 'id' | 'name' | 'color'> | null;
};
type OrderRow = Order & { items: OrderItemRow[] };

async function getOrder(orderId: string, userId: string): Promise<OrderRow | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('orders')
    .select('*, items:order_items(*, product:products(id, name, image_url, type), option:product_options(id, name, color))')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();
  return data as OrderRow | null;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const order = await getOrder(id, user.id);
  if (!order) notFound();

  const isCanceled = order.status === 'canceled' || order.status === 'refunded';
  const isDigitalOnly = order.items.every(item => item.product?.type === 'digital');
  const statusOrder = getStatusOrder(isDigitalOnly);
  const displayStatus = order.status === 'paid' ? 'processing' : order.status;
  const currentStepIndex = statusOrder.indexOf(displayStatus);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Voltar aos pedidos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatDate(order.created_at)}</p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Status Timeline */}
      {!isCanceled && (
        <div className="mb-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Status do pedido</h2>
          <div className="relative">
            {/* Connector line background */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-700 sm:left-[20px] sm:right-[20px]" />
            {/* Connector line progress */}
            {currentStepIndex > 0 && (
              <div
                className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-green-400 to-green-300 sm:left-[20px]"
                style={{ width: `calc(${(currentStepIndex / (statusOrder.length - 1)) * 100}% - 40px)` }}
              />
            )}
            {/* Steps */}
            <div className={`relative grid gap-0 ${isDigitalOnly ? 'grid-cols-3' : 'grid-cols-5'}`}>
              {statusOrder.map((status, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={status} className="flex flex-col items-center">
                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white dark:ring-gray-900 transition ${
                      isCurrent
                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30'
                        : isActive
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    }`}>
                      {isActive && !isCurrent ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`mt-2 text-[10px] sm:text-[11px] font-medium text-center leading-tight max-w-[56px] sm:max-w-none ${
                      isCurrent
                        ? 'text-pink-600 dark:text-pink-400 font-semibold'
                        : isActive
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PIX payment section */}
      {order.status === 'awaiting_payment' && order.mp_payment_id && order.mp_payment_method === 'pix' && (
        <PixPaymentSection mpPaymentId={order.mp_payment_id} orderId={order.id} />
      )}

      {/* Canceled notice */}
      {isCanceled && (
        <div className={`mb-8 rounded-2xl border p-5 ${order.status === 'refunded' ? 'border-red-100 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {order.status === 'refunded'
              ? 'Este pedido foi reembolsado. O valor será devolvido em até 7 dias úteis.'
              : 'Este pedido foi cancelado.'}
          </p>
        </div>
      )}

      {/* Order Items */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="border-b border-gray-50 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Itens ({order.items.length})
          </h2>
        </div>
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                {item.product?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.image_url} alt={item.product?.name ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100 to-orange-100 text-lg text-pink-200">
                    ◇
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.product?.name ?? 'Produto removido'}
                </p>
                {item.option && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {item.option.color && (
                      <span className="inline-block h-3 w-3 rounded-full border border-gray-200" style={{ backgroundColor: item.option.color }} />
                    )}
                    Variação: {item.option.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Qtd: {item.quantity} &middot; {formatPrice(item.unit_price)} cada
                </p>
                {item.product?.type === 'digital' && item.product?.id && (
                  <DownloadButton
                    order={order}
                    isDigitalOnly={isDigitalOnly}
                    productId={item.product.id}
                  />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatPrice(item.unit_price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-5 py-4">
          {(() => {
            const itemsSubtotal = order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
            const shippingCost = Math.max(0, Math.round((order.total - itemsSubtotal) * 100) / 100);
            return (
              <>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(itemsSubtotal)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Frete</span>
                  <span>{shippingCost > 0 ? formatPrice(shippingCost) : 'Grátis'}</span>
                </div>
                <div className="mt-2.5 flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2.5 text-base font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Tracking Code */}
      {(() => {
        const shipping = order.shipping_address as Record<string, unknown> | null;
        const trackingCode = typeof shipping?.tracking_code === 'string' ? shipping.tracking_code : '';
        if (!trackingCode || (order.status !== 'shipped' && order.status !== 'delivered')) return null;
        return (
          <div className="mt-6 rounded-2xl border border-purple-100 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/50 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">Rastreamento</h2>
            <p className="text-sm text-purple-800 dark:text-purple-300">
              Código: <span className="font-mono font-semibold">{trackingCode}</span>
            </p>
            <a
              href={`https://www.linkcorreios.com.br/?id=${trackingCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition"
            >
              Rastrear nos Correios
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        );
      })()}

      {/* Confirm Delivery */}
      {order.status === 'shipped' && (
        <ConfirmDeliveryButton orderId={order.id} />
      )}

      {/* Shipping Address */}
      {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
        <EditableShippingAddress
          orderId={order.id}
          address={order.shipping_address}
          canEdit={['awaiting_payment', 'pending', 'paid', 'processing'].includes(order.status)}
        />
      )}

      {/* Payment info */}
      <div className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pagamento</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {order.payment_provider === 'mercadopago' ? (
            <>
              <p>
                {order.mp_payment_method === 'pix' ? 'PIX' : 'Cartão de crédito'} via Mercado Pago
              </p>
              {order.mp_payment_id && (
                <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
                  Ref: ...{order.mp_payment_id.slice(-12).toUpperCase()}
                </p>
              )}
            </>
          ) : (
            <>
              <p>Processado via Stripe</p>
              {order.stripe_session_id && (
                <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
                  Ref: ...{order.stripe_session_id.slice(-12).toUpperCase()}
                </p>
              )}
            </>
          )}
          {!!(order.shipping_address as Record<string, unknown> | null)?.wants_invoice && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Nota fiscal solicitada
            </p>
          )}
        </div>
      </div>

      <ProductRecommendations title="Veja outros produtos" />
    </div>
  );
}

