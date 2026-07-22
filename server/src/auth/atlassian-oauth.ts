import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { consumeOAuthState, saveOAuthState } from './token-store.js';

const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export interface AccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl?: string;
}

export function createAuthorizeUrl(): { url: string; state: string } {
  const state = randomBytes(24).toString('hex');
  saveOAuthState(state, 10 * 60 * 1000);

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: config.atlassianClientId,
    scope: config.oauthScopes.join(' '),
    redirect_uri: config.atlassianCallbackUrl,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  return { url: `${AUTHORIZE_URL}?${params.toString()}`, state };
}

export function verifyOAuthState(state: string): boolean {
  return consumeOAuthState(state);
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.atlassianClientId,
      client_secret: config.atlassianClientSecret,
      code,
      redirect_uri: config.atlassianCallbackUrl,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text.slice(0, 200)}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.atlassianClientId,
      client_secret: config.atlassianClientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${text.slice(0, 200)}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function getAccessibleResources(
  accessToken: string,
): Promise<AccessibleResource[]> {
  const response = await fetch(RESOURCES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resources fetch failed: ${response.status} ${text.slice(0, 200)}`);
  }

  return (await response.json()) as AccessibleResource[];
}

export function pickAllowedResource(
  resources: AccessibleResource[],
): AccessibleResource | undefined {
  if (config.allowedJiraCloudId) {
    return resources.find((r) => r.id === config.allowedJiraCloudId);
  }
  const host = config.allowedJiraHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return resources.find((r) => {
    try {
      return new URL(r.url).host === host;
    } catch {
      return r.url.includes(host);
    }
  });
}
