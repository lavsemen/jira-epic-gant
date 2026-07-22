export function isDebugEnabled(): boolean {
  try {
    if (new URLSearchParams(location.search).get('ganttDebug') === '1') {
      return true;
    }
    return localStorage.getItem('ganttDebug') === '1';
  } catch {
    return false;
  }
}

export function debugLog(...args: unknown[]): void {
  if (!isDebugEnabled()) {
    return;
  }
  console.info('[epic-plan]', ...args);
}
