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
    const originalError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => useProductEditor());
    }).toThrow('useProductEditor must be used inside ProductEditorProvider');

    console.error = originalError;
  });
});
