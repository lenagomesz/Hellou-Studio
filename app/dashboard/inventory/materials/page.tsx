'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Box, Droplets, PackagePlus, Plus, Save, Scale, Trash2, X } from 'lucide-react';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface Material {
  id: string;
  name: string;
  material_type: string;
  brand: string | null;
  color_name: string;
  color_hex: string;
  spool_weight_grams: number;
  current_weight_grams: number;
  reserved_weight_grams: number;
  reorder_point_grams: number;
  target_weight_grams: number;
  cost_per_kg: number;
  priority: Priority;
  notes: string | null;
}

const PRIORITY: Record<Priority, { label: string; className: string }> = {
  urgent: { label: 'Urgente', className: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300' },
  high: { label: 'Alta', className: 'bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-300' },
  normal: { label: 'Normal', className: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300' },
  low: { label: 'Baixa', className: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300' },
};

const initialForm = {
  name: '', material_type: 'PLA', brand: '', color_name: '', color_hex: '#ec4899',
  spool_weight_grams: 1000, current_weight_grams: 1000, reserved_weight_grams: 0,
  reorder_point_grams: 250, cost_per_kg: 0, priority: 'normal' as Priority, notes: '',
  target_weight_grams: 1000,
};

function formatWeight(value: number) {
  return value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : `${value} g`;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/inventory/materials', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar materiais');
      setMaterials(data.materials ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  const summary = useMemo(() => {
    const total = materials.reduce((sum, item) => sum + item.current_weight_grams, 0);
    const reserved = materials.reduce((sum, item) => sum + item.reserved_weight_grams, 0);
    const critical = materials.filter((item) => item.current_weight_grams - item.reserved_weight_grams <= item.reorder_point_grams).length;
    const value = materials.reduce((sum, item) => sum + (item.current_weight_grams / 1000) * item.cost_per_kg, 0);
    const needed = materials.reduce((sum, item) => sum + Math.max(0, item.target_weight_grams - Math.max(0, item.current_weight_grams - item.reserved_weight_grams)), 0);
    return { total, reserved, critical, value, needed };
  }, [materials]);

  async function createMaterial(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/inventory/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar material');
      setMaterials((current) => [data.material, ...current]);
      setForm(initialForm);
      setShowForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao cadastrar material');
    } finally {
      setSaving(false);
    }
  }

  async function updateMaterial(id: string, updates: Partial<Material>) {
    const response = await fetch('/api/admin/inventory/materials', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }),
    });
    if (response.ok) {
      const data = await response.json();
      setMaterials((current) => current.map((item) => item.id === id ? { ...item, ...data.material } : item));
    }
  }

  async function archiveMaterial(id: string) {
    if (!window.confirm('Arquivar este material?')) return;
    const response = await fetch('/api/admin/inventory/materials', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    if (response.ok) setMaterials((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/inventory" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-pink-600"><ArrowLeft className="h-3.5 w-3.5" /> Estoque</Link>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Produção sob demanda</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Materiais e filamentos</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Controle cores, peso disponível, reserva para pedidos pagos e prioridade de compra sem misturar insumo com produto pronto.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-pink-600 dark:bg-white dark:text-slate-950"><Plus className="h-4 w-4" /> Novo material</button>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Material disponível', value: formatWeight(summary.total - summary.reserved), detail: `${formatWeight(summary.total)} físico`, icon: Scale, tone: 'text-pink-600 bg-pink-50 dark:bg-pink-500/10' },
          { label: 'Reservado em pedidos', value: formatWeight(summary.reserved), detail: 'não usar em novos trabalhos', icon: PackagePlus, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Compra prioritária', value: String(summary.critical), detail: 'cores no ponto de reposição', icon: AlertTriangle, tone: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10' },
          { label: 'Valor em material', value: summary.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), detail: 'custo atual aproximado', icon: Box, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="h-5 w-5" /></div>
            <p className="mt-4 text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-bold">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Visão operacional</p><h2 className="mt-1 text-xl font-bold">Tenho, reservei e preciso comprar</h2></div><span className="text-xs text-slate-400">{formatWeight(summary.needed)} na lista de compras</span></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5"><div className="flex items-center justify-between"><h3 className="font-bold text-emerald-900 dark:text-emerald-200">Tenho em mãos</h3><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-white/10 dark:text-emerald-300">{formatWeight(summary.total)}</span></div><div className="mt-3 space-y-2">{materials.slice(0,6).map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 dark:bg-white/5"><span className="h-7 w-7 rounded-lg border-2 border-white shadow" style={{backgroundColor:item.color_hex}}/><span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.color_name}</span><span className="text-xs font-bold">{formatWeight(item.current_weight_grams)}</span></div>)}</div></div>
          <div className="rounded-[22px] border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/20 dark:bg-violet-500/5"><div className="flex items-center justify-between"><h3 className="font-bold text-violet-900 dark:text-violet-200">Reservado para pedidos</h3><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-violet-700 dark:bg-white/10 dark:text-violet-300">{formatWeight(summary.reserved)}</span></div><div className="mt-3 space-y-2">{materials.filter((item)=>item.reserved_weight_grams>0).slice(0,6).map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 dark:bg-white/5"><span className="h-7 w-7 rounded-lg border-2 border-white shadow" style={{backgroundColor:item.color_hex}}/><span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.color_name}</span><span className="text-xs font-bold">{formatWeight(item.reserved_weight_grams)}</span></div>)}{materials.every((item)=>item.reserved_weight_grams===0)&&<p className="py-6 text-center text-xs text-violet-700/60 dark:text-violet-300/60">Nenhum material reservado.</p>}</div></div>
          <div className="rounded-[22px] border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-500/20 dark:bg-orange-500/5"><div className="flex items-center justify-between"><h3 className="font-bold text-orange-900 dark:text-orange-200">Preciso comprar</h3><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-orange-700 dark:bg-white/10 dark:text-orange-300">{formatWeight(summary.needed)}</span></div><div className="mt-3 space-y-2">{materials.filter((item)=>item.target_weight_grams>Math.max(0,item.current_weight_grams-item.reserved_weight_grams)).slice(0,6).map((item) => {const need=Math.max(0,item.target_weight_grams-Math.max(0,item.current_weight_grams-item.reserved_weight_grams));return <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 dark:bg-white/5"><span className="h-7 w-7 rounded-lg border-2 border-white shadow" style={{backgroundColor:item.color_hex}}/><span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.color_name}</span><span className="text-xs font-bold text-orange-700 dark:text-orange-300">+ {formatWeight(need)}</span></div>})}{summary.needed===0&&<p className="py-6 text-center text-xs text-orange-700/60 dark:text-orange-300/60">Lista de compras em dia.</p>}</div></div>
        </div>
      </section>

      <section className="rounded-[24px] border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10"><div><h2 className="font-bold">Mapa de cores</h2><p className="text-xs text-slate-500">Ordenado pelo que exige atenção primeiro</p></div><span className="text-xs font-semibold text-slate-400">{materials.length} materiais</span></div>
        {loading ? <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />)}</div> : materials.length === 0 ? (
          <div className="px-5 py-16 text-center"><Droplets className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold">Cadastre o primeiro rolo de filamento</p><p className="mt-1 text-xs text-slate-500">Depois você poderá reservar peso para a fila de produção.</p></div>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {[...materials].sort((a, b) => (a.current_weight_grams - a.reserved_weight_grams - a.reorder_point_grams) - (b.current_weight_grams - b.reserved_weight_grams - b.reorder_point_grams)).map((item) => {
              const available = Math.max(0, item.current_weight_grams - item.reserved_weight_grams);
              const percentage = Math.min(100, Math.round((item.current_weight_grams / item.spool_weight_grams) * 100));
              const needsPurchase = available <= item.reorder_point_grams;
              return (
                <article key={item.id} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${needsPurchase ? 'border-orange-300 bg-orange-50/30 dark:border-orange-500/30 dark:bg-orange-500/5' : 'border-black/5 dark:border-white/10'}`}>
                  <div className="flex items-start gap-3"><span className="h-12 w-12 shrink-0 rounded-2xl border-4 border-white shadow-md dark:border-slate-700" style={{ backgroundColor: item.color_hex }} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-bold">{item.color_name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${PRIORITY[item.priority].className}`}>{PRIORITY[item.priority].label}</span></div><p className="truncate text-xs text-slate-500">{item.material_type} · {item.brand || item.name}</p></div><button onClick={() => archiveMaterial(item.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-5 flex items-end justify-between"><div><p className="text-2xl font-bold">{formatWeight(available)}</p><p className="text-[11px] text-slate-400">disponível de {formatWeight(item.current_weight_grams)}</p></div>{needsPurchase && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Comprar agora</span>}</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full ${needsPurchase ? 'bg-orange-500' : 'bg-gradient-to-r from-pink-500 to-orange-400'}`} style={{ width: `${percentage}%` }} /></div>
                  <div className="mt-4 grid grid-cols-3 gap-2"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tenho<input type="number" defaultValue={item.current_weight_grams} onBlur={(event) => updateMaterial(item.id, { current_weight_grams: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-2 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5" /></label><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reservado<input type="number" defaultValue={item.reserved_weight_grams} onBlur={(event) => updateMaterial(item.id, { reserved_weight_grams: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-2 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5" /></label><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meta<input type="number" defaultValue={item.target_weight_grams} onBlur={(event) => updateMaterial(item.id, { target_weight_grams: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-2 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5" /></label></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={createMaterial} className="mx-auto my-8 max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl dark:bg-[#151820]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Novo insumo</p><h2 className="mt-1 text-2xl font-bold">Cadastrar filamento</h2></div><button type="button" onClick={() => setShowForm(false)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">
        {([['name','Identificação'],['brand','Marca'],['color_name','Nome da cor']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<input required={key !== 'brand'} value={form[key]} onChange={(event) => setForm({...form,[key]:event.target.value})} className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-3 dark:border-white/10 dark:bg-white/5" /></label>)}
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Material<select value={form.material_type} onChange={(event) => setForm({...form,material_type:event.target.value})} className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#151820]">{['PLA','PLA+','PETG','ABS','ASA','TPU','RESINA','OUTRO'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cor visual<input type="color" value={form.color_hex} onChange={(event) => setForm({...form,color_hex:event.target.value})} className="mt-1.5 h-12 w-full rounded-xl border border-black/10 p-1 dark:border-white/10 dark:bg-white/5" /></label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Prioridade<select value={form.priority} onChange={(event) => setForm({...form,priority:event.target.value as Priority})} className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#151820]">{Object.entries(PRIORITY).map(([value,config]) => <option key={value} value={value}>{config.label}</option>)}</select></label>
        {([['current_weight_grams','Peso atual (g)'],['reserved_weight_grams','Reservado (g)'],['target_weight_grams','Meta desejada (g)'],['reorder_point_grams','Comprar abaixo de (g)'],['cost_per_kg','Custo por kg (R$)']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<input type="number" min="0" value={form[key]} onChange={(event) => setForm({...form,[key]:Number(event.target.value)})} className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-3 dark:border-white/10 dark:bg-white/5" /></label>)}
      </div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold dark:border-white/10">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"><Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar material'}</button></div></form></div>}
    </div>
  );
}
