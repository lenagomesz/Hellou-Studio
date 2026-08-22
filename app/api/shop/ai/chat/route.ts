import { NextRequest, NextResponse } from 'next/server';
import { geminiClient } from '@/lib/ai/gemini-client';
import { getBrandVoice } from '@/lib/ai/brand-voice';
import { getStoreSettings } from '@/lib/store-settings';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FORBIDDEN_TERMS } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Serviço indisponível' },
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
    const [storeSettings, _brandVoice, productsResult] = await Promise.all([
      getStoreSettings(),
      getBrandVoice(),
      getSupabaseAdmin()
        .from('products')
        .select('id, name, description, category, base_price, sale_price')
        .eq('active', true)
        .limit(15),
    ]);

    const products = productsResult.data || [];

    // Build system prompt with context
    const productsList = products
      .map(p => `- ${p.name} (${p.category}): ${p.description || 'sem descrição'} - R$ ${p.sale_price || p.base_price}`)
      .join('\n');

    const systemPrompt = `Você é um assistente de atendimento ao cliente da loja "${storeSettings.identity?.name || 'Hellou Studio'}".

Sobre a Loja:
- Missão: ${storeSettings.identity?.tagline || 'Produtos personalizados'}
- WhatsApp: ${storeSettings.contact?.whatsapp || 'Disponível'}
- Instagram: ${storeSettings.contact?.instagram || 'Disponível'}

Produtos Disponíveis:
${productsList}

IMPORTANTE:
- Seja amigável, prestativo e conciso
- Responda SEMPRE em português (pt-BR)
- Se o cliente quiser falar com alguém, sugira WhatsApp: ${storeSettings.contact?.whatsapp || ''}
${FORBIDDEN_TERMS.map((term: string) => `- NUNCA mencione: ${term}`).join('\n')}

Foco: Ajudar o cliente com dúvidas sobre produtos, preços, envio e políticas. Seja breve e direto.`;

    // Format messages for API
    const formattedMessages = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    // Call Gemini with conversation history
    const { text: response } = await geminiClient.generateContent(
      lastMessage.content,
      systemPrompt,
      undefined,
      formattedMessages
    );

    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error('[shop-chat] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar. Tente novamente.' },
      { status: 500 }
    );
  }
}
