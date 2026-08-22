import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { updateBlogPost, deleteBlogPost } from '@/lib/blog/blog-service';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// PATCH /api/admin/ai/blog-approval
// Aprova (publica) ou rejeita (exclui) um post de blog em rascunho.
// ---------------------------------------------------------------------------

interface ApprovalRequestBody {
  postId: string;
  action: 'approve' | 'reject';
  updates?: {
    title?: string;
    excerpt?: string;
    content?: string;
    seo_keywords?: string[];
  };
}

export async function PATCH(request: NextRequest) {
  // Verificar permissão de admin
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  let body: ApprovalRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido. Envie um JSON valido.' },
      { status: 400 },
    );
  }

  // Validacao de campos obrigatorios
  const { postId, action, updates } = body;

  if (!postId) {
    return NextResponse.json(
      { error: 'O campo "postId" e obrigatorio.' },
      { status: 400 },
    );
  }

  if (!action) {
    return NextResponse.json(
      { error: 'O campo "action" e obrigatorio.' },
      { status: 400 },
    );
  }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: 'A acao deve ser "approve" ou "reject".' },
      { status: 400 },
    );
  }

  try {
    // Acao: aprovar (publicar)
    if (action === 'approve') {
      const updatePayload: Record<string, unknown> = {
        status: 'published' as const,
      };

      // Aplicar edicoes opcionais antes de publicar
      if (updates?.title) updatePayload.title = updates.title;
      if (updates?.excerpt) updatePayload.excerpt = updates.excerpt;
      if (updates?.content) updatePayload.content = updates.content;
      if (updates?.seo_keywords) updatePayload.seo_keywords = updates.seo_keywords;

      const post = await updateBlogPost(postId, updatePayload);

      return NextResponse.json({
        success: true,
        message: 'Post aprovado e publicado com sucesso.',
        post,
      });
    }

    // Acao: rejeitar (excluir permanentemente)
    await deleteBlogPost(postId);

    return NextResponse.json({
      success: true,
      message: 'Post rejeitado e excluido permanentemente.',
    });
  } catch (error) {
    console.error('[blog-approval] Erro ao processar aprovacao:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Erro interno ao processar a solicitacao.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
