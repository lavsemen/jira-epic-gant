import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { BoardObserver } from './jira/board-observer';
import { ensureShadowMount } from './shadow-root';
import { App, type AppHandle } from '../ui/App';
import { debugLog, isDebugEnabled } from './debug';

let reactRoot: Root | null = null;
let appHandle: AppHandle | null = null;
let boardObserver: BoardObserver | null = null;

function mountUi(): void {
  const { mountNode } = ensureShadowMount();
  if (!reactRoot) {
    reactRoot = createRoot(mountNode);
  }

  reactRoot.render(
    createElement(App, {
      onReady: (handle) => {
        appHandle = handle;
      },
    }),
  );
}

function start(): void {
  if (isDebugEnabled()) {
    debugLog('content script starting');
  }

  mountUi();

  boardObserver = new BoardObserver({
    onClick: (epicKey) => appHandle?.toggle(epicKey),
  });
  boardObserver.start();
}

start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    boardObserver?.stop();
    reactRoot?.unmount();
    reactRoot = null;
  });
}
