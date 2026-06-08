'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductOption } from '@/types/database';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    signDisplay: 'exceptZero',
  }).format(value);
}

export function OptionsManager({
  productId,
  initialOptions,
}: {
  productId: string;
  initialOptions: ProductOption[];
}) {
  const router = useRouter();
  const [options, setOptions] = useState<ProductOption[]>(initialOptions);
  const [name, setName] = useState('');
  const [priceModifier, setPriceModifier] = useState('0');
  const [stock, setStock] = useState('0');
  const [dimensions, setDimensions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSizes = options.some(
    (o) => ['P', 'M', 'G'].includes(o.name.toUpperCase()),
  );

  async function handleAddSizes() {
    setError(null);
    setSubmitting(true);

    const sizes = ['P', 'M', 'G'].filter(
      (s) => !options.some((o) => o.name.toUpperCase() === s),
    );

    for (const size of sizes) {
      const res = await fetch('/api/product-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          name: size,
          price_modifier: 0,
          stock: 10,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { option: ProductOption };
        setOptions((prev) => [...prev, data.option]);
      }
    }

    setSubmitting(false);
    router.refresh();
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const modifier = Number(priceModifier);
    const stockValue = Number(stock);
    if (!name.trim()) {
      setError('Nome da variação é obrigatório');
      return;
    }
    if (Number.isNaN(modifier)) {
      setError('Modificador de preço inválido');
      return;
    }
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setError('Estoque inválido');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/product-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        name: name.trim(),
        price_modifier: modifier,
        stock: stockValue,
        dimensions: dimensions.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao criar variação');
      setSubmitting(false);
      return;
    }

    const data = (await res.json()) as { option: ProductOption };
    setOptions((prev) => [...prev, data.option]);
    setName('');
    setPriceModifier('0');
    setStock('0');
    setDimensions('');
    setSubmitting(false);
    router.refresh();
  }

  async function handleUpdate(option: ProductOption, patch: Partial<ProductOption>) {
    const res = await fetch(`/api/product-options/${option.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao atualizar');
      return;
    }

    const data = (await res.json()) as { option: ProductOption };
    setOptions((prev) => prev.map((o) => (o.id === option.id ? data.option : o)));
    router.refresh();
  }

  async function handleDelete(option: ProductOption) {
    if (!confirm(`Excluir variação "${option.name}"?`)) return;

    const res = await fetch(`/api/product-options/${option.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao excluir');
      return;
    }
    setOptions((prev) => prev.filter((o) => o.id !== option.id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {options.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma variação cadastrada.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              onUpdate={(patch) => handleUpdate(option, patch)}
              onDelete={() => handleDelete(option)}
            />
          ))}
        </ul>
      )}

      {!hasSizes && (
        <button
          type="button"
          onClick={handleAddSizes}
          disabled={submitting}
          className="w-full rounded-lg border-2 border-dashed border-pink-300 bg-pink-50/50 px-4 py-3 text-sm font-medium text-pink-700 hover:bg-pink-50 disabled:opacity-50 transition"
        >
          + Adicionar tamanhos P / M / G (estoque padrão: 10)
        </button>
      )}

      <form onSubmit={handleAdd} className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900">Adicionar variação</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px_140px_auto]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tamanho M"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            step="0.01"
            value={priceModifier}
            onChange={(e) => setPriceModifier(e.target.value)}
            placeholder="Modificador R$"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Estoque"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="Ex: 10x10x5 cm"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {submitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function OptionRow({
  option,
  onUpdate,
  onDelete,
}: {
  option: ProductOption;
  onUpdate: (patch: Partial<ProductOption>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(option.name);
  const [priceModifier, setPriceModifier] = useState(String(option.price_modifier));
  const [stock, setStock] = useState(String(option.stock));
  const [dimensions, setDimensions] = useState(option.dimensions ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onUpdate({
      name: name.trim(),
      price_modifier: Number(priceModifier),
      stock: Number(stock),
      dimensions: dimensions.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setName(option.name);
    setPriceModifier(String(option.price_modifier));
    setStock(String(option.stock));
    setDimensions(option.dimensions ?? '');
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="p-3 bg-gray-50">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_120px_140px_auto]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            step="0.01"
            value={priceModifier}
            onChange={(e) => setPriceModifier(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="Ex: 10x10x5 cm"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? '...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{option.name}</p>
        <p className="text-xs text-gray-600">
          {option.price_modifier === 0 ? 'sem ajuste' : formatPrice(option.price_modifier)}
          {' · '}
          Estoque: {option.stock}
          {option.dimensions ? ` · ${option.dimensions}` : ''}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-pink-600 hover:text-pink-700"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
