import { JIRA_SELECTORS } from './selectors';
import { parseIssueKeyFromElement, type ParsedIssueKey } from './issue-key-parser';
import { isDebugEnabled, debugLog } from '../debug';

export interface DetectedIssueCard {
  element: HTMLElement;
  issueKey: ParsedIssueKey;
}

function uniqueElements(elements: Element[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    result.push(el);
  }
  return result;
}

export function findIssueCards(root: ParentNode = document): DetectedIssueCard[] {
  const candidates: Element[] = [];

  for (const selector of JIRA_SELECTORS.issueCardCandidates) {
    try {
      candidates.push(...root.querySelectorAll(selector));
    } catch {
      // invalid selector — skip
    }
  }

  // Also catch cards that only expose browse links
  candidates.push(...root.querySelectorAll('a[href*="/browse/"]'));

  const cards: DetectedIssueCard[] = [];
  const seenKeys = new Set<string>();

  for (const candidate of uniqueElements(candidates)) {
    const card =
      candidate.closest(
        JIRA_SELECTORS.issueCardCandidates.join(', '),
      ) ??
      (candidate.matches('[draggable="true"]') ? candidate : null) ??
      candidate.closest('[draggable="true"]') ??
      (candidate instanceof HTMLElement && candidate.querySelector('a[href*="/browse/"]')
        ? candidate
        : null);

    const element =
      card instanceof HTMLElement
        ? card
        : candidate instanceof HTMLAnchorElement
          ? (candidate.closest('div,li,article') as HTMLElement | null)
          : candidate instanceof HTMLElement
            ? candidate
            : null;

    if (!element) continue;

    const issueKey = parseIssueKeyFromElement(element);
    if (!issueKey) continue;
    if (seenKeys.has(issueKey.key)) continue;

    // Prefer the smallest reasonable card container that still contains the key
    seenKeys.add(issueKey.key);
    cards.push({ element, issueKey });
  }

  if (isDebugEnabled()) {
    debugLog(`detected cards: ${cards.length}`, cards.map((c) => `${c.issueKey.key}/${c.issueKey.strategy}`));
  }

  return cards;
}
