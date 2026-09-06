import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageUploadField } from './ImageUploadField';

describe('ImageUploadField', () => {
  it('reaproveita uma imagem já enviada sem pedir a URL novamente', () => {
    render(
      <form data-testid="form">
        <ImageUploadField value="/api/product-images/product-images/variacao.webp" onChange={vi.fn()} />
      </form>,
    );

    expect(screen.getByAltText('Prévia da variação')).toHaveAttribute('src', '/api/product-images/product-images/variacao.webp');
    expect(screen.queryByLabelText('Ou cole uma URL (opcional)')).not.toBeInTheDocument();
    expect(screen.getByTestId('form')).toBeValid();
  });

  it('mantém a URL como alternativa opcional quando ainda não há foto', () => {
    render(<ImageUploadField value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Ou cole uma URL (opcional)')).toHaveAttribute('inputmode', 'url');
  });
});
