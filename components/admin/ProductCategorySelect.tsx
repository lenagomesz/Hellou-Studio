'use client';

import { useEffect, useState } from 'react';
import type { ProductCategory } from '@/types/database';

const FALLBACK_CATEGORIES: ProductCategory[] = [
  { id: 'chaveiros', name: 'Chaveiros', slug: 'chaveiros', color: '#EC4899', active: true, sort_order: 10, is_system: true, created_at: '', updated_at: '' },
  { id: 'escritorio', name: 'Escritório', slug: 'escritorio', color: '#F97316', active: true, sort_order: 20, is_system: true, created_at: '', updated_at: '' },
  { id: 'criaturas', name: 'Criaturas', slug: 'criaturas', color: '#A855F7', active: true, sort_order: 30, is_system: true, created_at: '', updated_at: '' },
  { id: 'encomenda', name: 'Encomenda', slug: 'encomenda', color: '#64748B', active: true, sort_order: 40, is_system: true, created_at: '', updated_at: '' },
];

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/product-categories')
      .then((response) => response.ok ? response.json() : null)
      .then((data: { categories?: ProductCategory[] } | null) => {
        if (!cancelled && data?.categories?.length) setCategories(data.categories);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return categories;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  exclude?: string[];
  className?: string;
};

export function ProductCategorySelect({
  value,
  onChange,
  id,
  allowEmpty = false,
  emptyLabel = 'Todas as categorias',
  exclude = [],
  className,
}: Props) {
  const categories = useProductCategories();
  const options = categories.filter((category) => (category.active || category.slug === value) && !exclude.includes(category.slug));
  const hasCurrentValue = !value || options.some((category) => category.slug === value);

  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={className}>
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {!hasCurrentValue && <option value={value}>{value}</option>}
      {options.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
    </select>
  );
}
