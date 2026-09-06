import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ProductRecommendations } from './ProductRecommendations';

const cart = vi.hoisted(() => ({ items: [{ product_id: 'vaso', product: { type: 'physical' } }], total: 89.9 }));
vi.mock('./CartContext', () => ({ useCart: () => cart }));

beforeEach(() => {
  cart.items = [{ product_id: 'vaso', product: { type: 'physical' } }];
  cart.total = 89.9;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('complementos no carrinho', () => {
  it('envia o valor que falta e só marca sugestões suficientes para o frete', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [
      { id: 'lip', name: 'Lip Balm', image_url: null, starting_price: 20.9 },
      { id: 'boca', name: 'Chaveiro Boca', image_url: null, starting_price: 6.9 },
    ] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProductRecommendations threshold={99} />);
    expect(await screen.findByText('Lip Balm')).toBeVisible();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/recommendations?exclude=vaso&remaining=9.1');
    expect(screen.getByText(/Faltam.*9,10/)).toBeVisible();
    expect(screen.getAllByText('Com esta peça, você atinge o frete grátis')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Lip Balm/ })).toHaveAttribute('href', '/products/lip-balm');
  });

  it('remove imediatamente sugestões adicionadas e atualiza a busca', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [{ id: 'lip', name: 'Lip Balm', image_url: null, starting_price: 20.9 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(<ProductRecommendations threshold={99} />);
    await screen.findByText('Lip Balm');
    cart.items = [...cart.items, { product_id: 'lip', product: { type: 'physical' } }];
    cart.total = 110.8;
    rerender(<ProductRecommendations threshold={99} />);
    expect(screen.queryByText('Lip Balm')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain('remaining=0');
  });

  it('não sugere produtos físicos para um carrinho digital', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    cart.items = [{ product_id: 'stl', product: { type: 'digital' } }];
    const { container } = render(<ProductRecommendations />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
