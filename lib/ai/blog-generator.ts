import { geminiClient } from './gemini-client';
import { getBrandVoice } from './brand-voice';
import { buildBlogSystemPrompt, buildBlogUserPrompt, getRandomTheme, BlogTheme } from './blog-prompts';
import { validateGeminiResponse, sanitizeManufacturingTerms } from './utils';
import { getSupabaseAdmin } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface GeneratedBlogPost {
  title: string;
  excerpt: string;
  meta_description: string;
  content: string;
  seo_keywords: string[];
  theme: BlogTheme;
}

// ---------------------------------------------------------------------------
// Schema for Gemini structured output
// ---------------------------------------------------------------------------

const BLOG_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    excerpt: { type: 'string' },
    meta_description: { type: 'string' },
    content: { type: 'string' },
    seo_keywords: {
      type: 'array',
      items: { type: 'string' },
    },
    theme: { type: 'string' },
  },
  required: ['title', 'excerpt', 'meta_description', 'content', 'seo_keywords', 'theme'],
};

// ---------------------------------------------------------------------------
// Blog Generation
// ---------------------------------------------------------------------------

/**
 * Gera um blog post completo usando Gemini AI com um tema aleatório.
 * Retorna o conteúdo gerado validado contra o schema esperado.
 */
export async function generateBlogPost(): Promise<GeneratedBlogPost> {
  const theme = getRandomTheme();
  const brandVoice = await getBrandVoice();

  const systemPrompt = buildBlogSystemPrompt(brandVoice, theme);
  const userPrompt = buildBlogUserPrompt(theme);

  const response = await geminiClient.generateContent(userPrompt, systemPrompt, BLOG_SCHEMA);

  const requiredKeys = ['title', 'excerpt', 'meta_description', 'content', 'seo_keywords', 'theme'];
  if (!validateGeminiResponse(response, requiredKeys)) {
    throw new Error('Resposta da IA com estrutura inválida. Tente novamente.');
  }

  const parsed = JSON.parse(response) as GeneratedBlogPost;

  // Sanitize manufacturing terms from content
  parsed.content = sanitizeManufacturingTerms(parsed.content);
  parsed.title = sanitizeManufacturingTerms(parsed.title);
  parsed.excerpt = sanitizeManufacturingTerms(parsed.excerpt);
  parsed.meta_description = sanitizeManufacturingTerms(parsed.meta_description);

  // Ensure theme is set correctly (in case the model returns something else)
  parsed.theme = theme;

  return parsed;
}

// ---------------------------------------------------------------------------
// Random Product ID
// ---------------------------------------------------------------------------

/**
 * Busca um ID de produto ativo aleatório para vincular ao post.
 * Retorna null se não houver produtos ativos.
 */
export async function getRandomProductId(): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('active', true)
    .limit(50);

  if (error || !data || data.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex].id;
}
