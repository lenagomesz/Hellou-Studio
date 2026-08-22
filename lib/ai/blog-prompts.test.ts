import { describe, it, expect } from 'vitest';
import {
  BLOG_THEMES,
  BlogTheme,
  buildBlogSystemPrompt,
  buildBlogUserPrompt,
  getThemeDescription,
  getRandomTheme,
} from './blog-prompts';
import { BrandVoice } from './brand-voice';

const mockBrandVoice: BrandVoice = {
  id: 'test-id',
  tone: 'casual',
  toneDescription: 'Descontraido e amigavel',
  targetAgeMin: 18,
  targetAgeMax: 35,
  interests: ['decoracao', 'design', 'lifestyle', 'gaming'],
  brandRules: 'Sempre focar no produto final e na experiencia do cliente',
  language: 'pt-BR',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('Blog Prompts', () => {
  describe('BLOG_THEMES', () => {
    it('should have exactly 10 themes', () => {
      expect(BLOG_THEMES).toHaveLength(10);
    });

    it('should contain all required themes', () => {
      const expectedThemes: BlogTheme[] = [
        'decoracao_gamer',
        'organizacao_minimalista',
        'design_pop_culture',
        'ideias_pequenos_espacos',
        'tendencias_lifestyle',
        'colecionadores_organization',
        'home_office_setup',
        'dicas_feng_shui_moderno',
        'cores_trending_2026',
        'sustentabilidade_design',
      ];

      expectedThemes.forEach((theme) => {
        expect(BLOG_THEMES).toContain(theme);
      });
    });

    it('should have no duplicate themes', () => {
      const uniqueThemes = new Set(BLOG_THEMES);
      expect(uniqueThemes.size).toBe(BLOG_THEMES.length);
    });
  });

  describe('buildBlogSystemPrompt', () => {
    it('should include the theme title in the prompt', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'decoracao_gamer');
      expect(prompt).toContain('Decoracao Gamer');
    });

    it('should include word count guidance (800-1200)', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'organizacao_minimalista');
      expect(prompt).toContain('800');
      expect(prompt).toContain('1200');
    });

    it('should include JSON output schema fields', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'design_pop_culture');
      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"excerpt"');
      expect(prompt).toContain('"meta_description"');
      expect(prompt).toContain('"content"');
      expect(prompt).toContain('"seo_keywords"');
      expect(prompt).toContain('"theme"');
    });

    it('should include brand voice information', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'home_office_setup');
      expect(prompt).toContain('casual');
      expect(prompt).toContain('18-35 anos');
      expect(prompt).toContain('decoracao, design, lifestyle, gaming');
    });

    it('should include HTML format requirements', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'cores_trending_2026');
      expect(prompt).toContain('<h2>');
      expect(prompt).toContain('<p>');
      expect(prompt).toContain('HTML');
    });

    it('should include forbidden terms restriction', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'sustentabilidade_design');
      expect(prompt).toContain('NUNCA mencione');
      expect(prompt).toContain('impressao 3D');
      expect(prompt).toContain('filamento');
    });

    it('should include product integration requirement', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'ideias_pequenos_espacos');
      expect(prompt).toContain('recomendacao de produto da Hellou Studio');
    });

    it('should specify Portuguese language', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'tendencias_lifestyle');
      expect(prompt).toContain('portugues (pt-BR)');
    });

    it('should include the theme focus in the prompt', () => {
      const prompt = buildBlogSystemPrompt(mockBrandVoice, 'colecionadores_organization');
      expect(prompt).toContain('action figures');
    });

    it('should work for every theme without errors', () => {
      BLOG_THEMES.forEach((theme) => {
        const prompt = buildBlogSystemPrompt(mockBrandVoice, theme);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe('buildBlogUserPrompt', () => {
    it('should include the theme title', () => {
      const prompt = buildBlogUserPrompt('decoracao_gamer');
      expect(prompt).toContain('Decoracao Gamer');
    });

    it('should include the theme focus context', () => {
      const prompt = buildBlogUserPrompt('home_office_setup');
      expect(prompt).toContain('ergonomia');
    });

    it('should include word count reminder', () => {
      const prompt = buildBlogUserPrompt('organizacao_minimalista');
      expect(prompt).toContain('800');
      expect(prompt).toContain('1200');
    });

    it('should mention JSON format', () => {
      const prompt = buildBlogUserPrompt('design_pop_culture');
      expect(prompt).toContain('JSON');
    });

    it('should work for every theme without errors', () => {
      BLOG_THEMES.forEach((theme) => {
        const prompt = buildBlogUserPrompt(theme);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(50);
      });
    });
  });

  describe('getThemeDescription', () => {
    it('should return title and focus for each theme', () => {
      BLOG_THEMES.forEach((theme) => {
        const desc = getThemeDescription(theme);
        expect(desc).toHaveProperty('title');
        expect(desc).toHaveProperty('focus');
        expect(desc.title.length).toBeGreaterThan(0);
        expect(desc.focus.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getRandomTheme', () => {
    it('should return a valid theme', () => {
      const theme = getRandomTheme();
      expect(BLOG_THEMES).toContain(theme);
    });

    it('should return different themes over multiple calls (statistical)', () => {
      const results = new Set<BlogTheme>();
      for (let i = 0; i < 50; i++) {
        results.add(getRandomTheme());
      }
      // With 50 calls and 10 themes, we should get at least 2 different themes
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
