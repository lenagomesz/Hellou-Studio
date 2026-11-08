'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Copy, Download, ExternalLink, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';

type Theme = 'product' | 'poll' | 'gift' | 'behind_scenes' | 'decor' | 'seasonal' | 'promotion';
type Schedule = { id: string; weekday: number; local_time: string; theme: Theme; enabled: boolean };
type Post = { id: string; theme: Theme; caption: string; image_url: string | null; product_name: string | null; product_price: number | null; product_url: string | null; product_available: boolean; price_changed: boolean; status: 'draft' | 'scheduled' | 'ready' | 'published'; scheduled_at: string | null; published_at: string | null };
type CatalogItem = { id: string; name: string; image_url: string };
type Data = { channelUrl: string; posts: Post[]; schedule: Schedule[]; catalog: CatalogItem[] };

const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const themes: Record<Theme, string> = { product: 'Produto ou novidade', poll: 'Enquete', gift: 'Kits e presentes', behind_scenes: 'Bastidores', decor: 'Decoração e organização', seasonal: 'Sazonal', promotion: 'Promoção cadastrada' };
const statuses = { draft: 'Rascunho', scheduled: 'Programada', ready: 'Pronta para publicar', published: 'Publicada manualmente' };
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem horário';

export default function WhatsAppChannelPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [asOf, setAsOf] = useState(0);
  const [filter, setFilter] = useState<'all' | Post['status']>('all');
  const [newProduct, setNewProduct] = useState('');
  const [newTheme, setNewTheme] = useState<Theme>('product');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [postDates, setPostDates] = useState<Record<string, string>>({});
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, Schedule>>({});

  const reload = useCallback(async () => {
    const response = await fetch('/api/admin/whatsapp-channel', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar a central.');
    setData(result);
    setAsOf(Date.now());
    setScheduleDrafts(Object.fromEntries((result.schedule as Schedule[]).map((row) => [row.weekday, row])));
  }, []);

  useEffect(() => { reload().catch((cause) => setError(cause.message)); }, [reload]);

  async function act(method: 'POST' | 'PATCH', payload: Record<string, unknown>, key: string) {
    setBusy(key); setError('');
    try {
      const response = await fetch('/api/admin/whatsapp-channel', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro inesperado.'); }
    finally { setBusy(''); }
  }

  async function downloadPhoto(post: Post) {
    if (!post.image_url) return;
    try {
      const response = await fetch(post.image_url);
      if (!response.ok) throw new Error('Imagem indisponível');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
      link.href = url; link.download = `${post.product_name ?? 'produto-hellou'}.${ext}`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { window.open(post.image_url, '_blank', 'noopener,noreferrer'); }
  }

  const counts = useMemo(() => ({ drafts: data?.posts.filter((post) => post.status === 'draft').length ?? 0, ready: data?.posts.filter((post) => post.status === 'ready').length ?? 0, published: data?.posts.filter((post) => post.status === 'published' && post.published_at && Date.parse(post.published_at) >= asOf - 30 * 86400_000).length ?? 0 }), [data, asOf]);
  const visible = data?.posts.filter((post) => filter === 'all' || post.status === filter) ?? [];
  const dueLast30 = data?.posts.filter((post) => post.scheduled_at && Date.parse(post.scheduled_at) <= asOf && Date.parse(post.scheduled_at) >= asOf - 30 * 86400_000) ?? [];
  const consistency = dueLast30.length ? Math.round(dueLast30.filter((post) => post.status === 'published').length / dueLast30.length * 100) : null;

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
    <header className="rounded-3xl bg-gradient-to-r from-[#e51683] to-[#ff812f] p-6 text-white shadow-lg sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest"><MessageCircle size={18}/> Marketing</div><h1 className="text-3xl font-bold sm:text-4xl">Canal WhatsApp</h1><p className="mt-2 max-w-2xl text-white/90">Conteúdo criado com os produtos reais da loja. Revise, copie e publique manualmente no Canal.</p></div><a href={data?.channelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-[#bd1268]"><ExternalLink size={17}/> Abrir meu Canal</a></div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-3">{[['Rascunhos', counts.drafts], ['Prontas', counts.ready], ['Publicadas nos últimos 30 dias', counts.published]].map(([label, value]) => <div key={label} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-3xl font-bold text-[#c51572]">{value}</div></div>)}</section>
    <p className="text-sm text-slate-600">Consistência dos últimos 30 dias: <strong>{consistency === null ? 'ainda sem publicações programadas vencidas' : `${consistency}% das publicações programadas registradas como publicadas`}</strong></p>

    <section className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Calendário editorial</h2><p className="text-sm text-slate-600">A geração roda diariamente, mesmo com o painel fechado. Os textos aguardam sua revisão.</p></div><button onClick={() => act('POST', { action: 'generate' }, 'generate')} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-[#e51683] px-4 py-2 font-semibold text-white disabled:opacity-50"><Sparkles size={16}/>{busy === 'generate' ? 'Gerando...' : 'Gerar próxima semana'}</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3,4,5,6].map((weekday) => { const row = scheduleDrafts[weekday] ?? { id: '', weekday, local_time: '10:00', theme: 'product' as Theme, enabled: false }; return <div key={weekday} className="rounded-2xl bg-[#fff6fa] p-4"><div className="mb-3 flex items-center justify-between"><strong>{days[weekday]}</strong><input type="checkbox" aria-label={`Ativar ${days[weekday]}`} checked={row.enabled} onChange={(event) => setScheduleDrafts((current) => ({ ...current, [weekday]: { ...row, enabled: event.target.checked } }))}/></div><label className="block text-sm">Horário<input aria-label={`Horário de ${days[weekday]}`} type="time" value={row.local_time.slice(0,5)} onChange={(event) => setScheduleDrafts((current) => ({ ...current, [weekday]: { ...row, local_time: event.target.value } }))} className="mt-1 w-full rounded-lg border p-2"/></label><label className="mt-2 block text-sm">Tema<select value={row.theme} onChange={(event) => setScheduleDrafts((current) => ({ ...current, [weekday]: { ...row, theme: event.target.value as Theme } }))} className="mt-1 w-full rounded-lg border p-2">{Object.entries(themes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button disabled={Boolean(busy)} onClick={() => act('PATCH', { action: 'schedule', weekday, localTime: row.local_time.slice(0,5), theme: row.theme, enabled: row.enabled }, `schedule-${weekday}`)} className="mt-3 text-sm font-semibold text-[#c51572]">Salvar {days[weekday]}</button></div>; })}</div>
      <p className="mt-3 text-xs text-slate-500">Horários de Brasília. A geração e os lembretes são verificados uma vez por dia.</p>
    </section>

    <section className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Criar rascunho agora</h2><div className="mt-3 flex flex-wrap gap-2"><select aria-label="Produto" value={newProduct} onChange={(event) => setNewProduct(event.target.value)} className="min-w-60 flex-1 rounded-xl border p-2"><option value="">Selecione um produto</option>{data?.catalog.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><select aria-label="Tema" value={newTheme} onChange={(event) => setNewTheme(event.target.value as Theme)} className="rounded-xl border p-2">{Object.entries(themes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button disabled={!newProduct || Boolean(busy)} onClick={() => act('POST', { action: 'draft', productId: newProduct, theme: newTheme }, 'draft')} className="rounded-xl bg-[#e51683] px-5 py-2 font-semibold text-white disabled:opacity-50">Criar com IA</button></div></section>

    <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Publicações</h2><select aria-label="Filtrar publicações" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border bg-white p-2"><option value="all">Todas</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="grid gap-5 lg:grid-cols-2">{visible.map((post) => <article key={post.id} className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm"><div className="flex items-center gap-2 border-b p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#e51683] to-[#ff812f] text-sm font-bold text-white">h</span><div><strong>helloustudio</strong><div className="text-xs text-slate-500">Prévia do Canal · {themes[post.theme]}</div></div><span className="ml-auto rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-[#c51572]">{statuses[post.status]}</span></div>
        {post.image_url && <div className="aspect-[4/3] bg-pink-50"><img src={post.image_url} alt={post.product_name ?? 'Foto do produto'} className="h-full w-full object-contain"/></div>}
        <div className="space-y-3 p-5"><div className="flex flex-wrap justify-between gap-2"><strong>{post.product_name ?? themes[post.theme]}</strong>{post.product_price != null && <strong className="text-[#c51572]">{money(post.product_price)}</strong>}</div>{!post.product_available && <p className="text-sm text-amber-700">Produto fora do catálogo ativo. Confira antes de publicar.</p>}{post.price_changed && <p className="text-sm text-amber-700">O preço mudou. Regenere a legenda antes de aprovar.</p>}<textarea aria-label={`Legenda de ${post.product_name ?? post.id}`} value={drafts[post.id] ?? post.caption} onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))} disabled={post.status === 'published'} rows={6} className="w-full rounded-xl border border-pink-100 p-3 text-sm leading-relaxed"/><div className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14}/>{dateTime(post.scheduled_at)}</div>
          {post.status !== 'published' && <label className="block text-xs text-slate-600">Programar para<input aria-label={`Programar ${post.product_name ?? post.id}`} type="datetime-local" value={postDates[post.id] ?? (post.scheduled_at ? new Date(new Date(post.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : '')} onChange={(event) => setPostDates((current) => ({ ...current, [post.id]: event.target.value }))} className="mt-1 block rounded-lg border p-2 text-sm"/></label>}
          <div className="flex flex-wrap gap-2">{post.status !== 'published' && <><button onClick={() => act('PATCH', { action: 'edit', id: post.id, caption: drafts[post.id] ?? post.caption }, post.id)} disabled={Boolean(busy)} className="rounded-lg border px-3 py-2 text-sm">Salvar texto</button><button onClick={() => act('PATCH', { action: 'regenerate', id: post.id }, post.id)} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><RefreshCw size={14}/> Regenerar</button><button onClick={() => act('PATCH', { action: 'approve', id: post.id, scheduledAt: postDates[post.id] ? new Date(postDates[post.id]).toISOString() : post.scheduled_at }, post.id)} disabled={Boolean(busy) || (!postDates[post.id] && !post.scheduled_at) || !post.product_available || post.price_changed} className="inline-flex items-center gap-1 rounded-lg bg-[#e51683] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={14}/> Aprovar</button></>}
            <button onClick={() => navigator.clipboard.writeText(drafts[post.id] ?? post.caption)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Copy size={14}/> Copiar</button>{post.image_url && <button onClick={() => downloadPhoto(post)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Download size={14}/> Foto</button>}{post.product_url && <a href={post.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><ExternalLink size={14}/> Produto</a>}{post.status !== 'published' && <button onClick={() => { if (window.confirm('Você já publicou este conteúdo no Canal do WhatsApp?')) act('PATCH', { action: 'publish', id: post.id }, post.id); }} disabled={Boolean(busy) || !['ready','scheduled'].includes(post.status)} className="rounded-lg border border-green-300 px-3 py-2 text-sm text-green-800 disabled:opacity-50">Já publiquei</button>}</div>
        </div></article>)}{visible.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-600">Nenhuma publicação nesta lista. Gere a próxima semana ou crie um rascunho.</p>}</div>
    </section>
  </main>;
}
