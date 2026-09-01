import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { KitBuilder } from './KitBuilder';
import { ProductKits } from './ProductKits';
import { buildProductKits } from '@/lib/product-kits';
import { kitOption, setupProducts } from '@/tests/fixtures/kit-products';

const cart = vi.hoisted(() => ({ addItem: vi.fn(), removeItem: vi.fn(), items: [] as Array<{ product: { type: string } }>, total: 0, status: 'idle' }));
vi.mock('./CartContext', () => ({ useCart: () => cart }));

beforeEach(() => {
  cart.addItem.mockReset().mockResolvedValue(undefined);
  cart.items = [];
  cart.total = 0;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('montagem de kits', () => {
  it('mostra valor real, falta para o frete e navegação na vitrine', () => {
    const kit = buildProductKits(setupProducts())[0];
    render(<ProductKits kits={[kit]} threshold={99} />);
    expect(screen.getByText(/96,70/)).toBeVisible();
    expect(screen.getByText(/Faltam.*2,30/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Montar meu kit' })).toHaveAttribute('href', '/kits/setup-estudo');
    expect(screen.queryByText('Atinge o valor para frete grátis')).not.toBeInTheDocument();
  });

  it('respeita personalização e só avança após adicionar cada peça', async () => {
    const products = setupProducts();
    products[0] = { ...products[0], is_customizable: true, customization_placeholder: 'Seu nome', product_options: [kitOption({ price_modifier: 5 })] };
    render(<KitBuilder kit={buildProductKits(products)[0]} threshold={120} />);
    expect(screen.getByRole('button', { name: 'Preencha a personalização' })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Seu nome'), { target: { value: 'Helena' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    expect(await screen.findByRole('button', { name: 'Escolher próxima peça' })).toBeVisible();
    expect(cart.addItem).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1, customization_text: 'Helena', option: expect.objectContaining({ price_modifier: 5 }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher próxima peça' }));
    expect(screen.getByRole('heading', { name: 'Mini Fidget Espiral' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Escolher próxima peça' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Concluir kit' }));
    expect(screen.getByRole('heading', { name: 'Seu kit está no carrinho!' })).toBeVisible();
    expect(cart.addItem).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('link', { name: 'Conferir meu carrinho' })).toHaveAttribute('href', '/cart');
  });

  it('mantém a peça atual se adicionar ao carrinho falhar', async () => {
    cart.addItem.mockRejectedValue(new Error('Estoque indisponível'));
    render(<KitBuilder kit={buildProductKits(setupProducts())[0]} threshold={99} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    expect(await screen.findByText(/Estoque indisponível/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Escolher próxima peça' })).not.toBeInTheDocument();
  });

  it('impede misturar o kit com arquivos digitais', () => {
    cart.items = [{ product: { type: 'digital' } }];
    render(<KitBuilder kit={buildProductKits(setupProducts())[0]} threshold={99} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Seu carrinho contém arquivos digitais');
    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument();
  });
});
