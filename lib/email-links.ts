const DEFAULT_APP_URL = 'https://helloustudio.com.br';

export function normalizeEmailBaseUrl(value?: string | null): string {
  const candidate = value?.trim() || DEFAULT_APP_URL;
  return candidate.replace(/\/+$/, '');
}

export function buildEmailUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeEmailBaseUrl(baseUrl)}${normalizedPath}`;
}
