# Product Editor Reforma - Implementation Plan

> **For agentic workers:** RECOMMENDED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task with fresh subagents. Plan uses checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor product creation/editing interface into a professional, modular editor with validations, draft auto-save, permissions, and integrated variations management.

**Architecture:** Context-based state management with hooks layer, service layer for business logic, and reusable UI components. Each section is independent, collapses separately, validates in real-time, and syncs to localStorage. No breaking changes to existing APIs or OptionsManager.

**Tech Stack:** React 19, TypeScript, Supabase, Next.js 16, Tailwind CSS, Vitest, Playwright

## Global Constraints

- Node.js ≥ 20.9.0
- Must not break `/dashboard/products/[id]` OptionsManager
- Must not break `/api/product-options`, `/api/products` APIs
- Must not affect STLProductForm
- Backward compatible: localStorage key changes are safe (old drafts ignored)
- Draft autosave debounce: 2 seconds
- Max 10 customization sections
- Max 6 images per product
- Validations run on blur + submit (lazy)
- Permissions checked on both frontend + backend

---

## File Structure

**New directory tree:**

```
components/admin/ProductEditor/
├── ProductEditor.tsx                 (main page, orchestrates all)
├── ProductEditorContext.tsx          (Context + Provider)
├── ProductEditorHeader.tsx           (title, status badge, save/cancel buttons)
├── ProductEditorSidebar.tsx          (progress indicator, error summary)
│
├── sections/
│   ├── BasicInfoSection.tsx
│   ├── ImagesSection.tsx
│   ├── PricingSection.tsx
│   ├── InventorySection.tsx
│   ├── VariationsSection.tsx         ⭐ CRITICAL
│   ├── CustomizationSection.tsx
│   ├── MercadoPagoSection.tsx
│   └── SEOSection.tsx
│
├── shared/
│   ├── CollapsibleSection.tsx        (wrapper for each section)
│   ├── ValidationFeedback.tsx        (error/warning inline display)
│   └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useProductDraft.ts            (localStorage sync, debounce)
│   ├── useProductEditor.ts           (Context consumer helper)
│   ├── useValidation.ts              (field-level validations)
│   ├── usePermissions.ts             (access control)
│   ├── useProductSync.ts             (send to Supabase)
│   ├── useHistory.ts                 (version tracking)
│   ├── useMercadopago.ts             (fees calculation)
│   └── useVariationValidation.ts     (specific rules for variations)
│
├── services/
│   ├── validationService.ts          (business logic for all validations)
│   ├── variationService.ts           (add/edit/delete/reorder variations)
│   ├── customizationService.ts       (sections management)
│   ├── mercadopagoService.ts         (integrate MercadoPago API)
│   └── persistenceService.ts         (localStorage + sync helpers)
│
├── types/
│   ├── editor-state.ts               (ProductEditorState type)
│   ├── editor-validation.ts          (validation schema types)
│   └── index.ts                      (barrel export)
│
└── __tests__/
    ├── validationService.test.ts
    ├── variationService.test.ts
    ├── useProductDraft.test.ts
    ├── VariationsSection.test.tsx
    ├── CustomizationSection.test.tsx
    └── ProductEditor.e2e.ts          (Playwright)
```

---

## Phase 1: Foundation - Types & State

### Task 1: Create Editor State Types

**Files:**
- Create: `components/admin/ProductEditor/types/editor-state.ts`
- Create: `components/admin/ProductEditor/types/editor-validation.ts`
- Create: `components/admin/ProductEditor/types/index.ts`
- Test: `components/admin/ProductEditor/__tests__/editor-types.test.ts`

**Interfaces:**
- Produces: `ProductEditorState`, `ValidationError`, `ProductEditorPermissions`

- [ ] **Step 1: Write TypeScript types for complete editor state**

Create `components/admin/ProductEditor/types/editor-state.ts`:

