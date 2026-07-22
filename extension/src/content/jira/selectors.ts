/**
 * Нестабильные селекторы Jira Cloud.
 *
 * После инспекции реальной доски на ytme.atlassian.net дополните/замените
 * значения ниже. Стратегии детекции используют несколько fallback'ов.
 *
 * Как найти селекторы:
 * 1. Откройте доску Jira.
 * 2. Добавьте ?ganttDebug=1 к URL или localStorage.setItem('ganttDebug','1').
 * 3. В DevTools найдите карточку эпика и её data-* / ссылку /browse/KEY.
 * 4. Обновите константы в этом файле и пересоберите расширение.
 */

export const JIRA_SELECTORS = {
  /** Корневые контейнеры доски (пробуются по порядку) */
  boardRoots: [
    '[data-testid="software-board"]',
    '[data-testid="software-board.board"]',
    '#ghx-work',
    '#jira-frontend',
    'main',
    '#ak-main-content',
  ],

  /** Кандидаты на карточку задачи */
  issueCardCandidates: [
    '[data-testid*="platform-board-kit.ui.card.card"]',
    '[data-testid*="board-card"]',
    '[data-issue-key]',
    '[data-tooltip-content*="-"]',
    'div[draggable="true"]',
  ],

  /** Место для инъекции иконки внутри карточки */
  iconMountCandidates: [
    '[data-testid*="card-footer"]',
    '[data-testid*="extra-fields"]',
    'footer',
    '[class*="footer"]',
  ],

  /** Признаки типа Epic в DOM */
  epicIndicators: [
    'img[alt*="Epic" i]',
    'img[alt*="Эпик" i]',
    '[aria-label*="Epic" i]',
    '[aria-label*="Эпик" i]',
    '[data-tooltip*="Epic" i]',
    '[title*="Epic" i]',
    '[title*="Эпик" i]',
  ],
} as const;

export const ICON_ATTR = 'data-gantt-icon';
export const ICON_HOST_ATTR = 'data-gantt-icon-host';
export const CARD_MARK_ATTR = 'data-gantt-processed';
export const EXTENSION_ROOT_TAG = 'jira-epic-gantt-extension-root';
