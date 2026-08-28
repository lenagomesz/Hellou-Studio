'use client';

import { useState } from 'react';
export function TestimonialSummary() {
  const [source, setSource] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ summary: string; reviewNote: string } | null>(null);
  const [copied, setCopied] = useState(false);
  async function generate() {
    setBusy(true); setError(''); setResult(null); setCopied(false);
    try {
      const response = await fetch('/api/admin/ai/testimonial-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, consent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao resumir'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-pink-200 bg-white p-6 text-slate-900">
    <h2 className="text-xl font-bold">Resumir depoimento real</h2>
    <p className="text-sm text-slate-600">Cole o feedback do cliente sem nome, telefone, endereço ou número do pedido. O texto será enviado ao Gemini para gerar uma paráfrase; não será publicado nem salvo como avaliação.</p>
    <label className="block text-sm">Depoimento original<textarea value={source} onChange={e => { setSource(e.target.value); setResult(null); }} rows={5} maxLength={5000} className="mt-1 w-full rounded-xl border p-3" /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /> Tenho autorização para usar o depoimento e removi os dados pessoais antes de enviar à IA.</label>
    <button type="button" disabled={busy || !consent || source.trim().length < 15} onClick={generate} className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Resumindo...' : 'Gerar resumo para revisão'}</button>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {result && <div className="space-y-3 rounded-xl bg-pink-50 p-4" aria-live="polite">
      <p className="text-xs font-bold uppercase text-pink-600">Resumo editorial — não é citação literal</p>
      <p>{result.summary}</p><p className="text-xs text-slate-600">{result.reviewNote}</p>
      <p className="text-xs">Compare com o original antes de usar. Não transforme o resumo em nota, selo de compra verificada ou garantia.</p>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`Resumo editorial: ${result.summary}`); setCopied(true); } catch { setError('Não foi possível copiar. Selecione o texto manualmente.'); } }} className="text-sm font-semibold text-pink-700 underline">{copied ? 'Copiado' : 'Copiar resumo revisado'}</button>
    </div>}
  </section>;
}
