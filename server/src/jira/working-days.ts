export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** Jira default: 1 working day = 8 hours */
export const SECONDS_PER_WORKING_DAY = 8 * 60 * 60;

export function parseCalendarDate(value: string | null | undefined): CalendarDate | null {
  if (!value) {
    return null;
  }
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatCalendarDate(date: CalendarDate): string {
  const m = String(date.month).padStart(2, '0');
  const d = String(date.day).padStart(2, '0');
  return `${date.year}-${m}-${d}`;
}

function toUtcNoon(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0));
}

export function isWeekend(date: CalendarDate): boolean {
  const day = toUtcNoon(date).getUTCDay();
  return day === 0 || day === 6;
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const d = toUtcNoon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** Move forward/backward by N working days (Mon–Fri). */
export function addWorkingDays(date: CalendarDate, workingDays: number): CalendarDate {
  let current = date;
  let remaining = workingDays;
  const step = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  while (remaining > 0) {
    current = addCalendarDays(current, step);
    if (!isWeekend(current)) {
      remaining -= 1;
    }
  }
  return current;
}

/**
 * Convert Jira original estimate (seconds) to inclusive working-day length.
 * 1h..8h → 1 day; 8h1s..16h → 2 days; etc.
 */
export function estimateSecondsToWorkingDays(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(seconds / SECONDS_PER_WORKING_DAY));
}

/** Inclusive end date: start + (workingDays - 1) working days. */
export function endDateFromStartAndEstimate(
  startIsoDate: string,
  estimateSeconds: number,
): string | null {
  const start = parseCalendarDate(startIsoDate);
  if (!start) {
    return null;
  }
  const workingDays = estimateSecondsToWorkingDays(estimateSeconds);
  if (workingDays <= 0) {
    return null;
  }
  const end = addWorkingDays(start, workingDays - 1);
  return formatCalendarDate(end);
}
