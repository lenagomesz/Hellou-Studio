import { describe, expect, it } from 'vitest';
import {
  createInitialEditorState,
  DEFAULT_PERMISSIONS,
  type ProductEditorState,
  type DraftVariation,
  type MercadoPagoFees,
  type ProductEditorPermissions,
} from '../types';

describe('ProductEditor types', () => {
  describe('createInitialEditorState - create mode', () => {
    it('returns a valid initial state for create mode', () => {
      const state = createInitialEditorState('create');

      expect(state.mode).toBe('create');
      expect(state.productId).toBeNull();
    });

    it('has empty basic info fields', () => {
      const state = createInitialEditorState('create');

      expect(state.name).toBe('');
      expect(state.description).toBe('');
      expect(state.category).toBe('');
      expect(state.tags).toEqual([]);
      expect(state.sku).toBe('');
      expect(state.active).toBe(true);
    });

    it('has zeroed pricing with correct defaults', () => {
      const state = createInitialEditorState('create');

      expect(state.basePrice).toBe(0);
      expect(state.salePrice).toBeNull();
      expect(state.costPrice).toBeNull();
      expect(state.isWholesale).toBe(false);
      expect(state.minimumOrderQuantity).toBe(1);
    });

    it('has empty images array', () => {
      const state = createInitialEditorState('create');
      expect(state.images).toEqual([]);
    });

    it('has default fulfillment settings', () => {
      const state = createInitialEditorState('create');

      expect(state.fulfillmentMode).toBe('ship');
      expect(state.weightGrams).toBe(0);
      expect(state.lengthCm).toBe(0);
      expect(state.widthCm).toBe(0);
      expect(state.heightCm).toBe(0);
    });

    it('has empty variations', () => {
      const state = createInitialEditorState('create');
      expect(state.variations).toEqual([]);
    });

    it('has disabled customization by default', () => {
      const state = createInitialEditorState('create');

      expect(state.isCustomizable).toBe(false);
      expect(state.customizationQuestion).toBe('');
      expect(state.customizationHelpText).toBe('');
      expect(state.customizationPlaceholder).toBe('');
      expect(state.customizationSections).toEqual([]);
    });

    it('has MercadoPago disabled by default', () => {
      const state = createInitialEditorState('create');

      expect(state.useMercadopago).toBe(false);
      expect(state.mercadopagoFees).toBeNull();
    });

    it('has empty SEO fields', () => {
      const state = createInitialEditorState('create');

      expect(state.seoTitle).toBe('');
      expect(state.seoDescription).toBe('');
      expect(state.slug).toBe('');
    });

    it('has clean editor metadata', () => {
      const state = createInitialEditorState('create');

      expect(state.errors).toEqual({});
      expect(state.warnings).toEqual({});
      expect(state.isDraft).toBe(true);
      expect(state.draftSavedAt).toBeNull();
      expect(state.isSubmitting).toBe(false);
      expect(state.submitError).toBeNull();
    });

    it('has default permissions (all true)', () => {
      const state = createInitialEditorState('create');

      expect(state.permissions).toEqual(DEFAULT_PERMISSIONS);
      expect(state.permissions.canChangeStatus).toBe(true);
      expect(state.permissions.canEditBasePrice).toBe(true);
      expect(state.permissions.canEditCustomizations).toBe(true);
      expect(state.permissions.canSyncMercadopago).toBe(true);
      expect(state.permissions.canEditBasicInfo).toBe(true);
      expect(state.permissions.canEditImages).toBe(true);
      expect(state.permissions.canEditVariations).toBe(true);
      expect(state.permissions.canEditSEO).toBe(true);
    });

    it('has empty version history', () => {
      const state = createInitialEditorState('create');
      expect(state.versionHistory).toEqual([]);
    });
  });

  describe('createInitialEditorState - edit mode', () => {
    it('populates from product data in edit mode', () => {
      const product: Partial<ProductEditorState> = {
        productId: 'prod_123',
        name: 'Widget Pro',
        description: 'A professional widget',
        category: 'electronics',
        tags: ['new', 'featured'],
        basePrice: 4999,
        active: true,
        images: ['img1.jpg', 'img2.jpg'],
      };

      const state = createInitialEditorState('edit', product);

      expect(state.mode).toBe('edit');
      expect(state.productId).toBe('prod_123');
      expect(state.name).toBe('Widget Pro');
      expect(state.description).toBe('A professional widget');
      expect(state.category).toBe('electronics');
      expect(state.tags).toEqual(['new', 'featured']);
      expect(state.basePrice).toBe(4999);
      expect(state.images).toEqual(['img1.jpg', 'img2.jpg']);
    });

    it('keeps mode as edit even if product tries to override', () => {
      const product: Partial<ProductEditorState> = {
        mode: 'create' as const,
        name: 'Test',
      };

      const state = createInitialEditorState('edit', product);
      expect(state.mode).toBe('edit');
    });

    it('fills missing fields with defaults in edit mode', () => {
      const product: Partial<ProductEditorState> = {
        productId: 'prod_456',
        name: 'Minimal Product',
      };

      const state = createInitialEditorState('edit', product);

      expect(state.productId).toBe('prod_456');
      expect(state.name).toBe('Minimal Product');
      // defaults still applied for unspecified fields
      expect(state.description).toBe('');
      expect(state.basePrice).toBe(0);
      expect(state.variations).toEqual([]);
      expect(state.permissions).toEqual(DEFAULT_PERMISSIONS);
    });
  });

  describe('DEFAULT_PERMISSIONS', () => {
    it('has exactly 8 permission keys all set to true', () => {
      const keys = Object.keys(DEFAULT_PERMISSIONS);
      expect(keys).toHaveLength(8);
      expect(keys).toContain('canChangeStatus');
      expect(keys).toContain('canEditBasePrice');
      expect(keys).toContain('canEditCustomizations');
      expect(keys).toContain('canSyncMercadopago');
      expect(keys).toContain('canEditBasicInfo');
      expect(keys).toContain('canEditImages');
      expect(keys).toContain('canEditVariations');
      expect(keys).toContain('canEditSEO');

      Object.values(DEFAULT_PERMISSIONS).forEach((v) => {
        expect(v).toBe(true);
      });
    });
  });

  describe('type correctness', () => {
    it('DraftVariation has required fields', () => {
      const variation: DraftVariation = {
        id: 'var_1',
        name: 'Size M',
        priceModifier: 500,
        stock: 10,
        _isDirty: false,
      };

      expect(variation.id).toBe('var_1');
      expect(variation.name).toBe('Size M');
      expect(variation.priceModifier).toBe(500);
      expect(variation.stock).toBe(10);
      expect(variation._isDirty).toBe(false);
      expect(variation.color).toBeUndefined();
      expect(variation.dimensions).toBeUndefined();
      expect(variation.notes).toBeUndefined();
      expect(variation.imageUrl).toBeUndefined();
      expect(variation._serverError).toBeUndefined();
    });

    it('MercadoPagoFees has all required fields', () => {
      const fees: MercadoPagoFees = {
        commission: 5.99,
        installmentFee: 2.5,
        withdrawalFee: 1.0,
        finalPrice: 4500,
        calculatedAt: '2026-01-15T10:00:00Z',
      };

      expect(fees.commission).toBe(5.99);
      expect(fees.installmentFee).toBe(2.5);
      expect(fees.withdrawalFee).toBe(1.0);
      expect(fees.finalPrice).toBe(4500);
      expect(fees.calculatedAt).toBe('2026-01-15T10:00:00Z');
    });

    it('ProductEditorPermissions has all 8 boolean fields', () => {
      const perms: ProductEditorPermissions = {
        canChangeStatus: false,
        canEditBasePrice: true,
        canEditCustomizations: false,
        canSyncMercadopago: true,
        canEditBasicInfo: true,
        canEditImages: false,
        canEditVariations: true,
        canEditSEO: false,
      };

      expect(typeof perms.canChangeStatus).toBe('boolean');
      expect(typeof perms.canEditBasePrice).toBe('boolean');
      expect(typeof perms.canEditCustomizations).toBe('boolean');
      expect(typeof perms.canSyncMercadopago).toBe('boolean');
      expect(typeof perms.canEditBasicInfo).toBe('boolean');
      expect(typeof perms.canEditImages).toBe('boolean');
      expect(typeof perms.canEditVariations).toBe('boolean');
      expect(typeof perms.canEditSEO).toBe('boolean');
    });
  });
});
