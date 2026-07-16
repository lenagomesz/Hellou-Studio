'use client';

import { useEffect, useState } from 'react';
import type { ProductTag } from '@/types/database';

export function ProductTagSelect({
  productId,
  value,
  onChange,
}: {
  productId?: string;
  value: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const query = productId ? `?product_id=${encodeURIComponent(productId)}` : '';
    fetch(`/api/admin/products/tags${query}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { tags?: ProductTag[]; assigned_tag_ids?: string[] }) => {
        if (cancelled) return;
        setTags(data.tags ?? []);
        if (productId) onChange(data.assigned_tag_ids ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, onChange]);

  function toggle(tagId: string) {
    onChange(value.includes(tagId) ? value.filter((id) => id !== tagId) : [...value, tagId]);
  }

  if (loading) return <p className="text-xs text-gray-500">Carregando tags...</p>;
  if (tags.length === 0) return <p className="text-xs text-gray-500">Nenhuma tag cadastrada. Crie tags em Categorias e tags.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const selected = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            aria-pressed={selected}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
            style={selected
              ? { backgroundColor: tag.color, borderColor: tag.color, color: '#FFFFFF' }
              : { borderColor: `${tag.color}66`, color: tag.color, backgroundColor: `${tag.color}0F` }}
          >
            {selected ? '✓ ' : ''}{tag.name}
          </button>
        );
      })}
    </div>
  );
}

export async function replaceProductTags(productId: string, tagIds: string[]) {
  const response = await fetch('/api/admin/products/tags', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'replace', product_ids: [productId], tag_ids: tagIds }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error ?? 'Não foi possível salvar as tags');
  }
}
