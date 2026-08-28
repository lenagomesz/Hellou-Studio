'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { STLAnalysis } from '@/lib/stl-analysis';

export function STLAnalysisPanel({ file, authenticated }: { file: File; authenticated: boolean }) {
  const [unit, setUnit] = useState('mm');
  const [result, setResult] = useState<{ analysis: STLAnalysis; message: string; aiGenerated: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    setResult(null); setError(''); setBusy(true);
    const form = new FormData(); form.set('file', file); form.set('unit', unit);
    fetch('/api/shop/ai/stl-analysis', { method: 'POST', body: form, signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; })
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [file, authenticated, unit]);
  return <section className="mt-4 space-y-3 rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-slate-800">
    <h4 className="font-bold">Pré-análise instantânea do STL</h4>
    <p className="text-xs">Até 3 MB e 50 mil triângulos. O arquivo é analisado no servidor; somente as medidas e o resumo geométrico são enviados ao Gemini.</p>
    {!authenticated ? <Link className="text-pink-700 underline" href="/login?callbackUrl=/request-print">Entre na sua conta para analisar</Link> : <>
      <label className="flex items-center gap-2">Unidade do modelo
        <select value={unit} onChange={e => setUnit(e.target.value)} className="rounded border bg-white p-2"><option value="mm">Milímetros</option><option value="cm">Centímetros</option><option value="in">Polegadas</option></select>
      </label>
      {busy && <p role="status">Lendo a geometria e preparando a orientação...</p>}
      {error && <p role="alert">{error} O envio para análise manual continua disponível.</p>}
      {result && <div aria-live="polite" className="space-y-2">
        <p><strong>Dimensões:</strong> {result.analysis.dimensionsMm.map(v => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })).join(' × ')} mm</p>
        <p><strong>Volume geométrico:</strong> {result.analysis.volumeCm3 === null ? 'não confiável para esta malha' : `${result.analysis.volumeCm3.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} cm³`}</p>
        <p>{result.analysis.triangles.toLocaleString('pt-BR')} triângulos · {result.analysis.closedMesh ? 'bordas verificadas' : 'malha requer revisão'}</p>
        <p className="rounded-lg bg-white p-3">{result.message}</p>
        <p className="text-xs">{result.aiGenerated ? 'Orientação gerada por IA; sujeita a revisão.' : 'Orientação básica; IA indisponível nesta análise.'}</p>
        <ul className="list-disc space-y-1 pl-4 text-xs">{result.analysis.warnings.map(w => <li key={w}>{w}</li>)}</ul>
      </div>}
    </>}
  </section>;
}
