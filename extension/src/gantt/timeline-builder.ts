import { GANTT_ZOOM_DAY_WIDTH, TIMELINE_PADDING_WORKING_DAYS, type GanttTask, type GanttZoom } from '@jira-epic-gantt/shared';
import {
  addWorkingDays,
  compareCalendarDates,
  formatCalendarDate,
  getWorkingDaysRange,
  parseJiraDate,
  resolveTodayMarker,
  todayCalendar,
  type CalendarDate,
} from './date-utils';

export interface TimelineModel {
  workingDays: CalendarDate[];
  dayWidth: number;
  totalWidth: number;
  todayMarker: { index: number; edge: 'inside' | 'before'; tooltip: string } | null;
  hasScheduledTasks: boolean;
}

export function buildTimeline(tasks: GanttTask[], zoom: GanttZoom): TimelineModel {
  const dayWidth = GANTT_ZOOM_DAY_WIDTH[zoom];
  const scheduled = tasks.filter((task) => task.state === 'scheduled');
  if (scheduled.length === 0) {
    return {
      workingDays: [],
      dayWidth,
      totalWidth: 0,
      todayMarker: null,
      hasScheduledTasks: false,
    };
  }

  let minStart: CalendarDate | null = null;
  let maxEnd: CalendarDate | null = null;

  for (const task of scheduled) {
    const start = parseJiraDate(task.startDate);
    const end = parseJiraDate(task.endDate);
    if (!start || !end) continue;
    if (!minStart || compareCalendarDates(start, minStart) < 0) minStart = start;
    if (!maxEnd || compareCalendarDates(end, maxEnd) > 0) maxEnd = end;
  }

  if (!minStart || !maxEnd) {
    return {
      workingDays: [],
      dayWidth,
      totalWidth: 0,
      todayMarker: null,
      hasScheduledTasks: false,
    };
  }

  const rangeStart = addWorkingDays(minStart, -TIMELINE_PADDING_WORKING_DAYS);
  const rangeEnd = addWorkingDays(maxEnd, TIMELINE_PADDING_WORKING_DAYS);
  const workingDays = getWorkingDaysRange(rangeStart, rangeEnd);
  const today = todayCalendar();

  return {
    workingDays,
    dayWidth,
    totalWidth: workingDays.length * dayWidth,
    todayMarker: resolveTodayMarker(workingDays, today),
    hasScheduledTasks: true,
  };
}

export function taskBarLayout(
  task: GanttTask,
  workingDays: CalendarDate[],
  dayWidth: number,
): { left: number; width: number } | null {
  if (task.state !== 'scheduled' || !task.startDate || !task.endDate) {
    return null;
  }
  const start = parseJiraDate(task.startDate);
  const end = parseJiraDate(task.endDate);
  if (!start || !end) {
    return null;
  }

  let startIndex = workingDays.findIndex((d) => compareCalendarDates(d, start) >= 0);
  let endIndex = -1;
  for (let i = workingDays.length - 1; i >= 0; i -= 1) {
    const day = workingDays[i]!;
    if (compareCalendarDates(day, end) <= 0) {
      endIndex = i;
      break;
    }
  }

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    return null;
  }

  return {
    left: startIndex * dayWidth,
    width: (endIndex - startIndex + 1) * dayWidth,
  };
}

export function workingDayKey(date: CalendarDate): string {
  return formatCalendarDate(date);
}
