import { describe, it, expect } from 'vitest';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ValidationFeedback } from '../shared/ValidationFeedback';

describe('Shared UI Components', () => {
  it('CollapsibleSection component exports correctly', () => {
    expect(CollapsibleSection).toBeDefined();
    expect(typeof CollapsibleSection).toBe('function');
  });

  it('ValidationFeedback component exports correctly', () => {
    expect(ValidationFeedback).toBeDefined();
    expect(typeof ValidationFeedback).toBe('function');
  });
});
