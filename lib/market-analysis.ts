export type MarketComparable = {
  nome: string;
  fonte: string;
  preco: number;
  url: string;
  semelhanca: string;
};

export type MarketRecommendation = {
  minimo: number;
  ideal: number;
  premium: number;
  justificativa: string;
};

export type MarketAnalysisContent = {
  comparaveis: MarketComparable[];
  confianca: 'baixa' | 'media' | 'alta';
  recomendacao: MarketRecommendation;
  insights: string[];
  riscos: string[];
};

export type MarketSummary = {
  menor_preco: number;
  maior_preco: number;
  preco_medio: number;
  preco_mediano: number;
  amostra: number;
  posicao: 'abaixo' | 'competitivo' | 'acima' | 'dados_insuficientes';
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function summarizeMarket(prices: number[], currentPrice: number): MarketSummary {
  const normalized = prices
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (normalized.length === 0) {
    return {
      menor_preco: 0,
      maior_preco: 0,
      preco_medio: 0,
      preco_mediano: 0,
      amostra: 0,
      posicao: 'dados_insuficientes',
    };
  }

  const middle = Math.floor(normalized.length / 2);
  const median = normalized.length % 2 === 0
    ? (normalized[middle - 1] + normalized[middle]) / 2
    : normalized[middle];
  const average = normalized.reduce((sum, price) => sum + price, 0) / normalized.length;
  const lowerBound = median * 0.9;
  const upperBound = median * 1.1;

  return {
    menor_preco: round2(normalized[0]),
    maior_preco: round2(normalized.at(-1) ?? 0),
    preco_medio: round2(average),
    preco_mediano: round2(median),
    amostra: normalized.length,
    posicao: currentPrice < lowerBound ? 'abaixo' : currentPrice > upperBound ? 'acima' : 'competitivo',
  };
}

export function calculateMarketMargin(price: number, productionCost: number, paymentFeePercent: number) {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(productionCost) || productionCost <= 0) {
    return null;
  }

  const fee = price * Math.max(0, paymentFeePercent) / 100;
  const profit = price - productionCost - fee;
  return {
    taxa_pagamento: round2(fee),
    lucro_estimado: round2(profit),
    margem_estimada: round2((profit / price) * 100),
  };
}
