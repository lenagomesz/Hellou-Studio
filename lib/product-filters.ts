export function parseOptionalPrice(value: string | null) {
  if (value === null || value.trim() === '') return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
