'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductOption } from '@/types/database';
import { ChevronDown, Loader2 } from 'lucide-react';

const COLOR_PALETTE = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Preto', hex: '#1a1a1a' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Amarelo', hex: '#eab308' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Verde Escuro', hex: '#15803d' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Azul Escuro', hex: '#1e40af' },
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
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkColors, setBulkColors] = useState<Record<string, { selected: boolean; imageUrl: string }>>({});
  const [bulkStock, setBulkStock] = useState('10');
  const [bulkPriceModifier, setBulkPriceModifier] = useState('0');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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
        image_url: imageUrl.trim() || undefined,
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
    setImageUrl('');
    setSubmitting(false);
    router.refresh();
  }

  async function handleAddBulk() {
    setError(null);
    const selectedColors = Object.entries(bulkColors)
      .filter(([_, v]) => v.selected)
      .map(([name, v]) => ({ name, imageUrl: v.imageUrl }));

    if (selectedColors.length === 0) {
      setError('Selecione pelo menos uma cor');
      return;
    }

    const modifier = Number(bulkPriceModifier);
    const stockValue = Number(bulkStock);
    if (Number.isNaN(modifier)) {
      setError('Modificador de preço inválido');
      return;
    }
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setError('Estoque inválido');
      return;
    }

    setBulkSubmitting(true);
    for (const { name: colorName, imageUrl: colorImageUrl } of selectedColors) {
      const res = await fetch('/api/product-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          name: colorName,
          color: colorName,
          price_modifier: modifier,
          stock: stockValue,
          image_url: colorImageUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { option: ProductOption };
        setOptions((prev) => [...prev, data.option]);
      }
    }

    setBulkColors({});
    setBulkSubmitting(false);
    setShowBulkAdd(false);
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

      {showBulkAdd && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Adicionar Cores em Lote</p>
            <button
              type="button"
              onClick={() => setShowBulkAdd(false)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Selecione as cores:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTE.map((c) => (
                <label key={c.hex} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-white/50 dark:hover:bg-gray-900/50">
                  <input
                    type="checkbox"
                    checked={bulkColors[c.name]?.selected ?? false}
                    onChange={(e) => {
                      setBulkColors((prev) => ({
                        ...prev,
                        [c.name]: { selected: e.target.checked, imageUrl: prev[c.name]?.imageUrl ?? '' },
                      }));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 mt-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: c.hex === 'transparent' ? 'transparent' : c.hex,
                        background: c.hex === 'transparent' ? 'linear-gradient(135deg, white 25%, transparent 25%, transparent 75%, white 75%)' : undefined,
                      }}
                    />
                    <span className="text-sm text-blue-900 dark:text-blue-200">{c.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Estoque padrão</label>
              <input
                type="number"
                min="0"
                step="1"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Modificador R$ padrão</label>
              <input
                type="number"
                step="0.01"
                value={bulkPriceModifier}
                onChange={(e) => setBulkPriceModifier(e.target.value)}
                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {Object.entries(bulkColors)
            .filter(([_, v]) => v.selected)
            .map(([colorName, _]) => (
              <div key={colorName}>
                <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Imagem para {colorName} (opcional)
                </label>
                <input
                  type="url"
                  value={bulkColors[colorName]?.imageUrl ?? ''}
                  onChange={(e) => {
                    setBulkColors((prev) => ({
                      ...prev,
                      [colorName]: { selected: true, imageUrl: e.target.value },
                    }));
                  }}
                  placeholder="https://... (URL da imagem)"
                  className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

          {error && (
            <p className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAddBulk}
            disabled={bulkSubmitting}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            {bulkSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              `Criar ${Object.values(bulkColors).filter((v) => v.selected).length} variações`
            )}
          </button>
        </div>
      )}

      {!showBulkAdd && (
        <button
          type="button"
          onClick={() => {
            const initialColors = COLOR_PALETTE.reduce(
              (acc, c) => ({ ...acc, [c.name]: { selected: false, imageUrl: '' } }),
              {} as Record<string, { selected: boolean; imageUrl: string }>,
            );
            setBulkColors(initialColors);
            setShowBulkAdd(true);
          }}
          className="w-full rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
        >
          + Adicionar Cores em Lote (com imagens)
        </button>
      )}

      <form onSubmit={handleAdd} className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Adicionar variação individual</p>
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
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL da imagem (opcional)"
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
  const [imageUrl, setImageUrl] = useState(option.image_url ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onUpdate({
      name: name.trim(),
      color: color.trim() || null,
      price_modifier: Number(priceModifier),
      stock: Number(stock),
      dimensions: dimensions.trim() || null,
      image_url: imageUrl.trim() || null,
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
    setImageUrl(option.image_url ?? '');
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
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL da imagem"
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
      <div className="min-w-0 flex-1 flex gap-3 items-start">
        {option.image_url && (
          <div className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.image_url} alt={option.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{option.name}</p>
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
      </div>
      <div className="flex gap-2 flex-shrink-0">
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
