import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { geminiClient } from '@/lib/ai/gemini-client';
import { getBrandVoice } from '@/lib/ai/brand-voice';
import { getStoreSettings } from '@/lib/store-settings';
import { FORBIDDEN_TERMS } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Configure GOOGLE_GENAI_API_KEY no ambiente do servidor.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body as { messages: Message[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    // Fetch store context
    const [storeSettings, brandVoice, productsResult] = await Promise.all([
      getStoreSettings(),
      getBrandVoice(),
      getSupabaseAdmin()
        .from('products')
        .select('id, name, description, category, base_price, sale_price')
        .eq('active', true)
        .limit(20),
    ]);

    const products = productsResult.data || [];

    // Build system prompt with context
    const productsList = products
      .map(p => `- ${p.name} (${p.category}): ${p.description || 'sem descrição'} - R$ ${p.sale_price || p.base_price}`)
      .join('\n');

    const systemPrompt = `Você é um consultor especialista de e-commerce para a loja "${storeSettings.identity?.name || 'Hellou Studio'}".

Informações da Loja:
- Segmento: ${storeSettings.identity?.tagline || 'Produtos personalizados'}
- Público: ${brandVoice.targetAgeMin}-${brandVoice.targetAgeMax} anos
- Interesses do público: ${brandVoice.interests.join(', ')}
- Tom da marca: ${brandVoice.toneDescription || brandVoice.tone}
- Regras da marca: ${brandVoice.brandRules}

Produtos Disponíveis:
${productsList}

Regras Comerciais:
- Moeda: BRL
- Frete grátis acima de R$ ${storeSettings.commerce?.freeShippingThreshold || 99}
- Contato: WhatsApp ${storeSettings.contact?.whatsapp || ''}, Instagram ${storeSettings.contact?.instagram || ''}

IMPORTANTE:
${FORBIDDEN_TERMS.map(term => `- NUNCA mencione: ${term}`).join('\n')}

Seja um consultor amigável e prestativo. Responda em português. Foque em ajudar o negócio a crescer.`;

    // Format messages for API
    const formattedMessages = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    // Call Gemini with conversation history
    const { text: response, tokensUsed } = await geminiClient.generateContent(
      lastMessage.content,
      systemPrompt,
      undefined,
      formattedMessages
    );

    return NextResponse.json({
      message: response,
      tokensUsed,
    });
  } catch (error) {
    console.error('[chat] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
