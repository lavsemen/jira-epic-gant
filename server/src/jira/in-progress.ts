export interface JiraStatusInfo {
  id: string;
  name: string;
  categoryKey: 'new' | 'indeterminate' | 'done' | string;
}

export interface ChangelogHistory {
  created: string;
  items: Array<{
    field?: string;
    fieldId?: string;
    from?: string | null;
    to?: string | null;
    fromString?: string | null;
    toString?: string | null;
  }>;
}

const IN_PROGRESS_NAME_ALIASES = new Set([
  'in progress',
  'inprogress',
  'в работе',
  'doing',
  'started',
  'development',
  'разработка',
  'в разработке',
  'implementing',
  'implementation',
  'coding',
]);

const IN_PROGRESS_NAME_INCLUDES = [
  'progress',
  'в работ',
  'разработ',
  'doing',
  'develop',
  'implement',
];

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function nameLooksInProgress(statusName: string | null | undefined): boolean {
  if (!statusName) {
    return false;
  }
  const normalized = normalizeName(statusName);
  if (IN_PROGRESS_NAME_ALIASES.has(normalized)) {
    return true;
  }
  return IN_PROGRESS_NAME_INCLUDES.some((fragment) => normalized.includes(fragment));
}

export function isInProgressStatus(
  statusId: string | null | undefined,
  statusName: string | null | undefined,
  statusById: Map<string, JiraStatusInfo>,
): boolean {
  if (statusId) {
    const meta = statusById.get(String(statusId));
    if (meta?.categoryKey === 'indeterminate') {
      return true;
    }
    // Some sites put WIP statuses under unexpected categories — trust name too.
    if (meta?.name && nameLooksInProgress(meta.name)) {
      return true;
    }
  }
  return nameLooksInProgress(statusName);
}

function toCalendarDate(isoDateTime: string | null | undefined): string | null {
  if (!isoDateTime) {
    return null;
  }
  const match = isoDateTime.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function categoryOf(
  statusId: string | null | undefined,
  statusName: string | null | undefined,
  statusById: Map<string, JiraStatusInfo>,
): string | null {
  if (statusId) {
    const meta = statusById.get(String(statusId));
    if (meta?.categoryKey) {
      return meta.categoryKey;
    }
  }
  if (statusName) {
    for (const status of statusById.values()) {
      if (normalizeName(status.name) === normalizeName(statusName)) {
        return status.categoryKey;
      }
    }
  }
  return null;
}

/**
 * Resolve "взята в работу" date:
 * 1) earliest changelog transition into In Progress / indeterminate
 * 2) earliest transition out of "new" into non-new (started work heuristic)
 * 3) if currently In Progress — statuscategorychangedate
 */
export function resolveInProgressStartDate(params: {
  histories: ChangelogHistory[] | undefined;
  statusById: Map<string, JiraStatusInfo>;
  currentStatusId?: string;
  currentStatusName?: string;
  currentCategoryKey?: string;
  statusCategoryChangedDate?: string | null;
}): string | null {
  const { histories, statusById } = params;

  let earliestInProgress: string | null = null;
  let earliestLeftTodo: string | null = null;

  for (const history of histories ?? []) {
    for (const item of history.items ?? []) {
      const field = (item.field ?? '').toLowerCase();
      const fieldId = (item.fieldId ?? '').toLowerCase();
      if (field !== 'status' && fieldId !== 'status') {
        continue;
      }
      if (!history.created) {
        continue;
      }

      if (isInProgressStatus(item.to, item.toString, statusById)) {
        if (!earliestInProgress || history.created < earliestInProgress) {
          earliestInProgress = history.created;
        }
      }

      const fromCategory = categoryOf(item.from, item.fromString, statusById);
      const toCategory = categoryOf(item.to, item.toString, statusById);
      const leftTodo =
        (fromCategory === 'new' || nameLooksLikeTodo(item.fromString)) &&
        toCategory !== 'new' &&
        !nameLooksLikeTodo(item.toString);

      if (leftTodo && (!earliestLeftTodo || history.created < earliestLeftTodo)) {
        earliestLeftTodo = history.created;
      }
    }
  }

  const fromChangelog = toCalendarDate(earliestInProgress) ?? toCalendarDate(earliestLeftTodo);
  if (fromChangelog) {
    return fromChangelog;
  }

  const currentlyInProgress =
    params.currentCategoryKey === 'indeterminate' ||
    isInProgressStatus(params.currentStatusId, params.currentStatusName, statusById);

  if (currentlyInProgress) {
    return toCalendarDate(params.statusCategoryChangedDate ?? null);
  }

  return null;
}

function nameLooksLikeTodo(statusName: string | null | undefined): boolean {
  if (!statusName) {
    return false;
  }
  const normalized = normalizeName(statusName);
  return (
    normalized === 'to do' ||
    normalized === 'todo' ||
    normalized === 'backlog' ||
    normalized === 'open' ||
    normalized === 'к выполнению' ||
    normalized === 'новый' ||
    normalized.includes('backlog') ||
    normalized.includes('to do')
  );
}

/** @deprecated use resolveInProgressStartDate */
export function findFirstInProgressDate(
  histories: ChangelogHistory[] | undefined,
  statusById: Map<string, JiraStatusInfo>,
): string | null {
  return resolveInProgressStartDate({ histories, statusById });
}
