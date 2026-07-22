import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiErrorBody, EpicGanttData } from '@epic-plan/shared';
import { sendExtensionMessage } from '../content/messaging';
import { rememberEpicKey } from '../content/jira/epic-detector';
import { GanttModal, type ModalViewState } from './GanttModal';

export type AppHandle = {
  open: (epicKey: string) => void;
  close: () => void;
  toggle: (epicKey: string) => void;
};

interface Props {
  onReady: (handle: AppHandle) => void;
}

export function App({ onReady }: Props) {
  const [view, setView] = useState<ModalViewState>({
    open: false,
    epicKey: null,
  });
  const [data, setData] = useState<EpicGanttData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  const close = useCallback(() => {
    abortRef.current?.abort();
    setView({ open: false, epicKey: null });
    setError(null);
  }, []);

  const load = useCallback(async (epicKey: string, forceRefresh = false) => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setData(null);
    }
    setError(null);

    try {
      const response = await sendExtensionMessage({
        type: 'GET_EPIC_TASKS',
        payload: { epicKey, forceRefresh },
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (response.type === 'GET_EPIC_TASKS_RESULT' && response.ok) {
        setData(response.data);
        rememberEpicKey(response.data.epic.key);
        setError(null);
      } else if (response.type === 'GET_EPIC_TASKS_RESULT') {
        setError(response.error);
        if (!forceRefresh) {
          setData(null);
        }
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setError({
          code: 'NETWORK',
          message: 'Не удалось загрузить данные. Проверьте подключение и повторите попытку.',
        });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const open = useCallback(
    (epicKey: string) => {
      setView({ open: true, epicKey });
      void load(epicKey, false);
    },
    [load],
  );

  const toggle = useCallback(
    (epicKey: string) => {
      const current = viewRef.current;
      if (current.open && current.epicKey === epicKey) {
        close();
        return;
      }
      open(epicKey);
    },
    [close, open],
  );

  useEffect(() => {
    onReady({ open, close, toggle });
  }, [onReady, open, close, toggle]);

  useEffect(() => {
    if (!view.open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [view.open]);

  const onOpenIssue = useCallback((issueKey: string) => {
    void sendExtensionMessage({
      type: 'OPEN_JIRA_ISSUE',
      payload: { issueKey },
    });
  }, []);

  const onLogin = useCallback(() => {
    void sendExtensionMessage({ type: 'START_AUTH' });
  }, []);

  return (
    <GanttModal
      view={view}
      data={data}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onClose={close}
      onRefresh={() => {
        if (view.epicKey) {
          void load(view.epicKey, true);
        }
      }}
      onLogin={onLogin}
      onOpenIssue={onOpenIssue}
    />
  );
}
