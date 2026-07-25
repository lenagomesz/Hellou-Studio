import 'server-only';
import { randomBytes } from 'node:crypto';

let developmentSecret: string | null = null;

export function getAuthSecret() {
  const configured = process.env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is required in production.');
  }
  developmentSecret ??= randomBytes(32).toString('base64url');
  return developmentSecret;
}

export function getAnalyticsSalt() {
  const configured = process.env.ANALYTICS_HASH_SALT?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ANALYTICS_HASH_SALT or NEXTAUTH_SECRET is required in production.');
  }
  developmentSecret ??= randomBytes(32).toString('base64url');
  return developmentSecret;
}
