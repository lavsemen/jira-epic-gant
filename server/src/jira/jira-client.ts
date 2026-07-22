import type { SessionRow } from '../auth/token-store.js';
import { getValidAccessToken } from '../auth/session-service.js';
import { mapHttpStatusToAppError } from './jira-errors.js';
import type { ChangelogHistory, JiraStatusInfo } from './in-progress.js';

export interface JiraSearchIssue {
  id: string;
  key: string;
  fields: Record<string, unknown>;
  changelog?: {
    startAt?: number;
    maxResults?: number;
    total?: number;
    histories?: ChangelogHistory[];
  };
}

interface JiraSearchResponse {
  issues?: JiraSearchIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

async function jiraFetch(
  session: SessionRow,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const accessToken = await getValidAccessToken(session);
  const url = `https://api.atlassian.com/ex/jira/${session.cloud_id}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

export async function searchIssuesByJql(params: {
  session: SessionRow;
  jql: string;
  fields: string[];
  maxResults?: number;
  expand?: string[];
}): Promise<JiraSearchIssue[]> {
  const maxResults = params.maxResults ?? 100;
  const issues: JiraSearchIssue[] = [];
  let nextPageToken: string | undefined;

  do {
    const body: Record<string, unknown> = {
      jql: params.jql,
      maxResults,
      fields: params.fields,
    };
    if (params.expand?.length) {
      body.expand = params.expand.join(',');
    }
    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }

    const response = await jiraFetch(params.session, '/rest/api/3/search/jql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw mapHttpStatusToAppError(response.status, text, response.headers.get('Retry-After'));
    }

    const data = (await response.json()) as JiraSearchResponse;
    issues.push(...(data.issues ?? []));
    nextPageToken = data.nextPageToken;
    if (data.isLast || !nextPageToken) {
      break;
    }
  } while (issues.length < 500);

  return issues;
}

export async function getIssue(
  session: SessionRow,
  issueKey: string,
  fields: string[],
  expand?: string[],
): Promise<JiraSearchIssue> {
  const qs = new URLSearchParams({ fields: fields.join(',') });
  if (expand?.length) {
    qs.set('expand', expand.join(','));
  }
  const response = await jiraFetch(
    session,
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}?${qs.toString()}`,
  );
  if (!response.ok) {
    const text = await response.text();
    throw mapHttpStatusToAppError(response.status, text, response.headers.get('Retry-After'));
  }
  return (await response.json()) as JiraSearchIssue;
}

export async function listFields(session: SessionRow): Promise<unknown> {
  const response = await jiraFetch(session, '/rest/api/3/field');
  if (!response.ok) {
    const text = await response.text();
    throw mapHttpStatusToAppError(response.status, text, response.headers.get('Retry-After'));
  }
  return response.json();
}

export async function listStatuses(session: SessionRow): Promise<JiraStatusInfo[]> {
  const response = await jiraFetch(session, '/rest/api/3/status');
  if (!response.ok) {
    const text = await response.text();
    throw mapHttpStatusToAppError(response.status, text, response.headers.get('Retry-After'));
  }
  const raw = (await response.json()) as Array<{
    id: string;
    name: string;
    statusCategory?: { key?: string };
  }>;
  return raw.map((item) => ({
    id: String(item.id),
    name: String(item.name ?? ''),
    categoryKey: item.statusCategory?.key ?? 'new',
  }));
}

/** Paginated changelog for a single issue. */
export async function getIssueChangelog(
  session: SessionRow,
  issueKey: string,
): Promise<ChangelogHistory[]> {
  const histories: ChangelogHistory[] = [];
  let startAt = 0;
  const maxResults = 100;

  for (;;) {
    const qs = new URLSearchParams({
      startAt: String(startAt),
      maxResults: String(maxResults),
    });
    const response = await jiraFetch(
      session,
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/changelog?${qs.toString()}`,
    );
    if (!response.ok) {
      const text = await response.text();
      throw mapHttpStatusToAppError(response.status, text, response.headers.get('Retry-After'));
    }
    const data = (await response.json()) as {
      values?: ChangelogHistory[];
      total?: number;
      isLast?: boolean;
    };
    histories.push(...(data.values ?? []));
    if (data.isLast || !data.values?.length || histories.length >= (data.total ?? histories.length)) {
      break;
    }
    startAt += data.values.length;
  }

  return histories;
}

/** Load changelogs for issues (forceAll = always refetch via changelog API). */
export async function ensureChangelogs(
  session: SessionRow,
  issues: JiraSearchIssue[],
  forceAll = false,
): Promise<void> {
  const missing = forceAll
    ? issues
    : issues.filter((issue) => {
        const histories = issue.changelog?.histories;
        if (!histories?.length) {
          return true;
        }
        const total = issue.changelog?.total;
        return typeof total === 'number' && total > histories.length;
      });
  const concurrency = 5;
  for (let i = 0; i < missing.length; i += concurrency) {
    const slice = missing.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (issue) => {
        const histories = await getIssueChangelog(session, issue.key);
        issue.changelog = {
          histories,
          total: histories.length,
        };
      }),
    );
  }
}
