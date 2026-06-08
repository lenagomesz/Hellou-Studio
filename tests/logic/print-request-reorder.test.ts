import { describe, it, expect } from 'vitest';

interface PrintRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  stl_file_url: string | null;
  stl_file_name: string | null;
  stl_file_size: number | null;
  status: string;
}

function buildReorderPayload(original: PrintRequest, userId: string) {
  return {
    user_id: userId,
    title: original.title,
    description: original.description,
    notes: original.notes,
    stl_file_url: original.stl_file_url,
    stl_file_name: original.stl_file_name,
    stl_file_size: original.stl_file_size,
    status: 'pending' as const,
  };
}

function canReorder(request: PrintRequest, userId: string): { allowed: boolean; reason?: string } {
  if (request.user_id !== userId) {
    return { allowed: false, reason: 'not_owner' };
  }
  if (!['delivered', 'canceled', 'rejected'].includes(request.status)) {
    return { allowed: false, reason: 'invalid_status' };
  }
  return { allowed: true };
}

describe('Print Request Reorder', () => {
  const sampleRequest: PrintRequest = {
    id: 'pr-1',
    user_id: 'user-1',
    title: 'Peça customizada',
    description: 'Uma peça legal',
    notes: 'Cor azul',
    stl_file_url: 'https://storage.example.com/file.stl',
    stl_file_name: 'file.stl',
    stl_file_size: 1024000,
    status: 'delivered',
  };

  describe('buildReorderPayload', () => {
    it('should copy fields from original request with pending status', () => {
      const payload = buildReorderPayload(sampleRequest, 'user-1');

      expect(payload.title).toBe('Peça customizada');
      expect(payload.description).toBe('Uma peça legal');
      expect(payload.notes).toBe('Cor azul');
      expect(payload.stl_file_url).toBe('https://storage.example.com/file.stl');
      expect(payload.stl_file_name).toBe('file.stl');
      expect(payload.stl_file_size).toBe(1024000);
      expect(payload.status).toBe('pending');
      expect(payload.user_id).toBe('user-1');
    });

    it('should handle null optional fields', () => {
      const minimal: PrintRequest = {
        ...sampleRequest,
        description: null,
        notes: null,
        stl_file_url: null,
        stl_file_name: null,
        stl_file_size: null,
      };

      const payload = buildReorderPayload(minimal, 'user-1');
      expect(payload.description).toBeNull();
      expect(payload.notes).toBeNull();
      expect(payload.stl_file_url).toBeNull();
    });
  });

  describe('canReorder', () => {
    it('should allow reorder for delivered requests by owner', () => {
      expect(canReorder(sampleRequest, 'user-1').allowed).toBe(true);
    });

    it('should allow reorder for canceled requests', () => {
      const canceled = { ...sampleRequest, status: 'canceled' };
      expect(canReorder(canceled, 'user-1').allowed).toBe(true);
    });

    it('should allow reorder for rejected requests', () => {
      const rejected = { ...sampleRequest, status: 'rejected' };
      expect(canReorder(rejected, 'user-1').allowed).toBe(true);
    });

    it('should reject reorder for pending/processing requests', () => {
      const pending = { ...sampleRequest, status: 'pending' };
      expect(canReorder(pending, 'user-1').allowed).toBe(false);
      expect(canReorder(pending, 'user-1').reason).toBe('invalid_status');

      const processing = { ...sampleRequest, status: 'processing' };
      expect(canReorder(processing, 'user-1').allowed).toBe(false);
    });

    it('should reject reorder by non-owner', () => {
      expect(canReorder(sampleRequest, 'user-2').allowed).toBe(false);
      expect(canReorder(sampleRequest, 'user-2').reason).toBe('not_owner');
    });
  });
});