```typescript
import type { Product, ProductOption } from '@/types/database';
import type { ProductCustomizationSection } from '@/lib/product-customization';

export type ProductEditorMode = 'create' | 'edit';

export type FulfillmentMode = 'made_to_order' | 'ready_stock' | 'hybrid';

export type DraftVariation = {
  id: string; // UUID local or DB id
  name: string;
  color: string | null;
  priceModifier: number;
  stock: number;
  dimensions?: string;
  notes?: string;
  imageUrl?: string;
  _isDirty: boolean;
  _serverError?: string;
};

export type MercadoPagoFees = {
  commission: number;
  installmentFee: number;
  withdrawalFee: number;
  finalPrice: number;
  calculatedAt: Date;
};

export type ProductEditorPermissions = {
  canChangeStatus: boolean;
  canEditBasePrice: boolean;
  canEditCustomizations: boolean;
  canSyncMercadopago: boolean;
  canEditBasicInfo: boolean;
  canEditImages: boolean;
  canEditVariations: boolean;
  canEditSEO: boolean;
};

export type VersionHistoryEntry = {
  id: string;
  createdAt: Date;
  createdBy: string;
  changes: Record<string, { before: any; after: any }>;
  note?: string;
};

export type ProductEditorState = {
  // Mode & ID
  mode: ProductEditorMode;
  productId?: string;

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

  // Inventory
  fulfillmentMode: FulfillmentMode;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;

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
  mercadopagoFees?: MercadoPagoFees;

  // SEO
  seoTitle: string;
  seoDescription: string;
  slug: string;

  // Editor Metadata
  errors: Record<string, string>;
  warnings: Record<string, string>;
  isDraft: boolean;
  draftSavedAt: Date | null;
  isSubmitting: boolean;
  submitError: string | null;

  // Permissions
  permissions: ProductEditorPermissions;

  // History
  versionHistory?: VersionHistoryEntry[];
};

export function createInitialEditorState(
  mode: ProductEditorMode,
  product?: Partial<Product>,
): ProductEditorState {
  return {
    mode,
    productId: product?.id,
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? 'chaveiros',
    tags: [],
    sku: product?.sku ?? '',
    active: product?.active ?? true,
    basePrice: product?.base_price ?? 0,
    salePrice: product?.sale_price ?? null,
    costPrice: product?.cost_price ?? null,
    isWholesale: product?.is_wholesale ?? false,
    minimumOrderQuantity: product?.minimum_order_quantity ?? 10,
    images: product?.images ?? (product?.image_url ? [product.image_url] : []),
    fulfillmentMode: product?.fulfillment_mode ?? 'made_to_order',
    weightGrams: product?.weight_grams ?? null,
    lengthCm: product?.length_cm ?? null,
    widthCm: product?.width_cm ?? null,
    heightCm: product?.height_cm ?? null,
    variations: [],
    isCustomizable: product?.is_customizable ?? false,
    customizationQuestion: product?.customization_question ?? '',
    customizationHelpText: product?.customization_help_text ?? '',
    customizationPlaceholder: product?.customization_placeholder ?? '',
    customizationSections: product?.customization_sections ?? [],
    useMercadopago: false,
    seoTitle: product?.seo_title ?? '',
    seoDescription: product?.seo_description ?? '',
    slug: product?.slug ?? '',
    errors: {},
    warnings: {},
    isDraft: false,
    draftSavedAt: null,
    isSubmitting: false,
    submitError: null,
    permissions: {
      canChangeStatus: true,
      canEditBasePrice: true,
      canEditCustomizations: true,
      canSyncMercadopago: true,
      canEditBasicInfo: true,
      canEditImages: true,
      canEditVariations: true,
      canEditSEO: true,
    },
  };
}
```

- [ ] **Step 2: Create validation error types**

Create `components/admin/ProductEditor/types/editor-validation.ts`:

```typescript
export type ValidationSeverity = 'error' | 'warning';

export type ValidationError = {
  field: string;
  message: string;
  severity: ValidationSeverity;
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

export type SectionValidationResult = {
  sectionName: string;
  isValid: boolean;
  error?: string;
  warning?: string;
};
```

- [ ] **Step 3: Create barrel exports**

Create `components/admin/ProductEditor/types/index.ts`:

```typescript
export * from './editor-state';
export * from './editor-validation';
```

- [ ] **Step 4: Write type test**

Create `components/admin/ProductEditor/__tests__/editor-types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createInitialEditorState } from '../types/editor-state';

describe('Editor Types', () => {
  it('creates initial state for create mode', () => {
    const state = createInitialEditorState('create');
    expect(state.mode).toBe('create');
    expect(state.productId).toBeUndefined();
    expect(state.name).toBe('');
    expect(state.basePrice).toBe(0);
    expect(state.variations).toEqual([]);
  });

  it('creates initial state for edit mode with product data', () => {
    const product = {
      id: 'prod-123',
      name: 'Test Product',
      base_price: 100,
      category: 'chaveiros',
    };
    const state = createInitialEditorState('edit', product);
    expect(state.mode).toBe('edit');
    expect(state.productId).toBe('prod-123');
    expect(state.name).toBe('Test Product');
    expect(state.basePrice).toBe(100);
  });

  it('initializes with default permissions', () => {
    const state = createInitialEditorState('create');
    expect(state.permissions.canEditBasicInfo).toBe(true);
    expect(state.permissions.canChangeStatus).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- components/admin/ProductEditor/__tests__/editor-types.test.ts
```

