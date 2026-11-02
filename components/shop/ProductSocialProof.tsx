import { ProductRatingSummary } from '@/components/shop/ProductRatingSummary';

export function ProductSocialProof({ productId, orderCount }: { productId: string; orderCount?: number }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      <ProductRatingSummary productId={productId} />
      {orderCount !== undefined && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 sm:text-sm" title="Quantidade de pedidos confirmados que incluem este produto">
          <span aria-hidden="true">🛍️ </span>
          {orderCount === 1 ? 'Pedido 1 vez' : `Pedido ${new Intl.NumberFormat('pt-BR').format(orderCount)} vezes`}
        </span>
      )}
    </div>
  );
}
