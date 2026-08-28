'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analyzeSTL, MAX_STL_ANALYSIS_BYTES, STL_BASIC_MESSAGE, type STLAnalysis } from '@/lib/stl-analysis';

export function STLAnalysisPanel({ file, authenticated }: { file: File; authenticated: boolean }) {
  const [unit, setUnit] = useState<'mm' | 'cm' | 'in'>('mm');
  const [result, setResult] = useState<{ analysis: STLAnalysis; message: string; aiGenerated: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(''); setBusy(true);
    async function run() {
      try {
        if (!file.name.toLowerCase().endsWith('.stl') || file.size > MAX_STL_ANALYSIS_BYTES) throw new Error('Para pré-análise, selecione um STL de até 3 MB.');
        const buffer = await file.arrayBuffer();
        if (controller.signal.aborted) return;
        const analysis = analyzeSTL(buffer, unit);
        setResult({ analysis, message: STL_BASIC_MESSAGE, aiGenerated: false });
        if (!authenticated) return;
        const { format, triangles, dimensionsMm, closedMesh, volumeCm3 } = analysis;
        const response = await fetch('/api/shop/ai/stl-analysis', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, triangles, dimensionsMm, closedMesh, volumeCm3 }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Orientação por IA indisponível.');
        if (!controller.signal.aborted) {
          setResult({ analysis, message: data.message || STL_BASIC_MESSAGE, aiGenerated: data.aiGenerated === true });
          if (data.notice) setError(data.notice);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Não foi possível concluir a pré-análise.');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void run();
    return () => controller.abort();
  }, [file, authenticated, unit]);
  return <section className="mt-4 space-y-3 rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-slate-800">
    <h4 className="font-bold">Pré-análise instantânea do STL</h4>
    <p className="text-xs">Até 3 MB e 50 mil triângulos. A geometria é calculada no seu navegador, sem enviar o arquivo. Ao entrar na conta, somente o resumo das medidas é enviado para orientação por IA.</p>
    {!authenticated && <Link className="text-pink-700 underline" href="/login?callbackUrl=/request-print">Entre na sua conta para receber orientação por IA</Link>}
      <label className="flex items-center gap-2">Unidade do modelo
        <select value={unit} onChange={e => setUnit(e.target.value as 'mm' | 'cm' | 'in')} className="rounded border bg-white p-2"><option value="mm">Milímetros</option><option value="cm">Centímetros</option><option value="in">Polegadas</option></select>
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
  </section>;
}
