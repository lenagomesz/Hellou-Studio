'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Step = { id: string; name: string; active: boolean; definition: { required: boolean } };
type Product = {
  id: string; name: string; active: boolean; isCustomizable: boolean; localSteps: string[];
  links: Array<{ step_id: string; active: boolean; sort_order: number }>;
};

export function ProductStandardizationMonitor({ steps }: { steps: Step[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStepId, setSelectedStepId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'missing' | 'all' | 'linked' | 'local'>('missing');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const step = steps.find((item) => item.id === selectedStepId);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/admin/customization-monitor');
    const result = await response.json() as { products?: Product[]; error?: string };
    if (!response.ok || !result.products) throw new Error(result.error ?? 'Não foi possível carregar os produtos');
    setProducts(result.products);
  }, []);
  useEffect(() => { void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro ao carregar')); }, [refresh]);
  useEffect(() => { setSelectedIds([]); }, [selectedStepId]);

  const eligible = (product: Product) => product.active && product.isCustomizable
    && !product.links.some((link) => link.step_id === selectedStepId)
    && product.links.length + product.localSteps.length < 10;
  const filtered = useMemo(() => products.filter((product) => {
    const linked = product.links.some((link) => link.step_id === selectedStepId);
    return product.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
      && (filter === 'all' || filter === 'linked' && linked || filter === 'local' && product.localSteps.length > 0
        || filter === 'missing' && product.active && product.isCustomizable && !linked);
  }), [products, search, filter, selectedStepId]);
  const activeCustomizable = products.filter((product) => product.active && product.isCustomizable);
  const linkedCount = activeCustomizable.filter((product) => product.links.some((link) => link.step_id === selectedStepId && link.active)).length;
  const selectable = filtered.filter(eligible).map((product) => product.id);

  async function applyToSelected() {
    if (!step || !selectedIds.length) return;
    setBusy(true); setError(''); setMessage('');
    const targets = products.filter((product) => selectedIds.includes(product.id) && eligible(product));
    const failures: string[] = [];
    let saved = 0;
    for (let index = 0; index < targets.length; index += 4) {
      await Promise.all(targets.slice(index, index + 4).map(async (product) => {
        try {
          const response = await fetch(`/api/admin/products/${product.id}/customization-steps`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step_id: step.id, sort_order: Math.min(1000, Math.max(90, ...product.links.map((link) => link.sort_order)) + 10), required: step.definition.required, active: true, blocked_ids: [] }),
          });
          const result = await response.json() as { error?: string };
          if (!response.ok) throw new Error(result.error ?? 'Erro ao vincular');
          saved += 1;
        } catch (reason) { failures.push(`${product.name}: ${reason instanceof Error ? reason.message : 'erro'}`); }
      }));
    }
    try { await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao atualizar monitor'); }
    setSelectedIds([]);
    setMessage(`${saved} produto(s) vinculado(s) à etapa “${step.name}”. As etapas exclusivas foram preservadas.`);
    if (failures.length) setError(`Não foi possível vincular ${failures.length} produto(s): ${failures.slice(0, 5).join('; ')}${failures.length > 5 ? '…' : ''}`);
    setBusy(false);
  }

  return <section className="space-y-5">
    <div className="rounded-2xl border border-violet-200 bg-white p-5 dark:bg-slate-900">
      <h2 className="text-lg font-bold">Acompanhar padronização</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Escolha uma etapa compartilhada para ver onde ela já é usada e vinculá-la aos produtos selecionados. Etapas exclusivas continuam no produto para revisão individual.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
        <select aria-label="Etapa a padronizar" value={selectedStepId} onChange={(event) => setSelectedStepId(event.target.value)} className="rounded-xl border border-slate-200 p-2 text-sm dark:bg-slate-800"><option value="">Escolha uma etapa</option>{steps.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input aria-label="Pesquisar produto" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar produto" className="rounded-xl border border-slate-200 p-2 text-sm dark:bg-slate-800" />
        <select aria-label="Filtrar produtos" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-slate-200 p-2 text-sm dark:bg-slate-800"><option value="missing">Faltando etapa</option><option value="linked">Com a etapa</option><option value="local">Com etapa exclusiva</option><option value="all">Todos</option></select>
      </div>
      {step && <p className="mt-3 text-sm text-slate-700 dark:text-slate-200"><strong>{linkedCount} de {activeCustomizable.length}</strong> produtos ativos e personalizáveis já usam esta etapa ({activeCustomizable.length ? Math.round(linkedCount / activeCustomizable.length * 100) : 0}%).</p>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {step && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3"><button type="button" disabled={!selectable.length || busy} onClick={() => setSelectedIds(selectable.every((id) => selectedIds.includes(id)) ? [] : selectable)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-50">{selectable.every((id) => selectedIds.includes(id)) && selectable.length ? 'Limpar seleção' : 'Selecionar elegíveis exibidos'}</button><button type="button" disabled={!selectedIds.length || busy} onClick={() => void applyToSelected()} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Vincular a {selectedIds.length} produto(s)</button></div>
      <div className="divide-y divide-slate-100">{filtered.map((product) => { const link = product.links.find((item) => item.step_id === selectedStepId); const canSelect = eligible(product); return <div key={product.id} className="flex items-start gap-3 py-3 text-sm"><input type="checkbox" aria-label={`Selecionar ${product.name}`} checked={selectedIds.includes(product.id)} disabled={!canSelect || busy} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} className="mt-1" /><div className="min-w-0 flex-1"><Link href={`/dashboard/products/${product.id}`} className="font-semibold text-pink-700 underline">{product.name}</Link><p className="mt-1 text-xs text-slate-500">{link ? link.active ? 'Etapa vinculada' : 'Vínculo inativo neste produto' : !product.active ? 'Produto inativo' : !product.isCustomizable ? 'Produto não personalizável' : product.links.length + product.localSteps.length >= 10 ? 'Limite de 10 etapas' : 'Etapa ainda não vinculada'} · {product.links.length} compartilhada(s) · {product.localSteps.length} exclusiva(s)</p>{product.localSteps.length > 0 && <p className="mt-1 text-xs text-amber-700">Revisar exclusivas: {product.localSteps.join(', ')}</p>}</div></div>; })}{filtered.length === 0 && <p className="py-5 text-sm text-slate-500">Nenhum produto neste filtro.</p>}</div>
    </div>}
  </section>;
}
