import { ISSUE_KEY_REGEX, normalizeIssueKey } from '@epic-plan/shared';

export type KeyDetectionStrategy = 'browse-link' | 'data-attr' | 'text-fallback';

export interface ParsedIssueKey {
  key: string;
  strategy: KeyDetectionStrategy;
}

function fromBrowseHref(href: string): string | null {
  const match = href.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i);
  return match?.[1] ? normalizeIssueKey(match[1]) : null;
}

export function parseIssueKeyFromElement(element: Element): ParsedIssueKey | null {
  const links = element.querySelectorAll('a[href*="/browse/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const key = fromBrowseHref(href);
    if (key && ISSUE_KEY_REGEX.test(key)) {
      return { key, strategy: 'browse-link' };
    }
  }

  const dataAttrs = ['data-issue-key', 'data-key', 'data-issuekey', 'data-tooltip-content'];
  for (const attr of dataAttrs) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    const match = value.toUpperCase().match(ISSUE_KEY_REGEX);
    if (match?.[0]) {
      return { key: normalizeIssueKey(match[0]), strategy: 'data-attr' };
    }
  }

  for (const node of element.querySelectorAll('[data-issue-key], [data-key]')) {
    for (const attr of ['data-issue-key', 'data-key'] as const) {
      const value = node.getAttribute(attr);
      if (!value) continue;
      const key = normalizeIssueKey(value);
      if (ISSUE_KEY_REGEX.test(key)) {
        return { key, strategy: 'data-attr' };
      }
    }
  }

  const text = (element.textContent ?? '').slice(0, 400);
  const textMatch = text.toUpperCase().match(ISSUE_KEY_REGEX);
  if (textMatch?.[0]) {
    return { key: normalizeIssueKey(textMatch[0]), strategy: 'text-fallback' };
  }

  return null;
}
