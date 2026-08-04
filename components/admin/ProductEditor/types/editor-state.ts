import type { ProductCustomizationSection } from '@/lib/product-customization';

// ─── Mode ────────────────────────────────────────────────────────────────────
export type EditorMode = 'create' | 'edit';

// ─── Variation Draft ─────────────────────────────────────────────────────────
export interface DraftVariation {
  id: string;
  name: string;
  color?: string;
  priceModifier: number;
  stock: number;
  dimensions?: string;
  notes?: string;
  imageUrl?: string;
  _isDirty: boolean;
  _serverError?: string;
}

// ─── MercadoPago Fees ────────────────────────────────────────────────────────
export interface MercadoPagoFees {
  commission: number;
  installmentFee: number;
  withdrawalFee: number;
  finalPrice: number;
  calculatedAt: string | null;
}

// ─── Permissions ─────────────────────────────────────────────────────────────
export interface ProductEditorPermissions {
  canChangeStatus: boolean;
  canEditBasePrice: boolean;
  canEditCustomizations: boolean;
  canSyncMercadopago: boolean;
  canEditBasicInfo: boolean;
  canEditImages: boolean;
  canEditVariations: boolean;
  canEditSEO: boolean;
}

// ─── Version History ─────────────────────────────────────────────────────────
export interface VersionHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  changes: string[];
}

// ─── Editor State ────────────────────────────────────────────────────────────
export interface ProductEditorState {
  // Mode & ID
  mode: EditorMode;
  productId: string | null;

  // Basic Info
  name: string;
  description: string;
  category: string;
  tags: string[];
  sku: string;
  active: boolean;

  // Pricing
  basePrice: number;
  salePrice: number | null;
  costPrice: number | null;
  isWholesale: boolean;
  minimumOrderQuantity: number;

  // Images
  images: string[];

  // Inventory / Fulfillment
  fulfillmentMode: 'ship' | 'pickup' | 'digital';
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;

  // Variations
  variations: DraftVariation[];

  // Customization
  isCustomizable: boolean;
  customizationQuestion: string;
  customizationHelpText: string;
  customizationPlaceholder: string;
  customizationSections: ProductCustomizationSection[];

  // MercadoPago
  useMercadopago: boolean;
  mercadopagoFees: MercadoPagoFees | null;

  // SEO
  seoTitle: string;
  seoDescription: string;
  slug: string;

  // Editor Metadata
  errors: Record<string, string>;
  warnings: Record<string, string>;
  isDraft: boolean;
  draftSavedAt: string | null;
  isSubmitting: boolean;
  submitError: string | null;

  // Permissions
  permissions: ProductEditorPermissions;

  // History
  versionHistory: VersionHistoryEntry[];
}

// ─── Default Permissions ─────────────────────────────────────────────────────
export const DEFAULT_PERMISSIONS: ProductEditorPermissions = {
  canChangeStatus: true,
  canEditBasePrice: true,
  canEditCustomizations: true,
  canSyncMercadopago: true,
  canEditBasicInfo: true,
  canEditImages: true,
  canEditVariations: true,
  canEditSEO: true,
};

// ─── Factory ─────────────────────────────────────────────────────────────────
export function createInitialEditorState(
  mode: EditorMode,
  product?: Partial<ProductEditorState>,
): ProductEditorState {
  const base: ProductEditorState = {
    mode,
    productId: null,

    name: '',
    description: '',
    category: '',
    tags: [],
    sku: '',
    active: true,

    basePrice: 0,
    salePrice: null,
    costPrice: null,
    isWholesale: false,
    minimumOrderQuantity: 1,

    images: [],

    fulfillmentMode: 'ship',
    weightGrams: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,

    variations: [],

    isCustomizable: false,
    customizationQuestion: '',
    customizationHelpText: '',
    customizationPlaceholder: '',
    customizationSections: [],

    useMercadopago: false,
    mercadopagoFees: null,

    seoTitle: '',
    seoDescription: '',
    slug: '',

    errors: {},
    warnings: {},
    isDraft: true,
    draftSavedAt: null,
    isSubmitting: false,
    submitError: null,

    permissions: { ...DEFAULT_PERMISSIONS },

    versionHistory: [],
  };

  if (mode === 'edit' && product) {
    return { ...base, ...product, mode };
  }

  return base;
}
