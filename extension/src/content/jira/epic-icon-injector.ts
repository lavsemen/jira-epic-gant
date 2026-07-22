import { ICON_ATTR, ICON_HOST_ATTR, JIRA_SELECTORS } from './selectors';
import type { DetectedIssueCard } from './issue-card-detector';
import { shouldInjectEpicIcon } from './epic-detector';
import { isDebugEnabled, debugLog } from '../debug';

export type IconEventHandlers = {
  onClick: (epicKey: string) => void;
};

function createIconButton(epicKey: string, handlers: IconEventHandlers): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(ICON_ATTR, '1');
  button.setAttribute('data-epic-key', epicKey);
  button.setAttribute('aria-label', 'Открыть диаграмму Ганта');
  button.title = 'Открыть диаграмму Ганта';
  button.className = 'jeg-epic-icon';
  button.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor" opacity="0.35"/>
      <rect x="1" y="7" width="9" height="2" rx="1" fill="currentColor"/>
      <rect x="1" y="11" width="12" height="2" rx="1" fill="currentColor" opacity="0.7"/>
    </svg>
  `;

  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    marginLeft: '4px',
    padding: '0',
    border: 'none',
    borderRadius: '3px',
    background: 'transparent',
    color: '#42526E',
    cursor: 'pointer',
    flex: '0 0 auto',
    lineHeight: '1',
    verticalAlign: 'middle',
  } as CSSStyleDeclaration);

  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(9, 30, 66, 0.08)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = 'transparent';
  });
  button.addEventListener('mousedown', () => {
    button.style.background = 'rgba(9, 30, 66, 0.16)';
  });
  button.addEventListener('mouseup', () => {
    button.style.background = 'rgba(9, 30, 66, 0.08)';
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handlers.onClick(epicKey);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handlers.onClick(epicKey);
    }
  });
  button.addEventListener('focus', () => {
    button.style.outline = '2px solid #4C9AFF';
    button.style.outlineOffset = '1px';
  });
  button.addEventListener('blur', () => {
    button.style.outline = 'none';
  });

  return button;
}

function resolveMountPoint(card: HTMLElement): HTMLElement {
  for (const selector of JIRA_SELECTORS.iconMountCandidates) {
    try {
      const mount = card.querySelector(selector);
      if (mount instanceof HTMLElement) {
        return mount;
      }
    } catch {
      // ignore
    }
  }
  return card;
}

export function injectEpicIcons(
  cards: DetectedIssueCard[],
  handlers: IconEventHandlers,
): number {
  let injected = 0;

  for (const card of cards) {
    const { element, issueKey } = card;
    if (element.querySelector(`[${ICON_ATTR}="1"]`)) {
      continue;
    }
    if (!shouldInjectEpicIcon(element, issueKey.key)) {
      continue;
    }

    const mount = resolveMountPoint(element);
    if (mount.getAttribute(ICON_HOST_ATTR) === '1' && mount.querySelector(`[${ICON_ATTR}]`)) {
      continue;
    }

    const button = createIconButton(issueKey.key, handlers);
    mount.setAttribute(ICON_HOST_ATTR, '1');
    mount.appendChild(button);
    injected += 1;

    if (isDebugEnabled()) {
      debugLog(`icon injected for ${issueKey.key} via ${issueKey.strategy}`);
    }
  }

  return injected;
}

export function cleanupDetachedIcons(): void {
  document.querySelectorAll(`[${ICON_ATTR}="1"]`).forEach((node) => {
    if (!document.contains(node)) {
      node.remove();
    }
  });
}