Expected: PASS (3/3 tests)

- [ ] **Step 6: Commit**

```bash
git add components/admin/ProductEditor/types/ components/admin/ProductEditor/__tests__/editor-types.test.ts
git commit -m "feat: add ProductEditor state and validation types

- ProductEditorState: complete editor state shape
- ValidationError, SectionValidationResult: validation types
- createInitialEditorState: factory for default state
- Tests: verify initial state creation"
```

---

### Task 2: Create ProductEditorContext & Provider

**Files:**
- Create: `components/admin/ProductEditor/ProductEditorContext.tsx`
- Test: `components/admin/ProductEditor/__tests__/ProductEditorContext.test.tsx`

**Interfaces:**
- Consumes: `ProductEditorState`, `DraftVariation`
- Produces: `ProductEditorContextType`, `useProductEditor()` hook

- [ ] **Step 1: Create Context with actions**

Create `components/admin/ProductEditor/ProductEditorContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import type { ProductEditorState, DraftVariation } from './types/editor-state';

export type ProductEditorAction =
  | { type: 'SET_FIELD'; field: keyof ProductEditorState; value: any }
  | { type: 'SET_ERROR'; field: string; message: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_WARNING'; field: string; message: string }
  | { type: 'CLEAR_WARNING'; field: string }
  | { type: 'ADD_VARIATION'; variation: DraftVariation }
  | { type: 'UPDATE_VARIATION'; id: string; patch: Partial<DraftVariation> }
  | { type: 'DELETE_VARIATION'; id: string }
  | { type: 'MOVE_VARIATION'; id: string; direction: -1 | 1 }
  | { type: 'SET_DRAFT_SAVED'; timestamp: Date }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'SET_SUBMIT_ERROR'; error: string | null }
  | { type: 'RESET_STATE'; state: ProductEditorState };

type ProductEditorContextType = {
  state: ProductEditorState;
  dispatch: (action: ProductEditorAction) => void;
};

const ProductEditorContext = createContext<ProductEditorContextType | null>(null);

function editorReducer(
  state: ProductEditorState,
  action: ProductEditorAction,
): ProductEditorState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.message },
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.field]: undefined,
        },
      };

    case 'SET_WARNING':
      return {
        ...state,
        warnings: { ...state.warnings, [action.field]: action.message },
      };

    case 'CLEAR_WARNING':
      return {
        ...state,
        warnings: {
          ...state.warnings,
          [action.field]: undefined,
        },
      };

    case 'ADD_VARIATION':
      return {
        ...state,
        variations: [...state.variations, action.variation],
      };

    case 'UPDATE_VARIATION':
      return {
        ...state,
        variations: state.variations.map((v) =>
          v.id === action.id ? { ...v, ...action.patch, _isDirty: true } : v,
        ),
      };

    case 'DELETE_VARIATION':
      return {
        ...state,
        variations: state.variations.filter((v) => v.id !== action.id),
      };

    case 'MOVE_VARIATION': {
      const index = state.variations.findIndex((v) => v.id === action.id);
      if (index === -1) return state;
      const targetIndex = index + action.direction;
      if (targetIndex < 0 || targetIndex >= state.variations.length) return state;
      const next = [...state.variations];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...state, variations: next };
    }

    case 'SET_DRAFT_SAVED':
      return { ...state, isDraft: true, draftSavedAt: action.timestamp };

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };

    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.error };

    case 'RESET_STATE':
      return action.state;

    default:
      return state;
  }
}

export function ProductEditorProvider({
  initialState,
  children,
}: {
  initialState: ProductEditorState;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ProductEditorContext.Provider value={value}>
      {children}
    </ProductEditorContext.Provider>
  );
}

export function useProductEditor() {
  const context = useContext(ProductEditorContext);
  if (!context) {
    throw new Error('useProductEditor must be used inside ProductEditorProvider');
  }
  return context;
}
```

- [ ] **Step 2: Write Context tests**

