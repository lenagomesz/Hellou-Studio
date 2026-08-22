import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { generateBlogPost, getRandomProductId } from '@/lib/ai/blog-generator';
import { createBlogPost } from '@/lib/blog/blog-service';
import { logGeneratedContent, formatErrorResponse } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 90;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function POST() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Configure GOOGLE_GENAI_API_KEY no ambiente do servidor.' },
      { status: 503 },
    );
  }

  try {
    // Gerar conteúdo via Gemini AI
    const { generated, tokensUsed } = await generateBlogPost();

    // Gerar slug único: título slugificado + timestamp em base36
    const slug = `${slugify(generated.title)}-${Date.now().toString(36)}`;

    // Buscar produto aleatório para vincular (pode ser null)
    const featuredProductId = await getRandomProductId();

    // Criar post como rascunho no banco
    const post = await createBlogPost({
      title: generated.title,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      seo_keywords: generated.seo_keywords,
      featured_product_id: featuredProductId,
      status: 'draft',
      generated_by: auth.user.id,
      ai_generated: true,
    });

    // Registrar conteúdo gerado para auditoria
    await logGeneratedContent('blog_post', generated, featuredProductId ?? undefined, auth.user.id, tokensUsed);

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        theme: generated.theme,
        status: post.status,
        featured_product_id: post.featured_product_id,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[blog-generation] Erro ao gerar post:', error);
    return NextResponse.json(
      { error: formatErrorResponse(error) },
      { status: 500 },
    );
  }
}
