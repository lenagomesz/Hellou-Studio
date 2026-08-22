import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getDraftPosts } from '@/lib/blog/blog-service';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// GET /api/admin/ai/blog-posts
// Retorna todos os posts de blog com status "draft" (fila de revisao).
// ---------------------------------------------------------------------------

export async function GET() {
  // Verificar permissao de admin
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const posts = await getDraftPosts();

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('[blog-posts] Erro ao listar rascunhos:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Erro interno ao buscar rascunhos.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
