export function selectCollectionBestSellers<T extends { id: string; sold_quantity?: number }>(products: T[], limit = 3): T[] {
  return products.filter(product => (product.sold_quantity ?? 0) > 0)
    .sort((a, b) => (b.sold_quantity ?? 0) - (a.sold_quantity ?? 0) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
