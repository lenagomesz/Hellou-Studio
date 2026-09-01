import type { Product, ProductOption } from '@/types/database';

export type KitProduct = Omit<Product, 'product_options'> & { product_options: ProductOption[] };

export const KIT_DEFINITIONS = [
  {
    slug: 'setup-estudo', title: 'Setup & Estudo', eyebrow: 'Uma pausa no seu ritmo',
    description: 'Organize os fones e deixe a mesa com espaço para criar, estudar e brincar.',
    tone: 'violet',
    items: [['headset 3 em 1', 'headset'], ['fidget espiral', 'infinity cube'], ['chaveiro clicker']],
  },
  {
    slug: 'penteadeira', title: 'Penteadeira com Charme', eyebrow: 'Cuidado em cada detalhe',
    description: 'Seus pequenos favoritos organizados, com uma dose extra de fofura na rotina.',
    tone: 'pink',
    items: [['organizador coracao', 'organizador de maquiagem'], ['chaveiro lip balm', 'lip balm'], ['mochilhinhas com gatinho', 'mochilhinha com gatinho', 'mochilhinha gatinho']],
  },
  {
    slug: 'decoracao', title: 'Meu Cantinho', eyebrow: 'Um presente para o seu espaço',
    description: 'Uma peça de destaque e um detalhe afetivo para dar personalidade ao dia a dia.',
    tone: 'orange',
    items: [['vaso curvas modernas', 'vaso curvas'], ['chaveiro lip balm', 'lip balm']],
  },
] as const;

export type ProductKit = {
  slug: string; title: string; eyebrow: string; description: string;
  tone: 'violet' | 'pink' | 'orange'; products: KitProduct[]; startingPrice: number;
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function isKitProductAvailable(product: KitProduct) {
  return product.active && product.type === 'physical' && !product.is_wholesale
    && product.category !== 'encomenda' && !normalize(product.name).startsWith('encomenda')
    && (product.fulfillment_mode !== 'ready_stock' || product.product_options.some(option => option.active && option.stock > 0));
}

export function getStartingPrice(product: KitProduct) {
  const options = product.product_options.filter(option => option.active && (product.fulfillment_mode !== 'ready_stock' || option.stock > 0));
  const modifier = options.length ? Math.min(...options.map(option => option.price_modifier)) : 0;
  return Math.round(((product.sale_price ?? product.base_price) + modifier) * 100) / 100;
}

export function getShippingProgress(total: number, threshold: number) {
  const totalCents = Math.max(0, Math.round(total * 100));
  const thresholdCents = Math.max(0, Math.round(threshold * 100));
  return {
    remaining: Math.max(0, thresholdCents - totalCents) / 100,
    eligible: totalCents >= thresholdCents,
    percent: thresholdCents ? Math.min(100, totalCents / thresholdCents * 100) : 100,
  };
}

export function buildProductKits(products: KitProduct[]): ProductKit[] {
  const available = products.filter(isKitProductAvailable).sort((a, b) => getStartingPrice(a) - getStartingPrice(b) || a.id.localeCompare(b.id));
  return KIT_DEFINITIONS.flatMap(definition => {
    const selected: KitProduct[] = [];
    for (const alternatives of definition.items) {
      let match: KitProduct | undefined;
      for (const name of alternatives) {
        match = available.find(product => !selected.some(item => item.id === product.id) && normalize(product.name).includes(name));
        if (match) break;
      }
      if (!match) return [];
      selected.push(match);
    }
    return [{ ...definition, products: selected, startingPrice: selected.reduce((sum, product) => sum + Math.round(getStartingPrice(product) * 100), 0) / 100 }];
  });
}

export function selectComplementaryProducts(products: KitProduct[], excludedIds: string[], remaining = 0) {
  const candidates = products.filter(product => isKitProductAvailable(product) && !excludedIds.includes(product.id));
  return candidates.sort((a, b) => {
    const aPrice = getStartingPrice(a);
    const bPrice = getStartingPrice(b);
    if (remaining > 0) {
      const aMeets = Math.round(aPrice * 100) >= Math.round(remaining * 100);
      const bMeets = Math.round(bPrice * 100) >= Math.round(remaining * 100);
      if (aMeets !== bMeets) return aMeets ? -1 : 1;
    }
    return aPrice - bPrice || a.id.localeCompare(b.id);
  }).slice(0, 4);
}
