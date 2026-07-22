import type { ApiErrorBody, EpicGanttData, JiraFieldInfo, SessionInfo } from '@epic-plan/shared';
import { STORAGE_KEYS } from '@epic-plan/shared';
import { BACKEND_URL } from '../shared/config';

async function getSessionToken(): Promise<string | undefined> {
  const result = await chrome.storage.session.get(STORAGE_KEYS.sessionToken);
  return result[STORAGE_KEYS.sessionToken] as string | undefined;
}

export async function saveSessionToken(token: string): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEYS.sessionToken]: token });
}

export async function clearSessionToken(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEYS.sessionToken);
}

async function parseError(response: Response): Promise<ApiErrorBody> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.code && body?.message) {
      return body;
    }
  } catch {
    // ignore
  }
  if (response.status === 401) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Для просмотра диаграммы войдите через Atlassian.',
    };
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    return {
      code: 'RATE_LIMITED',
      message: 'Jira временно ограничила количество запросов. Повторите попытку позже.',
      retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    };
  }
  return {
    code: 'SERVER',
    message: 'Не удалось загрузить диаграмму.',
  };
}

export class ApiClientError extends Error {
  readonly body: ApiErrorBody;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.body = body;
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getSessionToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  try {
    return await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiClientError({
      code: 'NETWORK',
      message: 'Не удалось загрузить данные. Проверьте подключение и повторите попытку.',
    });
  }
}

export async function fetchSession(): Promise<SessionInfo> {
  const response = await apiFetch('/api/session');
  if (!response.ok) {
    throw new ApiClientError(await parseError(response));
  }
  return (await response.json()) as SessionInfo;
}

export async function fetchEpicTasks(epicKey: string): Promise<EpicGanttData> {
  const response = await apiFetch(`/api/jira/epics/${encodeURIComponent(epicKey)}/tasks`);
  if (!response.ok) {
    throw new ApiClientError(await parseError(response));
  }
  return (await response.json()) as EpicGanttData;
}

export async function fetchJiraFields(): Promise<JiraFieldInfo[]> {
  const response = await apiFetch('/api/jira/fields');
  if (!response.ok) {
    throw new ApiClientError(await parseError(response));
  }
  return (await response.json()) as JiraFieldInfo[];
}

export async function logoutRequest(): Promise<void> {
  const response = await apiFetch('/auth/logout', { method: 'POST' });
  await clearSessionToken();
  if (!response.ok && response.status !== 401) {
    throw new ApiClientError(await parseError(response));
  }
}

export function getAuthStartUrl(): string {
  return `${BACKEND_URL}/auth/atlassian/start`;
}
