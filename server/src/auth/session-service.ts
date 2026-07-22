import { randomBytes } from 'node:crypto';
import type { SessionInfo } from '@epic-plan/shared';
import { config } from '../config.js';
import {
  createSession,
  deleteSession,
  getSessionByToken,
  updateSessionTokens,
  type SessionRow,
} from './token-store.js';
import {
  exchangeCodeForTokens,
  getAccessibleResources,
  pickAllowedResource,
  refreshAccessToken,
  verifyOAuthState,
} from './atlassian-oauth.js';

function newId(): string {
  return randomBytes(16).toString('hex');
}

function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function completeOAuthLogin(params: {
  code: string;
  state: string;
}): Promise<{ sessionToken: string; jiraHost: string }> {
  if (!verifyOAuthState(params.state)) {
    throw Object.assign(new Error('Invalid or expired OAuth state'), { code: 'BAD_REQUEST' });
  }

  const tokens = await exchangeCodeForTokens(params.code);
  const resources = await getAccessibleResources(tokens.access_token);
  const resource = pickAllowedResource(resources);

  if (!resource) {
    throw Object.assign(
      new Error(`Нет доступа к разрешённому Jira-инстансу ${config.allowedJiraHost}`),
      { code: 'FORBIDDEN' },
    );
  }

  const now = Date.now();
  const sessionToken = newSessionToken();
  createSession({
    id: newId(),
    session_token: sessionToken,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_expires_at: now + tokens.expires_in * 1000,
    cloud_id: resource.id,
    jira_host: new URL(resource.url).host,
    display_name: resource.name,
    account_id: null,
    expires_at: now + config.sessionTtlDays * 24 * 60 * 60 * 1000,
  });

  return { sessionToken, jiraHost: new URL(resource.url).host };
}

export function getSessionInfo(sessionToken: string): SessionInfo {
  const session = getSessionByToken(sessionToken);
  if (!session) {
    return { authenticated: false };
  }
  return {
    authenticated: true,
    displayName: session.display_name ?? undefined,
    jiraHost: session.jira_host,
    expiresAt: new Date(session.expires_at).toISOString(),
  };
}

export function logout(sessionToken: string): void {
  deleteSession(sessionToken);
}

export async function getValidAccessToken(session: SessionRow): Promise<string> {
  const skewMs = 60_000;
  if (session.access_expires_at > Date.now() + skewMs) {
    return session.access_token;
  }

  const refreshed = await refreshAccessToken(session.refresh_token);
  const nextRefresh = refreshed.refresh_token || session.refresh_token;
  updateSessionTokens(session.id, {
    access_token: refreshed.access_token,
    refresh_token: nextRefresh,
    access_expires_at: Date.now() + refreshed.expires_in * 1000,
  });
  return refreshed.access_token;
}

export function requireSession(sessionToken: string | undefined): SessionRow {
  if (!sessionToken) {
    throw Object.assign(new Error('Требуется авторизация'), { code: 'UNAUTHORIZED' });
  }
  const session = getSessionByToken(sessionToken);
  if (!session) {
    throw Object.assign(new Error('Сессия истекла или недействительна'), {
      code: 'UNAUTHORIZED',
    });
  }
  return session;
}
