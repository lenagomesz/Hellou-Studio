'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Job = { product_id: string; attempts: number; available_at: string; last_error: string | null; products: { name: string } | null };
export default function ProductSEOPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [configured, setConfigured] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [quotaMessage, setQuotaMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/admin/ai/product-seo');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setJobs(data.jobs); setTotal(data.total); setConfigured(data.configured);
    setPausedUntil(data.pausedUntil); setQuotaMessage(data.quotaMessage || '');
  }
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!pausedUntil) return;
    const timer = window.setTimeout(() => { refresh().catch(e => setError(e.message)); }, Math.max(1000, Date.parse(pausedUntil) - Date.now() + 1000));
    return () => window.clearTimeout(timer);
  }, [pausedUntil]);
  async function runBatch() {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/ai/product-seo', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.pausedUntil) {
        setMessage(data.message || 'Gerações pausadas por cota. Os produtos continuam na fila.');
        await refresh();
        return;
      }
      const updated = data.results.filter((r: { status: string }) => r.status === 'updated').length;
      const skipped = data.results.reduce((n: number, r: { skippedImages?: number }) => n + (r.skippedImages ?? 0), 0);
      setMessage(data.processed ? `${updated} de ${data.processed} produtos atualizados. ${skipped ? `${skipped} imagens não puderam ser analisadas; confira os textos alternativos manualmente.` : 'Textos manuais preservados.'}` : 'Nenhum item disponível agora. Confira as tentativas e os horários abaixo.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha no processamento'); }
    finally { setBusy(false); }
  }
  async function retry(id: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/ai/product-seo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao reenviar'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-6">
    <Link href="/dashboard/products" className="text-sm text-pink-600">← Produtos</Link>
    <h1 className="text-3xl font-bold">SEO do catálogo com Gemini</h1>
    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">Produtos novos e existentes entram na fila. A IA preenche campos vazios e atualiza o que ela própria escreveu; textos manuais, URLs, preços e status de publicação são mantidos. As imagens precisam estar no armazenamento da loja para a análise visual.</p>
    <div className="rounded-2xl border border-pink-200 bg-pink-50 p-5 text-slate-900">
      <p className="text-2xl font-bold">{total} produtos pendentes</p>
      <p className="my-3 text-sm">Cada lote processa até 3 produtos e consome a cota da API. O processamento diário retoma a fila automaticamente. Produtos salvos no editor têm processamento imediato em segundo plano.</p>
      <button type="button" disabled={busy || !configured || !total || Boolean(pausedUntil)} onClick={runBatch} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{pausedUntil ? 'Aguardando renovação da cota' : busy ? 'Gerando SEO...' : 'Processar próximo lote'}</button>
      {quotaMessage && <p role="status" className="mt-3 text-sm text-amber-800">{quotaMessage} Os itens serão retomados na próxima execução disponível; a falta de cota não conta como falha do produto.</p>}
      {!configured && <p className="mt-2 text-sm">Configure a chave do Gemini no servidor para ativar.</p>}
    </div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <ul className="space-y-3">{jobs.map(job => <li key={job.product_id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <Link className="font-semibold text-pink-600" href={`/dashboard/products/${job.product_id}/edit`}>{job.products?.name || 'Produto'}</Link>
      <p className="mt-1 text-xs text-gray-500">{job.attempts >= 3 ? 'Requer revisão: 3 tentativas. Corrija a configuração e reenvie este item.' : `Tentativas: ${job.attempts}/3 · disponível a partir de ${new Date(job.available_at).toLocaleString('pt-BR')}`}</p>
      {job.last_error && <p className="mt-1 text-xs text-amber-700">{job.last_error}</p>}
      {job.attempts >= 3 && <button type="button" disabled={busy} onClick={() => retry(job.product_id)} className="mt-2 text-xs text-pink-600 underline">Reenviar para a fila</button>}
    </li>)}</ul>
    {total > jobs.length && <p className="text-xs">Mostrando os primeiros {jobs.length} da fila.</p>}
  </main>;
}
