import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createHash } from 'crypto';
import { randomBytes } from 'crypto';

const ISSUER = 'Hellou Studio';

export async function generate2FA(email: string) {
  const secret = speakeasy.generateSecret({
    name: `${ISSUER} (${email})`,
    issuer: ISSUER,
  });

  if (!secret.base32 || !secret.otpauth_url) {
    throw new Error('Failed to generate 2FA secret');
  }

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode,
  };
}

export function verify2FA(secret: string, token: string): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
    return verified === true;
  } catch {
    return false;
  }
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomBytes_ = randomBytes(6).toString('hex').toUpperCase();
    codes.push(randomBytes_);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/\s/g, '');
  return createHash('sha256').update(normalized).digest('hex');
}

export function verifyBackupCode(
  hashedCodes: string[],
  code: string,
): { valid: boolean; remaining: string[] } {
  const codeHash = hashBackupCode(code);
  const index = hashedCodes.indexOf(codeHash);

  if (index === -1) {
    return { valid: false, remaining: hashedCodes };
  }

  const remaining = hashedCodes.filter((_, i) => i !== index);
  return { valid: true, remaining };
}
