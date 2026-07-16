const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'E2E_PHYSICAL_PRODUCT_ID',
  'E2E_CUSTOM_PRODUCT_ID',
  'E2E_STL_PRODUCT_ID',
  'E2E_COUPON_CODE',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_EMAIL_DOMAIN',
  'E2E_CPF',
  'E2E_CEP',
  'E2E_CARD_NUMBER',
  'E2E_CARD_NAME',
  'E2E_CARD_EXPIRY',
  'E2E_CARD_CVV',
] as const;

export function requireE2EEnvironment() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variáveis E2E ausentes: ${missing.join(', ')}`);

  const placeholders = REQUIRED.filter((key) => {
    const value = process.env[key]?.trim() ?? '';
    return /^(uuid-do-|COLOQUE_|EMAIL_DO_|SENHA_REAL_|uma-senha-exclusiva-de-teste|example\.com)/i.test(value);
  });
  if (placeholders.length) {
    throw new Error(`Variáveis E2E ainda usam valores de exemplo: ${placeholders.join(', ')}`);
  }
}

export function e2eValue(key: typeof REQUIRED[number]) {
  const value = process.env[key];
  if (!value) throw new Error(`Variável E2E ausente: ${key}`);
  return value;
}

export function buildUniqueE2EEmail(destination: string, timestamp = Date.now()) {
  const normalized = destination.trim().toLowerCase();
  if (normalized.includes('@')) {
    const separator = normalized.lastIndexOf('@');
    const localPart = normalized.slice(0, separator).replace(/\+.*$/, '');
    const domain = normalized.slice(separator + 1);
    if (!localPart || !domain) throw new Error('E2E_EMAIL_DOMAIN possui um e-mail inválido');
    return `${localPart}+e2e-${timestamp}@${domain}`;
  }

  if (!normalized || !normalized.includes('.')) {
    throw new Error('E2E_EMAIL_DOMAIN deve ser um domínio ou um e-mail completo');
  }
  return `e2e+${timestamp}@${normalized}`;
}