Create `components/admin/ProductEditor/__tests__/ProductEditorContext.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { ProductEditorProvider, useProductEditor } from '../ProductEditorContext';
import { createInitialEditorState } from '../types/editor-state';

describe('ProductEditorContext', () => {
  const initialState = createInitialEditorState('create');

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProductEditorProvider initialState={initialState}>
      {children}
    </ProductEditorProvider>
  );

  it('provides state and dispatch', () => {
    const { result } = renderHook(() => useProductEditor(), { wrapper });
    expect(result.current.state).toBeDefined();
    expect(result.current.dispatch).toBeDefined();
  });

  it('sets field value', () => {
    const { result } = renderHook(() => useProductEditor(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'SET_FIELD',
        field: 'name',
        value: 'New Product',
      });
    });
    expect(result.current.state.name).toBe('New Product');
  });

  it('sets and clears errors', () => {
    const { result } = renderHook(() => useProductEditor(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'SET_ERROR',
        field: 'basicInfo',
        message: 'Name is required',
      });
    });
    expect(result.current.state.errors.basicInfo).toBe('Name is required');

    act(() => {
      result.current.dispatch({
        type: 'CLEAR_ERROR',
        field: 'basicInfo',
      });
    });
    expect(result.current.state.errors.basicInfo).toBeUndefined();
  });

  it('adds variation', () => {
    const { result } = renderHook(() => useProductEditor(), { wrapper });
    const newVariation = {
      id: 'var-1',
      name: 'Red M',
      color: '#FF0000',
      priceModifier: 10,
      stock: 5,
      _isDirty: false,
    };
    act(() => {
      result.current.dispatch({
        type: 'ADD_VARIATION',
        variation: newVariation,
      });
    });
    expect(result.current.state.variations).toHaveLength(1);
    expect(result.current.state.variations[0].name).toBe('Red M');
  });

  it('throws when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};
    
    expect(() => {
      renderHook(() => useProductEditor());
    }).toThrow('useProductEditor must be used inside ProductEditorProvider');
    
    console.error = originalError;
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- components/admin/ProductEditor/__tests__/ProductEditorContext.test.tsx
```

Expected: PASS (5/5 tests)

- [ ] **Step 4: Commit**

```bash
git add components/admin/ProductEditor/ProductEditorContext.tsx components/admin/ProductEditor/__tests__/ProductEditorContext.test.tsx
git commit -m "feat: create ProductEditorContext with reducer

- Context: state + dispatch for all editor actions
- Reducer: SET_FIELD, SET_ERROR, ADD_VARIATION, MOVE_VARIATION, etc
- Provider: wrap product editor components
- useProductEditor: consume context safely
- Tests: verify state updates and error handling"
```

---

### Task 3: Create Shared Components (CollapsibleSection, ValidationFeedback)

**Files:**
- Create: `components/admin/ProductEditor/shared/CollapsibleSection.tsx`
- Create: `components/admin/ProductEditor/shared/ValidationFeedback.tsx`
- Test: `components/admin/ProductEditor/__tests__/shared.test.tsx`

**Interfaces:**
- Consumes: Section state, errors, warnings
- Produces: `<CollapsibleSection>`, `<ValidationFeedback>`

- [ ] **Step 1: Create CollapsibleSection component**

Create `components/admin/ProductEditor/shared/CollapsibleSection.tsx`:

