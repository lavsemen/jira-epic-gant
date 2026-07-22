import { REQUEST_CACHE_TTL_MS, type EpicGanttData } from '@jira-epic-gantt/shared';

interface CacheEntry {
  data: EpicGanttData;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<EpicGanttData>>();

export function getCachedEpicTasks(epicKey: string): EpicGanttData | undefined {
  const entry = cache.get(epicKey);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt < Date.now()) {
    cache.delete(epicKey);
    return undefined;
  }
  return entry.data;
}

export function setCachedEpicTasks(epicKey: string, data: EpicGanttData): void {
  cache.set(epicKey, {
    data,
    expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
  });
}

export function clearCachedEpicTasks(epicKey?: string): void {
  if (epicKey) {
    cache.delete(epicKey);
    return;
  }
  cache.clear();
}

export async function dedupeEpicRequest(
  epicKey: string,
  factory: () => Promise<EpicGanttData>,
): Promise<EpicGanttData> {
  const existing = inflight.get(epicKey);
  if (existing) {
    return existing;
  }
  const promise = factory().finally(() => {
    inflight.delete(epicKey);
  });
  inflight.set(epicKey, promise);
  return promise;
}
