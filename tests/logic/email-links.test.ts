import { describe, expect, it } from 'vitest';
import { buildEmailUrl, normalizeEmailBaseUrl } from '@/lib/email-links';

describe('links transacionais de e-mail', () => {
  it('remove barras finais do domínio configurado', () => {
    expect(normalizeEmailBaseUrl('https://helloustudio.com.br///'))
      .toBe('https://helloustudio.com.br');
  });

  it('gera o acesso de e-mail que preserva login e pedido', () => {
    expect(buildEmailUrl('https://helloustudio.com.br/', '/pedido/order-123'))
      .toBe('https://helloustudio.com.br/pedido/order-123');
  });

  it('gera endereços válidos das demais áreas usadas nos e-mails', () => {
    expect(buildEmailUrl('https://helloustudio.com.br', '/products/product-1'))
      .toBe('https://helloustudio.com.br/products/product-1');
    expect(buildEmailUrl('https://helloustudio.com.br', '/account/requests'))
      .toBe('https://helloustudio.com.br/account/requests');
    expect(buildEmailUrl('https://helloustudio.com.br', '/dashboard/orders/order-1'))
      .toBe('https://helloustudio.com.br/dashboard/orders/order-1');
    expect(buildEmailUrl('https://helloustudio.com.br', '/dashboard/requests/request-1'))
      .toBe('https://helloustudio.com.br/dashboard/requests/request-1');
  });
});
