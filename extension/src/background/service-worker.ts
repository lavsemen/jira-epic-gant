import { registerMessageHandler, registerExternalMessageHandler } from './message-handler';

registerMessageHandler();
registerExternalMessageHandler();

chrome.runtime.onInstalled.addListener(() => {
  console.info('[jira-epic-gantt] service worker installed');
});
