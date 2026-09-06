import { describe, expect, it } from 'vitest';
import { deletedCustomerPatch } from './user-deletion';

describe('exclusão segura de clientes', () => {
  it('remove dados pessoais, libera o email e revoga sessões', () => {
    const patch = deletedCustomerPatch('6b2d4a8b-c849-4a3e-b219-d1cb8d627b54', 3, '2026-09-06T10:00:00.000Z');
    expect(patch).toMatchObject({
      email: 'deleted.6b2d4a8b-c849-4a3e-b219-d1cb8d627b54@deleted.invalid',
      name: null,
      phone: null,
      cpf: null,
      avatar_url: null,
      is_vip: false,
      session_version: 4,
      deleted_at: '2026-09-06T10:00:00.000Z',
    });
  });
});
