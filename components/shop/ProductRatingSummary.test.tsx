import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ProductRatingSummary } from './ProductRatingSummary';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('resumo das avaliações do produto', () => {
  it('mostra estrelas, média e acesso às avaliações', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviews: [{ rating: 5 }, { rating: 4 }] }),
    }));

    render(<ProductRatingSummary productId="produto-1" />);

    const link = await screen.findByRole('link', { name: 'Ver 2 avaliações, nota média 4.5 de 5' });
    expect(link).toHaveAttribute('href', '#product-reviews');
    expect(link).toHaveTextContent('4,5 · 2 avaliações');
  });

  it('atualiza o resumo após uma nova avaliação', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reviews: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reviews: [{ rating: 5 }] }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<ProductRatingSummary productId="produto-1" />);
    expect(await screen.findByText('Ainda sem avaliações')).toBeVisible();
    window.dispatchEvent(new CustomEvent('product-review-updated', { detail: 'produto-1' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Ver 1 avaliação, nota média 5.0 de 5' })).toHaveTextContent('5,0 · 1 avaliação'));
  });
});
