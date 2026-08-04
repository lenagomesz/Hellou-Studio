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
