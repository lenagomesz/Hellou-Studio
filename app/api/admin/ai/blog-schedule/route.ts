import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost, getRandomProductId } from '@/lib/ai/blog-generator';
import { createBlogPost } from '@/lib/blog/blog-service';
import { logGeneratedContent } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 90;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /api/admin/ai/blog-schedule
// Endpoint invocado pelo cron da Vercel para gerar posts automaticamente.
// Autenticado via CRON_SECRET (sem sessao de usuario).
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Verificar CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[blog-schedule] CRON_SECRET nao configurado no ambiente.');
    return NextResponse.json(
      { error: 'Configuracao do servidor incompleta.' },
      { status: 500 },
    );
  }

  const authorization = request.headers.get('authorization');

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Nao autorizado. Token invalido.' },
      { status: 401 },
    );
  }

  // Verificar chave da API Gemini
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    console.error('[blog-schedule] GOOGLE_GENAI_API_KEY nao configurada.');
    return NextResponse.json(
      { error: 'Chave da API de IA nao configurada no servidor.' },
      { status: 503 },
    );
  }

  try {
    // Gerar conteudo via Gemini AI
    const generated = await generateBlogPost();

    // Gerar slug unico: titulo slugificado + timestamp em base36
    const slug = `${slugify(generated.title)}-${Date.now().toString(36)}`;

    // Buscar produto aleatorio para vincular (pode ser null)
    const featuredProductId = await getRandomProductId();

    // Criar post como rascunho no banco (sem usuario - gerado por cron)
    const post = await createBlogPost({
      title: generated.title,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      seo_keywords: generated.seo_keywords,
      featured_product_id: featuredProductId,
      status: 'draft',
      generated_by: null,
      ai_generated: true,
    });

    // Registrar conteudo gerado para auditoria
    await logGeneratedContent('blog_post', generated, featuredProductId ?? undefined);

    console.log(`[blog-schedule] Post gerado com sucesso: "${post.title}" (${post.id})`);

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
      },
      message: 'Post gerado automaticamente e salvo como rascunho.',
    });
  } catch (error) {
    console.error('[blog-schedule] Erro ao gerar post automaticamente:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Erro desconhecido ao gerar conteudo do blog.';

    return NextResponse.json(
      { error: `Falha na geracao automatica: ${errorMessage}` },
      { status: 500 },
    );
  }
}
