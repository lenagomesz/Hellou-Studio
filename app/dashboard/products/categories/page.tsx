'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Plus, Save, Tag, Trash2, X } from 'lucide-react';
import type { ProductCategory, ProductTag } from '@/types/database';

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [name, setName] = useState('');
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#8B5CF6');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadCategories() {
    const [categoryResponse, tagResponse] = await Promise.all([
      fetch('/api/admin/product-categories'),
      fetch('/api/admin/products/tags'),
    ]);
    const categoryData = await categoryResponse.json().catch(() => ({})) as { categories?: ProductCategory[]; error?: string };
    const tagData = await tagResponse.json().catch(() => ({})) as { tags?: ProductTag[]; error?: string };
    if (!categoryResponse.ok) setError(categoryData.error ?? 'Erro ao carregar categorias');
    else setCategories(categoryData.categories ?? []);
    if (!tagResponse.ok) setError(tagData.error ?? 'Erro ao carregar tags');
    else setTags(tagData.tags ?? []);
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

  async function createTag(event: FormEvent) {
    event.preventDefault();
    if (!tagName.trim()) return;
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/products/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
    });
    const data = await response.json().catch(() => ({})) as { tag?: ProductTag; error?: string };
    if (!response.ok || !data.tag) setError(data.error ?? 'Erro ao criar tag');
    else {
      setTags((current) => [...current, data.tag!].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setTagName('');
      setTagColor('#8B5CF6');
      notify('Tag criada com sucesso');
    }
    setSaving(false);
  }

  async function updateTag(tag: ProductTag, update: Pick<ProductTag, 'name' | 'color'>) {
    setError('');
    const response = await fetch('/api/admin/products/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tag.id, ...update }),
    });
    const data = await response.json().catch(() => ({})) as { tag?: ProductTag; error?: string };
    if (!response.ok || !data.tag) return setError(data.error ?? 'Erro ao atualizar tag');
    setTags((current) => current.map((item) => item.id === tag.id ? data.tag! : item));
    notify('Tag atualizada');
  }

  async function deleteTag(tag: ProductTag) {
    if (!window.confirm(`Excluir a tag “${tag.name}”? Ela será removida dos produtos vinculados.`)) return;
    const response = await fetch(`/api/admin/products/tags?id=${tag.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      return setError(data.error ?? 'Erro ao excluir tag');
    }
    setTags((current) => current.filter((item) => item.id !== tag.id));
    notify('Tag excluída');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {message && <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg"><Check className="h-4 w-4" />{message}</div>}
      <header className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 shadow-sm sm:p-8">
        <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-pink-600"><ArrowLeft className="h-4 w-4" /> Voltar para produtos</Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Organização do catálogo</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Categorias e tags de produtos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Categorias organizam o catálogo e aparecem em rosa. Tags destacam características dos produtos e usam cores próprias.</p>
      </header>

      <form onSubmit={createCategory} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[1fr_auto] sm:items-end">
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

      <form onSubmit={createTag} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[1fr_150px_auto] sm:items-end">
        <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Nova tag<input value={tagName} onChange={(event) => setTagName(event.target.value)} maxLength={40} placeholder="Ex.: Lançamento" className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cor da tag<div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-800"><input type="color" value={tagColor} onChange={(event) => setTagColor(event.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" /><span className="text-xs font-semibold uppercase text-gray-500">{tagColor}</span></div></label>
        <button type="submit" disabled={saving || !tagName.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar tag</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800"><h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Tag className="h-4 w-4 text-violet-500" /> Tags cadastradas</h2><p className="mt-1 text-xs text-gray-500">As cores abaixo aparecem nas etiquetas dos produtos.</p></div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {tags.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Nenhuma tag cadastrada.</p> : tags.map((tag) => <TagRow key={tag.id} tag={tag} onSave={updateTag} onDelete={deleteTag} />)}
        </div>
      </section>
    </div>
  );
}

function CategoryRow({ category, onSave, onDelete }: { category: ProductCategory; onSave: (category: ProductCategory, update: Partial<ProductCategory>) => Promise<void>; onDelete: (category: ProductCategory) => Promise<void> }) {
  const [name, setName] = useState(category.name);
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div><div className="flex items-center gap-2"><span className="h-4 w-4 shrink-0 rounded-full bg-pink-500" /><input value={name} onChange={(event) => setName(event.target.value)} className="w-full max-w-md rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 focus:border-pink-300 focus:bg-white focus:outline-none dark:bg-gray-800 dark:text-white" /></div><p className="mt-1 px-6 text-xs text-gray-400">/{category.slug}{category.is_system ? ' · categoria padrão' : ''} · rosa no catálogo</p></div>
      <button type="button" onClick={() => void onSave(category, { active: !category.active })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{category.active ? 'Ativa' : 'Inativa'}</button>
      <div className="flex gap-1">
        <button type="button" disabled={name.trim() === category.name || !name.trim()} onClick={() => void onSave(category, { name: name.trim() })} aria-label={`Salvar ${category.name}`} className="rounded-lg p-2 text-gray-500 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-30"><Save className="h-4 w-4" /></button>
        <button type="button" disabled={category.is_system} onClick={() => void onDelete(category)} aria-label={`Excluir ${category.name}`} title={category.is_system ? 'Categoria padrão do sistema' : 'Excluir categoria'} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function TagRow({ tag, onSave, onDelete }: { tag: ProductTag; onSave: (tag: ProductTag, update: Pick<ProductTag, 'name' | 'color'>) => Promise<void>; onDelete: (tag: ProductTag) => Promise<void> }) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_145px_auto] sm:items-center">
      <div className="flex items-center gap-2"><span className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{name || 'Tag'}</span><input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className="w-full max-w-md rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 focus:border-violet-300 focus:bg-white focus:outline-none dark:bg-gray-800 dark:text-white" /></div>
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-1 dark:border-gray-700"><input type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} aria-label={`Cor de ${tag.name}`} className="h-7 w-9 cursor-pointer border-0 bg-transparent" /><span className="text-[10px] font-semibold text-gray-500">{color}</span></label>
      <div className="flex gap-1"><button type="button" disabled={(name.trim() === tag.name && color === tag.color) || !name.trim()} onClick={() => void onSave(tag, { name: name.trim(), color })} aria-label={`Salvar ${tag.name}`} className="rounded-lg p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-30"><Save className="h-4 w-4" /></button><button type="button" onClick={() => void onDelete(tag)} aria-label={`Excluir ${tag.name}`} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
    </div>
  );
}
