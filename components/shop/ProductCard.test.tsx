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

describe('layout compacto dos cartões de produto', () => {
  afterEach(() => { vi.useRealTimers(); });

  it.each([false, true])('ancora o Comprar no fim do cartão sem altura fixa (showcase=%s)', (showcase) => {
    render(<ProductCard product={product('Vaso')} showcase={showcase} />);
    const title = screen.getByRole('heading', { name: 'Vaso' });
    expect(title).toHaveClass('h-4', 'sm:h-5', 'line-clamp-1', 'shrink-0');
    expect(title).toHaveAttribute('title', 'Vaso');
    expect(title.parentElement).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(title.parentElement).not.toHaveClass('h-[13rem]', 'sm:h-[13.5rem]');
    expect(title.closest('article')).toHaveClass('flex', 'h-full', 'flex-col');
    expect(title.closest('a')).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(screen.getByText('Comprar').parentElement).toHaveClass('mt-auto', 'shrink-0');
    expect(screen.getByText('Uma descrição do produto.')).toHaveClass('h-8', 'sm:h-9', 'shrink-0');
  });

  it.each([false, true])('mantém todas as tags em uma faixa rolável sem criar linhas extras (showcase=%s)', (showcase) => {
    render(<ProductCard product={{ ...product('Vaso com tags'), tags: [
      { id: 'tag-1', name: 'Personalizável', color: '#db2777' },
      { id: 'tag-2', name: 'Uma tag de nome muito longo', color: '#f97316' },
    ] }} showcase={showcase} />);
    const tags = screen.getByLabelText('Características do produto');
    expect(tags).toHaveClass('overflow-x-auto', 'whitespace-nowrap', 'shrink-0', showcase ? 'h-5' : 'h-4');
    expect(tags).not.toHaveClass('flex-wrap');
    expect(tags).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('Uma tag de nome muito longo')).toBeVisible();
    expect(screen.getByText('Personalizável')).toBeVisible();
  });

  it('mantém o preço atual inteiro e não deixa preços promocionais criar uma segunda linha', () => {
    render(<ProductCard product={{ ...product('Kit'), slug: 'monte-seu-kit-religioso', base_price: 129.9, sale_price: 79.9 }} />);
    const price = screen.getByText(/45,90/);
    expect(price).toHaveClass('shrink-0');
    expect(price.parentElement).toHaveClass('whitespace-nowrap');
    expect(price.parentElement).not.toHaveClass('flex-wrap');
    expect(screen.getByText('A partir de')).toHaveAttribute('title', 'A partir de');
    expect(screen.getByText(/129,90/)).toHaveClass('truncate');
  });

  it('preserva os arquivos digitais sem botão de compra físico', () => {
    render(<ProductCard product={{ ...product('Arquivo STL'), type: 'digital' }} basePath="/stl" />);
    expect(screen.queryByText('Comprar')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Arquivo STL' }).closest('a')).toHaveAttribute('href', expect.stringContaining('/stl/'));
  });

  it('alterna as imagens automaticamente a cada cinco segundos', () => {
    vi.useFakeTimers();
    render(<ProductCard product={{ ...product('Vaso'), image_url: 'https://example.com/one.jpg', image_url_2: 'https://example.com/two.jpg' }} />);
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveClass('opacity-100');
    expect(images[1]).toHaveClass('opacity-0');
    expect(images[0].parentElement).toHaveClass('aspect-square', 'shrink-0');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(images[0]).toHaveClass('opacity-0');
    expect(images[1]).toHaveClass('opacity-100');
  });
});
