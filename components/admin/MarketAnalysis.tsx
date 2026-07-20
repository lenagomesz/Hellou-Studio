'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  Loader2,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
  images: string[] | null;
  active: boolean;
};

type MarketAnalysisResult = {
  produto: {
    id: string;
    nome: string;
    preco_atual: number;
    ativo: boolean;
  };
  margem_atual: {
    taxa_pagamento: number;
    lucro_estimado: number;
    margem_estimada: number;
  } | null;
  resumo_mercado: {
    menor_preco: number;
    maior_preco: number;
    preco_medio: number;
    preco_mediano: number;
    amostra: number;
    posicao: 'abaixo' | 'competitivo' | 'acima' | 'dados_insuficientes';
  };
  comparaveis: Array<{
    nome: string;
    fonte: string;
    preco: number;
    url: string;
    semelhanca: string;
  }>;
  confianca: 'baixa' | 'media' | 'alta';
  recomendacao: {
    minimo: number;
    ideal: number;
    premium: number;
    justificativa: string;
  };
  insights: string[];
  riscos: string[];
  fontes_consultadas: Array<{ url: string; titulo: string }>;
  analisado_em: string;
};

type Props = {
  weightGrams: string;
  filamentPricePerKg: string;
  hours: string;
  minutes: string;
  paymentFeePercent: string;
  onUseSuggestedPrice: (price: number) => void;
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value);

const POSITION = {
  abaixo: { label: 'Abaixo do mercado', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  competitivo: { label: 'Faixa competitiva', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  acima: { label: 'Acima do mercado', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  dados_insuficientes: { label: 'Poucos dados', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

export function MarketAnalysis({
  weightGrams,
  filamentPricePerKg,
  hours,
  minutes,
  paymentFeePercent,
  onUseSuggestedPrice,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketAnalysisResult | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      try {
        const response = await fetch('/api/products?active=all&type=physical&limit=100');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os produtos.');
        if (active) {
          const items = (payload.products ?? []) as Product[];
          setProducts(items);
          setProductId((current) => current || items[0]?.id || '');
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os produtos.');
      } finally {
        if (active) setLoadingProducts(false);
      }
    }
    loadProducts();
    return () => { active = false; };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [productId, products],
  );
  const selectedImage = selectedProduct?.image_url || selectedProduct?.images?.[0] || null;
  const hasCostInputs = Number(weightGrams) > 0 && Number(hours) + Number(minutes) / 60 > 0;

  async function analyze() {
    if (!productId || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/admin/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          weightGrams: Number(weightGrams) || 0,
          filamentPricePerKg: Number(filamentPricePerKg) || 0,
          hours: Number(hours) || 0,
          minutes: Number(minutes) || 0,
          paymentFeePercent: Number(paymentFeePercent) || 0,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível analisar o mercado.');
      setResult(payload as MarketAnalysisResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível analisar o mercado.');
    } finally {
      setLoading(false);
    }
  }

  const position = result ? POSITION[result.resumo_mercado.posicao] : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-violet-50/60 shadow-sm dark:border-blue-900/50 dark:from-gray-900 dark:via-blue-950/20 dark:to-violet-950/20">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Pesquisa ao vivo com IA</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Análise real de mercado</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                Escolha um produto atual da loja para comparar anúncios semelhantes, preço praticado, custo e margem.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            10 pesquisas/hora
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label htmlFor="market-product" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Produto do catálogo</label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {selectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedImage} alt="" className="h-full w-full object-cover" />
                ) : <BarChart3 className="h-5 w-5 text-slate-300" />}
              </div>
              <select
                id="market-product"
                value={productId}
                onChange={(event) => { setProductId(event.target.value); setResult(null); setError(''); }}
                disabled={loadingProducts}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {products.length === 0 && <option value="">Nenhum produto encontrado</option>}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {money(product.sale_price ?? product.base_price)}{product.active ? '' : ' · inativo'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={analyze}
            disabled={!productId || loading || loadingProducts}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Pesquisando preços reais…' : 'Analisar mercado'}
          </button>
        </div>

        {!hasCostInputs && (
          <p className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Informe peso e tempo de impressão na calculadora para a análise também mostrar lucro e margem reais.
          </p>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/60 dark:bg-red-950/30">{error}</p>}
      </div>

      {result && (
        <div className="border-t border-blue-100 bg-white/70 p-5 dark:border-blue-900/50 dark:bg-gray-950/20 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Preço atual de <strong className="text-slate-800 dark:text-slate-200">{result.produto.nome}</strong></p>
              <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{money(result.produto.preco_atual)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {position && <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${position.className}`}>{position.label}</span>}
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Confiança {result.confianca}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Mediana online" value={money(result.resumo_mercado.preco_mediano)} />
            <Metric label="Faixa encontrada" value={`${money(result.resumo_mercado.menor_preco)} – ${money(result.resumo_mercado.maior_preco)}`} />
            <Metric label="Amostra comparável" value={`${result.resumo_mercado.amostra} anúncios`} />
            <Metric label="Margem estimada" value={result.margem_atual ? `${result.margem_atual.margem_estimada.toFixed(1)}%` : 'Preencha os custos'} tone={result.margem_atual && result.margem_atual.margem_estimada < 20 ? 'warning' : 'positive'} />
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400"><Sparkles className="h-3.5 w-3.5" /> Faixa recomendada</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-xs text-emerald-700/70">Mínimo {money(result.recomendacao.minimo)}</span>
                  <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{money(result.recomendacao.ideal)}</span>
                  <span className="text-xs text-emerald-700/70">Premium {money(result.recomendacao.premium)}</span>
                </div>
              </div>
              <button type="button" onClick={() => onUseSuggestedPrice(result.recomendacao.ideal)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Usar preço ideal na simulação</button>
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-950/70 dark:text-emerald-100/70">{result.recomendacao.justificativa}</p>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Produtos comparáveis</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-700">
                {result.comparaveis.length ? result.comparaveis.map((item, index) => (
                  <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="group grid gap-1 border-b border-slate-100 bg-white p-4 last:border-b-0 hover:bg-blue-50/60 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-blue-950/20 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 group-hover:text-blue-700 dark:text-slate-200 dark:group-hover:text-blue-300">{item.nome} <ArrowUpRight className="inline h-3.5 w-3.5" /></p>
                      <p className="mt-1 text-xs text-slate-500">{item.fonte} · {item.semelhanca}</p>
                    </div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">{money(item.preco)}</p>
                  </a>
                )) : <p className="p-4 text-sm text-slate-500">Nenhum anúncio comparável com preço verificável foi encontrado.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <InsightList title="Oportunidades" items={result.insights} positive />
              <InsightList title="Pontos de atenção" items={result.riscos} />
            </div>
          </div>

          <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/60">
            <summary className="cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">Fontes consultadas ({result.fontes_consultadas.length})</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {result.fontes_consultadas.map((source, index) => (
                <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="truncate text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">{source.titulo || source.url}</a>
              ))}
            </div>
          </details>
          <p className="mt-3 text-[10px] text-slate-400">Pesquisa realizada em {new Date(result.analisado_em).toLocaleString('pt-BR')}. Preços online podem mudar; revise as fontes antes de alterar o catálogo.</p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'warning' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${tone === 'warning' ? 'text-amber-600' : tone === 'positive' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function InsightList({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  const Icon = positive ? CheckCircle2 : AlertTriangle;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {positive ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-amber-500" />}{title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300"><Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${positive ? 'text-emerald-500' : 'text-amber-500'}`} />{item}</li>)}
      </ul>
    </div>
  );
}
