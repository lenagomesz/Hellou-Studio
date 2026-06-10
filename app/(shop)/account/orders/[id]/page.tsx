import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Order, OrderItem, Product, ProductOption, OrderStatus } from '@/types/database';
import ConfirmDeliveryButton from './ConfirmDeliveryButton';
import { ProductRecommendations } from '@/components/shop/ProductRecommendations';

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
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paid: 'bg-blue-100 text-blue-700 border-blue-200',
  processing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  canceled: 'bg-gray-100 text-gray-600 border-gray-200',
  refunded: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ORDER: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

type OrderItemRow = OrderItem & {
  product: Pick<Product, 'id' | 'name' | 'image_url'> | null;
  option: Pick<ProductOption, 'id' | 'name' | 'color'> | null;
};
type OrderRow = Order & { items: OrderItemRow[] };

async function getOrder(orderId: string, userId: string): Promise<OrderRow | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('orders')
    .select('*, items:order_items(*, product:products(id, name, image_url), option:product_options(id, name, color))')
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
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

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
        <div className="mb-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Status do pedido</h2>
          <div className="flex items-center justify-between">
            {STATUS_ORDER.map((status, i) => {
              const isActive = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                      isCurrent
                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-md shadow-pink-200/50'
                        : isActive
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {isActive && !isCurrent ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`mt-1.5 text-[10px] font-medium text-center hidden sm:block ${isActive ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded ${i < currentStepIndex ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatPrice(item.unit_price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-5 py-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-bold text-gray-900 dark:text-white">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
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
        <ShippingAddress address={order.shipping_address} />
      )}

      {/* Payment info */}
      <div className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pagamento</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>Processado via Stripe</p>
          {order.stripe_session_id && (
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
              Ref: ...{order.stripe_session_id.slice(-12).toUpperCase()}
            </p>
          )}
        </div>
      </div>

      <ProductRecommendations title="Veja outros produtos" />
    </div>
  );
}

function ShippingAddress({ address }: { address: Record<string, unknown> }) {
  const name = typeof address.name === 'string' ? address.name : '';
  const city = typeof address.city === 'string' ? address.city : '';
  const state = typeof address.state === 'string' ? address.state : '';

  // Support both Stripe format (line1/line2/postal_code) and Brazilian format (street/number/neighborhood/cep)
  const street = typeof address.street === 'string' ? address.street : '';
  const number = typeof address.number === 'string' ? address.number : '';
  const complement = typeof address.complement === 'string' ? address.complement : '';
  const neighborhood = typeof address.neighborhood === 'string' ? address.neighborhood : '';
  const cep = typeof address.cep === 'string' ? address.cep : '';

  const line1 = typeof address.line1 === 'string' ? address.line1 : '';
  const line2 = typeof address.line2 === 'string' ? address.line2 : '';
  const postalCode = typeof address.postal_code === 'string' ? address.postal_code : '';

  const isBrazilianFormat = !!street;

  return (
    <div className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Endereço de entrega</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
        {name && <p className="font-medium text-gray-900 dark:text-white">{name}</p>}
        {isBrazilianFormat ? (
          <>
            <p>{[street, number].filter(Boolean).join(', ')}</p>
            {complement && <p>{complement}</p>}
            {neighborhood && <p>{neighborhood}</p>}
            <p>{[city, state].filter(Boolean).join(' - ')}{cep ? ` · CEP ${cep}` : ''}</p>
          </>
        ) : (
          <>
            {line1 && <p>{line1}</p>}
            {line2 && <p>{line2}</p>}
            <p>{[city, state, postalCode].filter(Boolean).join(', ')}</p>
          </>
        )}
      </div>
    </div>
  );
}
