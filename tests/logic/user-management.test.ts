import { describe, it, expect } from 'vitest';
import { hasAdminPermission } from '@/lib/admin-permissions';

interface BannedEmail {
  email: string;
  reason: string | null;
  banned_at: string;
}

function isEmailBanned(email: string, bannedList: BannedEmail[]): boolean {
  return bannedList.some(b => b.email.toLowerCase() === email.toLowerCase());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

describe('User Management', () => {
  describe('permissões da sócia operacional', () => {
    it('permite consultar e gerenciar dados operacionais sem alterar status sensíveis', () => {
      expect(hasAdminPermission('partner', 'orders.manage')).toBe(true);
      expect(hasAdminPermission('partner', 'products.manage')).toBe(true);
      expect(hasAdminPermission('partner', 'orders.status.manage')).toBe(false);
      expect(hasAdminPermission('partner', 'products.status.manage')).toBe(false);
    });

    it('mantém as alterações de status disponíveis para a administradora principal', () => {
      expect(hasAdminPermission('owner', 'orders.status.manage')).toBe(true);
      expect(hasAdminPermission('owner', 'products.status.manage')).toBe(true);
    });
  });

  describe('isEmailBanned', () => {
    const bannedList: BannedEmail[] = [
      { email: 'bad@example.com', reason: 'spam', banned_at: '2024-01-01T00:00:00Z' },
      { email: 'troll@test.com', reason: null, banned_at: '2024-02-01T00:00:00Z' },
    ];

    it('should detect banned emails', () => {
      expect(isEmailBanned('bad@example.com', bannedList)).toBe(true);
      expect(isEmailBanned('troll@test.com', bannedList)).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isEmailBanned('BAD@EXAMPLE.COM', bannedList)).toBe(true);
      expect(isEmailBanned('Bad@Example.Com', bannedList)).toBe(true);
    });

    it('should return false for non-banned emails', () => {
      expect(isEmailBanned('good@example.com', bannedList)).toBe(false);
      expect(isEmailBanned('hello@test.com', bannedList)).toBe(false);
    });

    it('should handle empty banned list', () => {
      expect(isEmailBanned('any@email.com', [])).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim', () => {
      expect(normalizeEmail('  HELLO@Test.Com  ')).toBe('hello@test.com');
    });

    it('should handle already normalized emails', () => {
      expect(normalizeEmail('user@domain.com')).toBe('user@domain.com');
    });
  });
});
