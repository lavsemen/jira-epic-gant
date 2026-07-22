import type { ApiErrorBody, EpicGanttData, SessionInfo } from './types.js';

export type ExtensionMessage =
  | {
      type: 'GET_EPIC_TASKS';
      payload: { epicKey: string; forceRefresh?: boolean };
    }
  | {
      type: 'OPEN_JIRA_ISSUE';
      payload: { issueKey: string };
    }
  | {
      type: 'GET_AUTH_STATUS';
    }
  | {
      type: 'START_AUTH';
    }
  | {
      type: 'LOGOUT';
    }
  | {
      type: 'GET_JIRA_FIELDS';
    }
  | {
      type: 'SAVE_SESSION_TOKEN';
      payload: { sessionToken: string };
    };

export type ExtensionResponse =
  | {
      type: 'GET_EPIC_TASKS_RESULT';
      ok: true;
      data: EpicGanttData;
    }
  | {
      type: 'GET_EPIC_TASKS_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'OPEN_JIRA_ISSUE_RESULT';
      ok: true;
    }
  | {
      type: 'OPEN_JIRA_ISSUE_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'GET_AUTH_STATUS_RESULT';
      ok: true;
      data: SessionInfo;
    }
  | {
      type: 'GET_AUTH_STATUS_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'START_AUTH_RESULT';
      ok: true;
    }
  | {
      type: 'START_AUTH_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'LOGOUT_RESULT';
      ok: true;
    }
  | {
      type: 'LOGOUT_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'GET_JIRA_FIELDS_RESULT';
      ok: true;
      data: Array<{ id: string; name: string; custom: boolean; schemaType: string }>;
    }
  | {
      type: 'GET_JIRA_FIELDS_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'SAVE_SESSION_TOKEN_RESULT';
      ok: true;
    }
  | {
      type: 'SAVE_SESSION_TOKEN_RESULT';
      ok: false;
      error: ApiErrorBody;
    }
  | {
      type: 'UNKNOWN_MESSAGE';
      ok: false;
      error: ApiErrorBody;
    };

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const msg = value as { type?: unknown; payload?: unknown };
  if (typeof msg.type !== 'string') {
    return false;
  }
  switch (msg.type) {
    case 'GET_EPIC_TASKS': {
      const payload = msg.payload as { epicKey?: unknown; forceRefresh?: unknown } | undefined;
      return (
        !!payload &&
        typeof payload.epicKey === 'string' &&
        (payload.forceRefresh === undefined || typeof payload.forceRefresh === 'boolean')
      );
    }
    case 'OPEN_JIRA_ISSUE': {
      const payload = msg.payload as { issueKey?: unknown } | undefined;
      return !!payload && typeof payload.issueKey === 'string';
    }
    case 'SAVE_SESSION_TOKEN': {
      const payload = msg.payload as { sessionToken?: unknown } | undefined;
      return !!payload && typeof payload.sessionToken === 'string' && payload.sessionToken.length > 0;
    }
    case 'GET_AUTH_STATUS':
    case 'START_AUTH':
    case 'LOGOUT':
    case 'GET_JIRA_FIELDS':
      return true;
    default:
      return false;
  }
}
