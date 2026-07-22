export const JIRA_HOST_DEFAULT = 'ytme.atlassian.net';

export const REQUEST_CACHE_TTL_MS = 8_000;

export const GANTT_ZOOM_DAY_WIDTH: Record<'compact' | 'default' | 'large', number> = {
  compact: 20,
  default: 32,
  large: 48,
};

export const GANTT_LAYOUT = {
  taskColWidthDefault: 280,
  taskColWidthMin: 180,
  taskColWidthMax: 560,
  rowHeightDefault: 44,
  rowHeightMin: 28,
  rowHeightMax: 96,
} as const;

export const TIMELINE_PADDING_WORKING_DAYS = 3;

export const MAX_TASKS_SOFT_LIMIT = 100;

export const CANCELLED_STATUS_NAME_ALIASES = [
  'cancelled',
  'canceled',
  'отменено',
  'отменена',
  'отменён',
  'отменен',
] as const;

export const STORAGE_KEYS = {
  grouping: 'gantt.grouping',
  zoom: 'gantt.zoom',
  taskColWidthPx: 'gantt.taskColWidthPx',
  rowHeightPx: 'gantt.rowHeightPx',
  cancelledStatusIds: 'gantt.cancelledStatusIds',
  sessionToken: 'gantt.sessionToken',
} as const;

export const OAUTH_SCOPES = ['read:jira-work', 'offline_access'] as const;
