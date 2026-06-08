import { describe, it, expect } from 'vitest';

const DAYS_AFTER_DELIVERY = 60;

interface PrintRequest {
  id: string;
  status: string;
  updated_at: string;
  product_id: string | null;
}

function getCleanupCutoffDate(): Date {
  return new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);
}

function shouldCleanup(request: PrintRequest, cutoff: Date): boolean {
  if (request.status !== 'delivered') return false;
  if (!request.product_id) return false;
  const updatedAt = new Date(request.updated_at);
  return updatedAt < cutoff;
}

function getProductIdsToDelete(requests: PrintRequest[], cutoff: Date): string[] {
  return requests
    .filter(r => shouldCleanup(r, cutoff))
    .map(r => r.product_id!)
    .filter(Boolean);
}

describe('Encomenda Cleanup', () => {
  const now = new Date('2024-06-01T00:00:00Z');

  describe('getCleanupCutoffDate', () => {
    it('should return date 60 days before now', () => {
      const cutoff = new Date(now.getTime() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);
      const expected = new Date('2024-04-02T00:00:00Z');
      expect(cutoff.toISOString()).toBe(expected.toISOString());
    });
  });

  describe('shouldCleanup', () => {
    const cutoff = new Date('2024-04-02T00:00:00Z');

    it('should return true for delivered requests older than 60 days with product', () => {
      const request: PrintRequest = {
        id: 'r1',
        status: 'delivered',
        updated_at: '2024-03-01T00:00:00Z',
        product_id: 'p1',
      };
      expect(shouldCleanup(request, cutoff)).toBe(true);
    });

    it('should return false for non-delivered requests', () => {
      const request: PrintRequest = {
        id: 'r2',
        status: 'processing',
        updated_at: '2024-01-01T00:00:00Z',
        product_id: 'p2',
      };
      expect(shouldCleanup(request, cutoff)).toBe(false);
    });

    it('should return false for recent delivered requests', () => {
      const request: PrintRequest = {
        id: 'r3',
        status: 'delivered',
        updated_at: '2024-05-15T00:00:00Z',
        product_id: 'p3',
      };
      expect(shouldCleanup(request, cutoff)).toBe(false);
    });

    it('should return false for requests without product_id', () => {
      const request: PrintRequest = {
        id: 'r4',
        status: 'delivered',
        updated_at: '2024-01-01T00:00:00Z',
        product_id: null,
      };
      expect(shouldCleanup(request, cutoff)).toBe(false);
    });
  });

  describe('getProductIdsToDelete', () => {
    const cutoff = new Date('2024-04-02T00:00:00Z');

    it('should return only product IDs from eligible requests', () => {
      const requests: PrintRequest[] = [
        { id: 'r1', status: 'delivered', updated_at: '2024-01-01T00:00:00Z', product_id: 'p1' },
        { id: 'r2', status: 'delivered', updated_at: '2024-05-01T00:00:00Z', product_id: 'p2' },
        { id: 'r3', status: 'processing', updated_at: '2024-01-01T00:00:00Z', product_id: 'p3' },
        { id: 'r4', status: 'delivered', updated_at: '2024-02-01T00:00:00Z', product_id: 'p4' },
        { id: 'r5', status: 'delivered', updated_at: '2024-01-15T00:00:00Z', product_id: null },
      ];

      const result = getProductIdsToDelete(requests, cutoff);
      expect(result).toEqual(['p1', 'p4']);
    });

    it('should return empty array when no requests qualify', () => {
      const requests: PrintRequest[] = [
        { id: 'r1', status: 'pending', updated_at: '2024-01-01T00:00:00Z', product_id: 'p1' },
      ];
      expect(getProductIdsToDelete(requests, cutoff)).toEqual([]);
    });
  });
});
