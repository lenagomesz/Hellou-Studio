'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProductCustomizationSection } from '@/lib/product-customization';

type Step = { id: string; name: string; active: boolean; definition: ProductCustomizationSection };
export type SharedStepLink = {
  step_id: string; sort_order: number; required: boolean; active: boolean;
  blocked_ids: string[]; label_override: string | null;
};
type LinkRow = SharedStepLink;
type Position = { value: number; label: string };
const field = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900';

function stagePositions(sections: ProductCustomizationSection[], links: LinkRow[], steps: Step[], excludeStepId?: string): Position[] {
  const ordered = [
    ...sections.map((section, index) => ({ label: section.label, order: section.sortOrder ?? index * 10 })),
    ...links.filter((link) => link.step_id !== excludeStepId).map((link) => ({
      label: link.label_override || steps.find((step) => step.id === link.step_id)?.definition.label || 'Etapa compartilhada',
      order: link.sort_order,
    })),
  ]
    .sort((a, b) => a.order - b.order);
  if (!ordered.length) return [{ value: 0, label: 'Primeira variação do produto' }];
  const positions: Position[] = [{ value: Math.max(-10, ordered[0].order - 5), label: `Antes de “${ordered[0].label}”` }];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    positions.push({ value: Math.floor((ordered[index].order + ordered[index + 1].order) / 2),
      label: `Entre “${ordered[index].label}” e “${ordered[index + 1].label}”` });
  }
  positions.push({ value: Math.min(1000, ordered.at(-1)!.order + 5), label: `Depois de “${ordered.at(-1)!.label}”` });
  return positions;
}

