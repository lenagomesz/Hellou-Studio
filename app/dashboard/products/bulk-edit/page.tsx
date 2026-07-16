'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  CheckSquare,
  Square,
  DollarSign,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  active: boolean;
  image_url: string | null;
};

type BulkChanges = {
  base_price?: number;
  active?: boolean;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritorio',
  criaturas: 'Criaturas',
  encomenda: 'Encomenda',
};

export default function BulkEditPage() {
  const { data: session } = useSession();
  const canChangeProductStatus = session?.user?.accessLevel !== 'partner';
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [changes, setChanges] = useState<BulkChanges>({});
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  // Form state
  const [editPrice, setEditPrice] = useState(false);
  const [editActive, setEditActive] = useState(false);
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newActive, setNewActive] = useState(true);

  useEffect(() => {
    fetch('/api/products?active=all')
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  function buildChanges(): BulkChanges {
    const c: BulkChanges = {};
    if (editPrice && newBasePrice) c.base_price = parseFloat(newBasePrice);
    if (editActive) c.active = newActive;
    return c;
  }

  function handlePreview() {
    const c = buildChanges();
    if (Object.keys(c).length === 0) {
      showToast('Selecione pelo menos um campo para editar', 'error');
      return;
    }
    if (selected.size === 0) {
      showToast('Selecione pelo menos um produto', 'error');
      return;
    }
    setChanges(c);
    setShowPreview(true);
  }

  async function applyChanges() {
    setApplying(true);
    const productIds = Array.from(selected);

    try {
      const res = await fetch('/api/admin/products/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: productIds, changes }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`${data.results.updated} produtos atualizados com sucesso!`, 'success');
        // Refresh products
        const refreshed = await fetch('/api/products?active=all').then((r) => r.json());
        setProducts(refreshed.products ?? []);
        setSelected(new Set());
        setShowPreview(false);
        resetForm();
      } else {
        showToast('Erro ao aplicar alterações', 'error');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    } finally {
      setApplying(false);
    }
  }

  function resetForm() {
    setEditPrice(false);
    setEditActive(false);
    setNewBasePrice('');
    setNewActive(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edição em massa</h1>
            <p className="text-sm text-gray-500">{selected.size} de {products.length} selecionados</p>
          </div>
        </div>
      </header>

      {/* Edit Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Campos para editar</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Base Price */}
          {canChangeProductStatus && <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={editPrice}
                onChange={(e) => setEditPrice(e.target.checked)}
                className="rounded"
              />
              <DollarSign className="h-4 w-4" />
              Preço Base
            </label>
            {editPrice && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={newBasePrice}
                onChange={(e) => setNewBasePrice(e.target.value)}
                placeholder="Novo preço base"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            )}
          </div>}

          {/* Active/Inactive */}
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded"
              />
              {newActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Status (Ativo/Inativo)
            </label>
            {editActive && (
              <select
                value={newActive ? 'true' : 'false'}
                onChange={(e) => setNewActive(e.target.value === 'true')}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handlePreview}
            disabled={selected.size === 0}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            Preview das Alterações
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Preview - Confirmar Alterações
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              As seguintes alterações serão aplicadas a {selected.size} produto(s):
            </p>

            <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              {changes.base_price !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>Preço base: <strong>{formatPrice(changes.base_price)}</strong></span>
                </div>
              )}
              {changes.active !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  {changes.active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
                  <span>Status: <strong>{changes.active ? 'Ativo' : 'Inativo'}</strong></span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Produtos selecionados:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {products
                  .filter((p) => selected.has(p.id))
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                      <span className="text-gray-400">{formatPrice(p.base_price)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={applyChanges}
                disabled={applying}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {applying ? 'Aplicando...' : 'Confirmar e Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List with Checkboxes */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <button onClick={selectAll} className="text-gray-600 hover:text-gray-900 dark:text-gray-400">
            {selected.size === products.length ? (
              <CheckSquare className="h-5 w-5 text-pink-500" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>
          <span className="text-sm text-gray-500">
            {selected.size > 0 ? `${selected.size} selecionado(s)` : 'Selecionar todos'}
          </span>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {products.map((product) => (
            <div
              key={product.id}
              className={`flex items-center gap-4 px-4 py-3 transition cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                selected.has(product.id) ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''
              }`}
              onClick={() => toggleSelect(product.id)}
            >
              <button className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}>
                {selected.has(product.id) ? (
                  <CheckSquare className="h-5 w-5 text-pink-500" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {CATEGORY_LABELS[product.category] ?? product.category}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatPrice(product.base_price)}
                </p>
              </div>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {product.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
