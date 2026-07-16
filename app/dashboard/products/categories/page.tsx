'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Plus, Save, Tag, Trash2, X } from 'lucide-react';
import type { ProductCategory } from '@/types/database';

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadCategories() {
    const response = await fetch('/api/admin/product-categories');
    const data = await response.json().catch(() => ({})) as { categories?: ProductCategory[]; error?: string };
    if (!response.ok) setError(data.error ?? 'Erro ao carregar categorias');
    else setCategories(data.categories ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadCategories(); }, []);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2500);
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/product-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), sort_order: categories.length * 10 + 10 }),
    });
    const data = await response.json().catch(() => ({})) as { category?: ProductCategory; error?: string };
    if (!response.ok || !data.category) setError(data.error ?? 'Erro ao criar categoria');
    else {
      setCategories((current) => [...current, data.category!]);
      setName('');
      notify('Categoria criada com sucesso');
    }
    setSaving(false);
  }

  async function updateCategory(category: ProductCategory, update: Partial<ProductCategory>) {
    setError('');
    const response = await fetch(`/api/admin/product-categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    const data = await response.json().catch(() => ({})) as { category?: ProductCategory; error?: string };
    if (!response.ok || !data.category) return setError(data.error ?? 'Erro ao atualizar categoria');
    setCategories((current) => current.map((item) => item.id === category.id ? data.category! : item));
    notify('Categoria atualizada');
  }

  async function deleteCategory(category: ProductCategory) {
    if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return;
    setError('');
    const response = await fetch(`/api/admin/product-categories/${category.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      return setError(data.error ?? 'Erro ao excluir categoria');
    }
    setCategories((current) => current.filter((item) => item.id !== category.id));
    notify('Categoria excluída');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {message && <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg"><Check className="h-4 w-4" />{message}</div>}
      <header className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 shadow-sm sm:p-8">
        <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-pink-600"><ArrowLeft className="h-4 w-4" /> Voltar para produtos</Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Organização do catálogo</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Categorias de produtos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Crie categorias para organizar produtos físicos e arquivos STL. Categorias em uso não podem ser excluídas.</p>
      </header>

      <form onSubmit={createCategory} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Nova categoria<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Ex.: Decoração" className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label>
        <button type="submit" disabled={saving || !name.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar</button>
      </form>

      {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fechar erro"><X className="h-4 w-4" /></button></div>}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800"><h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Tag className="h-4 w-4 text-pink-500" /> Categorias cadastradas</h2></div>
        {loading ? <div className="grid place-items-center p-12"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /></div> : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {categories.map((category) => <CategoryRow key={category.id} category={category} onSave={updateCategory} onDelete={deleteCategory} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryRow({ category, onSave, onDelete }: { category: ProductCategory; onSave: (category: ProductCategory, update: Partial<ProductCategory>) => Promise<void>; onDelete: (category: ProductCategory) => Promise<void> }) {
  const [name, setName] = useState(category.name);
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div><input value={name} onChange={(event) => setName(event.target.value)} className="w-full max-w-md rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 focus:border-pink-300 focus:bg-white focus:outline-none dark:bg-gray-800 dark:text-white" /><p className="mt-1 px-3 text-xs text-gray-400">/{category.slug}{category.is_system ? ' · categoria padrão' : ''}</p></div>
      <button type="button" onClick={() => void onSave(category, { active: !category.active })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{category.active ? 'Ativa' : 'Inativa'}</button>
      <div className="flex gap-1">
        <button type="button" disabled={name.trim() === category.name || !name.trim()} onClick={() => void onSave(category, { name: name.trim() })} aria-label={`Salvar ${category.name}`} className="rounded-lg p-2 text-gray-500 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-30"><Save className="h-4 w-4" /></button>
        <button type="button" disabled={category.is_system} onClick={() => void onDelete(category)} aria-label={`Excluir ${category.name}`} title={category.is_system ? 'Categoria padrão do sistema' : 'Excluir categoria'} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
