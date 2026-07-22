export type StatusCategoryKey = 'new' | 'indeterminate' | 'done';

export type TaskDateState = 'scheduled' | 'requires-estimation' | 'invalid-dates';

export type GanttZoom = 'compact' | 'default' | 'large';

export type GanttGrouping = 'none' | 'status' | 'assignee' | 'issueType';

export type ScheduleGapReason =
  | 'missing-start'
  | 'missing-estimate'
  | 'missing-both';

export interface JiraStatusConfig {
  cancelledStatusIds: string[];
}

export interface GanttTask {
  id: string;
  key: string;
  summary: string;
  issueType: {
    id: string;
    name: string;
    iconUrl?: string;
  };
  status: {
    id: string;
    name: string;
    categoryKey: StatusCategoryKey;
  };
  assignee: {
    accountId: string;
    displayName: string;
    avatarUrl?: string;
  } | null;
  /** Date when moved to In Progress (YYYY-MM-DD) */
  startDate: string | null;
  /** startDate + Original Estimate in working days (YYYY-MM-DD) */
  endDate: string | null;
  /** Jira timeoriginalestimate in seconds */
  originalEstimateSeconds: number | null;
  scheduleGapReason: ScheduleGapReason | null;
  state: TaskDateState;
  isDone: boolean;
  isCancelled: boolean;
  isOverdue: boolean;
  jiraUrl: string;
  /** Original API order / Rank position for stable secondary sort */
  rankIndex: number;
}

export interface EpicGanttData {
  epic: {
    key: string;
    summary: string;
  };
  tasks: GanttTask[];
  loadedAt: string;
}

export interface JiraFieldInfo {
  id: string;
  name: string;
  custom: boolean;
  schemaType: string;
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'FIELDS_NOT_CONFIGURED'
  | 'INVALID_EPIC_KEY'
  | 'NETWORK'
  | 'SERVER'
  | 'BAD_REQUEST';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  retryAfterSeconds?: number;
}

export interface SessionInfo {
  authenticated: boolean;
  displayName?: string;
  jiraHost?: string;
  expiresAt?: string;
}

export interface AuthCallbackPayload {
  sessionToken: string;
}
