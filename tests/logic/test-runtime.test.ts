import { describe, expect, it } from 'vitest';
import { act } from 'react';

describe('test runtime', () => {
  it('loads React with act even when the deployment shell uses production mode', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(act).toBeTypeOf('function');
  });
});