export function ProductSharedSteps({ productId, localSections = [], canPromote = false, onPromoted, onDraftChange }: {
  productId?: string;
  localSections?: ProductCustomizationSection[];
  canPromote?: boolean;
  onPromoted?: (sections: ProductCustomizationSection[]) => void;
  onDraftChange?: (links: SharedStepLink[]) => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [chosen, setChosen] = useState('');
  const [newPosition, setNewPosition] = useState<number | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const positions = useMemo(() => stagePositions(localSections, links, steps), [localSections, links, steps]);
  const lastPosition = positions.at(-1)?.value ?? 0;
  const selectedNewPosition = positions.some((position) => position.value === newPosition) ? newPosition! : lastPosition;

  const refresh = useCallback(async () => {
    const [stepsResponse, linksResponse] = await Promise.all([
      fetch('/api/admin/customization-steps'), productId ? fetch(`/api/admin/products/${productId}/customization-steps`) : Promise.resolve(null),
    ]);
    if (!stepsResponse.ok || (linksResponse && !linksResponse.ok)) throw new Error('Não foi possível carregar as etapas compartilhadas');
    setSteps(((await stepsResponse.json()) as { steps: Step[] }).steps);
    if (linksResponse) setLinks(((await linksResponse.json()) as { links: LinkRow[] }).links);
  }, [productId]);
  useEffect(() => { void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro ao carregar')); }, [refresh]);

  async function save(link: LinkRow) {
    if (!links.some((item) => item.step_id === link.step_id) && links.length + localSections.length >= 10) {
      setError('O produto pode ter no máximo 10 etapas.');
      return;
    }
    if (!productId) {
      const next = [...links.filter((item) => item.step_id !== link.step_id), link].sort((a, b) => a.sort_order - b.sort_order);
      setLinks(next); onDraftChange?.(next); setMessage('Etapa incluída. Será salva ao criar o produto.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/customization-steps`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(link),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Erro ao salvar vínculo');
      await refresh(); setMessage('Variação deste produto salva.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao salvar'); }
    finally { setBusy(false); }
  }

  async function remove(stepId: string) {
    if (!productId) {
      const next = links.filter((item) => item.step_id !== stepId);
      setLinks(next); onDraftChange?.(next); return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/customization-steps`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step_id: stepId }),
      });
      if (!response.ok) throw new Error('Não foi possível desvincular a etapa');
      await refresh(); setMessage('Variação compartilhada removida deste produto.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao remover'); }
    finally { setBusy(false); }
  }

  async function promote(section: ProductCustomizationSection) {
    if (!productId || !canPromote) return setError('Salve as alterações do produto antes de padronizar esta etapa.');
    const name = (names[section.id] ?? section.label).trim();
    const description = (descriptions[section.id] ?? `Escolha reutilizável: ${section.label}`).trim();
    if (!name || !description) return setError('Informe nome e descrição para a etapa compartilhada.');
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/promote-stage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: section.id, name, description }),
      });
      const result = await response.json() as { sections?: ProductCustomizationSection[]; error?: string };
      if (!response.ok || !result.sections) throw new Error(result.error ?? 'Erro ao padronizar etapa');
      onPromoted?.(result.sections);
      await refresh();
      setMessage(`“${section.label}” agora é uma etapa compartilhada e mantém sua posição neste produto.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao padronizar'); }
    finally { setBusy(false); }
  }

  function edit(stepId: string, patch: Partial<LinkRow>) {
    const next = links.map((link) => link.step_id === stepId ? { ...link, ...patch } : link);
    setLinks(next);
    if (!productId) onDraftChange?.(next);
  }

  return <section className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4 dark:bg-slate-900 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">Variações compartilhadas</h3><p className="mt-1 text-xs text-slate-500">Inclua etapas reutilizáveis entre as outras variações. A posição e o título podem ser específicos deste produto.</p></div><Link href="/dashboard/products/customization-center" className="text-xs font-bold text-pink-700 underline">Abrir central</Link></div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}{message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs font-semibold">Etapa/variação<select value={chosen} onChange={(event) => setChosen(event.target.value)} className={field}><option value="">Escolha uma etapa</option>{steps.filter((step) => step.active && !links.some((link) => link.step_id === step.id)).map((step) => <option key={step.id} value={step.id}>{step.name}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold">Posição<select value={selectedNewPosition} onChange={(event) => setNewPosition(Number(event.target.value))} className={field}>{positions.map((position) => <option key={`${position.value}:${position.label}`} value={position.value}>{position.label}</option>)}</select></label><button type="button" disabled={!chosen || busy || links.length + localSections.length >= 10} onClick={() => { const step = steps.find((item) => item.id === chosen); if (step) void save({ step_id: chosen, sort_order: selectedNewPosition, required: step.definition.required, active: true, blocked_ids: [], label_override: null }); setChosen(''); }} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{productId ? 'Vincular variação' : 'Adicionar variação'}</button></div>
    <div className="space-y-3">{links.map((link) => { const step = steps.find((item) => item.id === link.step_id); if (!step) return null; const choices = [...step.definition.colors, ...step.definition.options]; const rowPositions = stagePositions(localSections, links, steps, link.step_id); const currentPositionIsListed = rowPositions.some((position) => position.value === link.sort_order); return <article key={link.step_id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm">{link.label_override || step.definition.label}</strong><p className="text-xs text-slate-500">Etapa compartilhada: {step.name}</p></div><span className={`text-xs ${step.active ? 'text-emerald-700' : 'text-amber-700'}`}>{step.active ? 'Disponível globalmente' : 'Inativa globalmente'}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold">Título neste produto<input value={link.label_override ?? ''} onChange={(event) => edit(link.step_id, { label_override: event.target.value })} maxLength={80} placeholder={step.definition.label} className={field} /></label><label className="grid gap-1 text-xs font-semibold">Posição da variação<select value={link.sort_order} onChange={(event) => edit(link.step_id, { sort_order: Number(event.target.value) })} className={field}>{!currentPositionIsListed && <option value={link.sort_order}>Posição atual ({link.sort_order})</option>}{rowPositions.map((position) => <option key={`${position.value}:${position.label}`} value={position.value}>{position.label}</option>)}</select></label></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={link.required} onChange={(event) => edit(link.step_id, { required: event.target.checked })} /> Obrigatória</label><label className="flex items-center gap-1"><input type="checkbox" checked={link.active} onChange={(event) => edit(link.step_id, { active: event.target.checked })} /> Ativa neste produto</label></div>{choices.length > 0 && <div className="mt-3"><p className="text-xs font-semibold text-slate-600">Bloquear só neste produto</p><div className="mt-2 flex flex-wrap gap-2">{choices.map((choice) => <label key={choice.id} className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs"><input type="checkbox" checked={link.blocked_ids.includes(choice.id)} onChange={(event) => edit(link.step_id, { blocked_ids: event.target.checked ? [...link.blocked_ids, choice.id] : link.blocked_ids.filter((id) => id !== choice.id) })} /> {choice.label}</label>)}</div></div>}<div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void save(link)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{productId ? 'Salvar configuração' : 'Configuração pronta'}</button><button type="button" disabled={busy} onClick={() => void remove(link.step_id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">{productId ? 'Desvincular' : 'Remover'}</button></div></article>; })}{links.length === 0 && <p className="text-xs text-slate-500">Nenhuma variação compartilhada vinculada.</p>}</div>
    {productId && localSections.length > 0 && <div className="border-t border-violet-100 pt-4"><h4 className="text-sm font-bold">Padronizar etapa deste produto</h4><p className="mt-1 text-xs text-slate-500">Transforme uma etapa exclusiva já salva em compartilhada. Ela continua neste produto na mesma posição e poderá ser vinculada a outros.</p>{!canPromote && <p className="mt-2 text-xs text-amber-700">Salve as alterações do produto antes de padronizar.</p>}<div className="mt-3 space-y-3">{localSections.map((section) => { const hasDependency = Boolean(section.showWhen) || localSections.some((candidate) => candidate.showWhen?.source === 'section_option' && candidate.showWhen.sectionId === section.id); return <div key={section.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]"><label className="grid gap-1 text-xs font-semibold">Nome compartilhado<input value={names[section.id] ?? section.label} onChange={(event) => setNames((current) => ({ ...current, [section.id]: event.target.value }))} maxLength={80} className={field} /></label><label className="grid gap-1 text-xs font-semibold">Descrição<input value={descriptions[section.id] ?? `Escolha reutilizável: ${section.label}`} onChange={(event) => setDescriptions((current) => ({ ...current, [section.id]: event.target.value }))} maxLength={300} className={field} /></label><button type="button" disabled={busy || !canPromote || hasDependency} title={hasDependency ? 'Remova condições ligadas a esta etapa antes de padronizar' : undefined} onClick={() => void promote(section)} className="self-end rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 disabled:opacity-40">Padronizar</button>{hasDependency && <p className="text-xs text-amber-700 sm:col-span-3">Esta etapa tem uma condição ou outra etapa depende dela. Remova a condição antes de padronizar.</p>}</div>; })}</div></div>}
  </section>;
}
