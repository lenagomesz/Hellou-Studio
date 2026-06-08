'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/types/database';
import { VALID_CATEGORIES } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
};

type ProductFormProps =
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: Product };

export function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const initial = props.mode === 'edit' ? props.product : null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? 'chaveiros');
  const [basePrice, setBasePrice] = useState<string>(
    initial ? String(initial.base_price) : '',
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const priceNumber = Number(basePrice);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setError('Preço base inválido');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      base_price: priceNumber,
      image_url: imageUrl.trim() || null,
      active,
    };

    const url =
      props.mode === 'edit' ? `/api/products/${props.product.id}` : '/api/products';
    const method = props.mode === 'edit' ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao salvar');
      setSubmitting(false);
      return;
    }

    if (props.mode === 'create') {
      const data = (await res.json()) as { product: Product };
      router.push(`/dashboard/products/${data.product.id}`);
    } else {
      router.push(`/dashboard/products/${props.product.id}`);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (props.mode !== 'edit') return;
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    setSubmitting(true);
    const res = await fetch(`/api/products/${props.product.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao excluir');
      setSubmitting(false);
      return;
    }
    router.push('/dashboard/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descrição
          </label>
          <textarea
            id="description"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Categoria
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700">
              Preço base (R$)
            </label>
            <input
              id="base_price"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
            URL da imagem
          </label>
          <input
            id="image_url"
            type="url"
            value={imageUrl ?? ''}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
          />
          <span className="text-sm text-gray-700">Produto ativo (visível na loja)</span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {submitting ? 'Salvando...' : props.mode === 'edit' ? 'Salvar alterações' : 'Criar produto'}
          </button>
          <Link
            href={
              props.mode === 'edit'
                ? `/dashboard/products/${props.product.id}`
                : '/dashboard/products'
            }
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
        </div>

        {props.mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
          >
            Excluir produto
          </button>
        )}
      </div>
    </form>
  );
}
