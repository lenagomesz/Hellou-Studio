import { describe, expect, it } from 'vitest';
import { forceLightEmailHtml } from '@/lib/email-html';

describe('forceLightEmailHtml', () => {
  it('envolve fragmentos com documento e tema claro', () => {
    const html = forceLightEmailHtml('<p>Pedido confirmado</p>');

    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain('<meta name="supported-color-schemes" content="light">');
    expect(html).toContain('class="hellou-email-light"');
    expect(html).toContain('<p>Pedido confirmado</p>');
  });

  it('injeta a configuração em documentos completos sem criar outro html', () => {
    const html = forceLightEmailHtml('<html><head><title>Campanha</title></head><body>Olá</body></html>');

    expect(html.match(/<html/gi)).toHaveLength(1);
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain('<title>Campanha</title>');
  });
});
