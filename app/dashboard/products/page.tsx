'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Eye, EyeOff, Pencil, Trash2, Search, Download, Edit3 } from 'lucide-react';
import { useSession } from 'next-auth/react';

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
  encomenda: 'Encomenda',
};

const CATEGORY_COLORS: Record<string, string> = {
  chaveiros: 'bg-pink-100 text-pink-700',
  escritorio: 'bg-blue-100 text-blue-700',
  criaturas: 'bg-purple-100 text-purple-700',
  encomenda: 'bg-orange-100 text-orange-700',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type ProductRow = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  type?: string;
};

export default function ProductsPage() {
  const { data: session } = useSession();
  const canDeleteProducts = session?.user?.accessLevel !== 'partner';
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [toast, setToast] = useState('');
  const [fetchKey, setFetchKey] = useState(0);
  const [filter, setFilter] = useState<'all' | 'physical' | 'digital'>('all');

  const filteredProducts = products.filter(p => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (minPrice && p.base_price < parseFloat(minPrice)) return false;
    if (maxPrice && p.base_price > parseFloat(maxPrice)) return false;
    return true;
  });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (status === 'active') params.set('active', 'true');
    else if (status === 'inactive') params.set('active', 'false');
    else params.set('active', 'all');
    fetch(`/api/products?${params.toString()}`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then(data => { if (!cancelled) { setProducts(data.products ?? data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, status, search, fetchKey]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFetchKey(k => k + 1);
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
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setToast('Produto excluído');
      setTimeout(() => setToast(''), 3000);
    }
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
            {products.length} produtos · {activeCount} ativos
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
            <Edit3 className="h-4 w-4" /> Edicao em Massa
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
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">Todas categorias</option>
          <option value="chaveiros">Chaveiros</option>
          <option value="escritorio">Escritório</option>
          <option value="criaturas">Criaturas</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Preço min"
          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Preço max"
          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Buscar</button>
      </form>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded font-medium transition ${filter === 'all' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('physical')}
          className={`px-4 py-2 rounded font-medium transition ${filter === 'physical' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Produtos Fisicos
        </button>
        <button
          onClick={() => setFilter('digital')}
          className={`px-4 py-2 rounded font-medium transition ${filter === 'digital' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Arquivos STL
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition hover:shadow-md hover:border-pink-200 dark:border-gray-800 dark:bg-gray-900">
              <div className="h-36 bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-pink-200" /></div>
                )}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  product.type === 'digital'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.type === 'digital' ? '📥 Digital' : '📦 Fisico'}
                </span>
              </div>
              <div className="absolute top-2 right-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {product.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[product.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORY_LABELS[product.category] ?? product.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(product.base_price)}</p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-3 dark:border-gray-800">
                  <Link href={`/dashboard/products/${product.id}/edit`} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition dark:text-gray-400 dark:hover:bg-gray-800">
                    <Pencil className="h-3 w-3" /> Editar
                  </Link>
                  <button onClick={() => toggleActive(product.id, product.active)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition dark:text-gray-400 dark:hover:bg-gray-800">
                    {product.active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {product.active ? 'Desativar' : 'Ativar'}
                  </button>
                  {canDeleteProducts && <button onClick={() => deleteProduct(product.id, product.name)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition ml-auto">
                    <Trash2 className="h-3 w-3" />
                  </button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
