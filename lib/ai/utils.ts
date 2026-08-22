import { getSupabaseAdmin } from '@/lib/supabase';

export function sanitizeManufacturingTerms(text: string): string {
  const bannedTerms = [
    /3d\s*print/gi,
    /filament/gi,
    /resina/gi,
    /impressora/gi,
    /printer/gi,
    /bico/gi,
    /camadas/gi,
    /fatiador/gi,
    /slicing/gi,
    /extrusora/gi,
  ];

  let sanitized = text;
  for (const term of bannedTerms) {
    sanitized = sanitized.replace(term, '[REDACTED]');
  }
  return sanitized;
}

export async function logGeneratedContent(
  featureType: 'market_trends' | 'social_campaign' | 'blog_post',
  content: unknown,
  productId?: string,
  userId?: string,
  tokensUsed?: number,
) {
  try {
    const admin = getSupabaseAdmin();
    await admin.from('ai_generated_content').insert({
      feature_type: featureType,
      product_id: productId,
      content: JSON.stringify(content),
      generated_by: userId,
      tokens_used: tokensUsed,
    });
  } catch (error) {
    console.error('[logGeneratedContent] Failed to log:', error);
  }
}

export function validateGeminiResponse(response: string, expectedKeys: string[]): boolean {
  try {
    const parsed = JSON.parse(response);
    return expectedKeys.every((key) => key in parsed);
  } catch {
    return false;
  }
}

export function formatErrorResponse(error: unknown): string {
  if (error instanceof Error) {
    console.error('[formatErrorResponse] Full error message:', error.message);
    console.error('[formatErrorResponse] Error stack:', error.stack);
    if (error.message.includes('API key')) {
      return 'Configure GOOGLE_GENAI_API_KEY no ambiente do servidor.';
    }
    if (error.message.includes('JSON')) {
      return 'A IA retornou uma resposta inválida. Tente novamente.';
    }
    return `Erro ao processar a solicitação: ${error.message}`;
  }
  return 'Erro desconhecido ao gerar conteúdo.';
}
