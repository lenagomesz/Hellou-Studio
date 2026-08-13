import { rastrearEncomendas } from 'correios-brasil';

export type ShipmentTrackingEvent = {
  code: string;
  description: string;
  occurredAt: string;
  location: string | null;
};

export type ShipmentTrackingResult = {
  trackingCode: string;
  carrier: 'Correios';
  trackingUrl: string;
  events: ShipmentTrackingEvent[];
  message: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? value as UnknownRecord : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function eventLocation(event: UnknownRecord): string | null {
  const unit = asRecord(event.unidade);
  const address = asRecord(unit?.endereco);
  const parts = [
    stringValue(unit?.tipo),
    stringValue(address?.cidade),
    stringValue(address?.uf),
  ].filter(Boolean);
  return parts.length > 0 ? Array.from(new Set(parts)).join(' · ') : null;
}

export function normalizeCorreiosTrackingResponse(raw: unknown, trackingCode: string): ShipmentTrackingResult {
  const response = Array.isArray(raw) ? raw[0] : raw;
  const parcel = Array.isArray(response) ? response[0] : response;
  const parcelRecord = asRecord(parcel);
  const rawEvents = Array.isArray(parcelRecord?.eventos) ? parcelRecord.eventos : [];

  const events = rawEvents
    .map((rawEvent): ShipmentTrackingEvent | null => {
      const event = asRecord(rawEvent);
      if (!event) return null;
      const description = stringValue(event.descricao);
      const occurredAt = stringValue(event.dtHrCriado);
      if (!description || !occurredAt) return null;
      return {
        code: stringValue(event.codigo),
        description,
        occurredAt,
        location: eventLocation(event),
      };
    })
    .filter((event): event is ShipmentTrackingEvent => event !== null)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  const providerMessage = stringValue(parcelRecord?.mensagem);
  return {
    trackingCode,
    carrier: 'Correios',
    trackingUrl: `https://melhorrastreio.com.br/${encodeURIComponent(trackingCode)}`,
    events,
    message: providerMessage || (events.length === 0 ? 'O código foi salvo, mas os Correios ainda não publicaram movimentações.' : null),
  };
}

export async function trackCorreiosShipment(rawTrackingCode: string): Promise<ShipmentTrackingResult> {
  const trackingCode = rawTrackingCode.trim().toUpperCase();
  const fallback = normalizeCorreiosTrackingResponse([], trackingCode);

  if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(trackingCode)) {
    return { ...fallback, message: 'Código salvo. As atualizações automáticas exigem um código válido dos Correios.' };
  }

  try {
    const response = await Promise.race([
      rastrearEncomendas([trackingCode]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    return normalizeCorreiosTrackingResponse(response, trackingCode);
  } catch {
    return { ...fallback, message: 'Não foi possível consultar os Correios agora. Tente atualizar novamente em instantes.' };
  }
}
