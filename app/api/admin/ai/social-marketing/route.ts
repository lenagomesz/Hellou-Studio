import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { geminiClient } from '@/lib/ai/gemini-client';
import { getBrandVoice } from '@/lib/ai/brand-voice';
import { buildSocialCampaignSystemPrompt } from '@/lib/ai/prompts';
import { logGeneratedContent, validateGeminiResponse, formatErrorResponse } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 45;

const SOCIAL_CAMPAIGN_SCHEMA = {
  type: 'object',
  properties: {
    visual_hook: { type: 'string' },
    script: { type: 'string' },
    caption: { type: 'string' },
  },
  required: ['visual_hook', 'script', 'caption'],
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
    const body = (await request.json()) as { productId: string };
    if (!body.productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const [brandVoice, productResult] = await Promise.all([
      getBrandVoice(),
      admin
        .from('products')
        .select('id, name, description, image_url')
        .eq('id', body.productId)
        .single(),
    ]);

    if (productResult.error || !productResult.data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productResult.data;
    const systemPrompt = buildSocialCampaignSystemPrompt(brandVoice, product.name);
    const userPrompt = `Product details:\nName: ${product.name}\nDescription: ${product.description || 'No description'}\nImage: ${product.image_url || 'No image'}\n\nCreate a viral-ready campaign for this product.`;

    const { text: responseText, tokensUsed } = await geminiClient.generateContent(userPrompt, systemPrompt, SOCIAL_CAMPAIGN_SCHEMA);

    if (!validateGeminiResponse(responseText, ['visual_hook', 'script', 'caption'])) {
      return NextResponse.json({ error: 'Invalid response structure from AI' }, { status: 502 });
    }

    const result = JSON.parse(responseText);

    await logGeneratedContent('social_campaign', result, body.productId, auth.user.id, tokensUsed);

    return NextResponse.json({
      success: true,
      product: { id: product.id, name: product.name },
      campaign: result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[social-marketing] Error:', error);
    return NextResponse.json(
      { error: formatErrorResponse(error) },
      { status: 500 },
    );
  }
}
