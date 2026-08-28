export type QuotaKind = 'daily' | 'rate';

// Google resets daily quotas at midnight America/Los_Angeles, including DST.
export function nextGeminiDailyReset(now = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
  const tomorrow = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1);
  for (const offset of [7, 8]) {
    const candidate = new Date(tomorrow + offset * 3600_000);
    const hour = formatter.formatToParts(candidate).find(p => p.type === 'hour')?.value;
    if (hour === '00') return new Date(candidate.getTime() + 60_000);
  }
  return new Date(now.getTime() + 24 * 3600_000);
}

export class GeminiQuotaError extends Error {
  readonly code = 'GEMINI_QUOTA_EXCEEDED';
  constructor(readonly kind: QuotaKind, readonly retryAt: string) {
    const when = new Date(retryAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    super(`${kind === 'daily' ? 'A cota diária' : 'O limite temporário'} do Gemini foi atingido. As gerações de IA estão pausadas até ${when} (horário de Brasília). O cadastro manual continua disponível.`);
    this.name = 'GeminiQuotaError';
  }
}

export function asGeminiQuotaError(error: unknown, now = new Date()): GeminiQuotaError | null {
  if (error instanceof GeminiQuotaError) return error;
  if (!error || typeof error !== 'object') return null;
  const e = error as { status?: number; message?: string; errorDetails?: unknown };
  const message = typeof e.message === 'string' ? e.message : '';
  if (e.status !== 429 && !/\b429\b/.test(message)) return null;
  const details = JSON.stringify(e.errorDetails ?? []);
  const daily = /PerDay|requests.?per.?day|daily.?quota|quota.?di[aá]ria/i.test(details + message);
  if (daily) return new GeminiQuotaError('daily', nextGeminiDailyReset(now).toISOString());
  const seconds = Number((details + message).match(/retryDelay["\s:]+([\d.]+)s/)?.[1] ?? 60);
  const delay = Math.max(60, Math.min(Number.isFinite(seconds) ? seconds : 60, 24 * 3600));
  return new GeminiQuotaError('rate', new Date(now.getTime() + delay * 1000).toISOString());
}
