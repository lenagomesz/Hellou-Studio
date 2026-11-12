import { describe, expect, it } from 'vitest';
import { getWhatsAppUrl, normalizeWhatsAppPhone } from '@/lib/whatsapp';

describe('normalizeWhatsAppPhone', () => {
  it('adds the Brazilian country code to local 10- and 11-digit numbers', () => {
    expect(normalizeWhatsAppPhone('(11) 99876-5432')).toBe('5511998765432');
    expect(normalizeWhatsAppPhone('(11) 3456-7890')).toBe('551134567890');
  });

  it('keeps an explicitly Brazilian international number unchanged', () => {
    expect(normalizeWhatsAppPhone('+55 11 99876-5432')).toBe('5511998765432');
  });

  it('does not mistake local DDD 55 for a country code', () => {
    expect(normalizeWhatsAppPhone('(55) 99876-5432')).toBe('5555998765432');
  });

  it.each([undefined, null, '', '119987654', '55119987654321', '+1 212 555 1212'])('rejects invalid numbers: %s', (phone) => {
    expect(normalizeWhatsAppPhone(phone)).toBeNull();
  });

  it('builds a wa.me URL without a pre-filled message', () => {
    expect(getWhatsAppUrl('(11) 99876-5432')).toBe('https://wa.me/5511998765432');
  });
});
