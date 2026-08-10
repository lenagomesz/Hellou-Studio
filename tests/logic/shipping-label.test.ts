import { describe, expect, it } from 'vitest';
import { DEFAULT_PRODUCTION_BUSINESS_DAYS, DEFAULT_PRODUCTION_LEAD_TIME } from '@/lib/production';
import { buildShippingLabelText, getShippingLabelRecipient } from '@/lib/shipping-label';

describe('prazo padrão de produção', () => {
  it('usa cinco dias úteis em todas as comunicações', () => {
    expect(DEFAULT_PRODUCTION_BUSINESS_DAYS).toBe(5);
    expect(DEFAULT_PRODUCTION_LEAD_TIME).toBe('até 5 dias úteis');
  });
});

describe('etiqueta de remetente e destinatário', () => {
  const address = {
    street: 'Rua das Flores',
    number: 42,
    complement: 'Apto 3',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01001-000',
  };

  it('monta os dados visuais do destinatário sem perder número ou complemento', () => {
    expect(getShippingLabelRecipient('Maria Silva', 'maria@example.com', address)).toEqual({
      name: 'Maria Silva',
      streetLine: 'Rua das Flores, 42',
      complement: 'Apto 3',
      neighborhood: 'Centro',
      cityState: 'São Paulo - SP',
      cep: '01001-000',
    });
  });

  it('gera um texto compartilhável com remetente e destinatário', () => {
    const result = buildShippingLabelText(null, 'maria@example.com', address);

    expect(result).toContain('REMETENTE:\nHelena Soares Gomes');
    expect(result).toContain('CEP: 88303-330');
    expect(result).toContain('DESTINATÁRIO:\nmaria@example.com');
    expect(result).toContain('Rua das Flores, 42\nApto 3\nCentro\nSão Paulo - SP\nCEP: 01001-000');
  });
});
