import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRequirePermission = vi.fn();
vi.mock('@/lib/api', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

const mockUpdateBlogPost = vi.fn();
const mockDeleteBlogPost = vi.fn();
vi.mock('@/lib/blog/blog-service', () => ({
  updateBlogPost: (...args: unknown[]) => mockUpdateBlogPost(...args),
  deleteBlogPost: (...args: unknown[]) => mockDeleteBlogPost(...args),
}));

import { PATCH } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/ai/blog-approval', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: 'user-123',
  email: 'admin@example.com',
  role: 'admin' as const,
  accessLevel: 'owner' as const,
};

const samplePost = {
  id: 'post-abc-123',
  title: 'Dicas de decoracao para escritorio',
  slug: 'dicas-de-decoracao-para-escritorio',
  content: '<p>Conteudo completo do post...</p>',
  excerpt: 'Resumo do post sobre decoracao.',
  seo_keywords: ['decoracao', 'escritorio'],
  featured_product_id: null,
  status: 'published',
  created_at: '2026-08-21T10:00:00.000Z',
  published_at: '2026-08-21T12:00:00.000Z',
  edited_at: '2026-08-21T12:00:00.000Z',
  generated_by: 'user-123',
  ai_generated: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/ai/blog-approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({ user: mockUser });
  });

  // -------------------------------------------------------------------------
  // Autorizacao
  // -------------------------------------------------------------------------

  describe('autorizacao', () => {
    it('requer permissao settings.manage', async () => {
      mockRequirePermission.mockResolvedValue({ user: mockUser });
      mockUpdateBlogPost.mockResolvedValue(samplePost);

      await PATCH(makeRequest({ postId: 'post-1', action: 'approve' }));

      expect(mockRequirePermission).toHaveBeenCalledWith('settings.manage');
    });

    it('retorna 403 quando usuario nao tem permissao', async () => {
      const { NextResponse } = await import('next/server');
      mockRequirePermission.mockResolvedValue({
        response: NextResponse.json(
          { error: 'Seu perfil administrativo nao possui permissao para esta acao.' },
          { status: 403 },
        ),
      });

      const response = await PATCH(makeRequest({ postId: 'post-1', action: 'approve' }));

      expect(response.status).toBe(403);
    });

    it('retorna 401 quando usuario nao esta autenticado', async () => {
      const { NextResponse } = await import('next/server');
      mockRequirePermission.mockResolvedValue({
        response: NextResponse.json(
          { error: 'Nao autenticado' },
          { status: 401 },
        ),
      });

      const response = await PATCH(makeRequest({ postId: 'post-1', action: 'approve' }));

      expect(response.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Validacao
  // -------------------------------------------------------------------------

  describe('validacao', () => {
    it('retorna 400 quando postId esta ausente', async () => {
      const response = await PATCH(makeRequest({ action: 'approve' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('postId');
    });

    it('retorna 400 quando action esta ausente', async () => {
      const response = await PATCH(makeRequest({ postId: 'post-1' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('action');
    });

    it('retorna 400 quando action e invalida', async () => {
      const response = await PATCH(
        makeRequest({ postId: 'post-1', action: 'invalid' }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('approve');
      expect(data.error).toContain('reject');
    });

    it('retorna 400 quando body nao e JSON valido', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/ai/blog-approval',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{{{',
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('JSON');
    });
  });

  // -------------------------------------------------------------------------
  // Acao: approve
  // -------------------------------------------------------------------------

  describe('acao approve', () => {
    it('atualiza post para status published', async () => {
      mockUpdateBlogPost.mockResolvedValue(samplePost);

      const response = await PATCH(
        makeRequest({ postId: 'post-abc-123', action: 'approve' }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('aprovado');
      expect(data.post).toEqual(samplePost);
      expect(mockUpdateBlogPost).toHaveBeenCalledWith('post-abc-123', {
        status: 'published',
      });
    });

    it('aplica edicoes opcionais antes de publicar', async () => {
      const updatedPost = {
        ...samplePost,
        title: 'Titulo editado',
        excerpt: 'Resumo editado',
      };
      mockUpdateBlogPost.mockResolvedValue(updatedPost);

      const response = await PATCH(
        makeRequest({
          postId: 'post-abc-123',
          action: 'approve',
          updates: {
            title: 'Titulo editado',
            excerpt: 'Resumo editado',
          },
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdateBlogPost).toHaveBeenCalledWith('post-abc-123', {
        status: 'published',
        title: 'Titulo editado',
        excerpt: 'Resumo editado',
      });
    });

    it('aplica seo_keywords nas edicoes', async () => {
      mockUpdateBlogPost.mockResolvedValue(samplePost);

      await PATCH(
        makeRequest({
          postId: 'post-abc-123',
          action: 'approve',
          updates: { seo_keywords: ['nova', 'keyword'] },
        }),
      );

      expect(mockUpdateBlogPost).toHaveBeenCalledWith('post-abc-123', {
        status: 'published',
        seo_keywords: ['nova', 'keyword'],
      });
    });

    it('retorna 500 quando updateBlogPost falha', async () => {
      mockUpdateBlogPost.mockRejectedValue(
        new Error('Erro ao atualizar post do blog (id: post-abc-123): row not found'),
      );

      const response = await PATCH(
        makeRequest({ postId: 'post-abc-123', action: 'approve' }),
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Erro ao atualizar post do blog');
    });
  });

  // -------------------------------------------------------------------------
  // Acao: reject
  // -------------------------------------------------------------------------

  describe('acao reject', () => {
    it('exclui o post permanentemente', async () => {
      mockDeleteBlogPost.mockResolvedValue(undefined);

      const response = await PATCH(
        makeRequest({ postId: 'post-abc-123', action: 'reject' }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('rejeitado');
      expect(data.message).toContain('excluido');
      expect(data.post).toBeUndefined();
      expect(mockDeleteBlogPost).toHaveBeenCalledWith('post-abc-123');
    });

    it('retorna 500 quando deleteBlogPost falha', async () => {
      mockDeleteBlogPost.mockRejectedValue(
        new Error('Erro ao excluir post do blog (id: post-abc-123): permission denied'),
      );

      const response = await PATCH(
        makeRequest({ postId: 'post-abc-123', action: 'reject' }),
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Erro ao excluir post do blog');
    });
  });
});
