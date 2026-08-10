export type ShippingAddressInput = Record<string, unknown> | null;

export const STORE_SENDER_ADDRESS = {
  name: 'helloustudio',
  streetLine: 'Rua São Paulo, 250',
  neighborhood: 'Bairro São Judas',
  cityState: 'Itajaí - SC',
  cep: '88303-330',
} as const;

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function getShippingLabelRecipient(
  recipientName: string | null | undefined,
  recipientEmail: string | null | undefined,
  address: ShippingAddressInput,
) {
  const street = text(address?.street);
  const number = text(address?.number);
  const complement = text(address?.complement);
  const city = text(address?.city);
  const state = text(address?.state);

  return {
    name: recipientName?.trim() || recipientEmail?.trim() || 'Destinatário',
    streetLine: [street, number].filter(Boolean).join(', ') || 'Endereço não informado',
    complement,
    neighborhood: text(address?.neighborhood),
    cityState: [city, state].filter(Boolean).join(' - '),
    cep: text(address?.cep),
  };
}

export function buildShippingLabelText(
  recipientName: string | null | undefined,
  recipientEmail: string | null | undefined,
  address: ShippingAddressInput,
) {
  const recipient = getShippingLabelRecipient(recipientName, recipientEmail, address);
  const recipientLines = [
    'DESTINATÁRIO:',
    recipient.name,
    recipient.streetLine,
    recipient.complement,
    recipient.neighborhood,
    recipient.cityState,
    recipient.cep ? `CEP: ${recipient.cep}` : '',
  ].filter(Boolean);

  return [
    'REMETENTE:',
    STORE_SENDER_ADDRESS.name,
    STORE_SENDER_ADDRESS.streetLine,
    STORE_SENDER_ADDRESS.neighborhood,
    STORE_SENDER_ADDRESS.cityState,
    `CEP: ${STORE_SENDER_ADDRESS.cep}`,
    '',
    ...recipientLines,
  ].join('\n');
}
