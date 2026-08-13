import { describe, expect, it } from 'vitest';
import { normalizeCorreiosTrackingResponse } from '@/lib/shipment-tracking';

describe('rastreamento de encomendas', () => {
  it('normaliza e ordena as atualizações mais recentes primeiro', () => {
    const result = normalizeCorreiosTrackingResponse([{
      eventos: [
        { codigo: 'PO', descricao: 'Objeto postado', dtHrCriado: '2026-08-10T10:00:00', unidade: { tipo: 'Agência', endereco: { cidade: 'Itajaí', uf: 'SC' } } },
        { codigo: 'OEC', descricao: 'Objeto saiu para entrega', dtHrCriado: '2026-08-12T08:00:00', unidade: { tipo: 'Unidade de Distribuição', endereco: { cidade: 'São Paulo', uf: 'SP' } } },
      ],
    }], 'AB123456789BR');

    expect(result.events.map((event) => event.code)).toEqual(['OEC', 'PO']);
    expect(result.events[0].location).toBe('Unidade de Distribuição · São Paulo · SP');
    expect(result.trackingUrl).toContain('AB123456789BR');
  });

  it('informa quando ainda não existem movimentações', () => {
    const result = normalizeCorreiosTrackingResponse([], 'AB123456789BR');
    expect(result.events).toEqual([]);
    expect(result.message).toContain('ainda não publicaram');
  });
});
