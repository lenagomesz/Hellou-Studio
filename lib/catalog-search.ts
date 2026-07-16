type SearchableCatalogProduct = {
  name: string;
  description?: string | null;
  tags?: Array<{ name: string }>;
};

export function normalizeCatalogSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function matchesCatalogSearch(product: SearchableCatalogProduct, search: string) {
  const term = normalizeCatalogSearchText(search);
  if (!term) return true;
  return normalizeCatalogSearchText(product.name).includes(term)
    || normalizeCatalogSearchText(product.description ?? '').includes(term)
    || (product.tags ?? []).some((tag) => normalizeCatalogSearchText(tag.name).includes(term));
}
