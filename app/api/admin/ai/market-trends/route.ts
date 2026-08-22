import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { geminiClient } from '@/lib/ai/gemini-client';
import { getBrandVoice } from '@/lib/ai/brand-voice';
import { buildMarketTrendsSystemPrompt } from '@/lib/ai/prompts';
import { logGeneratedContent, validateGeminiResponse, formatErrorResponse } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MARKET_TRENDS_SCHEMA = {
  type: 'object',
  properties: {
    trends: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          justification: { type: 'string' },
          audience: { type: 'string' },
        },
        required: ['name', 'justification', 'audience'],
      },
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          trend_alignment: { type: 'string' },
        },
        required: ['name', 'description', 'trend_alignment'],
      },
    },
  },
  required: ['trends', 'products'],
};

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Configure GOOGLE_GENAI_API_KEY no ambiente do servidor.' },
      { status: 503 },
    );
  }

  try {
    console.log('[market-trends] 1. Inicializando Admin Supabase...');
    const admin = getSupabaseAdmin();

    console.log('[market-trends] 2. Fetching brandVoice e products em paralelo...');
    const [brandVoice, productsResult] = await Promise.all([
      getBrandVoice(),
      admin.from('products').select('id, name, description, category').eq('active', true),
    ]);

    console.log('[market-trends] 3. Validando resultado de products...');
    if (productsResult.error || !productsResult.data) {
      console.error('[market-trends] Products error:', productsResult.error);
      return NextResponse.json({ error: 'Falha ao buscar produtos' }, { status: 500 });
    }

    console.log('[market-trends] 4. Processando products (total:', productsResult.data.length, ')...');
    const products = productsResult.data;
    const productSummary = products
      .map((p) => `- ${p.name} (${p.category}): ${p.description || 'sem descrição'}`)
      .join('\n');

    console.log('[market-trends] 5. Building prompts...');
    const systemPrompt = buildMarketTrendsSystemPrompt(brandVoice);
    const userPrompt = `Nosso catálogo atual (${products.length} produtos):\n\n${productSummary}\n\nAnalise tendências de mercado atuais em cultura pop, design de interiores e organização que se alinham com nosso estilo. Sugira 3 novos produtos exatos que devemos fabricar.`;

    console.log('[market-trends] 6. Calling geminiClient.generateContent...');
    const { text: responseText, tokensUsed } = await geminiClient.generateContent(userPrompt, systemPrompt, MARKET_TRENDS_SCHEMA);

    console.log('[market-trends] 7. Validating Gemini response...');
    if (!validateGeminiResponse(responseText, ['trends', 'products'])) {
      console.error('[market-trends] Invalid response structure:', responseText.substring(0, 200));
      return NextResponse.json({ error: 'Estrutura de resposta inválida da IA' }, { status: 502 });
    }

    console.log('[market-trends] 8. Parsing JSON...');
    const result = JSON.parse(responseText);

    console.log('[market-trends] 9. Logging generated content...');
    await logGeneratedContent('market_trends', result, undefined, auth.user.id, tokensUsed);

    console.log('[market-trends] 10. Success! Returning response...');
    return NextResponse.json({
      success: true,
      trends: result.trends.slice(0, 3),
      products: result.products.slice(0, 3),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[market-trends] Erro na execução:', error);
    return NextResponse.json(
      { error: formatErrorResponse(error) },
      { status: 500 },
    );
  }
}
