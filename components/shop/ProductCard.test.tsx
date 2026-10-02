import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types/database';

function product(name: string): Product {
  return {
    id: name,
    name,
    description: 'Uma descrição do produto.',
    category: 'decoracao',
    type: 'physical',
    base_price: 29.9,
    sale_price: null,
    image_url: null,
    image_url_2: null,
    images: [],
    active: true,
    file_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('card de lançamento na home', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantém altura fixa sem reservar uma linha vazia depois de títulos curtos', () => {
    render(<ProductCard product={product('Vaso')} showcase />);

    const title = screen.getByRole('heading', { name: 'Vaso' });
    expect(title).not.toHaveClass('min-h-[2.4rem]');
    expect(title.parentElement).toHaveClass('h-[13rem]', 'sm:h-[13.5rem]');
  });

  it('alterna as imagens automaticamente a cada cinco segundos', () => {
    vi.useFakeTimers();
    render(<ProductCard product={{ ...product('Vaso'), image_url: 'https://example.com/one.jpg', image_url_2: 'https://example.com/two.jpg' }} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveClass('opacity-100');
    expect(images[1]).toHaveClass('opacity-0');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(images[0]).toHaveClass('opacity-0');
    expect(images[1]).toHaveClass('opacity-100');
  });
});
