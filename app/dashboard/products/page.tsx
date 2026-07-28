'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Eye, EyeOff, Pencil, Trash2, Search, Download, Edit3, Tags, Boxes, ExternalLink, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ProductCategorySelect, useProductCategories } from '@/components/admin/ProductCategorySelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type ProductRow = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  sale_price?: number | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
  type?: string;
  fulfillment_mode?: string;
  is_customizable?: boolean;
  sku?: string | null;
  cost_price?: number | null;
  weight_grams?: number | null;
  product_options?: Array<{ id: string; name: string; stock: number; price_modifier: number }>;
  tags?: Array<{ id: string; name: string; color: string }>;
};

export default function ProductsPage() {
  const { data: session } = useSession();
  const canDeleteProducts = session?.user?.accessLevel !== 'partner';
  const canChangeProductStatus = session?.user?.accessLevel !== 'partner';
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, pages: 0 });
  const [filter, setFilter] = useState<'all' | 'physical' | 'digital'>('all');
  const [pendingDelete, setPendingDelete] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const productCategories = useProductCategories();
  const categoryLabels = Object.fromEntries(productCategories.map((item) => [item.slug, item.name]));

  const filteredProducts = products;

  useEffect(() => {
    const timeout = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (category) params.set('category', category);
    if (status === 'active') params.set('active', 'true');
    else if (status === 'inactive') params.set('active', 'false');
    else params.set('active', 'all');
    if (filter !== 'all') params.set('type', filter);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    params.set('page', String(page));
    params.set('limit', '24');
    fetch(`/api/products?${params.toString()}`)
      .then(async r => { if (!r.ok) { const data = await r.json().catch(() => ({})); throw new Error(data.error ?? 'Erro ao carregar produtos'); } return r.json(); })
      .then(data => { if (!cancelled) { setProducts(data.products ?? data); setPagination(data.pagination ?? { page: 1, limit: 24, total: 0, pages: 0 }); setLoading(false); } })
      .catch((requestError) => { if (!cancelled) { setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar produtos'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [category, status, debouncedSearch, filter, maxPrice, minPrice, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !active } : p));
      setToast(!active ? 'Produto ativado' : 'Produto desativado');
      setTimeout(() => setToast(''), 3000);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Não foi possível alterar o produto');
    }
  }

  async function deleteProduct(id: string, _name: string) {
    setDeleting(true);
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setPendingDelete(null);
      setToast('Produto excluído');
      setTimeout(() => setToast(''), 3000);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Não foi possível excluir o produto');
    }
    setDeleting(false);
  }

  const activeCount = products.filter(p => p.active).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} produtos encontrados · {activeCount} ativos nesta página
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/products/export"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
          <Link href="/dashboard/products/bulk-edit" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Edit3 className="h-4 w-4" /> Edição em massa
          </Link>
          <Link href="/dashboard/products/categories" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Tags className="h-4 w-4" /> Categorias
          </Link>
          <Link href="/dashboard/products/new" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Novo produto
          </Link>
        </div>
      </header>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        </div>
        <ProductCategorySelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} allowEmpty emptyLabel="Todas as categorias" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          value={minPrice}
          onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
          placeholder="Preço min"
          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={maxPrice}
          onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
          placeholder="Preço max"
          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Buscar</button>
      </form>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setFilter('all'); setPage(1); }}
          className={`px-4 py-2 rounded font-medium transition ${filter === 'all' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Todos
        </button>
        <button
          onClick={() => { setFilter('physical'); setPage(1); }}
          className={`px-4 py-2 rounded font-medium transition ${filter === 'physical' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Produtos físicos
        </button>
        <button
          onClick={() => { setFilter('digital'); setPage(1); }}
          className={`px-4 py-2 rounded font-medium transition ${filter === 'digital' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Arquivos STL
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const optionCount = product.product_options?.length ?? 0;
            const stockCount = (product.product_options ?? []).reduce((sum, option) => sum + option.stock, 0);
            const margin = product.cost_price != null && product.base_price > 0
              ? Math.round(((product.base_price - product.cost_price) / product.base_price) * 100)
              : null;
            const storePath = product.type === 'digital' ? `/stl/${product.id}` : `/products/${product.id}`;

            return (
              <article key={product.id} className="group overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_18px_45px_rgba(236,72,153,0.12)] dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-pink-50 via-white to-orange-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-12 w-12 text-pink-200" /></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 to-transparent" />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm backdrop-blur ${
                      product.type === 'digital' ? 'bg-blue-500/90 text-white' : 'bg-white/90 text-slate-700'
                    }`}>
                      {product.type === 'digital' ? 'STL digital' : 'Produto físico'}
                    </span>
                    {product.is_customizable && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur">
                        <Sparkles className="h-3 w-3" /> Personalizável
                      </span>
                    )}
                  </div>
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur ${
                    product.active ? 'bg-emerald-500/90' : 'bg-slate-900/70'
                  }`}>
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/65 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                    {categoryLabels[product.category] ?? product.category}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-base font-bold leading-5 text-slate-950 dark:text-white">{product.name}</h3>
                      {product.sku && <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">SKU {product.sku}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black text-slate-950 dark:text-white">{formatPrice(product.sale_price ?? product.base_price)}</p>
                      {product.sale_price != null && <p className="text-[10px] text-slate-400 line-through">{formatPrice(product.base_price)}</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Boxes className="h-3.5 w-3.5" /> Variações</p>
                      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{optionCount}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/80 px-3 py-2.5 dark:bg-emerald-500/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Estoque total</p>
                      <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-300">{stockCount}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex min-h-6 flex-wrap gap-1.5 text-[10px]">
                    {margin != null && <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{margin}% margem</span>}
                    {product.weight_grams && <span className="rounded-full bg-sky-50 px-2 py-1 font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{product.weight_grams} g</span>}
                    {product.tags?.slice(0, 2).map((tag) => <span key={tag.id} className="rounded-full px-2 py-1 font-bold text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>)}
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <Link href={`/dashboard/products/${product.id}/edit`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-pink-600 dark:bg-white dark:text-slate-950 dark:hover:bg-pink-500 dark:hover:text-white">
                      <Pencil className="h-3.5 w-3.5" /> Editar produto
                    </Link>
                    <Link href={storePath} aria-label={`Ver ${product.name} na loja`} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-slate-700 dark:hover:bg-pink-500/10">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    {canChangeProductStatus && (
                      <button type="button" onClick={() => toggleActive(product.id, product.active)} aria-label={product.active ? `Desativar ${product.name}` : `Ativar ${product.name}`} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 dark:border-slate-700 dark:hover:bg-amber-500/10">
                        {product.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                    {canDeleteProducts && (
                      <button type="button" onClick={() => setPendingDelete(product)} aria-label={`Excluir ${product.name}`} className="rounded-xl border border-red-100 p-2.5 text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fechar erro">×</button></div>}
      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm"><span className="text-gray-500">Página {pagination.page} de {pagination.pages} · {pagination.total} produtos</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold disabled:opacity-40">Anterior</button><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))} className="rounded-lg bg-slate-950 px-3 py-2 font-semibold text-white disabled:opacity-40">Próxima</button></div></div>
      )}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Excluir produto?" description={`“${pendingDelete?.name ?? ''}” será removido permanentemente.`} confirmLabel="Excluir" busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={() => pendingDelete ? deleteProduct(pendingDelete.id, pendingDelete.name) : undefined} />
    </div>
  );
}
