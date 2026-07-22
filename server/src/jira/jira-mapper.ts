import {
  CANCELLED_STATUS_NAME_ALIASES,
  type EpicGanttData,
  type GanttTask,
  type ScheduleGapReason,
  type StatusCategoryKey,
  type TaskDateState,
} from '@epic-plan/shared';
import { config } from '../config.js';
import type { JiraSearchIssue } from './jira-client.js';
import { resolveInProgressStartDate, type JiraStatusInfo } from './in-progress.js';
import { endDateFromStartAndEstimate } from './working-days.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function compareCalendar(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function todayCalendarLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase();
}

function isCancelledStatus(statusId: string, statusName: string, cancelledIds: string[]): boolean {
  if (cancelledIds.includes(statusId)) {
    return true;
  }
  if (cancelledIds.length > 0) {
    return false;
  }
  const normalized = normalizeStatusName(statusName);
  return (CANCELLED_STATUS_NAME_ALIASES as readonly string[]).includes(normalized);
}

function resolveDateState(startDate: string | null, endDate: string | null): TaskDateState {
  if (!startDate || !endDate) {
    return 'requires-estimation';
  }
  if (compareCalendar(endDate, startDate) < 0) {
    return 'invalid-dates';
  }
  return 'scheduled';
}

function mapCategoryKey(value: unknown): StatusCategoryKey {
  if (value === 'done' || value === 'indeterminate' || value === 'new') {
    return value;
  }
  return 'new';
}

function parseSecondsNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return null;
}

function parseDurationStringToSeconds(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const re = /(\d+(?:\.\d+)?)\s*([wdhm])/g;
  let match: RegExpExecArray | null;
  let total = 0;
  let matched = false;
  while ((match = re.exec(normalized)) !== null) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount)) {
      continue;
    }
    switch (unit) {
      case 'w':
        total += amount * 5 * 8 * 3600;
        break;
      case 'd':
        total += amount * 8 * 3600;
        break;
      case 'h':
        total += amount * 3600;
        break;
      case 'm':
        total += amount * 60;
        break;
      default:
        break;
    }
  }
  return matched && total > 0 ? total : null;
}

function extractOriginalEstimateSeconds(fields: Record<string, unknown>): number | null {
  const direct =
    parseSecondsNumber(fields.timeoriginalestimate) ??
    parseSecondsNumber(fields.aggregatetimeoriginalestimate);
  if (direct) {
    return direct;
  }

  const tracking = asRecord(fields.timetracking);
  if (tracking) {
    const fromSeconds = parseSecondsNumber(tracking.originalEstimateSeconds);
    if (fromSeconds) {
      return fromSeconds;
    }
    if (typeof tracking.originalEstimate === 'string') {
      const fromText = parseDurationStringToSeconds(tracking.originalEstimate);
      if (fromText) {
        return fromText;
      }
    }
  }

  return null;
}

function resolveScheduleGap(
  startDate: string | null,
  hasEstimate: boolean,
): ScheduleGapReason | null {
  if (startDate && hasEstimate) {
    return null;
  }
  if (!startDate && !hasEstimate) {
    return 'missing-both';
  }
  if (!startDate) {
    return 'missing-start';
  }
  return 'missing-estimate';
}

export function mapEpicTasks(params: {
  epicKey: string;
  epicSummary: string;
  issues: JiraSearchIssue[];
  statuses: JiraStatusInfo[];
  cancelledStatusIds: string[];
  jiraHost: string;
}): EpicGanttData {
  const today = todayCalendarLocal();
  const cancelledIds = params.cancelledStatusIds.length
    ? params.cancelledStatusIds
    : config.cancelledStatusIds;
  const statusById = new Map(params.statuses.map((status) => [status.id, status]));

  const tasks: GanttTask[] = params.issues.map((issue, index) => {
    const fields = issue.fields;
    const statusObj = asRecord(fields.status);
    const statusCategory = asRecord(statusObj?.statusCategory);
    const categoryKey = mapCategoryKey(statusCategory?.key);
    const statusId = String(statusObj?.id ?? '');
    const statusName = String(statusObj?.name ?? 'Unknown');
    const issueTypeObj = asRecord(fields.issuetype);
    const assigneeObj = asRecord(fields.assignee);
    const avatarUrls = asRecord(assigneeObj?.avatarUrls);

    const originalEstimateSeconds = extractOriginalEstimateSeconds(fields);
    const startDate = resolveInProgressStartDate({
      histories: issue.changelog?.histories,
      statusById,
      currentStatusId: statusId,
      currentStatusName: statusName,
      currentCategoryKey: categoryKey,
      statusCategoryChangedDate: extractDate(fields.statuscategorychangedate),
    });
    const endDate =
      startDate && originalEstimateSeconds
        ? endDateFromStartAndEstimate(startDate, originalEstimateSeconds)
        : null;

    const state = resolveDateState(startDate, endDate);
    const scheduleGapReason =
      state === 'requires-estimation'
        ? resolveScheduleGap(startDate, originalEstimateSeconds != null)
        : null;

    const isDone = categoryKey === 'done';
    const isCancelled = isCancelledStatus(statusId, statusName, cancelledIds);
    const isOverdue =
      state === 'scheduled' &&
      !!endDate &&
      compareCalendar(endDate, today) < 0 &&
      !isDone &&
      !isCancelled;

    return {
      id: issue.id,
      key: issue.key,
      summary: String(fields.summary ?? ''),
      issueType: {
        id: String(issueTypeObj?.id ?? ''),
        name: String(issueTypeObj?.name ?? ''),
        iconUrl: typeof issueTypeObj?.iconUrl === 'string' ? issueTypeObj.iconUrl : undefined,
      },
      status: {
        id: statusId,
        name: statusName,
        categoryKey,
      },
      assignee: assigneeObj
        ? {
            accountId: String(assigneeObj.accountId ?? ''),
            displayName: String(assigneeObj.displayName ?? 'Не назначено'),
            avatarUrl:
              typeof avatarUrls?.['24x24'] === 'string' ? avatarUrls['24x24'] : undefined,
          }
        : null,
      startDate,
      endDate,
      originalEstimateSeconds,
      scheduleGapReason,
      state,
      isDone,
      isCancelled,
      isOverdue,
      jiraUrl: `https://${params.jiraHost}/browse/${issue.key}`,
      rankIndex: index,
    };
  });

  return {
    epic: {
      key: params.epicKey,
      summary: params.epicSummary,
    },
    tasks,
    loadedAt: new Date().toISOString(),
  };
}
