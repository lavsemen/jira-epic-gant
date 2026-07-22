export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseJiraDate(value: string | null | undefined): CalendarDate | null {
  if (!value) {
    return null;
  }
  const datePart = value.slice(0, 10);
  const match = datePart.match(DATE_ONLY_RE);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

export function formatCalendarDate(date: CalendarDate): string {
  const m = String(date.month).padStart(2, '0');
  const d = String(date.day).padStart(2, '0');
  return `${date.year}-${m}-${d}`;
}

export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/** JS getDay(): 0=Sun ... 6=Sat. We use Monday=0 ... Sunday=6 via utc noon trick-free local Date. */
function toUtcNoonDate(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0));
}

export function isWeekend(date: CalendarDate): boolean {
  const day = toUtcNoonDate(date).getUTCDay();
  return day === 0 || day === 6;
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const d = toUtcNoonDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

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

export function getWorkingDaysRange(start: CalendarDate, end: CalendarDate): CalendarDate[] {
  if (compareCalendarDates(end, start) < 0) {
    return [];
  }
  const result: CalendarDate[] = [];
  let current = start;
  while (compareCalendarDates(current, end) <= 0) {
    if (!isWeekend(current)) {
      result.push(current);
    }
    current = addCalendarDays(current, 1);
  }
  return result;
}

export function getWorkingDayIndex(range: CalendarDate[], date: CalendarDate): number {
  return range.findIndex((item) => compareCalendarDates(item, date) === 0);
}

export function countWorkingDaysInclusive(start: CalendarDate, end: CalendarDate): number {
  return getWorkingDaysRange(start, end).length;
}

export function isOverdue(params: {
  endDate: CalendarDate | null;
  today: CalendarDate;
  isDone: boolean;
  isCancelled: boolean;
}): boolean {
  if (!params.endDate || params.isDone || params.isCancelled) {
    return false;
  }
  return compareCalendarDates(params.endDate, params.today) < 0;
}

export function todayCalendar(): CalendarDate {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function formatDayLabelFull(date: CalendarDate): string {
  const d = toUtcNoonDate(date);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(d);
}

/** Compact axis labels so day columns do not overlap at small zoom widths. */
export function formatDayLabel(
  date: CalendarDate,
  options?: { dayWidth: number; previous?: CalendarDate | null },
): string {
  const dayWidth = options?.dayWidth ?? 48;
  const previous = options?.previous;
  const monthChanged =
    !previous || previous.year !== date.year || previous.month !== date.month;

  // Compact (~20px): day number only.
  if (dayWidth < 28) {
    return String(date.day);
  }

  // Default (~32px): day number; short month only when month changes.
  if (dayWidth < 44) {
    if (monthChanged) {
      const month = new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
        timeZone: 'UTC',
      }).format(toUtcNoonDate(date));
      return `${date.day}\n${month}`;
    }
    return String(date.day);
  }

  return formatDayLabelFull(date);
}

/**
 * Today marker policy:
 * - weekday: index of today's working day column
 * - weekend: index of the next working day (line drawn at its leading edge), tooltip «Сегодня»
 */
export function resolveTodayMarker(
  workingDays: CalendarDate[],
  today: CalendarDate,
): { index: number; edge: 'inside' | 'before'; tooltip: string } | null {
  if (workingDays.length === 0) {
    return null;
  }

  if (!isWeekend(today)) {
    const index = getWorkingDayIndex(workingDays, today);
    if (index >= 0) {
      return { index, edge: 'inside', tooltip: 'Сегодня' };
    }
  }

  const nextWorking = workingDays.find((day) => compareCalendarDates(day, today) > 0);
  if (nextWorking) {
    const index = getWorkingDayIndex(workingDays, nextWorking);
    if (index >= 0) {
      return { index, edge: 'before', tooltip: 'Сегодня' };
    }
  }

  return null;
}
