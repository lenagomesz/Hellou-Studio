'use client';

import { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import type { ProductEditorState, DraftVariation } from './types/editor-state';

export type ProductEditorAction =
  | { type: 'SET_FIELD'; field: keyof ProductEditorState; value: unknown }
  | { type: 'SET_ERROR'; field: string; message: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_WARNING'; field: string; message: string }
  | { type: 'CLEAR_WARNING'; field: string }
  | { type: 'ADD_VARIATION'; variation: DraftVariation }
  | { type: 'UPDATE_VARIATION'; id: string; patch: Partial<DraftVariation> }
  | { type: 'DELETE_VARIATION'; id: string }
  | { type: 'MOVE_VARIATION'; id: string; direction: -1 | 1 }
  | { type: 'SET_IMAGES'; images: string[] }
  | { type: 'ADD_IMAGE'; url: string }
  | { type: 'REMOVE_IMAGE'; index: number }
  | { type: 'MOVE_IMAGE'; fromIndex: number; toIndex: number }
  | { type: 'SET_TAGS'; tags: string[] }
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

    case 'CLEAR_ERROR': {
      const { [action.field]: _, ...rest } = state.errors;
      return { ...state, errors: rest };
    }

    case 'SET_WARNING':
      return {
        ...state,
        warnings: { ...state.warnings, [action.field]: action.message },
      };

    case 'CLEAR_WARNING': {
      const { [action.field]: _, ...rest } = state.warnings;
      return { ...state, warnings: rest };
    }

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

    case 'SET_IMAGES':
      return { ...state, images: action.images };

    case 'ADD_IMAGE':
      if (state.images.length >= 6 || state.images.includes(action.url)) return state;
      return { ...state, images: [...state.images, action.url] };

    case 'REMOVE_IMAGE':
      return {
        ...state,
        images: state.images.filter((_, i) => i !== action.index),
      };

    case 'MOVE_IMAGE': {
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= state.images.length || toIndex < 0 || toIndex >= state.images.length) return state;
      const next = [...state.images];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return { ...state, images: next };
    }

    case 'SET_TAGS':
      return { ...state, tags: action.tags };

    case 'SET_DRAFT_SAVED':
      return {
        ...state,
        isDraft: true,
        draftSavedAt: action.timestamp.toISOString(),
      };

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

interface ProductEditorProviderProps {
  readonly initialState: ProductEditorState;
  readonly children: ReactNode;
}

export function ProductEditorProvider({
  initialState,
  children,
}: ProductEditorProviderProps) {
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
