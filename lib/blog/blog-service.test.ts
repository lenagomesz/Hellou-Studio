import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockFrom = vi.fn();

function buildChain(_terminal?: 'single' | 'maybeSingle') {
  const chain: Record<string, unknown> = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  };
  // All chainable methods return the chain itself
  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockDelete.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
  mockRange.mockReturnValue(chain);

  return chain;
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import {
  createBlogPost,
  updateBlogPost,
  getBlogPostById,
  getDraftPosts,
  getPublishedPosts,
  deleteBlogPost,
} from './blog-service';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const samplePost = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Como organizar sua estante de livros',
  slug: 'como-organizar-sua-estante-de-livros',
  content: '<p>Dicas para organizar sua estante...</p>',
  excerpt: 'Dicas práticas para organizar livros em casa.',
  seo_keywords: ['organização', 'estante', 'livros'],
  featured_product_id: null,
  status: 'draft' as const,
  created_at: '2026-08-21T10:00:00.000Z',
  published_at: null,
  edited_at: null,
  generated_by: null,
  ai_generated: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('blog-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChain();
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });
  });

  // -------------------------------------------------------------------------
  // createBlogPost
  // -------------------------------------------------------------------------

  describe('createBlogPost', () => {
    it('insere um novo post e retorna os dados', async () => {
      mockSingle.mockResolvedValue({ data: samplePost, error: null });

      const result = await createBlogPost({
        title: samplePost.title,
        slug: samplePost.slug,
        content: samplePost.content,
        excerpt: samplePost.excerpt,
        seo_keywords: samplePost.seo_keywords,
      });

      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      expect(mockInsert).toHaveBeenCalled();
      expect(result.title).toBe(samplePost.title);
      expect(result.status).toBe('draft');
    });

    it('lança erro com mensagem em português quando falha', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key' },
      });

      await expect(
        createBlogPost({
          title: 'Teste',
          slug: 'teste',
          content: 'Conteúdo',
        }),
      ).rejects.toThrow('Erro ao criar post do blog: duplicate key');
    });

    it('usa status draft por padrão', async () => {
      mockSingle.mockResolvedValue({ data: samplePost, error: null });

      await createBlogPost({
        title: 'Teste',
        slug: 'teste',
        content: 'Conteúdo',
      });

      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.status).toBe('draft');
    });

    it('define published_at quando status é published', async () => {
      mockSingle.mockResolvedValue({
        data: { ...samplePost, status: 'published' },
        error: null,
      });

      await createBlogPost({
        title: 'Teste',
        slug: 'teste',
        content: 'Conteúdo',
        status: 'published',
      });

      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.published_at).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateBlogPost
  // -------------------------------------------------------------------------

  describe('updateBlogPost', () => {
    it('atualiza e retorna o post modificado', async () => {
      const updated = { ...samplePost, title: 'Novo Título' };
      mockSingle.mockResolvedValue({ data: updated, error: null });

      const result = await updateBlogPost(samplePost.id, {
        title: 'Novo Título',
      });

      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      expect(mockUpdate).toHaveBeenCalled();
      expect(result.title).toBe('Novo Título');
    });

    it('define edited_at automaticamente', async () => {
      mockSingle.mockResolvedValue({ data: samplePost, error: null });

      await updateBlogPost(samplePost.id, { title: 'Alterado' });

      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg.edited_at).toBeDefined();
    });

    it('define published_at ao publicar', async () => {
      mockSingle.mockResolvedValue({
        data: { ...samplePost, status: 'published' },
        error: null,
      });

      await updateBlogPost(samplePost.id, { status: 'published' });

      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg.published_at).toBeDefined();
    });

    it('lança erro quando post não existe', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'row not found' },
      });

      await expect(
        updateBlogPost('non-existent', { title: 'X' }),
      ).rejects.toThrow('Erro ao atualizar post do blog');
    });
  });

  // -------------------------------------------------------------------------
  // getBlogPostById
  // -------------------------------------------------------------------------

  describe('getBlogPostById', () => {
    it('retorna o post quando encontrado', async () => {
      mockMaybeSingle.mockResolvedValue({ data: samplePost, error: null });

      const result = await getBlogPostById(samplePost.id);

      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      expect(result).toEqual(samplePost);
    });

    it('retorna null quando não encontrado', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await getBlogPostById('non-existent');

      expect(result).toBeNull();
    });

    it('lança erro com mensagem em português quando Supabase falha', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'connection failed' },
      });

      await expect(getBlogPostById('123')).rejects.toThrow(
        'Erro ao buscar post do blog',
      );
    });
  });

  // -------------------------------------------------------------------------
  // getDraftPosts
  // -------------------------------------------------------------------------

  describe('getDraftPosts', () => {
    it('retorna lista de rascunhos', async () => {
      // For getDraftPosts the final result comes from the query itself (no .single())
      // We need to make the chain resolve as a promise
      mockOrder.mockResolvedValue({ data: [samplePost], error: null });

      const result = await getDraftPosts();

      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      expect(mockEq).toHaveBeenCalledWith('status', 'draft');
      expect(result).toHaveLength(1);
    });

    it('filtra por usuário quando userId é fornecido', async () => {
      // Chain: from().select().eq('status','draft').order().eq('generated_by',userId)
      // The second eq (after order) resolves the query
      const secondEq = vi.fn().mockResolvedValue({ data: [], error: null });
      mockOrder.mockReturnValue({ eq: secondEq });

      await getDraftPosts('user-123');

      expect(mockEq).toHaveBeenCalledWith('status', 'draft');
      expect(secondEq).toHaveBeenCalledWith('generated_by', 'user-123');
    });

    it('lança erro quando consulta falha', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'timeout' },
      });

      await expect(getDraftPosts()).rejects.toThrow(
        'Erro ao listar rascunhos do blog',
      );
    });
  });

  // -------------------------------------------------------------------------
  // getPublishedPosts
  // -------------------------------------------------------------------------

  describe('getPublishedPosts', () => {
    it('retorna posts publicados com paginação', async () => {
      mockRange.mockResolvedValue({
        data: [{ ...samplePost, status: 'published' }],
        error: null,
        count: 1,
      });

      const result = await getPublishedPosts(12, 0);

      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(result.posts).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('usa valores padrão de paginação', async () => {
      mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

      const result = await getPublishedPosts();

      expect(mockRange).toHaveBeenCalledWith(0, 11); // offset 0, offset + 12 - 1
      expect(result.total).toBe(0);
    });

    it('lança erro quando consulta falha', async () => {
      mockRange.mockResolvedValue({
        data: null,
        error: { message: 'permission denied' },
      });

      await expect(getPublishedPosts()).rejects.toThrow(
        'Erro ao listar posts publicados',
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteBlogPost
  // -------------------------------------------------------------------------

  describe('deleteBlogPost', () => {
    it('remove o post sem erro', async () => {
      mockEq.mockResolvedValue({ error: null });

      await expect(deleteBlogPost(samplePost.id)).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('lança erro quando exclusão falha', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'foreign key violation' },
      });

      await expect(deleteBlogPost('123')).rejects.toThrow(
        'Erro ao excluir post do blog',
      );
    });
  });
});
