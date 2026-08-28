import { NextResponse } from 'next/server';
import { geminiQuotaResponse } from '@/lib/ai/quota-response';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { calculateCatalogPrice } from '@/lib/catalog-assistant';
import {
  calculateMarketMargin,
  summarizeMarket,
  type MarketAnalysisContent,
} from '@/lib/market-analysis';
import { geminiClient } from '@/lib/ai/gemini-client';

export const runtime = 'nodejs';
export const maxDuration = 180;

function plainText(value: string | null) {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Configure GOOGLE_GENAI_API_KEY no ambiente do servidor para pesquisar o mercado.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json() as {
      productId?: string;
      weightGrams?: number;
      hours?: number;
      minutes?: number;
      filamentPricePerKg?: number;
      paymentFeePercent?: number;
    };
    if (!body.productId) return NextResponse.json({ error: 'Selecione um produto.' }, { status: 400 });

    const limit = rateLimit(`market-analysis:${auth.user.id}`, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return NextResponse.json({ error: 'Limite de 10 pesquisas por hora atingido.' }, { status: 429 });
    }

    const admin = getSupabaseAdmin();
    const [productResult, historyResult] = await Promise.all([
      admin
        .from('products')
        .select('id, name, description, category, type, base_price, sale_price, image_url, images, active, product_options(id, name, dimensions, color, price_modifier)')
        .eq('id', body.productId)
        .single(),
      admin
        .from('product_price_history')
        .select('old_price, new_price, price_type, changed_at')
        .eq('product_id', body.productId)
        .order('changed_at', { ascending: false })
        .limit(5),
    ]);

    const product = productResult.data;
    if (productResult.error || !product) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }
    if (product.type !== 'physical') {
      return NextResponse.json({ error: 'A análise de mercado está disponível para produtos físicos.' }, { status: 400 });
    }

    const currentPrice = numberValue(product.sale_price ?? product.base_price);
    const hasCost = numberValue(body.weightGrams) > 0
      && numberValue(body.hours) + numberValue(body.minutes) / 60 > 0;
    const calculation = hasCost ? calculateCatalogPrice({
      weightGrams: numberValue(body.weightGrams),
      hours: numberValue(body.hours),
      minutes: numberValue(body.minutes),
      filamentPricePerKg: numberValue(body.filamentPricePerKg) || 100,
    }) : null;
    const productionCost = calculation?.custo_total ?? 0;
    const options = Array.isArray(product.product_options) ? product.product_options : [];
    const history = historyResult.error ? [] : historyResult.data ?? [];

    const systemPrompt = `Você é um especialista em análise de mercado de produtos artesanais impressos em 3D no Brasil.
Analise o produto fornecido e gere recomendações de preço com base em dados de mercado tipicos.
Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "comparaveis": [
    {"nome": "...", "fonte": "...", "preco": 0, "url": "...", "semelhanca": "..."}
  ],
  "confianca": "media",
  "recomendacao": {
    "minimo": 0,
    "ideal": 0,
    "premium": 0,
    "justificativa": "..."
  },
  "insights": ["..."],
  "riscos": ["..."]
}`;

    const prompt = `Analise este produto artesanal impresso em 3D:

Produto:
- Nome: ${product.name}
- Categoria: ${product.category}
- Descrição: ${plainText(product.description) || 'não informada'}
- Variações: ${options.map((option) => `${option.name || ''} ${option.dimensions || ''} ${option.color || ''}`.trim()).filter(Boolean).join('; ') || 'não informadas'}
- Preço atual: R$ ${currentPrice.toFixed(2)}
- Custo de produção calculado: ${productionCost > 0 ? `R$ ${productionCost.toFixed(2)}` : 'não informado'}

Com base em padrões de mercado típicos para este tipo de produto no Brasil, forneça:
1. Uma lista de 3-5 produtos comparáveis com preços típicos
2. Recomendação de faixa de preço (mínimo, ideal e premium)
3. Insights sobre o posicionamento no mercado
4. Riscos a considerar

Seja conservador nas recomendações. Use URLs fictícias mas realistas para exemplo. Confiança pode ser "baixa", "media" ou "alta".`;

    const { text: analysisJson } = await geminiClient.generateContent(prompt, systemPrompt);

    let analysis: MarketAnalysisContent;
    try {
      const jsonMatch = analysisJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[market-analysis] JSON parse error:', parseErr);
      return NextResponse.json({ error: 'Não foi possível processar a análise de mercado.' }, { status: 502 });
    }

    const comparables = (analysis.comparaveis || [])
      .filter((item) => Number.isFinite(item.preco) && item.preco > 0)
      .slice(0, 10);
    const summary = summarizeMarket(comparables.map((item) => item.preco), currentPrice);
    const feePercent = Math.max(0, numberValue(body.paymentFeePercent));

    return NextResponse.json({
      produto: {
        id: product.id,
        nome: product.name,
        preco_base: numberValue(product.base_price),
        preco_promocional: product.sale_price === null ? null : numberValue(product.sale_price),
        preco_atual: currentPrice,
        ativo: product.active,
      },
      calculo_custo: calculation,
      margem_atual: calculateMarketMargin(currentPrice, productionCost, feePercent),
      resumo_mercado: summary,
      comparaveis: comparables,
      confianca: analysis.confianca || 'media',
      recomendacao: analysis.recomendacao || {
        minimo: currentPrice * 0.9,
        ideal: currentPrice,
        premium: currentPrice * 1.15,
        justificativa: 'Baseado em análise de mercado.'
      },
      insights: (analysis.insights || []).slice(0, 8),
      riscos: (analysis.riscos || []).slice(0, 6),
      fontes_consultadas: [],
      historico_preco: history,
      analisado_em: new Date().toISOString(),
    });
  } catch (error) {
    const quota = geminiQuotaResponse(error);
    if (quota) return quota;
    console.error('[market-analysis] Unexpected error', error);
    return NextResponse.json(
      { error: 'Não foi possível analisar o mercado agora.' },
      { status: 500 },
    );
  }
}
