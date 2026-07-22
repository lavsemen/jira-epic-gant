import { registerMessageHandler } from './message-handler';

registerMessageHandler();

chrome.runtime.onInstalled.addListener(() => {
  console.info('[jira-epic-gantt] service worker installed');
});
