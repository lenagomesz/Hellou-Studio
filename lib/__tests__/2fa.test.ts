import { describe, it, expect } from 'vitest';
import {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../2fa';

describe('2FA Security Functions', () => {
  describe('generateBackupCodes', () => {
    it('should generate 10 codes by default', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it('should generate codes with correct length (12 chars for hex)', () => {
      const codes = generateBackupCodes(5);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{12}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(100);
      const unique = new Set(codes);
      expect(unique.size).toBe(100);
    });

    it('should use cryptographically secure random', () => {
      const codes1 = generateBackupCodes(10);
      const codes2 = generateBackupCodes(10);
      expect(codes1).not.toEqual(codes2);
    });
  });

  describe('hashBackupCode', () => {
    it('should hash codes consistently', () => {
      const code = 'ABC123DEF456';
      const hash1 = hashBackupCode(code);
      const hash2 = hashBackupCode(code);
      expect(hash1).toBe(hash2);
    });

    it('should handle case normalization', () => {
      const hash1 = hashBackupCode('ABC123DEF456');
      const hash2 = hashBackupCode('abc123def456');
      expect(hash1).toBe(hash2);
    });

    it('should handle whitespace normalization', () => {
      const hash1 = hashBackupCode('ABC123 DEF456');
      const hash2 = hashBackupCode('ABC123DEF456');
      expect(hash1).toBe(hash2);
    });

    it('should produce SHA-256 hash (64 hex chars)', () => {
      const code = 'TEST123456';
      const hash = hashBackupCode(code);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('different codes should produce different hashes', () => {
      const hash1 = hashBackupCode('CODE1');
      const hash2 = hashBackupCode('CODE2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify a valid backup code', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(hashBackupCode);

      const result = verifyBackupCode(hashedCodes, codes[0]);
      expect(result.valid).toBe(true);
    });

    it('should reject an invalid backup code', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(hashBackupCode);

      const result = verifyBackupCode(hashedCodes, 'INVALID');
      expect(result.valid).toBe(false);
    });

    it('should remove used code from remaining codes', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(hashBackupCode);

      const result = verifyBackupCode(hashedCodes, codes[1]);
      expect(result.remaining).toHaveLength(2);
      expect(result.remaining).not.toContain(hashedCodes[1]);
    });

    it('should handle case insensitivity', () => {
      const codes = generateBackupCodes(1);
      const hashedCodes = codes.map(hashBackupCode);

      const lowerResult = verifyBackupCode(
        hashedCodes,
        codes[0].toLowerCase(),
      );
      expect(lowerResult.valid).toBe(true);
    });

    it('should handle whitespace normalization', () => {
      const codes = generateBackupCodes(1);
      const hashedCodes = codes.map(hashBackupCode);

      const codeWithSpace = codes[0].slice(0, 6) + ' ' + codes[0].slice(6);
      const result = verifyBackupCode(hashedCodes, codeWithSpace);
      expect(result.valid).toBe(true);
    });

    it('should maintain order when removing code', () => {
      const codes = generateBackupCodes(5);
      const hashedCodes = codes.map(hashBackupCode);

      const result = verifyBackupCode(hashedCodes, codes[2]);
      expect(result.remaining).toEqual([
        hashedCodes[0],
        hashedCodes[1],
        hashedCodes[3],
        hashedCodes[4],
      ]);
    });

    it('should return unchanged array if code not found', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(hashBackupCode);

      const result = verifyBackupCode(hashedCodes, 'NOTFOUND');
      expect(result.remaining).toEqual(hashedCodes);
    });
  });
});
