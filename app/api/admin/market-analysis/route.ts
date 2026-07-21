import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { calculateCatalogPrice } from '@/lib/catalog-assistant';
import {
  calculateMarketMargin,
  summarizeMarket,
  type MarketAnalysisContent,
} from '@/lib/market-analysis';

export const runtime = 'nodejs';
export const maxDuration = 180;

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    comparaveis: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nome: { type: 'string' },
          fonte: { type: 'string' },
          preco: { type: 'number' },
          url: { type: 'string' },
          semelhanca: { type: 'string' },
        },
        required: ['nome', 'fonte', 'preco', 'url', 'semelhanca'],
      },
    },
    confianca: { type: 'string', enum: ['baixa', 'media', 'alta'] },
    recomendacao: {
      type: 'object',
      additionalProperties: false,
      properties: {
        minimo: { type: 'number' },
        ideal: { type: 'number' },
        premium: { type: 'number' },
        justificativa: { type: 'string' },
      },
      required: ['minimo', 'ideal', 'premium', 'justificativa'],
    },
    insights: { type: 'array', items: { type: 'string' } },
    riscos: { type: 'array', items: { type: 'string' } },
  },
  required: ['comparaveis', 'confianca', 'recomendacao', 'insights', 'riscos'],
};

type ResponseOutput = {
  type?: string;
  action?: { sources?: Array<{ url?: string; title?: string }> };
  content?: Array<{
    type?: string;
    text?: string;
    annotations?: Array<{ type?: string; url?: string; title?: string }>;
  }>;
};

type OpenAIResponse = {
  output?: ResponseOutput[];
  error?: { code?: string; type?: string; message?: string };
};

function outputText(payload: OpenAIResponse) {
  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    const content = item.content?.find((part) => part.type === 'output_text' && part.text);
    if (content?.text) return content.text;
  }
  return null;
}

function outputSources(payload: OpenAIResponse) {
  const sources = new Map<string, { url: string; titulo: string }>();
  for (const item of payload.output ?? []) {
    for (const source of item.action?.sources ?? []) {
      if (source.url?.startsWith('http')) sources.set(source.url, { url: source.url, titulo: source.title || source.url });
    }
    for (const content of item.content ?? []) {
      for (const annotation of content.annotations ?? []) {
        if (annotation.type === 'url_citation' && annotation.url?.startsWith('http')) {
          sources.set(annotation.url, { url: annotation.url, titulo: annotation.title || annotation.url });
        }
      }
    }
  }
  return [...sources.values()];
}

function plainText(value: string | null) {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function openAIError(response: Response) {
  const payload = await response.json().catch(() => null) as OpenAIResponse | null;
  const errorCode = payload?.error?.code || payload?.error?.type;
  console.error('[market-analysis] OpenAI error', {
    status: response.status,
    code: errorCode,
    requestId: response.headers.get('x-request-id'),
  });
  if (response.status === 401) return 'A chave da OpenAI é inválida ou expirou.';
  if (errorCode === 'insufficient_quota') {
    return 'A conta da OpenAI API está sem créditos. Adicione saldo em platform.openai.com/settings/organization/billing/overview e tente novamente após alguns minutos.';
  }
  if (errorCode === 'billing_hard_limit_reached') {
    return 'O limite mensal de gastos da OpenAI API foi atingido. Aumente o limite no painel de Billing da OpenAI.';
  }
  if (errorCode === 'rate_limit_exceeded' || response.status === 429) {
    return 'A OpenAI recebeu muitas solicitações em pouco tempo. Aguarde um minuto e tente novamente.';
  }
  if (errorCode === 'model_not_found') {
    return 'O projeto desta chave não possui acesso ao modelo configurado. Verifique OPENAI_TEXT_MODEL na Vercel.';
  }
  return 'A pesquisa de mercado não pôde ser concluída agora.';
}

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Configure OPENAI_API_KEY no ambiente do servidor para pesquisar o mercado.' },
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
    const prompt = `Pesquise preços anunciados atualmente na internet para produtos realmente comparáveis a este item artesanal impresso em 3D, vendido no Brasil.

Produto da Hellou Studio:
- Nome: ${product.name}
- Categoria: ${product.category}
- Descrição: ${plainText(product.description) || 'não informada'}
- Variações: ${options.map((option) => `${option.name || ''} ${option.dimensions || ''} ${option.color || ''}`.trim()).filter(Boolean).join('; ') || 'não informadas'}
- Preço atual: R$ ${currentPrice.toFixed(2)}
- Custo de produção calculado: ${productionCost > 0 ? `R$ ${productionCost.toFixed(2)}` : 'não informado'}
- Histórico recente de preço: ${history.length ? JSON.stringify(history) : 'sem histórico'}

Regras obrigatórias:
- Faça busca web ao vivo e priorize anúncios brasileiros em BRL.
- Procure de 4 a 10 comparáveis, mas inclua somente resultados com preço e URL verificáveis.
- Compare função, tamanho aparente, material, acabamento, personalização e produção artesanal.
- Exclua arquivos STL digitais, itens usados, atacado, peças industriais sem relação e anúncios sem preço verificável.
- Use o preço do item sem somar frete. Sinalize promoções ou diferenças relevantes em "semelhanca".
- Não invente produto, preço, loja ou URL. Se houver poucos equivalentes, diminua a confiança e explique nos riscos.
- A recomendação deve equilibrar mercado, custo, caráter artesanal e posicionamento da Hellou Studio.
- Retorne valores monetários como números em reais.`;

    const imageUrl = [product.image_url, ...(Array.isArray(product.images) ? product.images : [])]
      .find((url): url is string => typeof url === 'string' && url.startsWith('https://'));
    const userContent: Array<Record<string, string>> = [{ type: 'input_text', text: prompt }];
    if (imageUrl) userContent.push({ type: 'input_image', image_url: imageUrl, detail: 'original' });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(150_000),
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-5.4',
        store: false,
        safety_identifier: createHash('sha256').update(auth.user.id).digest('hex'),
        reasoning: { effort: 'low' },
        tools: [{
          type: 'web_search',
          search_context_size: 'medium',
          external_web_access: true,
          user_location: {
            type: 'approximate',
            country: 'BR',
            city: 'São Paulo',
            region: 'São Paulo',
            timezone: 'America/Sao_Paulo',
          },
        }],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        input: [{ role: 'user', content: userContent }],
        text: {
          format: {
            type: 'json_schema',
            name: 'market_analysis',
            strict: true,
            schema: ANALYSIS_SCHEMA,
          },
          verbosity: 'medium',
        },
        max_output_tokens: 3200,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: await openAIError(response) }, { status: 502 });
    }

    const payload = await response.json() as OpenAIResponse;
    const text = outputText(payload);
    if (!text) return NextResponse.json({ error: 'A pesquisa não retornou uma análise.' }, { status: 502 });

    const analysis = JSON.parse(text) as MarketAnalysisContent;
    const comparables = analysis.comparaveis
      .filter((item) => Number.isFinite(item.preco) && item.preco > 0 && item.url.startsWith('http'))
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
      confianca: analysis.confianca,
      recomendacao: analysis.recomendacao,
      insights: analysis.insights.slice(0, 8),
      riscos: analysis.riscos.slice(0, 6),
      fontes_consultadas: outputSources(payload).slice(0, 30),
      historico_preco: history,
      analisado_em: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[market-analysis] Unexpected error', error);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json(
      { error: timedOut ? 'A pesquisa demorou demais. Tente novamente.' : 'Não foi possível analisar o mercado agora.' },
      { status: timedOut ? 504 : 500 },
    );
  }
}
