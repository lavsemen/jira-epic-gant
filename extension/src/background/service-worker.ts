import { registerMessageHandler, registerExternalMessageHandler } from './message-handler';

registerMessageHandler();
registerExternalMessageHandler();

chrome.runtime.onInstalled.addListener(() => {
  console.info('[epic-plan] service worker installed');
});
