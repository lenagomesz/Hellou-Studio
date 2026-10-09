'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Step = { id: string; name: string; active: boolean; definition: { required: boolean } };
type Product = {
  id: string; name: string; active: boolean; isCustomizable: boolean; localSteps: string[];
  links: Array<{ step_id: string; active: boolean; sort_order: number }>;
  options: Array<{ id: string; name: string; color: string | null; color_name: string | null; stock: number; active: boolean; price_modifier: number }>;
};

export function ProductStandardizationMonitor({ steps, initialStepId = '' }: { steps: Step[]; initialStepId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStepId, setSelectedStepId] = useState(initialStepId);
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

  const eligible = (product: Product) => product.active
    && !product.links.some((link) => link.step_id === selectedStepId)
    && product.links.length + product.localSteps.length < 10;
  const filtered = useMemo(() => products.filter((product) => {
    const linked = product.links.some((link) => link.step_id === selectedStepId);
    return product.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
      && (filter === 'all' || filter === 'linked' && linked || filter === 'local' && product.localSteps.length > 0
        || filter === 'missing' && product.active && !linked);
  }), [products, search, filter, selectedStepId]);
  const activeProducts = products.filter((product) => product.active);
  const linkedCount = activeProducts.filter((product) => product.links.some((link) => link.step_id === selectedStepId && link.active)).length;
  const selectable = filtered.filter(eligible).map((product) => product.id);

  async function linkProducts(ids: string[]) {
    if (!step || !ids.length) return;
    setBusy(true); setError(''); setMessage('');
    const targets = products.filter((product) => ids.includes(product.id) && eligible(product));
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
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Escolha uma etapa/variação compartilhada, pesquise um produto e clique em Vincular. Para vários produtos, selecione todos os elegíveis. Escolhas exclusivas continuam no produto para revisão individual.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
        <select aria-label="Etapa a padronizar" value={selectedStepId} onChange={(event) => setSelectedStepId(event.target.value)} className="rounded-xl border border-slate-200 p-2 text-sm dark:bg-slate-800"><option value="">Escolha uma etapa</option>{steps.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input aria-label="Pesquisar produto" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar produto" className="rounded-xl border border-slate-200 p-2 text-sm dark:bg-slate-800" />
        <select aria-label="Filtrar produtos" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-slate-200 p-2 text-sm dark:bg-slate-800"><option value="missing">Faltando etapa</option><option value="linked">Com a etapa</option><option value="local">Com etapa exclusiva</option><option value="all">Todos</option></select>
      </div>
      {step && <p className="mt-3 text-sm text-slate-700 dark:text-slate-200"><strong>{linkedCount} de {activeProducts.length}</strong> produtos ativos já usam esta etapa ({activeProducts.length ? Math.round(linkedCount / activeProducts.length * 100) : 0}%).</p>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {step && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3"><button type="button" disabled={!selectable.length || busy} onClick={() => setSelectedIds(selectable.every((id) => selectedIds.includes(id)) ? [] : selectable)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-50">{selectable.every((id) => selectedIds.includes(id)) && selectable.length ? 'Limpar seleção' : 'Selecionar elegíveis exibidos'}</button><button type="button" disabled={!selectedIds.length || busy} onClick={() => void linkProducts(selectedIds)} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Vincular a {selectedIds.length} produto(s)</button></div>
      <div className="divide-y divide-slate-100">{filtered.map((product) => <ProductMonitorRow key={product.id} product={product} steps={steps} selectedStepId={selectedStepId} selected={selectedIds.includes(product.id)} canSelect={eligible(product)} busy={busy} onSelect={(checked) => setSelectedIds((current) => checked ? [...current, product.id] : current.filter((id) => id !== product.id))} onLink={() => void linkProducts([product.id])} />)}{filtered.length === 0 && <p className="py-5 text-sm text-slate-500">Nenhum produto neste filtro.</p>}</div>
    </div>}
  </section>;
}

function ProductMonitorRow({ product, steps, selectedStepId, selected, canSelect, busy, onSelect, onLink }: {
  product: Product; steps: Step[]; selectedStepId: string; selected: boolean; canSelect: boolean; busy: boolean;
  onSelect: (checked: boolean) => void; onLink: () => void;
}) {
  const link = product.links.find((item) => item.step_id === selectedStepId);
  return <div className="flex items-start gap-3 py-3 text-sm">
    <input type="checkbox" aria-label={`Selecionar ${product.name}`} checked={selected} disabled={!canSelect || busy} onChange={(event) => onSelect(event.target.checked)} className="mt-1" />
    <div className="min-w-0 flex-1">
      <Link href={`/dashboard/products/${product.id}`} className="font-semibold text-pink-700 underline">{product.name}</Link>
      <p className="mt-1 text-xs text-slate-500">{link ? link.active ? 'Etapa vinculada' : 'Vínculo inativo neste produto' : !product.active ? 'Produto inativo' : product.links.length + product.localSteps.length >= 10 ? 'Limite de 10 etapas' : product.isCustomizable ? 'Etapa ainda não vinculada' : 'Sem variação anterior'} · {product.links.length} compartilhada(s) · {product.localSteps.length} exclusiva(s) · {product.options.length} opção(ões)</p>
      <details className="mt-2 text-xs text-slate-600 dark:text-slate-300"><summary className="cursor-pointer font-semibold text-violet-700">Ver todas as etapas, variações e opções</summary>
        <div className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p><strong>Compartilhadas:</strong> {product.links.length ? product.links.map((item) => `${steps.find((step) => step.id === item.step_id)?.name ?? 'Etapa removida'}${item.active ? '' : ' (inativa)'}`).join(', ') : 'Nenhuma'}</p>
          <p><strong>Exclusivas:</strong> {product.localSteps.length ? product.localSteps.join(', ') : 'Nenhuma'}</p>
          <div><strong>Opções comerciais:</strong> {product.options.length ? <ul className="mt-1 space-y-1">{product.options.map((option) => <li key={option.id} className="flex flex-wrap items-center gap-1"><span className="h-3 w-3 rounded-full border" style={{ backgroundColor: option.color && /^#[0-9a-f]{6}$/i.test(option.color) ? option.color : 'transparent' }} />{option.name}{option.color_name ? ` · ${option.color_name}` : ''} · {option.active ? 'ativa' : 'inativa'} · estoque {option.stock} · ajuste R$ {Number(option.price_modifier).toFixed(2)}</li>)}</ul> : ' Nenhuma'}</div>
        </div>
      </details>
      {product.localSteps.length > 0 && <p className="mt-1 text-xs text-amber-700">Revisar exclusivas: {product.localSteps.join(', ')}</p>}
    </div>
    {canSelect && <button type="button" disabled={busy} onClick={onLink} className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 disabled:opacity-40">Vincular</button>}
  </div>;
}
