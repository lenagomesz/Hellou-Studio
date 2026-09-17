type PurchaseOrder = {
  status: string;
  mp_status: string | null;
  total: number;
  items: Array<{ product_id: string; quantity: number }>;
};

export function confirmedMetaPurchase(order: PurchaseOrder) {
  if (!['approved', 'authorized'].includes(order.mp_status ?? '')) return null;
  if (!['approved', 'paid', 'processing', 'completed', 'shipped', 'delivered'].includes(order.status)) return null;
  if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) return null;
  const items = order.items.filter((item) => item.product_id && Number.isInteger(item.quantity) && item.quantity > 0);
  if (items.length !== order.items.length || items.length === 0) return null;

  return {
    confirmed: true,
    value: Number(order.total),
    currency: 'BRL',
    content_ids: [...new Set(items.map((item) => item.product_id))],
    content_type: 'product',
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
