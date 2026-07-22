import type { ExtensionMessage, ExtensionResponse } from '@jira-epic-gantt/shared';

export function sendExtensionMessage<T extends ExtensionResponse>(
  message: ExtensionMessage,
): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
