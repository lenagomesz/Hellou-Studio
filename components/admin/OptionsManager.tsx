'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductOption } from '@/types/database';

const COLOR_PALETTE = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Preto', hex: '#1a1a1a' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Amarelo', hex: '#eab308' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Roxo', hex: '#a855f7' },
  { name: 'Lilás', hex: '#c084fc' },
  { name: 'Cinza', hex: '#6b7280' },
  { name: 'Bege', hex: '#d4a574' },
  { name: 'Dourado', hex: '#d4af37' },
  { name: 'Prata', hex: '#c0c0c0' },
  { name: 'Transparente', hex: 'transparent' },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            onClick={() => onChange(value === c.name ? '' : c.name)}
            className={`h-6 w-6 rounded-full border-2 transition ${
              value === c.name
                ? 'border-pink-500 ring-2 ring-pink-300 dark:ring-pink-700 scale-110'
                : 'border-gray-200 dark:border-gray-600 hover:scale-110'
            } ${c.hex === 'transparent' ? 'bg-gradient-to-br from-white to-gray-300 dark:from-gray-600 dark:to-gray-800' : ''}`}
            style={c.hex !== 'transparent' ? { backgroundColor: c.hex } : undefined}
          />
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou digite a cor"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
    </div>
  );
}

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
  const [color, setColor] = useState('');
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
        color: color.trim() || null,
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
    setColor('');
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
        <p className="text-sm text-gray-600 dark:text-gray-400">Nenhuma variação cadastrada.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
          className="w-full rounded-lg border-2 border-dashed border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-900/20 px-4 py-3 text-sm font-medium text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/30 disabled:opacity-50 transition"
        >
          + Adicionar tamanhos P / M / G (estoque padrão: 10)
        </button>
      )}

      <form onSubmit={handleAdd} className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Adicionar variação</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tamanho M"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            step="0.01"
            value={priceModifier}
            onChange={(e) => setPriceModifier(e.target.value)}
            placeholder="Modificador R$"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Estoque"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="Ex: 10x10x5 cm"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cor (opcional)</p>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {submitting ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
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
  const [color, setColor] = useState(option.color ?? '');
  const [priceModifier, setPriceModifier] = useState(String(option.price_modifier));
  const [stock, setStock] = useState(String(option.stock));
  const [dimensions, setDimensions] = useState(option.dimensions ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onUpdate({
      name: name.trim(),
      color: color.trim() || null,
      price_modifier: Number(priceModifier),
      stock: Number(stock),
      dimensions: dimensions.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setName(option.name);
    setColor(option.color ?? '');
    setPriceModifier(String(option.price_modifier));
    setStock(String(option.stock));
    setDimensions(option.dimensions ?? '');
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="p-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            step="0.01"
            value={priceModifier}
            onChange={(e) => setPriceModifier(e.target.value)}
            placeholder="Modificador R$"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Estoque"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="Ex: 10x10x5 cm"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cor</p>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex gap-2 mt-2">
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
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{option.name}</p>
          {option.color && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300">
              <span
                className="h-2.5 w-2.5 rounded-full border border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: option.color.toLowerCase() }}
              />
              {option.color}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
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
          className="text-sm font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
