export const PRODUCT_COLOR_PALETTE = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Preto', hex: '#1A1A1A' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Amarelo', hex: '#EAB308' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Verde-escuro', hex: '#15803D' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Azul-escuro', hex: '#1E40AF' },
  { name: 'Roxo', hex: '#A855F7' },
  { name: 'Lilás', hex: '#C084FC' },
  { name: 'Cinza', hex: '#6B7280' },
  { name: 'Bege', hex: '#D4A574' },
  { name: 'Dourado', hex: '#D4AF37' },
  { name: 'Prata', hex: '#C0C0C0' },
  { name: 'Transparente', hex: 'transparent' },
] as const;

export function getProductColorName(value: string | null | undefined) {
  if (!value) return 'Cor';
  const normalized = value.trim().toLowerCase();
  return PRODUCT_COLOR_PALETTE.find(
    (color) => color.hex.toLowerCase() === normalized || color.name.toLowerCase() === normalized,
  )?.name ?? 'Cor personalizada';
}

export function getProductColorValue(value: string | null | undefined) {
  if (!value) return 'transparent';
  const normalized = value.trim().toLowerCase();
  return PRODUCT_COLOR_PALETTE.find(
    (color) => color.hex.toLowerCase() === normalized || color.name.toLowerCase() === normalized,
  )?.hex ?? value;
}
