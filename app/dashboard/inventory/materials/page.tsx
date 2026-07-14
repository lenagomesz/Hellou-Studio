'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  Edit3,
  PackageCheck,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type ViewFilter = 'all' | 'stock' | 'buy' | 'missing';

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

const PRIORITY: Record<Priority, { label: string; badge: string; order: number }> = {
  urgent: { label: 'Urgente', badge: 'bg-red-50 text-red-700 ring-red-200', order: 4 },
  high: { label: 'Alta', badge: 'bg-orange-50 text-orange-700 ring-orange-200', order: 3 },
  normal: { label: 'Normal', badge: 'bg-blue-50 text-blue-700 ring-blue-200', order: 2 },
  low: { label: 'Baixa', badge: 'bg-slate-100 text-slate-600 ring-slate-200', order: 1 },
};

const STANDARD_COLORS = [
  { name: 'Preto', hex: '#111827' },
  { name: 'Branco', hex: '#F8FAFC' },
  { name: 'Cinza', hex: '#94A3B8' },
  { name: 'Prata', hex: '#CBD5E1' },
  { name: 'Vermelho', hex: '#DC2626' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Amarelo', hex: '#FACC15' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Roxo', hex: '#9333EA' },
  { name: 'Marrom', hex: '#92400E' },
  { name: 'Bege', hex: '#D6C5A4' },
  { name: 'Dourado', hex: '#D4A017' },
  { name: 'Transparente', hex: '#E2E8F0' },
] as const;

const emptyForm = {
  name: 'PLA Rosa', material_type: 'PLA', brand: '', color_name: 'Rosa', color_hex: '#EC4899',
  spool_weight_grams: 1000, current_weight_grams: 1000, reserved_weight_grams: 0,
  reorder_point_grams: 250, target_weight_grams: 1000, cost_per_kg: 0,
  priority: 'normal' as Priority, notes: '',
};

function formatWeight(value: number) {
  return value >= 1000
    ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
    : `${Math.max(0, Math.round(value))} g`;
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function amountToBuy(item: Material) {
  if (item.current_weight_grams > item.reorder_point_grams) return 0;
  return Math.max(0, item.target_weight_grams - item.current_weight_grams);
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [modal, setModal] = useState<'stock' | 'missing' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await fetch('/api/admin/inventory/materials', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setMaterials(data.materials ?? []);
    else setError(data.error ?? 'Erro ao carregar filamentos');
    setLoading(false);
  }, []);

  useEffect(() => { void loadMaterials(); }, [loadMaterials]);

  const purchaseList = useMemo(() => materials
    .map((item) => ({ ...item, buyAmount: amountToBuy(item) }))
    .filter((item) => item.buyAmount > 0)
    .sort((a, b) => PRIORITY[b.priority].order - PRIORITY[a.priority].order || b.buyAmount - a.buyAmount), [materials]);

  const summary = useMemo(() => {
    const totalWeight = materials.reduce((sum, item) => sum + item.current_weight_grams, 0);
    const totalValue = materials.reduce((sum, item) => sum + item.current_weight_grams / 1000 * item.cost_per_kg, 0);
    const buyWeight = purchaseList.reduce((sum, item) => sum + item.buyAmount, 0);
    const estimatedPurchase = purchaseList.reduce((sum, item) => sum + item.buyAmount / 1000 * item.cost_per_kg, 0);
    return { totalWeight, totalValue, buyWeight, estimatedPurchase, missing: materials.filter((item) => item.current_weight_grams === 0).length };
  }, [materials, purchaseList]);

  const visibleMaterials = useMemo(() => materials.filter((item) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (term && !`${item.name} ${item.brand ?? ''} ${item.color_name} ${item.material_type}`.toLocaleLowerCase('pt-BR').includes(term)) return false;
    if (filter === 'stock') return item.current_weight_grams > 0;
    if (filter === 'buy') return amountToBuy(item) > 0;
    if (filter === 'missing') return item.current_weight_grams === 0;
    return true;
  }).sort((a, b) => PRIORITY[b.priority].order - PRIORITY[a.priority].order || a.current_weight_grams - b.current_weight_grams), [filter, materials, search]);

  function openCreate(mode: 'stock' | 'missing') {
    setEditingId(null);
    setForm({ ...emptyForm, current_weight_grams: mode === 'missing' ? 0 : 1000, priority: mode === 'missing' ? 'high' : 'normal' });
    setModal(mode);
    setError('');
  }

  function openEdit(item: Material) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      material_type: item.material_type,
      brand: item.brand ?? '',
      color_name: item.color_name,
      color_hex: item.color_hex,
      spool_weight_grams: item.spool_weight_grams,
      current_weight_grams: item.current_weight_grams,
      reserved_weight_grams: 0,
      reorder_point_grams: item.reorder_point_grams,
      target_weight_grams: item.target_weight_grams,
      cost_per_kg: item.cost_per_kg,
      priority: item.priority,
      notes: item.notes ?? '',
    });
    setModal('edit');
    setError('');
  }

  async function saveMaterial(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const editing = modal === 'edit' && editingId;
    const normalizedForm = {
      ...form,
      name: form.name.trim() || `${form.material_type} ${form.color_name}`,
      reserved_weight_grams: 0,
    };
    const response = await fetch('/api/admin/inventory/materials', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editingId, ...normalizedForm } : normalizedForm),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setError(data.error ?? 'Erro ao salvar filamento');
    setMaterials((current) => editing
      ? current.map((item) => item.id === editingId ? { ...item, ...data.material } : item)
      : [data.material, ...current]);
    setModal(null);
    setMessage(editing ? 'Filamento atualizado.' : modal === 'missing' ? 'Filamento adicionado à lista de compras.' : 'Filamento cadastrado.');
    window.setTimeout(() => setMessage(''), 3000);
  }

  async function quickUpdate(id: string, updates: Partial<Material>, success?: string) {
    const response = await fetch('/api/admin/inventory/materials', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? 'Erro ao atualizar filamento');
    setMaterials((current) => current.map((item) => item.id === id ? { ...item, ...data.material } : item));
    if (success) { setMessage(success); window.setTimeout(() => setMessage(''), 3000); }
  }

  async function archiveMaterial(id: string) {
    if (!window.confirm('Arquivar este filamento? Ele sairá do estoque e da lista de compras.')) return;
    const response = await fetch('/api/admin/inventory/materials', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (response.ok) setMaterials((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-7">
      {message && <div className="fixed right-5 top-5 z-[70] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xl">{message}</div>}

      <header className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-orange-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/dashboard/inventory" className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600"><ArrowLeft className="h-3.5 w-3.5" />Estoque</Link>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Controle inteligente de materiais</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Filamentos e lista de compras</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Registre o que você tem, defina o estoque ideal e veja somente as cores que realmente precisam ser compradas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openCreate('missing')} className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-bold text-pink-700 shadow-sm transition hover:bg-pink-50"><ShoppingCart className="h-4 w-4" />Adicionar cor que não tenho</button>
            <button onClick={() => openCreate('stock')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-pink-600"><Plus className="h-4 w-4" />Cadastrar filamento</button>
          </div>
        </div>
      </header>

      {error && <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Material disponível', value: formatWeight(summary.totalWeight), detail: `${materials.filter((item) => item.current_weight_grams > 0).length} cores em mãos`, icon: Droplets, tone: 'bg-pink-50 text-pink-600' },
          { label: 'Lista de compras', value: String(purchaseList.length), detail: `${formatWeight(summary.buyWeight)} para repor`, icon: ShoppingCart, tone: 'bg-orange-50 text-orange-600' },
          { label: 'Cores que ainda não tenho', value: String(summary.missing), detail: 'adicionadas como desejo', icon: Sparkles, tone: 'bg-violet-50 text-violet-600' },
          { label: 'Compra estimada', value: money(summary.estimatedPurchase), detail: `material atual: ${money(summary.totalValue)}`, icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-600' },
        ].map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-4 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>)}
      </div>

      <section className="overflow-hidden rounded-[26px] border border-orange-200 bg-gradient-to-br from-orange-50/80 to-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-orange-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">Reposição baseada no estoque real</p><h2 className="mt-1 text-xl font-bold text-slate-950">O que preciso comprar</h2><p className="mt-1 text-xs text-slate-500">Um item entra aqui quando chega ao ponto de reposição. A quantidade completa até a meta definida.</p></div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm">{purchaseList.length} itens · {formatWeight(summary.buyWeight)}</span>
        </div>
        {purchaseList.length === 0 ? <div className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-bold text-slate-900">Lista de compras em dia</p><p className="mt-1 text-xs text-slate-500">Nenhum filamento atingiu o ponto de reposição.</p></div> : <div className="grid gap-3 p-4 lg:grid-cols-2">{purchaseList.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center"><span className="h-12 w-12 shrink-0 rounded-2xl border-4 border-white shadow-md" style={{ backgroundColor: item.color_hex }} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900">{item.color_name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${PRIORITY[item.priority].badge}`}>{PRIORITY[item.priority].label}</span>{item.current_weight_grams === 0 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Ainda não tenho</span>}</div><p className="mt-0.5 text-xs text-slate-500">{item.material_type} · {item.brand || item.name}</p><p className="mt-2 text-sm font-bold text-orange-700">Comprar {formatWeight(item.buyAmount)} <span className="font-normal text-slate-400">· aprox. {money(item.buyAmount / 1000 * item.cost_per_kg)}</span></p></div><div className="flex shrink-0 gap-2"><button onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:border-pink-300 hover:text-pink-600" title="Editar"><Edit3 className="h-4 w-4" /></button><button onClick={() => quickUpdate(item.id, { current_weight_grams: item.target_weight_grams }, `${item.color_name} marcado como comprado.`)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-600"><PackageCheck className="h-4 w-4" />Comprei</button></div></article>)}</div>}
      </section>

      <section className="rounded-[26px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1"><h2 className="font-bold text-slate-950">Todos os filamentos</h2><p className="text-xs text-slate-500">Edite cor, marca, peso, custo, meta e prioridade.</p></div>
          <div className="relative min-w-[240px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cor, marca ou material..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-pink-400" /></div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{([['all','Todos'],['stock','Tenho'],['buy','Comprar'],['missing','Não tenho']] as Array<[ViewFilter,string]>).map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${filter === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div>
        </div>
        {loading ? <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}</div> : visibleMaterials.length === 0 ? <div className="p-14 text-center"><Droplets className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Nenhum filamento encontrado</p></div> : <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">{visibleMaterials.map((item) => {
          const buy = amountToBuy(item);
          const percent = item.target_weight_grams > 0 ? Math.min(100, Math.round(item.current_weight_grams / item.target_weight_grams * 100)) : 0;
          return <article key={item.id} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${buy > 0 ? 'border-orange-200' : 'border-slate-100'}`}><div className="flex items-start gap-3"><span className="h-12 w-12 shrink-0 rounded-2xl border-4 border-white shadow-md" style={{ backgroundColor: item.color_hex }} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-bold text-slate-900">{item.color_name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${PRIORITY[item.priority].badge}`}>{PRIORITY[item.priority].label}</span></div><p className="truncate text-xs text-slate-500">{item.material_type} · {item.brand || item.name}</p></div><button onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-pink-50 hover:text-pink-600"><Edit3 className="h-4 w-4" /></button><button onClick={() => archiveMaterial(item.id)} className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div><div className="mt-5 flex items-end justify-between"><div><p className="text-2xl font-bold text-slate-950">{formatWeight(item.current_weight_grams)}</p><p className="text-[11px] text-slate-400">meta de {formatWeight(item.target_weight_grams)}</p></div><span className={`text-xs font-bold ${buy > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{buy > 0 ? `Comprar ${formatWeight(buy)}` : 'Estoque saudável'}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${buy > 0 ? 'bg-orange-500' : 'bg-gradient-to-r from-pink-500 to-orange-400'}`} style={{ width: `${percent}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">Repor em</p><p className="text-xs font-bold text-slate-700">{formatWeight(item.reorder_point_grams)}</p></div><div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">Custo/kg</p><p className="text-xs font-bold text-slate-700">{money(item.cost_per_kg)}</p></div><div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">Valor atual</p><p className="text-xs font-bold text-slate-700">{money(item.current_weight_grams / 1000 * item.cost_per_kg)}</p></div></div></article>;
        })}</div>}
      </section>

      {modal && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={saveMaterial} className="mx-auto my-8 max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">{modal === 'edit' ? 'Editar cadastro' : modal === 'missing' ? 'Lista de compras' : 'Novo material'}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{modal === 'edit' ? 'Editar filamento' : modal === 'missing' ? 'Adicionar uma cor que não tenho' : 'Cadastrar filamento'}</h2><p className="mt-1 text-xs text-slate-500">{modal === 'missing' ? 'O saldo começa zerado e o item aparece imediatamente na lista de compras.' : 'Defina o saldo real e quando deseja fazer a reposição.'}</p></div><button type="button" onClick={() => setModal(null)} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Escolha uma cor</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{STANDARD_COLORS.map((color) => {
            const selected = form.color_name === color.name && form.color_hex.toUpperCase() === color.hex;
            return <button key={color.name} type="button" onClick={() => setForm({ ...form, color_name: color.name, color_hex: color.hex, name: `${form.material_type} ${color.name}` })} className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold transition ${selected ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-100' : 'border-slate-200 text-slate-600 hover:border-pink-200'}`}><span className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: color.hex }} /><span className="truncate">{color.name}</span></button>;
          })}</div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Material<select value={form.material_type} onChange={(event) => { const material = event.target.value; setForm({...form, material_type: material, name: `${material} ${form.color_name}`}); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3">{['PLA','PLA+','PETG','ABS','ASA','TPU','RESINA','OUTRO'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Marca <span className="font-normal text-slate-400">(opcional)</span><input value={form.brand} onChange={(event) => setForm({...form,brand:event.target.value})} placeholder="Ex.: Voolt3D" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-pink-400" /></label>
          <label className="text-xs font-semibold text-slate-600">Nome da cor<input required value={form.color_name} onChange={(event) => setForm({...form,color_name:event.target.value,name:`${form.material_type} ${event.target.value}`})} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-pink-400" /></label>
          <label className="text-xs font-semibold text-slate-600">Ajustar tom<input type="color" value={form.color_hex} onChange={(event) => setForm({...form,color_hex:event.target.value})} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 p-1" /></label>
          <label className="text-xs font-semibold text-slate-600">{modal === 'missing' ? 'Quanto tenho agora (g)' : 'Peso disponível agora (g)'}<input type="number" min="0" value={form.current_weight_grams} onChange={(event) => setForm({...form,current_weight_grams:Number(event.target.value)})} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-pink-400" /></label>
          <label className="text-xs font-semibold text-slate-600">Custo por kg (R$)<input type="number" min="0" step="0.01" value={form.cost_per_kg} onChange={(event) => setForm({...form,cost_per_kg:Number(event.target.value)})} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-pink-400" /></label>
        </div>

        <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">Ajustes avançados</summary>
          <p className="mt-1 text-xs text-slate-500">Use somente quando quiser personalizar a reposição.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([['target_weight_grams','Meta que desejo ter (g)'],['reorder_point_grams','Comprar quando chegar em (g)'],['spool_weight_grams','Peso de um rolo cheio (g)']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<input type="number" min="0" value={form[key]} onChange={(event) => setForm({...form,[key]:Number(event.target.value)})} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>)}
            <label className="text-xs font-semibold text-slate-600">Prioridade<select value={form.priority} onChange={(event) => setForm({...form,priority:event.target.value as Priority})} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3">{Object.entries(PRIORITY).map(([value,config]) => <option key={value} value={value}>{config.label}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Observações<textarea rows={2} value={form.notes} onChange={(event) => setForm({...form,notes:event.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" /></label>
          </div>
        </details>

        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : modal === 'edit' ? 'Salvar alterações' : modal === 'missing' ? 'Adicionar à lista' : 'Salvar filamento'}</button></div>
      </form></div>}
    </div>
  );
}
