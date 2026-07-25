'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Entity = 'returns' | 'pages' | 'fiscal';
type Item = Record<string, unknown> & { id: string };
const entities: { id: Entity; label: string }[] = [
  { id: 'returns', label: 'Trocas e devoluções' },
  { id: 'pages', label: 'Páginas institucionais' },
  { id: 'fiscal', label: 'Documentos fiscais' },
];
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';

export default function OperationsPage() {
  const [entity, setEntity] = useState<Entity>('returns');
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/operations?entity=${entity}`, { cache: 'no-store' });
    const data = await response.json();
    setItems(data.items ?? []);
    if (!response.ok) setMessage(data.error);
  }, [entity]);
  useEffect(() => { load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form.entries());
    body.published = form.get('published') === 'on';
    const response = await fetch(`/api/admin/operations?entity=${entity}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    setMessage(response.ok ? 'Registro criado com sucesso.' : data.error);
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/operations?entity=${entity}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    await load();
  }

  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.2em] text-pink-600">Fase 2</p><h1 className="mt-1 text-3xl font-black">Operações avançadas</h1><p className="mt-2 text-sm text-slate-500">Pós-venda, conteúdo institucional e emissão fiscal manual ou integrada.</p></div>
    <div className="flex flex-wrap gap-2">{entities.map((tab) => <button key={tab.id} onClick={() => setEntity(tab.id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${entity === tab.id ? 'bg-pink-600 text-white' : 'border bg-white dark:bg-slate-900'}`}>{tab.label}</button>)}</div>
    {message && <p className="rounded-xl bg-pink-50 px-4 py-3 text-sm text-pink-800 dark:bg-pink-950/30 dark:text-pink-200">{message}</p>}
    <form onSubmit={create} className="grid gap-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:grid-cols-2">
      {entity === 'returns' && <><input name="order_id" required placeholder="ID do pedido" className={field}/><select name="kind" className={field}><option value="return">Devolução</option><option value="exchange">Troca</option><option value="refund">Reembolso</option></select><input name="reason" required placeholder="Motivo" className={field}/><input name="amount" type="number" min="0" step=".01" placeholder="Valor opcional" className={field}/></>}
      {entity === 'pages' && <><input name="title" required placeholder="Título" className={field}/><input name="slug" required placeholder="slug-da-pagina" className={field}/><input name="excerpt" placeholder="Resumo" className={`${field} sm:col-span-2`}/><textarea name="content" required rows={7} placeholder="Conteúdo" className={`${field} sm:col-span-2`}/><input name="seo_title" placeholder="Título SEO" className={field}/><input name="seo_description" placeholder="Descrição SEO" className={field}/><label className="flex items-center gap-2 text-sm font-bold"><input name="published" type="checkbox"/> Publicar</label></>}
      {entity === 'fiscal' && <><input name="order_id" required placeholder="ID do pedido" className={field}/><select name="document_type" className={field}><option value="nfe">NF-e</option><option value="nfse">NFS-e</option><option value="receipt">Recibo</option></select><input name="provider" defaultValue="manual" placeholder="Provedor" className={field}/></>}
      <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-pink-600 dark:bg-white dark:text-slate-950 sm:col-span-2">Adicionar</button>
    </form>
    <section className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-white/10 dark:border-white/10 dark:bg-slate-950">
      {items.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhum registro.</p> : items.map((item) => <div key={item.id} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{String(item.title || item.reason || item.document_type || item.id)}</p><p className="mt-1 text-xs text-slate-500">{entity === 'pages' ? `/pages/${String(item.slug)}` : `Pedido: ${String(item.order_id || '—')}`}</p></div>{entity === 'pages' ? <span className="text-xs font-bold">{item.published ? 'Publicado' : 'Rascunho'}</span> : <select value={String(item.status)} onChange={(e) => setStatus(item.id, e.target.value)} className={field}>{(entity === 'returns' ? ['requested','reviewing','approved','rejected','received','refunded','cancelled'] : ['pending','processing','issued','cancelled','error']).map((status) => <option key={status}>{status}</option>)}</select>}</div>)}
    </section>
  </div>;
}