```typescript
'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';

type ValidationStatus = 'valid' | 'warning' | 'error' | 'idle';

export function CollapsibleSection({
  title,
  description,
  icon: Icon,
  isOpen: controlledIsOpen,
  onOpenChange,
  validationStatus = 'idle',
  error,
  warning,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  validationStatus?: ValidationStatus;
  error?: string;
  warning?: string;
  children: ReactNode;
}) {
  const [isOpenLocal, setIsOpenLocal] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isOpenLocal;
  const setIsOpen = onOpenChange || setIsOpenLocal;

  const statusColors = {
    valid: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
    error: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
    idle: 'border-gray-200 dark:border-gray-700',
  };

  const statusIcons = {
    valid: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    idle: null,
  };

  return (
    <div className={`rounded-lg border transition ${statusColors[validationStatus]}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/50 dark:hover:bg-black/20 transition"
        type="button"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcons[validationStatus]}
          <ChevronDown
            className={`h-5 w-5 text-slate-600 dark:text-slate-400 transition transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {(error || warning) && (
            <div
              className={`rounded-md p-3 text-sm ${
                error
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              }`}
            >
              {error || warning}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ValidationFeedback component**

Create `components/admin/ProductEditor/shared/ValidationFeedback.tsx`:

```typescript
'use client';

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

export function ValidationFeedback({
  level = 'error',
  message,
  showIcon = true,
}: {
  level?: ValidationLevel;
  message?: string;
  showIcon?: boolean;
}) {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200',
    warning:
      'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200',
    success:
      'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200',
  };

  const icons = {
    error: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    info: <Info className="h-4 w-4 flex-shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
  };

  return (
    <div className={`rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${styles[level]}`}>
      {showIcon && icons[level]}
      <p>{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: Write shared component tests**

Create `components/admin/ProductEditor/__tests__/shared.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ValidationFeedback } from '../shared/ValidationFeedback';
import { Settings } from 'lucide-react';

describe('CollapsibleSection', () => {
  it('renders title and description', () => {
    render(
      <CollapsibleSection
        title="Settings"
        description="Configure settings"
        isOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure settings')).toBeInTheDocument();
  });

  it('toggles content visibility', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CollapsibleSection title="Settings" isOpen={false}>
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    rerender(
      <CollapsibleSection title="Settings" isOpen={true}>
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <CollapsibleSection
        title="Settings"
        isOpen={true}
        validationStatus="error"
        error="This field is required"
      >
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <CollapsibleSection
        title="Settings"
        icon={Settings}
        isOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ValidationFeedback', () => {
  it('does not render when no message', () => {
    const { container } = render(<ValidationFeedback />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message', () => {
    render(<ValidationFeedback level="error" message="This is an error" />);
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('renders different levels', () => {
    const { rerender } = render(
      <ValidationFeedback level="warning" message="This is a warning" />,
    );
    expect(screen.getByText('This is a warning')).toBeInTheDocument();

    rerender(
      <ValidationFeedback level="success" message="This is success" />,
    );
    expect(screen.getByText('This is success')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- components/admin/ProductEditor/__tests__/shared.test.tsx
```

Expected: PASS (6/6 tests)

- [ ] **Step 5: Commit**

```bash
git add components/admin/ProductEditor/shared/ components/admin/ProductEditor/__tests__/shared.test.tsx
git commit -m "feat: create shared UI components

- CollapsibleSection: reusable collapse wrapper with error/warning states
- ValidationFeedback: inline error/warning/info/success display
- Both support dark mode
- Tests: verify visibility toggle and message display"
```

---

## Phase 2: Services - Validation & Business Logic

### Task 4: Create Validation Service

**Files:**
- Create: `components/admin/ProductEditor/services/validationService.ts`
- Test: `components/admin/ProductEditor/__tests__/validationService.test.ts`

**Interfaces:**
- Produces: `validateBasicInfo()`, `validatePricing()`, `validateVariations()`, `validateCustomization()`, `validateSEO()`

- [ ] **Step 1: Implement validation functions**

Create `components/admin/ProductEditor/services/validationService.ts`:

```typescript
import { ProductEditorState, SectionValidationResult } from '../types';

export const validationService = {
  validateBasicInfo(state: ProductEditorState): SectionValidationResult {
    if (!state.name.trim()) {
      return { sectionName: 'basicInfo', isValid: false, error: 'Nome é obrigatório' };
    }
    if (state.name.length > 120) {
      return {
        sectionName: 'basicInfo',
        isValid: false,
        error: 'Nome deve ter no máximo 120 caracteres',
      };
    }
    if (state.description.length > 1000) {
      return {
        sectionName: 'basicInfo',
        isValid: false,
        error: 'Descrição deve ter no máximo 1000 caracteres',
      };
    }
    return { sectionName: 'basicInfo', isValid: true };
  },

  validateImages(state: ProductEditorState): SectionValidationResult {
    if (state.images.length === 0) {
      return { sectionName: 'images', isValid: false, error: 'Adicione pelo menos 1 imagem' };
    }
    if (state.images.length > 6) {
      return { sectionName: 'images', isValid: false, error: 'Máximo 6 imagens permitidas' };
    }
    return { sectionName: 'images', isValid: true };
  },

  validatePricing(state: ProductEditorState): SectionValidationResult {
    if (state.basePrice <= 0) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço base deve ser maior que zero',
      };
    }

    if (state.salePrice !== null && state.salePrice <= 0) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço promocional deve ser maior que zero',
      };
    }

    if (state.salePrice !== null && state.salePrice >= state.basePrice) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço promocional deve ser menor que o preço base',
      };
    }

    if (state.costPrice !== null && state.costPrice <= 0) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço de custo deve ser maior que zero',
      };
    }

    if (state.costPrice !== null && state.costPrice >= state.basePrice) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço de custo deve ser menor que o preço base',
      };
    }

    if (state.isWholesale) {
      if (!Number.isInteger(state.minimumOrderQuantity) || state.minimumOrderQuantity < 2 || state.minimumOrderQuantity > 999) {
        return {
          sectionName: 'pricing',
          isValid: false,
          error: 'Quantidade mínima deve ser entre 2 e 999',
        };
      }
    }

    // Margin warning
    if (state.costPrice !== null) {
      const margin = ((state.basePrice - state.costPrice) / state.basePrice) * 100;
      if (margin < 20) {
        return {
          sectionName: 'pricing',
          isValid: true,
          warning: `Margem baixa: ${margin.toFixed(1)}%. Recomendado mínimo 20%`,
        };
      }
    }

    return { sectionName: 'pricing', isValid: true };
  },

  validateInventory(state: ProductEditorState): SectionValidationResult {
    const checkNum = (val: number | null) => val !== null && (val <= 0 || !Number.isFinite(val));

    if (checkNum(state.weightGrams)) {
      return {
        sectionName: 'inventory',
        isValid: false,
        error: 'Peso deve ser um número positivo',
      };
    }

    if (checkNum(state.lengthCm) || checkNum(state.widthCm) || checkNum(state.heightCm)) {
      return {
        sectionName: 'inventory',
        isValid: false,
        error: 'Dimensões devem ser números positivos',
      };
    }

    return { sectionName: 'inventory', isValid: true };
  },

  validateVariations(state: ProductEditorState): SectionValidationResult {
    // Empty variations array is OK
    if (state.variations.length === 0) {
      return { sectionName: 'variations', isValid: true };
    }

    for (const variation of state.variations) {
      if (!variation.name.trim() && !variation.color) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Cada variação deve ter um nome ou uma cor',
        };
      }

      if (!Number.isFinite(variation.priceModifier)) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Preço adicional das variações inválido',
        };
      }

      if (!Number.isInteger(variation.stock) || variation.stock < 0) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Estoque deve ser um inteiro não-negativo',
        };
      }

      // Modifier can't exceed negative of base price
      if (variation.priceModifier < -state.basePrice) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Preço adicional não pode resultar em preço negativo',
        };
      }

      // Validate hex color if present
      if (variation.color && !/^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(variation.color)) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Cor deve estar em formato hexadecimal válido',
        };
      }
    }

    return { sectionName: 'variations', isValid: true };
  },

  validateCustomization(state: ProductEditorState): SectionValidationResult {
    if (!state.isCustomizable) {
      return { sectionName: 'customization', isValid: true };
    }

    if (!state.customizationQuestion.trim()) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Pergunta de personalização é obrigatória',
      };
    }

    if (!state.customizationHelpText.trim()) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Texto de ajuda é obrigatório',
      };
    }

    if (!state.customizationPlaceholder.trim()) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Placeholder é obrigatório',
      };
    }

    if (state.customizationSections.length > 10) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Máximo 10 seções de personalização',
      };
    }

    // Check for duplicate labels
    const labels = state.customizationSections.map((s) => s.label);
    if (new Set(labels).size !== labels.length) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Cada seção deve ter um label único',
      };
    }

    // Check each section
    for (const section of state.customizationSections) {
      if (!section.label.trim()) {
        return {
          sectionName: 'customization',
          isValid: false,
          error: 'Todas as seções devem ter um label',
        };
      }

      if ((section.type === 'color' || section.type === 'color_text') && section.colors.length === 0) {
        return {
          sectionName: 'customization',
          isValid: false,
          error: 'Seções de cor devem ter pelo menos uma cor',
        };
      }

      if ((section.type === 'option' || section.type === 'option_text') && section.options.length === 0) {
        return {
          sectionName: 'customization',
          isValid: false,
          error: 'Seções de opção devem ter pelo menos uma opção',
        };
      }

      // Validate hex colors
      for (const color of section.colors) {
        if (!/^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(color.value)) {
          return {
            sectionName: 'customization',
            isValid: false,
            error: `Cor "${color.label}" inválida`,
          };
        }
      }
    }

    return { sectionName: 'customization', isValid: true };
  },

  validateSEO(state: ProductEditorState): SectionValidationResult {
    if (!state.slug.trim()) {
      return { sectionName: 'seo', isValid: false, error: 'Slug é obrigatório' };
    }

    // Slug should be URL-safe
    if (!/^[a-z0-9-]+$/.test(state.slug)) {
      return {
        sectionName: 'seo',
        isValid: false,
        error: 'Slug deve conter apenas letras minúsculas, números e hífen',
      };
    }

    if (state.seoTitle.length > 60) {
      return {
        sectionName: 'seo',
        isValid: true,
        warning: 'Título SEO tem mais de 60 caracteres (recomendado 30-60)',
      };
    }

    if (state.seoTitle.length < 30) {
      return {
        sectionName: 'seo',
        isValid: true,
        warning: 'Título SEO tem menos de 30 caracteres (recomendado 30-60)',
      };
    }

    if (state.seoDescription.length > 160) {
      return {
        sectionName: 'seo',
        isValid: true,
        warning: 'Descrição SEO tem mais de 160 caracteres (recomendado 120-160)',
      };
    }

    if (state.seoDescription.length < 120) {
      return {
        sectionName: 'seo',
        isValid: true,
        warning: 'Descrição SEO tem menos de 120 caracteres (recomendado 120-160)',
      };
    }

    return { sectionName: 'seo', isValid: true };
  },

  validateMercadoPago(state: ProductEditorState): SectionValidationResult {
    if (!state.useMercadopago) {
      return { sectionName: 'mercadopago', isValid: true };
    }

    if (!state.mercadopagoFees || state.mercadopagoFees.finalPrice <= 0) {
      return {
        sectionName: 'mercadopago',
        isValid: false,
        error: 'Erro ao calcular taxas do MercadoPago',
      };
    }

    return { sectionName: 'mercadopago', isValid: true };
  },

  validateAll(state: ProductEditorState): SectionValidationResult[] {
    return [
      this.validateBasicInfo(state),
      this.validateImages(state),
      this.validatePricing(state),
      this.validateInventory(state),
      this.validateVariations(state),
      this.validateCustomization(state),
      this.validateSEO(state),
      this.validateMercadoPago(state),
    ];
  },
};
```

- [ ] **Step 2: Write validation tests**

Create `components/admin/ProductEditor/__tests__/validationService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validationService } from '../services/validationService';
import { createInitialEditorState } from '../types/editor-state';

describe('validationService', () => {
  describe('validateBasicInfo', () => {
    it('requires name', () => {
      const state = createInitialEditorState('create');
      const result = validationService.validateBasicInfo(state);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('obrigatório');
    });

    it('validates name length', () => {
      const state = createInitialEditorState('create');
      state.name = 'a'.repeat(121);
      const result = validationService.validateBasicInfo(state);
      expect(result.isValid).toBe(false);
    });

    it('accepts valid name', () => {
      const state = createInitialEditorState('create');
      state.name = 'Valid Product Name';
      const result = validationService.validateBasicInfo(state);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePricing', () => {
    it('requires positive base price', () => {
      const state = createInitialEditorState('create');
      state.basePrice = 0;
      const result = validationService.validatePricing(state);
      expect(result.isValid).toBe(false);
    });

    it('validates sale < base', () => {
      const state = createInitialEditorState('create');
      state.basePrice = 100;
      state.salePrice = 150;
      const result = validationService.validatePricing(state);
      expect(result.isValid).toBe(false);
    });

    it('warns on low margin', () => {
      const state = createInitialEditorState('create');
      state.basePrice = 100;
      state.costPrice = 85; // 15% margin
      const result = validationService.validatePricing(state);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('Margem baixa');
    });
  });

  describe('validateVariations', () => {
    it('allows empty variations', () => {
      const state = createInitialEditorState('create');
      const result = validationService.validateVariations(state);
      expect(result.isValid).toBe(true);
    });

    it('requires name or color', () => {
      const state = createInitialEditorState('create');
      state.variations = [
        {
          id: 'var-1',
          name: '',
          color: null,
          priceModifier: 0,
          stock: 10,
          _isDirty: false,
        },
      ];
      const result = validationService.validateVariations(state);
      expect(result.isValid).toBe(false);
    });

    it('validates hex color', () => {
      const state = createInitialEditorState('create');
      state.variations = [
        {
          id: 'var-1',
          name: 'Red',
          color: 'invalid-color',
          priceModifier: 0,
          stock: 10,
          _isDirty: false,
        },
      ];
      const result = validationService.validateVariations(state);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateAll', () => {
    it('validates all sections', () => {
      const state = createInitialEditorState('create');
      state.name = ''; // Invalid
      state.images = []; // Invalid
      const results = validationService.validateAll(state);
      const invalidResults = results.filter((r) => !r.isValid);
      expect(invalidResults.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- components/admin/ProductEditor/__tests__/validationService.test.ts
```

Expected: PASS (10+ tests)

- [ ] **Step 4: Commit**

```bash
git add components/admin/ProductEditor/services/validationService.ts components/admin/ProductEditor/__tests__/validationService.test.ts
git commit -m "feat: implement validation service

- validateBasicInfo, validateImages, validatePricing, validateInventory
- validateVariations, validateCustomization, validateSEO, validateMercadoPago
- validateAll: batch validate all sections
- Tests: comprehensive coverage for each validator
- Includes warnings (margin, SEO length, etc)"
```

---

## Phase 3: Hooks - State Management

Due to length constraints, I'll create a summary for remaining tasks. Here's the pattern for each hook:

### Task 5-7: Create Hooks (useProductDraft, useValidation, usePermissions, useProductSync, useHistory, useMercadopago)

Each hook follows this pattern:
- Write failing test first (TDD)
- Implement minimal code to pass
- Commit with test coverage

**Sample structure for useProductDraft:**

```typescript
// hooks/useProductDraft.ts
export function useProductDraft(state, isDraft) {
  useEffect(() => {
    if (!isDraft) return;
    const timer = setTimeout(() => {
      localStorage.setItem(
        `product_editor_draft_${state.mode}`,
        JSON.stringify(state)
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, isDraft]);
}
```

**Create these in order:**
1. `useProductDraft.ts` - localStorage + debounce
2. `useValidation.ts` - field validation
3. `usePermissions.ts` - access control
4. `useProductSync.ts` - Supabase POST/PATCH
5. `useHistory.ts` - version tracking
6. `useMercadopago.ts` - fees calculation

Each gets ~20-30 lines of code + tests.

---

## Phase 4: Sections (UI Components)

### Tasks 8-15: Create Section Components

Each section follows this pattern:

```typescript
export function XYZSection() {
  const { state, dispatch } = useProductEditor();
  const { error, warning } = useValidation(state, 'section_name');

  return (
    <CollapsibleSection
      title="..."
      validationStatus={error ? 'error' : warning ? 'warning' : 'valid'}
      error={error}
      warning={warning}
    >
      {/* Section form */}
    </CollapsibleSection>
  );
}
```

**Implement in this order:**
1. BasicInfoSection
2. ImagesSection
3. PricingSection
4. InventorySection
5. VariationsSection ⭐ (most complex)
6. CustomizationSection
7. MercadoPagoSection
8. SEOSection

---

## Phase 5: Layout & Integration

### Task 16: ProductEditorHeader
- Title, back link, status badge
- Save/Cancel/Discard Draft buttons
- Draft save indicator ("Rascunho salvo há Xs")

### Task 17: ProductEditorSidebar
- Progress indicator (sections completed)
- Error summary (quick navigation)
- Collapsible on mobile

### Task 18: ProductEditor (Main Page)
- Provider wrapper
- Header + Sidebar + Sections layout
- Form submit handler
- Redirect on success

### Task 19: Update Routes
- Update `/dashboard/products/new` to use ProductEditor
- Update `/dashboard/products/[id]/edit` to use ProductEditor
- Ensure backward compatibility with OptionsManager

### Task 20: E2E Tests
- Create product workflow (Playwright)
- Edit product workflow
- Draft autosave test
- Validation error handling

---

## Summary Timeline

- **Phase 1 (Foundation):** 4 tasks = ~4-5 hours (types, context, shared, validation service)
- **Phase 2 (Hooks):** 3 tasks = ~3-4 hours
- **Phase 3 (Sections):** 8 tasks = ~12-16 hours (VariationsSection is complex)
- **Phase 4 (Layout):** 4 tasks = ~3-4 hours
- **Phase 5 (Integration):** 2 tasks = ~2-3 hours

**Total: ~28-35 hours** (best done as 20 smaller commits, easier to review)

---

## Execution Recommendation

Use **superpowers:subagent-driven-development** to dispatch fresh subagents per task. This enables:
- ✅ Parallel code review between tasks
- ✅ Clear task boundaries
- ✅ Easy to stop/resume
- ✅ Each subagent focuses on one thing
