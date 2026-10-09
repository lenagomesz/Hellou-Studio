'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ProductCustomizationSection } from '@/lib/product-customization';

type Step = { id: string; name: string; active: boolean; definition: ProductCustomizationSection };
type LinkRow = { step_id: string; sort_order: number; required: boolean; active: boolean; blocked_ids: string[] };
const field = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900';

export function ProductSharedSteps({ productId }: { productId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [chosen, setChosen] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    const [stepsResponse, linksResponse] = await Promise.all([
      fetch('/api/admin/customization-steps'), fetch(`/api/admin/products/${productId}/customization-steps`),
    ]);
    if (!stepsResponse.ok || !linksResponse.ok) throw new Error('Não foi possível carregar as etapas compartilhadas');
    setSteps(((await stepsResponse.json()) as { steps: Step[] }).steps);
    setLinks(((await linksResponse.json()) as { links: LinkRow[] }).links);
  }, [productId]);
  useEffect(() => { void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro ao carregar')); }, [refresh]);

  async function save(link: LinkRow) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/customization-steps`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(link),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Erro ao salvar vínculo');
      await refresh(); setMessage('Configuração deste produto salva.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao salvar'); }
    finally { setBusy(false); }
  }

  async function remove(stepId: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/customization-steps`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step_id: stepId }),
      });
      if (!response.ok) throw new Error('Não foi possível desvincular a etapa');
      await refresh(); setMessage('Etapa removida deste produto.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao remover'); }
    finally { setBusy(false); }
  }

  function edit(stepId: string, patch: Partial<LinkRow>) {
    setLinks((current) => current.map((link) => link.step_id === stepId ? { ...link, ...patch } : link));
  }

  return <section className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4 dark:bg-slate-900 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">Etapas compartilhadas</h3><p className="mt-1 text-xs text-slate-500">Vincule etapas reutilizáveis. Bloqueios e obrigatoriedade valem somente para este produto. Ordem 0, 10, 20… define a posição junto das etapas exclusivas.</p></div><Link href="/dashboard/products/customization-center" className="text-xs font-bold text-pink-700 underline">Abrir central</Link></div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}{message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    <div className="flex flex-wrap gap-2"><select value={chosen} onChange={(event) => setChosen(event.target.value)} className={field}><option value="">Escolha uma etapa</option>{steps.filter((step) => !links.some((link) => link.step_id === step.id)).map((step) => <option key={step.id} value={step.id}>{step.name}{step.active ? '' : ' (inativa)'}</option>)}</select><button type="button" disabled={!chosen || busy} onClick={() => { const step = steps.find((item) => item.id === chosen); if (step) void save({ step_id: chosen, sort_order: Math.max(90, ...links.map((link) => link.sort_order)) + 10, required: step.definition.required, active: true, blocked_ids: [] }); setChosen(''); }} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Vincular etapa</button></div>
    <div className="space-y-3">{links.map((link) => { const step = steps.find((item) => item.id === link.step_id); if (!step) return null; const choices = [...step.definition.colors, ...step.definition.options]; return <article key={link.step_id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{step.name}</strong><span className={`text-xs ${step.active ? 'text-emerald-700' : 'text-amber-700'}`}>{step.active ? 'Disponível globalmente' : 'Inativa globalmente'}</span></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs"><label>Ordem <input type="number" min="0" max="1000" value={link.sort_order} onChange={(event) => edit(link.step_id, { sort_order: Number(event.target.value) })} className={`${field} ml-1 w-20`} /></label><label className="flex items-center gap-1"><input type="checkbox" checked={link.required} onChange={(event) => edit(link.step_id, { required: event.target.checked })} /> Obrigatória</label><label className="flex items-center gap-1"><input type="checkbox" checked={link.active} onChange={(event) => edit(link.step_id, { active: event.target.checked })} /> Ativa neste produto</label></div>{choices.length > 0 && <div className="mt-3"><p className="text-xs font-semibold text-slate-600">Bloquear só neste produto</p><div className="mt-2 flex flex-wrap gap-2">{choices.map((choice) => <label key={choice.id} className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs"><input type="checkbox" checked={link.blocked_ids.includes(choice.id)} onChange={(event) => edit(link.step_id, { blocked_ids: event.target.checked ? [...link.blocked_ids, choice.id] : link.blocked_ids.filter((id) => id !== choice.id) })} /> {choice.label}</label>)}</div></div>}<div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void save(link)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Salvar configuração</button><button type="button" disabled={busy} onClick={() => void remove(link.step_id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Desvincular</button></div></article>; })}{links.length === 0 && <p className="text-xs text-slate-500">Este produto usa apenas as etapas exclusivas abaixo.</p>}</div>
  </section>;
}
