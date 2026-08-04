import { describe, it, expect } from 'vitest';
import { ProductEditorProvider, useProductEditor } from '../ProductEditorContext';
import { createInitialEditorState } from '../types/editor-state';

describe('ProductEditorContext', () => {
  it('exports ProductEditorProvider', () => {
    expect(ProductEditorProvider).toBeDefined();
    expect(typeof ProductEditorProvider).toBe('function');
  });

  it('exports useProductEditor hook', () => {
    expect(useProductEditor).toBeDefined();
    expect(typeof useProductEditor).toBe('function');
  });

  it('creates initial state correctly', () => {
    const state = createInitialEditorState('create');
    expect(state.mode).toBe('create');
    expect(state.name).toBe('');
    expect(state.variations).toEqual([]);
  });
});
