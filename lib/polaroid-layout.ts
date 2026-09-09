export const POLAROIDS_PER_A4_PAGE = 9;

export function paginatePolaroids<T>(items: T[], pageSize = POLAROIDS_PER_A4_PAGE): T[][] {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('O tamanho da página deve ser um número inteiro positivo.');
  }

  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize));
  }
  return pages;
}

export function getPolaroidPrintSummary(count: number) {
  const safeCount = Math.max(0, Math.floor(count));
  return {
    count: safeCount,
    pages: safeCount === 0 ? 0 : Math.ceil(safeCount / POLAROIDS_PER_A4_PAGE),
    remainingSlots: safeCount === 0
      ? POLAROIDS_PER_A4_PAGE
      : (POLAROIDS_PER_A4_PAGE - (safeCount % POLAROIDS_PER_A4_PAGE)) % POLAROIDS_PER_A4_PAGE,
  };
}
