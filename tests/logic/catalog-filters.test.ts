import { describe, it, expect } from 'vitest';
import { matchesCatalogSearch } from '@/lib/catalog-search';

const VALID_CATEGORIES = ['chaveiros', 'escritorio', 'criaturas'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

function isCategory(value: string): value is Category {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

function shouldShowInCatalog(product: { category: string; name: string; active: boolean }): boolean {
  if (!product.active) return false;
  if (!VALID_CATEGORIES.includes(product.category as Category)) return false;
  if (product.name.toLowerCase().startsWith('encomenda')) return false;
  return true;
}

describe('Catalog Filters', () => {
  describe('catalog search', () => {
    const product = {
      name: 'Dragão articulado',
      description: 'Modelo impresso em PLA',
      tags: [{ name: 'Presente criativo' }, { name: 'Colecionável' }],
    };

    it('finds products by tag', () => {
      expect(matchesCatalogSearch(product, 'presente')).toBe(true);
      expect(matchesCatalogSearch(product, 'colecionavel')).toBe(true);
    });

    it('continues finding by name and description', () => {
      expect(matchesCatalogSearch(product, 'dragao')).toBe(true);
      expect(matchesCatalogSearch(product, 'PLA')).toBe(true);
    });

    it('rejects unrelated terms', () => {
      expect(matchesCatalogSearch(product, 'chaveiro')).toBe(false);
    });
  });

  describe('isCategory', () => {
    it('should accept valid categories', () => {
      expect(isCategory('chaveiros')).toBe(true);
      expect(isCategory('escritorio')).toBe(true);
      expect(isCategory('criaturas')).toBe(true);
    });

    it('should reject invalid categories', () => {
      expect(isCategory('encomenda')).toBe(false);
      expect(isCategory('random')).toBe(false);
      expect(isCategory('')).toBe(false);
    });
  });

  describe('shouldShowInCatalog', () => {
    it('should show regular active products', () => {
      expect(shouldShowInCatalog({ category: 'chaveiros', name: 'Chaveiro Legal', active: true })).toBe(true);
      expect(shouldShowInCatalog({ category: 'escritorio', name: 'Porta Caneta', active: true })).toBe(true);
      expect(shouldShowInCatalog({ category: 'criaturas', name: 'Dragão', active: true })).toBe(true);
    });

    it('should hide inactive products', () => {
      expect(shouldShowInCatalog({ category: 'chaveiros', name: 'Chaveiro', active: false })).toBe(false);
    });

    it('should hide encomenda category products', () => {
      expect(shouldShowInCatalog({ category: 'encomenda', name: 'Qualquer coisa', active: true })).toBe(false);
    });

    it('should hide products with name starting with Encomenda', () => {
      expect(shouldShowInCatalog({ category: 'chaveiros', name: 'Encomenda - Peça Custom', active: true })).toBe(false);
      expect(shouldShowInCatalog({ category: 'escritorio', name: 'Encomenda Personalizada', active: true })).toBe(false);
    });

    it('should not hide products that mention encomenda in the middle of name', () => {
      expect(shouldShowInCatalog({ category: 'chaveiros', name: 'Chaveiro de encomenda', active: true })).toBe(true);
    });
  });
});
