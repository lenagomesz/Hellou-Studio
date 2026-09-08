import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  it('mantém altura fixa sem reservar uma linha vazia depois de títulos curtos', () => {
    render(<ProductCard product={product('Vaso')} showcase />);

    const title = screen.getByRole('heading', { name: 'Vaso' });
    expect(title).not.toHaveClass('min-h-[2.4rem]');
    expect(title.parentElement).toHaveClass('h-[13rem]', 'sm:h-[13.5rem]');
  });
});
