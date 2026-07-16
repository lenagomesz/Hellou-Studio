export const STORE_TIME_ZONE = 'America/Sao_Paulo';

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const datePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getZonedParts(date: Date): CalendarDate & { hour: number; minute: number; second: number } {
  const values = Object.fromEntries(
    datePartsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffset(date: Date): number {
  const parts = getZonedParts(date);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const dateWithoutMilliseconds = Math.floor(date.getTime() / 1000) * 1000;
  return representedAsUtc - dateWithoutMilliseconds;
}

function zonedMidnightToUtc({ year, month, day }: CalendarDate): Date {
  const utcGuess = Date.UTC(year, month - 1, day);
  let offset = getTimeZoneOffset(new Date(utcGuess));
  let result = new Date(utcGuess - offset);

  const correctedOffset = getTimeZoneOffset(result);
  if (correctedOffset !== offset) {
    offset = correctedOffset;
    result = new Date(utcGuess - offset);
  }

  return result;
}

function shiftCalendarDate(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function calendarDateKey({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getStoreDateKey(value: Date | string | number = new Date()): string {
  return calendarDateKey(getZonedParts(new Date(value)));
}

export function getStoreDateGroupKey(
  value: Date | string | number,
  groupBy: 'day' | 'week' | 'month',
): string {
  const parts = getZonedParts(new Date(value));
  if (groupBy === 'day') return calendarDateKey(parts);
  if (groupBy === 'month') return `${parts.year}-${String(parts.month).padStart(2, '0')}`;

  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const daysSinceMonday = (calendarDate.getUTCDay() + 6) % 7;
  return calendarDateKey(shiftCalendarDate(parts, -daysSinceMonday));
}

export function getStoreDayBounds(value: Date | string | number = new Date()) {
  const calendarDate = getZonedParts(new Date(value));
  return {
    dateKey: calendarDateKey(calendarDate),
    start: zonedMidnightToUtc(calendarDate),
    endExclusive: zonedMidnightToUtc(shiftCalendarDate(calendarDate, 1)),
  };
}

export function getStoreMonthBounds(value: Date | string | number = new Date()) {
  const { year, month } = getZonedParts(new Date(value));
  const current = { year, month, day: 1 };
  const previousDate = new Date(Date.UTC(year, month - 2, 1));
  const nextDate = new Date(Date.UTC(year, month, 1));

  return {
    start: zonedMidnightToUtc(current),
    previousStart: zonedMidnightToUtc({
      year: previousDate.getUTCFullYear(),
      month: previousDate.getUTCMonth() + 1,
      day: 1,
    }),
    nextStart: zonedMidnightToUtc({
      year: nextDate.getUTCFullYear(),
      month: nextDate.getUTCMonth() + 1,
      day: 1,
    }),
  };
}

export function formatStoreDateTime(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('pt-BR', {
    ...options,
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(value));
}
