import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { geminiClient } from '@/lib/ai/gemini-client';
import { getBrandVoice } from '@/lib/ai/brand-voice';
import { buildSEOBlogSystemPrompt } from '@/lib/ai/prompts';
import { logGeneratedContent, validateGeminiResponse, formatErrorResponse } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SEO_BLOG_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    meta_description: { type: 'string' },
    content: { type: 'string' },
    seo_keywords: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'meta_description', 'content', 'seo_keywords'],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

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
    const body = (await request.json()) as { topic: string };
    if (!body.topic || body.topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const brandVoice = await getBrandVoice();
    const systemPrompt = buildSEOBlogSystemPrompt(brandVoice, body.topic);
    const userPrompt = `Generate an SEO-optimized blog post about: ${body.topic}`;

    const response = await geminiClient.generateContent(userPrompt, systemPrompt, SEO_BLOG_SCHEMA);

    if (!validateGeminiResponse(response, ['title', 'content', 'seo_keywords'])) {
      return NextResponse.json({ error: 'Invalid response structure from AI' }, { status: 502 });
    }

    const result = JSON.parse(response);
    const slug = `${slugify(result.title)}-${Date.now().toString(36)}`;

    const admin = getSupabaseAdmin();
    const { data: blogPost, error: insertError } = await admin
      .from('blog_posts')
      .insert({
        title: result.title,
        slug,
        content: result.content,
        excerpt: result.meta_description,
        status: 'published',
        seo_keywords: result.seo_keywords,
        generated_by: auth.user.id,
        ai_generated: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !blogPost) {
      console.error('[seo-blog] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save blog post' }, { status: 500 });
    }

    await logGeneratedContent('blog_post', result, undefined, auth.user.id);

    return NextResponse.json({
      success: true,
      blogPost: {
        id: blogPost.id,
        title: blogPost.title,
        slug: blogPost.slug,
        publishedAt: blogPost.published_at,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[seo-blog] Error:', error);
    return NextResponse.json(
      { error: formatErrorResponse(error) },
      { status: 500 },
    );
  }
}
