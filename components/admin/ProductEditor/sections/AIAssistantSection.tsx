'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useProductEditor } from '../hooks/useProductEditor';
import type { ProductContent } from '@/lib/ai/product-content';
import type { CatalogCalculation } from '@/lib/catalog-assistant';

const field = 'w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-slate-900';
type Suggestion = { content: ProductContent; imageUrls: string[]; calculation: CatalogCalculation | null };

export function AIAssistantSection() {
  const { state, dispatch } = useProductEditor();
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [includePrice, setIncludePrice] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [filament, setFilament] = useState(100);
  const [overwrite, setOverwrite] = useState(false);

  async function generate() {
    setBusy(true); setError(''); setSuggestion(null); setNotice('');
    try {
      const response = await fetch('/api/admin/ai/product-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords || state.name, description: state.description,
          imageUrl: state.images[0] || undefined,
          ...(includePrice ? { pricing: { weightGrams: state.weightGrams, hours, minutes, filamentPricePerKg: filament } } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar');
      setSuggestion(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha na geração'); }
    finally { setBusy(false); }
  }

  function apply() {
    if (!suggestion) return;
    const c = suggestion.content;
    for (const [key, value] of [['name', c.title], ['description', c.description], ['seoTitle', c.seo_title], ['seoDescription', c.seo_description]] as const) {
      if (overwrite || !state[key].trim()) dispatch({ type: 'SET_FIELD', field: key, value });
    }
    dispatch({ type: 'SET_FIELD', field: 'seoKeywords', value: [...new Set([...state.seoKeywords.filter(Boolean), ...c.keywords])].slice(0, 20) });
    const alts = { ...state.imageAltTexts };
    for (const alt of c.image_alts) {
      const url = suggestion.imageUrls[alt.index];
      if (state.images.includes(url) && (overwrite || !alts[url])) alts[url] = alt.text;
    }
    dispatch({ type: 'SET_FIELD', field: 'imageAltTexts', value: alts });
    setSuggestion(null);
    setNotice('Sugestão aplicada ao formulário. Confira os campos e salve o produto para publicar. O preço só muda no botão específico.');
  }

  return <section className="space-y-4 rounded-2xl border border-pink-200 bg-pink-50/60 p-5 dark:bg-pink-950/20">
    <h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-pink-600" /> Cadastro com Gemini <span className="text-xs font-normal">opcional</span></h2>
    <p className="text-sm text-slate-600 dark:text-slate-300">Envie a foto em “Imagens do produto” e/ou escreva poucas palavras. Revise a sugestão antes de salvar. O cadastro manual continua disponível abaixo.</p>
    <label className="block space-y-1 text-sm">Palavras-chave e fatos confirmados
      <textarea value={keywords} onChange={e => setKeywords(e.target.value)} maxLength={1000} rows={2} placeholder="Lula articulada, roxo e rosa, ímã. Material: PLA (se confirmado)." className={field} />
    </label>
    <p className="text-xs text-slate-500">{state.images[0] ? 'A capa atual será analisada pelo Gemini.' : 'Sem foto: a sugestão usará somente os dados informados.'}</p>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includePrice} onChange={e => setIncludePrice(e.target.checked)} /> Calcular também uma sugestão de preço</label>
    {includePrice && <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-xs">Peso real (g)<input type="number" min={1} max={100000} value={state.weightGrams || ''} onChange={e => dispatch({ type: 'SET_FIELD', field: 'weightGrams', value: Number(e.target.value) })} className={field} /></label>
        <label className="text-xs">Horas<input type="number" min={0} max={1000} value={hours} onChange={e => setHours(Number(e.target.value))} className={field} /></label>
        <label className="text-xs">Minutos<input type="number" min={0} max={59} value={minutes} onChange={e => setMinutes(Number(e.target.value))} className={field} /></label>
        <label className="text-xs">Filamento (R$/kg)<input type="number" min={1} max={10000} value={filament} onChange={e => setFilament(Number(e.target.value))} className={field} /></label>
      </div>
      <p className="text-xs text-slate-500">Usa a fórmula atual da loja: filamento + R$ 1,20/h + embalagem de 10% do filamento; multiplicador 2,1 e arredondamento comercial. Não inclui frete, impostos ou taxas de pagamento.</p>
    </div>}
    <button type="button" disabled={busy} onClick={generate} className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Gerando sugestão...' : 'Gerar ficha com IA'}</button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {suggestion && <div className="space-y-3 rounded-xl border border-pink-200 bg-white p-4 text-slate-900">
      <h3 className="font-bold">{suggestion.content.title}</h3>
      <p className="whitespace-pre-wrap text-sm">{suggestion.content.description}</p>
      <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-blue-700">{suggestion.content.seo_title}</p><p>{suggestion.content.seo_description}</p></div>
      <p className="text-xs">Palavras-chave: {suggestion.content.keywords.join(', ')}</p>
      {suggestion.content.image_alts.map(alt => <p key={alt.index} className="text-xs">Alt da capa: {alt.text}</p>)}
      {suggestion.calculation && <div className="text-sm"><p>Preço sugerido: R$ {suggestion.calculation.valor_sugerido.toFixed(2)} · custo calculado: R$ {suggestion.calculation.custo_total.toFixed(2)}</p>
        <button type="button" className="mt-1 text-pink-700 underline" onClick={() => { dispatch({ type: 'SET_FIELD', field: 'basePrice', value: suggestion.calculation!.valor_sugerido }); setNotice('Preço aplicado ao formulário; salve para confirmar.'); }}>Aplicar somente este preço</button></div>}
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} /> Substituir também os textos já preenchidos (nome, descrição, SEO e alt)</label>
      <div className="flex gap-3"><button type="button" onClick={apply} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{overwrite ? 'Aplicar textos revisados' : 'Preencher campos vazios'}</button><button type="button" onClick={() => setSuggestion(null)} className="text-sm">Descartar</button></div>
    </div>}
  </section>;
}
