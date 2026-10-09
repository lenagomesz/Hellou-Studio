'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomizationSectionsEditor } from '@/components/admin/CustomizationSectionsEditor';
import { ProductStandardizationMonitor } from '@/components/admin/ProductStandardizationMonitor';
import type { ProductCustomizationSection } from '@/lib/product-customization';

type Color = { id: string; name: string; hex: string; active: boolean; recent: boolean; productCount: number; stepCount: number; presetCount: number; products: Array<{ id: string; name: string }>; steps: Array<{ id: string; name: string }>; presets: Array<{ id: string; name: string }> };
type Step = { id: string; name: string; description: string; definition: ProductCustomizationSection; active: boolean; recent: boolean; products: Array<{ product_id: string; name: string; blocked_ids: string[] }> };
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

function freshSection(): ProductCustomizationSection {
  return { id: `section-${crypto.randomUUID()}`, label: 'Escolha a cor', type: 'color', required: true,
    autoSelectOptionByCharacterCount: false, helpText: '', placeholder: '', colors: [{ id: `color-${crypto.randomUUID()}`, label: 'Branco', value: '#FFFFFF' }], options: [] };
}

export function CatalogCenter() {
  const [tab, setTab] = useState<'colors' | 'steps' | 'products'>('colors');
  const [colors, setColors] = useState<Color[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stepFilter, setStepFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#EC4899');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [focusStepId, setFocusStepId] = useState('');
  const [stepName, setStepName] = useState('');
  const [description, setDescription] = useState('');
  const [definition, setDefinition] = useState<ProductCustomizationSection[]>([freshSection()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [colorResponse, stepResponse] = await Promise.all([
      fetch('/api/admin/catalog-colors'), fetch('/api/admin/customization-steps'),
    ]);
    if (!colorResponse.ok || !stepResponse.ok) throw new Error('Não foi possível carregar a central');
    setColors(((await colorResponse.json()) as { colors: Color[] }).colors);
    setSteps(((await stepResponse.json()) as { steps: Step[] }).steps);
  }, []);

  useEffect(() => { void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro ao carregar')); }, [refresh]);

  async function saveColor(color?: Color, patch?: Partial<Color>) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(color ? `/api/admin/catalog-colors/${color.id}` : '/api/admin/catalog-colors', {
        method: color ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(color ? patch : { name: name.trim(), hex: hex.toUpperCase() }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Erro ao salvar cor');
      await refresh();
      if (!color) { setName(''); setHex('#EC4899'); }
      setMessage('Cor salva. A disponibilidade foi atualizada em todos os produtos vinculados.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao salvar cor'); }
    finally { setBusy(false); }
  }

  async function removeColor(color: Color, withoutReplacement: boolean) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog-colors/${color.id}${withoutReplacement ? '?withoutReplacement=1' : ''}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? 'Erro ao excluir cor');
      }
      await refresh(); setMessage(withoutReplacement
        ? `Cor “${color.name}” removida. Variações que usavam essa cor foram inativadas; revise os produtos afetados.`
        : `Cor “${color.name}” excluída.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao excluir cor'); }
    finally { setBusy(false); }
  }

  async function replaceColor(color: Color, target: Color) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog-colors/${color.id}/replace`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: target.id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Erro ao substituir cor');
      await refresh(); setMessage(`“${color.name}” foi substituída por “${target.name}” nos produtos, paletas e etapas. Revise escolhas repetidas em etapas específicas.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao substituir cor'); }
    finally { setBusy(false); }
  }

  async function saveStep() {
    if (definition.length !== 1) return setError('A etapa precisa conter exatamente uma seção.');
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(selectedStepId ? `/api/admin/customization-steps/${selectedStepId}` : '/api/admin/customization-steps', {
        method: selectedStepId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stepName.trim(), description: description.trim(), definition: definition[0] }),
      });
      const result = await response.json() as { step?: Step; error?: string };
      if (!response.ok || !result.step) throw new Error(result.error ?? 'Erro ao salvar etapa');
      await refresh(); selectStep(result.step);
      setMessage('Etapa salva. Produtos vinculados usarão esta configuração.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao salvar etapa'); }
    finally { setBusy(false); }
  }

  async function toggleStep(step: Step) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/customization-steps/${step.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !step.active }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Erro ao alterar etapa');
      await refresh();
      setMessage(`Etapa ${step.active ? 'inativada' : 'reativada'} em todos os produtos vinculados.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao alterar etapa'); }
    finally { setBusy(false); }
  }

  function selectStep(step: Step) {
    setSelectedStepId(step.id); setStepName(step.name); setDescription(step.description); setDefinition([step.definition]);
    setError(''); setMessage('');
  }

  const filteredColors = useMemo(() => colors.filter((color) => {
    return (status === 'all' || status === 'new' && color.recent || status === 'active' && color.active || status === 'inactive' && !color.active)
      && (stepFilter === 'all' || color.steps.some((step) => step.id === stepFilter))
      && `${color.name} ${color.hex} ${color.products.map((product) => product.name).join(' ')} ${color.presets.map((group) => group.name).join(' ')}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
  }), [colors, search, status, stepFilter]);
  const filteredSteps = useMemo(() => steps.filter((step) => (
    (status === 'all' || status === 'active' && step.active || status === 'inactive' && !step.active || status === 'new' && step.recent)
    && (colorFilter === 'all' || step.definition.colors.some((color) => color.colorId === colorFilter))
    && `${step.name} ${step.definition.label} ${step.products.map((product) => product.name).join(' ')}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  )), [steps, search, status, colorFilter]);

  return <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-7">
    <header className="rounded-3xl bg-gradient-to-br from-pink-50 via-white to-violet-50 p-7 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-violet-950">
      <Link href="/dashboard/products" className="text-sm text-pink-700">← Produtos</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">Central de cores e etapas</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Gerencie disponibilidade global, veja os produtos afetados e mantenha etapas reutilizáveis em um só lugar. Cada hexadecimal tem uma cor central; grupos e produtos podem apontar para ela. Para unificar duas entradas, substitua uma pela outra.</p>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setTab('colors')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'colors' ? 'bg-pink-600 text-white' : 'bg-white text-slate-700'}`}>Cores · {colors.length}</button><button onClick={() => setTab('steps')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'steps' ? 'bg-pink-600 text-white' : 'bg-white text-slate-700'}`}>Etapas · {steps.length}</button><button onClick={() => setTab('products')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'products' ? 'bg-pink-600 text-white' : 'bg-white text-slate-700'}`}>Produtos · padronização</button></div>
      {tab === 'steps' && selectedStepId && <button type="button" onClick={() => { setFocusStepId(selectedStepId); setTab('products'); }} className="mt-3 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700">Vincular “{stepName}” aos produtos →</button>}
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {tab !== 'products' && <div className="grid gap-3 sm:grid-cols-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar nome ou produto" className={inputClass} /><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}><option value="all">Todos os status</option><option value="active">Disponíveis</option><option value="inactive">Indisponíveis</option><option value="new">Novos</option></select>{tab === 'colors' ? <select value={stepFilter} onChange={(event) => setStepFilter(event.target.value)} className={inputClass}><option value="all">Todas as etapas</option>{[...new Map(colors.flatMap((color) => color.steps).map((step) => [step.id, step])).values()].map((step) => <option key={step.id} value={step.id}>{step.name}</option>)}</select> : <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} className={inputClass}><option value="all">Todas as cores</option>{colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select>}</div>}
    {tab === 'products' ? <ProductStandardizationMonitor key={focusStepId || 'all'} steps={steps} initialStepId={focusStepId} /> : tab === 'colors' ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
      <div className="space-y-3">{filteredColors.map((color) => <ColorRow key={color.id} color={color} colors={colors} busy={busy} save={saveColor} remove={removeColor} replace={replaceColor} />)}{filteredColors.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Nenhuma cor encontrada.</p>}</div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><h2 className="font-bold">Cadastrar cor</h2><div className="mt-4 space-y-3"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da cor" maxLength={60} className={inputClass} /><div className="flex gap-2"><input type="color" value={hex} onChange={(event) => setHex(event.target.value.toUpperCase())} className="h-10 w-12" /><input value={hex} onChange={(event) => setHex(event.target.value.toUpperCase())} className={inputClass} /></div><button disabled={busy} onClick={() => void saveColor()} className="w-full rounded-xl bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Cadastrar</button></div></aside>
    </div> : <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-2"><button onClick={() => { setSelectedStepId(null); setStepName(''); setDescription(''); setDefinition([freshSection()]); }} className="w-full rounded-xl border border-pink-300 bg-white px-4 py-3 text-left text-sm font-bold text-pink-700">+ Nova etapa</button>{filteredSteps.map((step) => <div key={step.id} className={`rounded-xl border bg-white p-3 ${selectedStepId === step.id ? 'border-pink-500' : 'border-slate-200'}`}><button onClick={() => selectStep(step)} className="w-full text-left"><strong className="block text-sm">{step.name}</strong><span className="text-xs text-slate-500">{step.products.length} produto(s) · {step.active ? 'Ativa' : 'Inativa'}</span></button><button disabled={busy} onClick={() => void toggleStep(step)} className={`mt-2 rounded-lg px-2 py-1 text-xs font-bold ${step.active ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{step.active ? 'Inativar em todos' : 'Reativar em todos'}</button></div>)}</aside>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><h2 className="text-lg font-bold">{selectedStepId ? 'Editar etapa compartilhada' : 'Nova etapa compartilhada'}</h2><input value={stepName} onChange={(event) => setStepName(event.target.value)} placeholder="Nome interno da etapa" maxLength={80} className={inputClass} /><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição para administração" maxLength={300} className={inputClass} /><CustomizationSectionsEditor value={definition} onChange={setDefinition} maxSections={1} availableColors={colors} />{selectedStepId && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong>Produtos vinculados:</strong> {steps.find((step) => step.id === selectedStepId)?.products.map((product) => <span key={product.product_id} className="ml-2"><Link href={`/dashboard/products/${product.product_id}`} className="underline">{product.name}</Link>{product.blocked_ids.length > 0 ? ` · bloqueadas: ${product.blocked_ids.map((id) => [...(steps.find((step) => step.id === selectedStepId)?.definition.colors ?? []), ...(steps.find((step) => step.id === selectedStepId)?.definition.options ?? [])].find((choice) => choice.id === id)?.label ?? id).join(', ')}` : ''}</span>) || 'Nenhum'}</div>}<button disabled={busy} onClick={() => void saveStep()} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Salvar etapa</button></section>
    </div>}
  </div>;
}

function ColorRow({ color, colors, busy, save, remove, replace }: {
  color: Color; colors: Color[]; busy: boolean;
  save: (color: Color, patch: Partial<Color>) => Promise<void>;
  remove: (color: Color, withoutReplacement: boolean) => Promise<void>;
  replace: (color: Color, target: Color) => Promise<void>;
}) {
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.hex);
  const [targetId, setTargetId] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => { setName(color.name); setHex(color.hex); }, [color.name, color.hex]);
  const fresh = color.recent;
  const used = color.productCount > 0 || color.stepCount > 0 || color.presetCount > 0;
  const target = colors.find((item) => item.id === targetId);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-900">
    <div className="flex flex-wrap items-start gap-3"><span className="h-11 w-11 shrink-0 rounded-full border" style={{ backgroundColor: color.hex }} /><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${color.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{color.active ? 'Disponível' : 'Indisponível'}</span>{fresh && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">Nova</span>}</div><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px_auto]"><input aria-label={`Nome de ${color.name}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} className={inputClass} /><input aria-label={`Hexadecimal de ${color.name}`} value={hex} onChange={(event) => setHex(event.target.value.toUpperCase())} className={inputClass} /><button disabled={busy || name === color.name && hex === color.hex} onClick={() => void save(color, { name, hex })} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Salvar</button></div></div><button disabled={busy} onClick={() => void save(color, { active: !color.active })} className={`rounded-lg px-3 py-2 text-xs font-bold ${color.active ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{color.active ? 'Inativar' : 'Ativar'}</button></div>
    <p className="mt-3 text-xs text-slate-500">{color.productCount} produto(s) · {color.stepCount} etapa(s) · {color.presetCount} grupo(s)</p>
    {color.products.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer text-pink-700">Ver produtos afetados</summary><div className="mt-2 flex flex-wrap gap-2">{color.products.map((product) => <Link key={product.id} href={`/dashboard/products/${product.id}`} className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700 underline">{product.name}</Link>)}</div></details>}
    {color.steps.length > 0 && <p className="mt-2 text-xs text-slate-500">Etapas: {color.steps.map((step) => step.name).join(', ')}</p>}
    {color.presets.length > 0 && <p className="mt-2 text-xs text-slate-500">Grupos: {color.presets.map((group) => group.name).join(', ')}</p>}
    <div className="mt-4 border-t border-slate-100 pt-3"><button disabled={busy} onClick={() => { setTargetId(''); setDeleteOpen(true); }} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Excluir cor</button></div>
    {deleteOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label={`Excluir ${color.name}`} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center gap-3"><span className="h-12 w-12 rounded-full border" style={{ backgroundColor: color.hex }} /><div><h3 className="text-lg font-bold">Excluir “{color.name}”?</h3><p className="text-xs text-slate-500">{color.hex} · {color.productCount} produto(s), {color.stepCount} etapa(s), {color.presetCount} grupo(s)</p></div></div>
        {used ? <><p className="mt-4 text-sm text-slate-700 dark:text-slate-200">Esta cor está em uso. Você pode substituí-la por uma cor ativa para manter as opções nos produtos, ou removê-la sem substituição. Nesse caso, variações comerciais afetadas ficam inativas e escolhas da cor são retiradas das etapas.</p>
          <label className="mt-4 block text-sm font-semibold">Substituir por
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className={`${inputClass} mt-1`}><option value="">Escolha a nova cor</option>{colors.filter((item) => item.id !== color.id && item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.hex}</option>)}</select>
          </label><div className="mt-5 flex flex-wrap gap-2"><button disabled={!target || busy} onClick={() => { if (target) { setDeleteOpen(false); void replace(color, target); } }} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Substituir e excluir</button><button disabled={busy} onClick={() => { if (window.confirm('Excluir sem substituição? As variações desta cor serão inativadas e poderão deixar produtos sem opções de compra.')) { setDeleteOpen(false); void remove(color, true); } }} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-40">Excluir sem substituir</button><button onClick={() => setDeleteOpen(false)} className="px-3 py-2 text-sm text-slate-600">Cancelar</button></div></>
          : <div className="mt-5 flex gap-2"><button disabled={busy} onClick={() => { setDeleteOpen(false); void remove(color, false); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Confirmar exclusão</button><button onClick={() => setDeleteOpen(false)} className="px-3 py-2 text-sm text-slate-600">Cancelar</button></div>}
      </div>
    </div>}
  </article>;
}
