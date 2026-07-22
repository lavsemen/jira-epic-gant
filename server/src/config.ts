import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, '../../.env');
if (existsSync(rootEnv)) {
  loadDotenv({ path: rootEnv });
} else {
  loadDotenv();
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    return '';
  }
  return value;
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  backendPublicUrl: required('BACKEND_PUBLIC_URL', 'http://localhost:8787'),
  atlassianClientId: required('ATLASSIAN_CLIENT_ID'),
  atlassianClientSecret: required('ATLASSIAN_CLIENT_SECRET'),
  atlassianCallbackUrl: required(
    'ATLASSIAN_CALLBACK_URL',
    'http://localhost:8787/auth/atlassian/callback',
  ),
  allowedJiraHost: required('ALLOWED_JIRA_HOST', 'ytme.atlassian.net'),
  allowedJiraCloudId: required('ALLOWED_JIRA_CLOUD_ID', ''),
  extensionId: required('EXTENSION_ID', ''),
  sqlitePath: resolve(
    process.cwd(),
    required('SQLITE_PATH', './data/sessions.sqlite'),
  ),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 7),
  corsExtraOrigins: parseCsv(process.env.CORS_EXTRA_ORIGINS ?? ''),
  cancelledStatusIds: parseCsv(process.env.CANCELLED_STATUS_IDS ?? ''),
  oauthScopes: ['read:jira-work', 'offline_access'] as const,
};

export function getCorsOrigins(): string[] {
  const origins = [
    'http://localhost:8787',
    ...config.corsExtraOrigins,
  ];
  if (config.extensionId) {
    origins.push(`chrome-extension://${config.extensionId}`);
  }
  return origins;
}
