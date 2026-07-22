import {
  isExtensionMessage,
  isValidIssueKey,
  normalizeIssueKey,
  type ExtensionMessage,
  type ExtensionResponse,
} from '@jira-epic-gantt/shared';
import {
  ApiClientError,
  clearSessionToken,
  fetchEpicTasks,
  fetchJiraFields,
  fetchSession,
  getAuthStartUrl,
  logoutRequest,
  saveSessionToken,
} from './api-client';
import {
  clearCachedEpicTasks,
  dedupeEpicRequest,
  getCachedEpicTasks,
  setCachedEpicTasks,
} from './request-cache';
import { JIRA_HOST } from '../shared/config';

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'GET_EPIC_TASKS': {
      const epicKey = normalizeIssueKey(message.payload.epicKey);
      if (!isValidIssueKey(epicKey)) {
        return {
          type: 'GET_EPIC_TASKS_RESULT',
          ok: false,
          error: { code: 'INVALID_EPIC_KEY', message: 'Некорректный ключ эпика.' },
        };
      }
      try {
        if (!message.payload.forceRefresh) {
          const cached = getCachedEpicTasks(epicKey);
          if (cached) {
            return { type: 'GET_EPIC_TASKS_RESULT', ok: true, data: cached };
          }
        } else {
          clearCachedEpicTasks(epicKey);
        }

        const data = await dedupeEpicRequest(epicKey, () => fetchEpicTasks(epicKey));
        setCachedEpicTasks(epicKey, data);
        return { type: 'GET_EPIC_TASKS_RESULT', ok: true, data };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return { type: 'GET_EPIC_TASKS_RESULT', ok: false, error: error.body };
        }
        return {
          type: 'GET_EPIC_TASKS_RESULT',
          ok: false,
          error: { code: 'SERVER', message: 'Не удалось загрузить диаграмму.' },
        };
      }
    }

    case 'OPEN_JIRA_ISSUE': {
      const issueKey = normalizeIssueKey(message.payload.issueKey);
      if (!isValidIssueKey(issueKey)) {
        return {
          type: 'OPEN_JIRA_ISSUE_RESULT',
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'Некорректный ключ задачи.' },
        };
      }
      await chrome.tabs.create({
        url: `https://${JIRA_HOST}/browse/${issueKey}`,
      });
      return { type: 'OPEN_JIRA_ISSUE_RESULT', ok: true };
    }

    case 'GET_AUTH_STATUS': {
      try {
        const data = await fetchSession();
        return { type: 'GET_AUTH_STATUS_RESULT', ok: true, data };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return { type: 'GET_AUTH_STATUS_RESULT', ok: false, error: error.body };
        }
        return {
          type: 'GET_AUTH_STATUS_RESULT',
          ok: true,
          data: { authenticated: false },
        };
      }
    }

    case 'START_AUTH': {
      try {
        await chrome.tabs.create({ url: getAuthStartUrl() });
        return { type: 'START_AUTH_RESULT', ok: true };
      } catch {
        return {
          type: 'START_AUTH_RESULT',
          ok: false,
          error: { code: 'SERVER', message: 'Не удалось открыть страницу авторизации.' },
        };
      }
    }

    case 'LOGOUT': {
      try {
        await logoutRequest();
        clearCachedEpicTasks();
        return { type: 'LOGOUT_RESULT', ok: true };
      } catch (error) {
        await clearSessionToken();
        if (error instanceof ApiClientError) {
          return { type: 'LOGOUT_RESULT', ok: false, error: error.body };
        }
        return { type: 'LOGOUT_RESULT', ok: true };
      }
    }

    case 'GET_JIRA_FIELDS': {
      try {
        const data = await fetchJiraFields();
        return { type: 'GET_JIRA_FIELDS_RESULT', ok: true, data };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return { type: 'GET_JIRA_FIELDS_RESULT', ok: false, error: error.body };
        }
        return {
          type: 'GET_JIRA_FIELDS_RESULT',
          ok: false,
          error: { code: 'SERVER', message: 'Не удалось загрузить список полей.' },
        };
      }
    }

    case 'SAVE_SESSION_TOKEN': {
      await saveSessionToken(message.payload.sessionToken);
      return { type: 'SAVE_SESSION_TOKEN_RESULT', ok: true };
    }

    default:
      return {
        type: 'UNKNOWN_MESSAGE',
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Неизвестное сообщение.' },
      };
  }
}

export function registerMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isExtensionMessage(message)) {
      sendResponse({
        type: 'UNKNOWN_MESSAGE',
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Некорректное сообщение.' },
      } satisfies ExtensionResponse);
      return false;
    }

    void handleMessage(message).then(sendResponse);
    return true;
  });
}
