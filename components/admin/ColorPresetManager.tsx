'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FALLBACK_PRODUCT_COLOR_PRESET, type ProductColorPreset, type ProductColorPresetItem } from '@/lib/product-color-presets';

type EditableColor = Pick<ProductColorPresetItem, 'name' | 'hex'> & { id: string };
const newColor = (): EditableColor => ({ id: crypto.randomUUID(), name: '', hex: '#EC4899' });

function toEditable(preset: ProductColorPreset) {
  return preset.items.map((item) => ({ id: item.id, name: item.name, hex: item.hex }));
}

export function ColorPresetManager() {
  const [presets, setPresets] = useState<ProductColorPreset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [items, setItems] = useState<EditableColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ProductColorPreset | null>(null);

  const selectPreset = (preset: ProductColorPreset) => {
    setSelectedId(preset.id);
    setName(preset.name);
    setItems(toEditable(preset));
    setError('');
    setMessage('');
  };

  useEffect(() => {
    void fetch('/api/admin/product-option-color-presets')
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as cores');
        return (await response.json() as { presets: ProductColorPreset[] }).presets;
      })
      .then((data) => {
        setPresets(data);
        if (data[0]) selectPreset(data[0]);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as cores'))
      .finally(() => setLoading(false));
  }, []);

  const addPreset = () => {
    setSelectedId(null);
    setName('Novo tipo de variação');
    setItems(toEditable(FALLBACK_PRODUCT_COLOR_PRESET));
    setMessage('');
    setError('');
  };

  const updateItem = (id: string, patch: Partial<EditableColor>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  async function save() {
    setError('');
    setMessage('');
    const normalizedItems = items
      .map((item) => ({ name: item.name.trim(), hex: item.hex.trim().toUpperCase() }))
      .filter((item) => item.name || item.hex !== '#EC4899');
    if (!name.trim()) return setError('Informe o nome do tipo de variação.');
    if (normalizedItems.length === 0) return setError('Adicione pelo menos uma cor.');
    if (normalizedItems.some((item) => !item.name || !/^#[0-9A-F]{6}$/.test(item.hex))) return setError('Cada cor precisa de nome e código hexadecimal válido.');
    setSaving(true);
    const response = await fetch(selectedId ? `/api/admin/product-option-color-presets/${selectedId}` : '/api/admin/product-option-color-presets', {
      method: selectedId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), items: normalizedItems }),
    });
    const data = await response.json().catch(() => ({})) as { preset?: ProductColorPreset; error?: string };
    setSaving(false);
    if (!response.ok || !data.preset) return setError(data.error ?? 'Não foi possível salvar o tipo de variação.');
    setPresets((current) => selectedId ? current.map((preset) => preset.id === data.preset!.id ? data.preset! : preset) : [...current, data.preset!]);
    selectPreset(data.preset);
    setMessage('Cores salvas. Elas já podem ser aplicadas em lote nos produtos.');
  }

  async function remove() {
    if (!pendingDelete) return;
    const deleted = pendingDelete;
    setPendingDelete(null);
    const response = await fetch(`/api/admin/product-option-color-presets/${deleted.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      return setError(data.error ?? 'Não foi possível excluir o tipo de variação.');
    }
    const remaining = presets.filter((preset) => preset.id !== deleted.id);
    setPresets(remaining);
    if (remaining[0]) selectPreset(remaining[0]); else addPreset();
    setMessage('Tipo de variação excluído. Produtos já cadastrados não foram alterados.');
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 shadow-sm sm:p-8">
        <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-pink-600"><ArrowLeft className="h-4 w-4" /> Voltar para produtos</Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Variações reutilizáveis</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Cores por tipo de variação</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Crie grupos como “Cores padrão”, “Arco-íris” ou “Metalizadas”. Ao editar um produto, escolha um grupo e adicione todas as suas cores de uma vez.</p>
      </header>

      {message && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Check className="h-4 w-4" />{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={addPreset} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pink-300 px-3 py-2.5 text-sm font-bold text-pink-700 hover:bg-pink-50"><Plus className="h-4 w-4" /> Novo tipo</button>
          {loading ? <div className="grid place-items-center p-8"><Loader2 className="h-5 w-5 animate-spin text-pink-500" /></div> : presets.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">Nenhum grupo salvo.</p> : <div className="space-y-1">{presets.map((preset) => <button key={preset.id} type="button" onClick={() => selectPreset(preset)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${preset.id === selectedId ? 'bg-pink-600 text-white' : 'text-slate-700 hover:bg-pink-50 dark:text-slate-200 dark:hover:bg-gray-800'}`}><span className="block truncate">{preset.name}</span><span className={`mt-0.5 block text-xs font-normal ${preset.id === selectedId ? 'text-pink-100' : 'text-slate-400'}`}>{preset.items.length} cores</span></button>)}</div>}
        </aside>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-bold text-slate-950 dark:text-white">{selectedId ? 'Editar tipo de variação' : 'Novo tipo de variação'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">As mudanças valem para novos usos. Variações que já pertencem a produtos não são modificadas.</p></div>
            {selectedId && <button type="button" onClick={() => setPendingDelete(presets.find((preset) => preset.id === selectedId) ?? null)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Excluir</button>}
          </div>
          <label className="mt-6 block text-sm font-bold text-slate-700 dark:text-slate-200">Nome do tipo de variação<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Ex.: Cores padrão" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <div className="mt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">Cores disponíveis</h3><p className="text-xs text-slate-500">O nome aparece ao cliente e o círculo usa o hexadecimal.</p></div><button type="button" onClick={() => setItems((current) => [...current, newColor()])} disabled={items.length >= 40} className="inline-flex items-center gap-1 rounded-lg border border-pink-200 px-3 py-2 text-xs font-bold text-pink-700 hover:bg-pink-50 disabled:opacity-50"><Plus className="h-4 w-4" /> Adicionar cor</button></div>
            <div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[42px_1fr_150px_auto] sm:items-center dark:border-slate-700"><span className="h-9 w-9 rounded-full border border-slate-300" style={{ backgroundColor: item.hex }} /><input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} maxLength={60} placeholder="Nome da cor" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><div className="flex rounded-lg border border-slate-200 dark:border-slate-700"><input type="color" value={item.hex} onChange={(event) => updateItem(item.id, { hex: event.target.value.toUpperCase() })} aria-label={`Cor de ${item.name || 'nova cor'}`} className="h-9 w-10 cursor-pointer border-0 bg-transparent p-1" /><input value={item.hex} onChange={(event) => updateItem(item.id, { hex: event.target.value.toUpperCase() })} className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold uppercase text-slate-600 outline-none dark:text-slate-300" /></div><button type="button" onClick={() => setItems((current) => current.filter((color) => color.id !== item.id))} disabled={items.length === 1} aria-label={`Remover ${item.name || 'cor'}`} className="justify-self-end rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          </div>
          <div className="mt-6 flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar cores</button></div>
        </section>
      </div>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Excluir este tipo de variação?" description={`As cores de “${pendingDelete?.name ?? ''}” serão removidas desta lista. Produtos que já usam essas cores não serão alterados.`} confirmLabel="Excluir" onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} />
    </div>
  );
}
