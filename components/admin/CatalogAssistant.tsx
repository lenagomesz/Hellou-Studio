'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';

type CatalogCalculation = {
  peso_g: number;
  tempo_impressao: string;
  preco_filamento_kg: number;
  custo_filamento: number;
  custo_operacional: number;
  custo_embalagem: number;
  custo_total: number;
  multiplicador: number;
  valor_bruto: number;
  valor_sugerido: number;
};

type CatalogResult = {
  titulo: string;
  descricao_curta: string;
  descricao_completa: string;
  calculo_valor: CatalogCalculation;
  prompt_imagem: string;
  imagem_catalogo: string;
};

type Props = {
  weightGrams: string;
  filamentPricePerKg: string;
  hours: string;
  minutes: string;
  onUseSuggestedPrice: (price: number) => void;
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function ResultField({ label, children }: { label: string; children: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700">
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-gray-300">{children}</p>
    </div>
  );
}

export function CatalogAssistant({
  weightGrams,
  filamentPricePerKg,
  hours,
  minutes,
  onUseSuggestedPrice,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!image) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function selectImage(file?: File) {
    setError('');
    setResult(null);
    if (!file) return setImage(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImage(null);
      return setError('Use uma imagem JPG, PNG ou WebP.');
    }
    if (file.size > 4 * 1024 * 1024) {
      setImage(null);
      return setError('A imagem deve ter no máximo 4 MB.');
    }
    setImage(file);
  }

  async function generate() {
    if (!image) return setError('Selecione uma foto do produto.');
    if ((Number(weightGrams) || 0) <= 0 || (Number(hours) || 0) + (Number(minutes) || 0) / 60 <= 0) {
      return setError('Preencha o peso e o tempo da peça na calculadora abaixo.');
    }

    setLoading(true);
    setError('');
    setResult(null);

    const body = new FormData();
    body.append('image', image);
    body.append('name', name);
    body.append('color', color);
    body.append('weightGrams', weightGrams);
    body.append('filamentPricePerKg', filamentPricePerKg || '100');
    body.append('hours', hours);
    body.append('minutes', minutes);

    try {
      const response = await fetch('/api/admin/catalog-assistant', { method: 'POST', body });
      const data = await response.json() as CatalogResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o catálogo.');
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível gerar o catálogo.');
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!result) return;
    const calculation = result.calculo_valor;
    await navigator.clipboard.writeText(`Título\n\n${result.titulo}\n\nDescrição curta\n\n${result.descricao_curta}\n\nDescrição completa\n\n${result.descricao_completa}\n\nCálculo do valor\nPeso: ${calculation.peso_g} g\nTempo de impressão: ${calculation.tempo_impressao}\nPreço do filamento: ${money(calculation.preco_filamento_kg)}/kg\nCusto do filamento: ${money(calculation.custo_filamento)}\nCusto operacional: ${money(calculation.custo_operacional)}\nEmbalagem/acabamento: ${money(calculation.custo_embalagem)}\nCusto total: ${money(calculation.custo_total)}\nMultiplicador aplicado: ${calculation.multiplicador.toFixed(2)}x\n\nValor sugerido\n\n${money(calculation.valor_sugerido)}\n\nPrompt final da imagem\n\n${result.prompt_imagem}`);
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1800);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-pink-50/40 to-orange-50/70 shadow-sm dark:border-orange-900/40 dark:from-gray-900 dark:via-pink-950/10 dark:to-orange-950/20">
      <div className="border-b border-orange-100 px-5 py-5 dark:border-orange-900/40 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-lg shadow-orange-200/60 dark:shadow-none">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Novo · com IA</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Assistente de catálogo</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-gray-400">
              Envie a foto real da peça para criar o mockup no padrão da loja, título, descrições e preço sugerido.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[320px_1fr]">
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDrop={(event) => { event.preventDefault(); selectImage(event.dataTransfer.files[0]); }}
            onDragOver={(event) => event.preventDefault()}
            className="group relative flex aspect-[2/3] w-full overflow-hidden rounded-2xl border-2 border-dashed border-orange-200 bg-white/80 text-center transition hover:border-pink-400 dark:border-orange-900 dark:bg-gray-900"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Prévia do produto" className="h-full w-full object-contain" />
            ) : (
              <span className="m-auto px-6">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition group-hover:bg-pink-50 group-hover:text-pink-600 dark:bg-orange-950/30">
                  <ImageIcon className="h-6 w-6" />
                </span>
                <span className="mt-4 block text-sm font-bold text-slate-700 dark:text-gray-200">Adicionar foto do produto</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">JPG, PNG ou WebP · até 4 MB</span>
              </span>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => selectImage(event.target.files?.[0])} />
        </div>

        <div className="flex flex-col">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-gray-400">Nome base <span className="font-normal text-slate-400">(opcional)</span></label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Suporte para Headset" maxLength={80} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-gray-400">Cor desejada <span className="font-normal text-slate-400">(opcional)</span></label>
              <input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Vazio mantém a cor original" maxLength={50} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/70">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Dados usados da calculadora</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-lg font-bold text-slate-900 dark:text-white">{weightGrams || '—'}<span className="ml-0.5 text-xs font-medium text-slate-400">g</span></p><p className="text-[10px] text-slate-500">Peso</p></div>
              <div><p className="text-lg font-bold text-slate-900 dark:text-white">{hours || '0'}<span className="ml-0.5 text-xs font-medium text-slate-400">h</span> {minutes || '0'}<span className="ml-0.5 text-xs font-medium text-slate-400">min</span></p><p className="text-[10px] text-slate-500">Impressão</p></div>
              <div><p className="text-lg font-bold text-slate-900 dark:text-white">{filamentPricePerKg || '100'}</p><p className="text-[10px] text-slate-500">R$/kg</p></div>
            </div>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/60 dark:bg-red-950/30">{error}</p>}

          <button type="button" onClick={generate} disabled={loading} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-200/60 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {loading ? 'Criando catálogo e mockup…' : 'Gerar catálogo completo'}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">A foto é processada pela OpenAI. A geração pode levar até 2 minutos e utiliza créditos da API.</p>
        </div>
      </div>

      {result && (
        <div className="border-t border-orange-100 bg-white/60 p-5 dark:border-orange-900/40 dark:bg-gray-950/20 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Catálogo pronto</p>
              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Revise antes de publicar</h3>
            </div>
            <button type="button" onClick={copyAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-pink-300 hover:text-pink-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              {copiedAll ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedAll ? 'Tudo copiado' : 'Copiar conteúdo'}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.imagem_catalogo} alt={result.titulo} className="aspect-[2/3] w-full rounded-2xl border border-slate-200 bg-white object-cover shadow-sm dark:border-gray-700" />
              <a href={result.imagem_catalogo} download={`${result.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'produto'}-catalogo.webp`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-pink-600 dark:bg-white dark:text-slate-950">
                <Download className="h-4 w-4" /> Baixar imagem WebP
              </a>
            </div>

            <div className="space-y-3">
              <ResultField label="Título">{result.titulo}</ResultField>
              <ResultField label="Descrição curta">{result.descricao_curta}</ResultField>
              <ResultField label="Descrição completa">{result.descricao_completa}</ResultField>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Valor sugerido · método 2,10×</p>
                    <p className="mt-1 text-3xl font-black text-emerald-700 dark:text-emerald-400">{money(result.calculo_valor.valor_sugerido)}</p>
                    <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-400/70">Custo total {money(result.calculo_valor.custo_total)} · bruto {money(result.calculo_valor.valor_bruto)}</p>
                  </div>
                  <button type="button" onClick={() => onUseSuggestedPrice(result.calculo_valor.valor_sugerido)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Usar na simulação</button>
                </div>
                <div className="mt-4 grid gap-2 border-t border-emerald-200/70 pt-4 text-xs text-emerald-950/70 dark:border-emerald-900/60 dark:text-emerald-100/70 sm:grid-cols-3">
                  <span>Filamento: {money(result.calculo_valor.custo_filamento)}</span>
                  <span>Operação: {money(result.calculo_valor.custo_operacional)}</span>
                  <span>Embalagem: {money(result.calculo_valor.custo_embalagem)}</span>
                </div>
              </div>

              <ResultField label="Prompt final da imagem">{result.prompt_imagem}</ResultField>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
