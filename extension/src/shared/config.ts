export const BACKEND_URL = __BACKEND_URL__;
export const JIRA_HOST = __JIRA_HOST__;

export function parseCancelledStatusIds(): string[] {
  return (__CANCELLED_STATUS_IDS__ || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
