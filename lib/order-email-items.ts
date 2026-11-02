import type { OrderItem } from '@/types/database';

export interface OrderEmailItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  variacao: string | null;
  personalizacao: string | null;
}

type EmailSourceItem = Pick<OrderItem, 'quantity' | 'unit_price' | 'product_snapshot' | 'customization_text'> & {
  product?: { name?: string | null } | null;
  option?: { name?: string | null; color_name?: string | null; color?: string | null } | null;
};

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function toOrderEmailItems(items: EmailSourceItem[]): OrderEmailItem[] {
  return items.map((item) => ({
    // Preserve the customer's purchase even if the catalog is later edited.
    nome: nonEmptyText(item.product_snapshot?.name) ?? nonEmptyText(item.product?.name) ?? 'Produto',
    quantidade: item.quantity,
    precoUnitario: Number(item.unit_price),
    variacao: [...new Set([
      nonEmptyText(item.product_snapshot?.option_name) ?? nonEmptyText(item.option?.name),
      nonEmptyText(item.product_snapshot?.option_color_name) ?? nonEmptyText(item.product_snapshot?.option_color)
        ?? nonEmptyText(item.option?.color_name) ?? nonEmptyText(item.option?.color),
    ].filter((text): text is string => text !== null))].join(' · ') || null,
    personalizacao: nonEmptyText(item.customization_text) ?? nonEmptyText(item.product_snapshot?.customization_text),
  }));
}
