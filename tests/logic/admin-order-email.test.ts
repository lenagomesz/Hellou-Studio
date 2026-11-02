// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toOrderEmailItems } from '@/lib/order-email-items';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/email-delivery', () => ({ sendTrackedEmail: send }));
vi.mock('@/lib/observability', () => ({ structuredLog: vi.fn() }));
vi.mock('resend', () => ({ Resend: class MockResend {} }));

import { sendAdminNewOrderEmail } from '@/lib/email';

describe('itens na notificação administrativa de pedido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://helloustudio.com.br';
    send.mockResolvedValue({ error: null, data: { id: 'email-test' } });
  });

  it('preserva nome, variação e escolhas comprados quando o catálogo muda', () => {
    expect(toOrderEmailItems([{
      quantity: 2, unit_price: 49.9, customization_text: null,
      product_snapshot: {
        name: 'Kit Natal', option_name: 'Vermelho', customization_text: 'Nome: Ana',
      },
      product: { name: 'Nome alterado' }, option: { name: 'Azul' },
    }])).toEqual([{
      nome: 'Kit Natal', quantidade: 2, precoUnitario: 49.9,
      variacao: 'Vermelho', personalizacao: 'Nome: Ana',
    }]);
  });

  it('usa os dados disponíveis de pedidos antigos e aceita produto removido', () => {
    const base = { quantity: 1, unit_price: 12.9, product_snapshot: null, customization_text: null };
    expect(toOrderEmailItems([
      { ...base, product: { name: 'Porta-bombom' }, option: { name: 'Rena' } },
      base,
    ]).map(item => [item.nome, item.variacao])).toEqual([
      ['Porta-bombom', 'Rena'], ['Produto', null],
    ]);
  });

  it('mostra todos os itens, quantidades, preços e personalização sem interpretar HTML do cliente', async () => {
    await sendAdminNewOrderEmail({
      adminEmail: 'loja@example.com', orderId: 'pedido-123',
      customerName: 'Ana <script>', customerEmail: 'ana@example.com', total: 112.7,
      itens: [{
        nome: 'Kit <Natal>', quantidade: 2, precoUnitario: 49.9,
        variacao: 'Rena & árvore', personalizacao: 'Cor: Verde\nNome: <img src=x>',
      }, {
        nome: 'Porta-bombom', quantidade: 1, precoUnitario: 12.9,
        variacao: null, personalizacao: null,
      }],
    });

    const payload = send.mock.calls[0][1] as { to: string; html: string };
    const html = payload.html.replace(/\u00a0/g, ' ');
    expect(payload.to).toBe('loja@example.com');
    expect(html).toContain('Itens do pedido');
    expect(html).toContain('Kit &lt;Natal&gt;');
    expect(html).toContain('Porta-bombom');
    expect(html).toContain('Quantidade: 2 × R$ 49,90');
    expect(html).toContain('R$ 99,80');
    expect(html).toContain('Quantidade: 1 × R$ 12,90');
    expect(html).toContain('Rena &amp; árvore');
    expect(html).toContain('Cor: Verde<br/>Nome: &lt;img src=x&gt;');
    expect(html).toContain('Ana &lt;script&gt;');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('/dashboard/orders/pedido-123');
    expect(send.mock.calls[0][2]).toMatchObject({ emailType: 'admin_new_order', orderId: 'pedido-123' });
  });
});
