/** Converts a Brazilian phone number to the digits accepted by wa.me. */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  const value = phone?.trim() ?? '';
  const digits = value.replace(/\D/g, '');

  // An explicit international prefix must be Brazil's country code.
  if (value.startsWith('+') && !digits.startsWith('55')) return null;

  // A local number has DDD + 8 or 9 digits. Do not infer a country code from
  // its prefix: DDD 55 is valid and must still receive Brazil's 55 prefix.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  // International numbers accepted here must explicitly be Brazilian.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits;

  return null;
}

export function getWhatsAppUrl(phone: string | null | undefined): string | null {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  return normalizedPhone ? `https://wa.me/${normalizedPhone}` : null;
}
