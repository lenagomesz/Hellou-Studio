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

export function normalizeProductColor(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const paletteColor = PRODUCT_COLOR_PALETTE.find(
    (color) => color.hex.toLowerCase() === raw.toLowerCase() || color.name.toLowerCase() === raw.toLowerCase(),
  );
  if (paletteColor) return paletteColor.hex;
  const shortHex = /^#([0-9a-f]{3})$/i.exec(raw);
  if (shortHex) return `#${shortHex[1].split('').map((character) => character.repeat(2)).join('')}`.toUpperCase();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(raw);
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number);
    if (channels.every((channel) => channel >= 0 && channel <= 255)) {
      return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    }
  }
  return null;
}
