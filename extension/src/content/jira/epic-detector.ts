import { JIRA_SELECTORS } from './selectors';
import { isDebugEnabled, debugLog } from '../debug';

const knownEpicKeys = new Set<string>();

export function rememberEpicKey(key: string): void {
  knownEpicKeys.add(key.toUpperCase());
}

export function isKnownEpicKey(key: string): boolean {
  return knownEpicKeys.has(key.toUpperCase());
}

function hasEpicDomHint(card: HTMLElement): boolean {
  for (const selector of JIRA_SELECTORS.epicIndicators) {
    try {
      if (card.querySelector(selector)) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  const textSignals = ['epic', 'эпик'];
  const labeled = card.querySelectorAll('[aria-label], [title], img[alt], img[src]');
  for (const node of labeled) {
    const values = [
      node.getAttribute('aria-label'),
      node.getAttribute('title'),
      node.getAttribute('alt'),
      node.getAttribute('src'),
    ];
    for (const value of values) {
      if (!value) continue;
      const lower = value.toLowerCase();
      if (textSignals.some((signal) => lower.includes(signal))) {
        return true;
      }
    }
  }

  // Some boards put issue type name near the key
  const typeBadge = card.querySelector('[class*="issuetype"], [data-testid*="issue-type"]');
  if (typeBadge?.textContent) {
    const t = typeBadge.textContent.trim().toLowerCase();
    if (t === 'epic' || t === 'эпик') {
      return true;
    }
  }

  // Common Jira lozenge / colorful epic label on board cards
  const lozenges = card.querySelectorAll('[class*="epic"], [data-testid*="epic"]');
  if (lozenges.length > 0) {
    return true;
  }

  return false;
}

export type EpicConfidence = 'dom' | 'cache' | 'unknown';

export function detectEpic(card: HTMLElement, issueKey: string): EpicConfidence {
  if (hasEpicDomHint(card)) {
    if (isDebugEnabled()) {
      debugLog(`epic via DOM: ${issueKey}`);
    }
    return 'dom';
  }
  if (isKnownEpicKey(issueKey)) {
    if (isDebugEnabled()) {
      debugLog(`epic via cache: ${issueKey}`);
    }
    return 'cache';
  }
  return 'unknown';
}

/**
 * Heuristic for MVP boards where epics are shown as cards:
 * treat as epic if DOM hints OR known cache.
 * Cards with unknown confidence are skipped (no icon) until confirmed.
 */
export function shouldInjectEpicIcon(card: HTMLElement, issueKey: string): boolean {
  const confidence = detectEpic(card, issueKey);
  return confidence === 'dom' || confidence === 'cache';
}
