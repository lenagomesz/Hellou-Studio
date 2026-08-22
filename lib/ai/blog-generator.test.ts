import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn();
vi.mock('./gemini-client', () => ({
  geminiClient: {
    generateContent: (...args: unknown[]) => mockGenerateContent(...args),
  },
}));

const mockGetBrandVoice = vi.fn();
vi.mock('./brand-voice', () => ({
  getBrandVoice: () => mockGetBrandVoice(),
}));

vi.mock('./blog-prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./blog-prompts')>();
  return {
    ...actual,
    getRandomTheme: () => 'decoracao_gamer' as const,
  };
});

const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseLimit = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({ from: mockSupabaseFrom }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { generateBlogPost, getRandomProductId } from './blog-generator';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockBrandVoice = {
  id: 'test-id',
  tone: 'casual' as const,
  toneDescription: 'Descontraido e amigavel',
  targetAgeMin: 18,
  targetAgeMax: 35,
  interests: ['decoracao', 'design', 'lifestyle', 'gaming'],
  brandRules: 'Sempre focar no produto final e na experiencia do cliente',
  language: 'pt-BR',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const validGeminiResponse = JSON.stringify({
  title: 'Montando seu Setup Gamer Perfeito',
  excerpt: 'Dicas para criar o ambiente gamer dos seus sonhos sem gastar muito.',
  meta_description: 'Aprenda a montar um setup gamer completo com dicas de decoracao e organizacao.',
  content: '<h2>Setup dos Sonhos</h2><p>Montar um canto gamer em casa e mais facil do que voce imagina.</p>',
  seo_keywords: ['setup gamer', 'decoracao gamer', 'quarto gamer', 'home gamer', 'luminaria led'],
  theme: 'decoracao_gamer',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('blog-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBrandVoice.mockResolvedValue(mockBrandVoice);
  });

  // -------------------------------------------------------------------------
  // generateBlogPost
  // -------------------------------------------------------------------------

  describe('generateBlogPost', () => {
    it('retorna um GeneratedBlogPost valido quando Gemini responde corretamente', async () => {
      mockGenerateContent.mockResolvedValue(validGeminiResponse);

      const result = await generateBlogPost();

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('excerpt');
      expect(result).toHaveProperty('meta_description');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('seo_keywords');
      expect(result).toHaveProperty('theme');
      expect(result.theme).toBe('decoracao_gamer');
      expect(Array.isArray(result.seo_keywords)).toBe(true);
      expect(result.seo_keywords.length).toBeGreaterThan(0);
    });

    it('chama getBrandVoice para obter a voz da marca', async () => {
      mockGenerateContent.mockResolvedValue(validGeminiResponse);

      await generateBlogPost();

      expect(mockGetBrandVoice).toHaveBeenCalledTimes(1);
    });

    it('chama geminiClient.generateContent com prompts e schema', async () => {
      mockGenerateContent.mockResolvedValue(validGeminiResponse);

      await generateBlogPost();

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const [userPrompt, systemPrompt, schema] = mockGenerateContent.mock.calls[0];
      expect(userPrompt).toContain('Decoracao Gamer');
      expect(systemPrompt).toContain('Hellou Studio');
      expect(schema).toHaveProperty('required');
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('content');
    });

    it('sanitiza termos de manufatura do conteudo gerado', async () => {
      const responseWithBannedTerms = JSON.stringify({
        title: 'Setup com impressora 3D',
        excerpt: 'Use filament para criar pecas.',
        meta_description: 'Como usar resina no setup.',
        content: '<p>Voce pode usar 3d printing para fazer pecas.</p>',
        seo_keywords: ['gamer', 'setup'],
        theme: 'decoracao_gamer',
      });
      mockGenerateContent.mockResolvedValue(responseWithBannedTerms);

      const result = await generateBlogPost();

      expect(result.title).not.toContain('impressora');
      expect(result.excerpt).not.toContain('filament');
      expect(result.meta_description).not.toContain('resina');
      expect(result.content).not.toContain('3d print');
    });

    it('lanca erro quando resposta do Gemini nao tem campos obrigatorios', async () => {
      const incompleteResponse = JSON.stringify({
        title: 'Titulo',
        content: 'Conteudo',
      });
      mockGenerateContent.mockResolvedValue(incompleteResponse);

      await expect(generateBlogPost()).rejects.toThrow(
        'Resposta da IA com estrutura inválida',
      );
    });

    it('lanca erro quando Gemini retorna JSON invalido', async () => {
      mockGenerateContent.mockResolvedValue('not valid json at all');

      await expect(generateBlogPost()).rejects.toThrow();
    });

    it('forca o tema correto mesmo que o modelo retorne outro', async () => {
      const responseWithWrongTheme = JSON.stringify({
        title: 'Titulo Teste',
        excerpt: 'Resumo teste',
        meta_description: 'Meta teste',
        content: '<p>Conteudo</p>',
        seo_keywords: ['teste'],
        theme: 'sustentabilidade_design',
      });
      mockGenerateContent.mockResolvedValue(responseWithWrongTheme);

      const result = await generateBlogPost();

      expect(result.theme).toBe('decoracao_gamer');
    });
  });

  // -------------------------------------------------------------------------
  // getRandomProductId
  // -------------------------------------------------------------------------

  describe('getRandomProductId', () => {
    it('retorna um ID de produto quando existem produtos ativos', async () => {
      const products = [
        { id: 'prod-1' },
        { id: 'prod-2' },
        { id: 'prod-3' },
      ];

      mockSupabaseLimit.mockResolvedValue({ data: products, error: null });
      mockSupabaseEq.mockReturnValue({ limit: mockSupabaseLimit });
      mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq });
      mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });

      const result = await getRandomProductId();

      expect(result).not.toBeNull();
      expect(products.map((p) => p.id)).toContain(result);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('products');
      expect(mockSupabaseEq).toHaveBeenCalledWith('active', true);
    });

    it('retorna null quando nao ha produtos ativos', async () => {
      mockSupabaseLimit.mockResolvedValue({ data: [], error: null });
      mockSupabaseEq.mockReturnValue({ limit: mockSupabaseLimit });
      mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq });
      mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });

      const result = await getRandomProductId();

      expect(result).toBeNull();
    });

    it('retorna null quando ocorre erro no Supabase', async () => {
      mockSupabaseLimit.mockResolvedValue({
        data: null,
        error: { message: 'connection timeout' },
      });
      mockSupabaseEq.mockReturnValue({ limit: mockSupabaseLimit });
      mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq });
      mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });

      const result = await getRandomProductId();

      expect(result).toBeNull();
    });

    it('retorna null quando data e null', async () => {
      mockSupabaseLimit.mockResolvedValue({ data: null, error: null });
      mockSupabaseEq.mockReturnValue({ limit: mockSupabaseLimit });
      mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq });
      mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });

      const result = await getRandomProductId();

      expect(result).toBeNull();
    });
  });
});
