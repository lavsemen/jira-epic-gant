import { JIRA_SELECTORS } from './selectors';
import { findIssueCards } from './issue-card-detector';
import { cleanupDetachedIcons, injectEpicIcons, type IconEventHandlers } from './epic-icon-injector';
import { isDebugEnabled, debugLog } from '../debug';

const DEBOUNCE_MS = 120;

export class BoardObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private urlCheckTimer: number | null = null;
  private lastUrl = location.href;
  private readonly handlers: IconEventHandlers;
  private started = false;

  constructor(handlers: IconEventHandlers) {
    this.handlers = handlers;
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.scan();
    this.attachObserver();
    this.urlCheckTimer = window.setInterval(() => this.checkUrlChange(), 800);
    if (isDebugEnabled()) {
      debugLog('BoardObserver started');
    }
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.urlCheckTimer !== null) {
      window.clearInterval(this.urlCheckTimer);
      this.urlCheckTimer = null;
    }
    this.started = false;
  }

  scan(): void {
    cleanupDetachedIcons();
    const cards = findIssueCards(document);
    const count = injectEpicIcons(cards, this.handlers);
    if (isDebugEnabled() && count > 0) {
      debugLog(`scan injected ${count} icons`);
    }
  }

  private attachObserver(): void {
    const root = this.resolveRoot();
    this.observer?.disconnect();
    this.observer = new MutationObserver((mutations) => {
      if (!this.shouldReact(mutations)) {
        return;
      }
      this.scheduleScan();
    });
    this.observer.observe(root, {
      childList: true,
      subtree: true,
    });
  }

  private resolveRoot(): Element {
    for (const selector of JIRA_SELECTORS.boardRoots) {
      try {
        const node = document.querySelector(selector);
        if (node) {
          return node;
        }
      } catch {
        // ignore
      }
    }
    return document.documentElement;
  }

  private shouldReact(mutations: MutationRecord[]): boolean {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.closest?.('[data-gantt-icon]') || node.hasAttribute?.('data-gantt-icon')) {
          continue;
        }
        if (
          node.matches?.('a[href*="/browse/"], [data-issue-key], [draggable="true"]') ||
          node.querySelector?.('a[href*="/browse/"], [data-issue-key], [draggable="true"]')
        ) {
          return true;
        }
      }
      for (const node of mutation.removedNodes) {
        if (node instanceof HTMLElement) {
          return true;
        }
      }
    }
    return false;
  }

  private scheduleScan(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.scan();
    }, DEBOUNCE_MS);
  }

  private checkUrlChange(): void {
    if (location.href === this.lastUrl) {
      return;
    }
    this.lastUrl = location.href;
    if (isDebugEnabled()) {
      debugLog('URL changed, rescan');
    }
    this.attachObserver();
    this.scheduleScan();
  }
}
