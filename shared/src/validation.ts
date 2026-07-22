/** Standard Jira Cloud issue key, e.g. YTME-100 */
export const ISSUE_KEY_REGEX = /^[A-Z][A-Z0-9_]*-\d+$/;

export function isValidIssueKey(value: string): boolean {
  return ISSUE_KEY_REGEX.test(value);
}

export function normalizeIssueKey(value: string): string {
  return value.trim().toUpperCase();
}
