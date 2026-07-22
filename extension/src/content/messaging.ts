import type { ExtensionMessage, ExtensionResponse } from '@epic-plan/shared';

export function sendExtensionMessage<T extends ExtensionResponse>(
  message: ExtensionMessage,
): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
