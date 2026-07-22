import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type {
  ApiErrorBody,
  EpicGanttData,
  GanttGrouping,
  GanttZoom,
} from '@jira-epic-gantt/shared';
import { GANTT_LAYOUT, STORAGE_KEYS } from '@jira-epic-gantt/shared';
import { partitionVisibleTasks } from '../gantt/task-layout';
import { GanttHeader } from './GanttHeader';
import { GanttToolbar } from './GanttToolbar';
import { GanttTimeline, type GanttTimelineHandle } from './GanttTimeline';
import { RequiresEstimation } from './RequiresEstimation';
import { InvalidDates } from './InvalidDates';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { AuthState } from './AuthState';

export interface ModalViewState {
  open: boolean;
  epicKey: string | null;
}

interface Props {
  view: ModalViewState;
  data: EpicGanttData | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiErrorBody | null;
  onClose: () => void;
  onRefresh: () => void;
  onLogin: () => void;
  onOpenIssue: (issueKey: string) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function loadUiPrefs(): Promise<{
  grouping: GanttGrouping;
  zoom: GanttZoom;
  taskColWidthPx: number;
  rowHeightPx: number;
}> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.grouping,
    STORAGE_KEYS.zoom,
    STORAGE_KEYS.taskColWidthPx,
    STORAGE_KEYS.rowHeightPx,
  ]);
  const grouping = (stored[STORAGE_KEYS.grouping] as GanttGrouping | undefined) ?? 'none';
  const zoom = (stored[STORAGE_KEYS.zoom] as GanttZoom | undefined) ?? 'default';
  const taskColWidthPx = clamp(
    Number(stored[STORAGE_KEYS.taskColWidthPx]) || GANTT_LAYOUT.taskColWidthDefault,
    GANTT_LAYOUT.taskColWidthMin,
    GANTT_LAYOUT.taskColWidthMax,
  );
  const rowHeightPx = clamp(
    Number(stored[STORAGE_KEYS.rowHeightPx]) || GANTT_LAYOUT.rowHeightDefault,
    GANTT_LAYOUT.rowHeightMin,
    GANTT_LAYOUT.rowHeightMax,
  );
  return { grouping, zoom, taskColWidthPx, rowHeightPx };
}

function layoutCssVars(taskColWidthPx: number, rowHeightPx: number): CSSProperties {
  const barHeight = Math.max(12, Math.round(rowHeightPx * 0.42));
  const paddingY = Math.max(2, Math.round(rowHeightPx * 0.14));
  const barTop = Math.max(4, Math.round((rowHeightPx - barHeight) / 2));
  return {
    ['--jeg-task-col-width' as string]: `${taskColWidthPx}px`,
    ['--jeg-row-height' as string]: `${rowHeightPx}px`,
    ['--jeg-row-padding-y' as string]: `${paddingY}px`,
    ['--jeg-bar-height' as string]: `${barHeight}px`,
    ['--jeg-bar-top' as string]: `${barTop}px`,
    ['--jeg-section-gap' as string]: `${Math.max(2, Math.round(paddingY / 2))}px`,
  };
}

export function GanttModal({
  view,
  data,
  loading,
  refreshing,
  error,
  onClose,
  onRefresh,
  onLogin,
  onOpenIssue,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<GanttTimelineHandle>(null);
  const [grouping, setGrouping] = useState<GanttGrouping>('none');
  const [zoom, setZoom] = useState<GanttZoom>('default');
  const [taskColWidthPx, setTaskColWidthPx] = useState<number>(GANTT_LAYOUT.taskColWidthDefault);
  const [rowHeightPx, setRowHeightPx] = useState<number>(GANTT_LAYOUT.rowHeightDefault);

  useEffect(() => {
    void loadUiPrefs().then((prefs) => {
      setGrouping(prefs.grouping);
      setZoom(prefs.zoom);
      setTaskColWidthPx(prefs.taskColWidthPx);
      setRowHeightPx(prefs.rowHeightPx);
    });
  }, []);

  useEffect(() => {
    void chrome.storage.local.set({
      [STORAGE_KEYS.grouping]: grouping,
      [STORAGE_KEYS.zoom]: zoom,
      [STORAGE_KEYS.taskColWidthPx]: taskColWidthPx,
      [STORAGE_KEYS.rowHeightPx]: rowHeightPx,
    });
  }, [grouping, zoom, taskColWidthPx, rowHeightPx]);

  useEffect(() => {
    if (!view.open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [view.open, onClose]);

  useEffect(() => {
    if (!view.open) {
      return;
    }
    dialogRef.current?.focus();
  }, [view.open, view.epicKey]);

  const partitions = useMemo(
    () => (data ? partitionVisibleTasks(data.tasks) : null),
    [data],
  );

  if (!view.open || !view.epicKey) {
    return null;
  }

  const showAuth = error?.code === 'UNAUTHORIZED' && !data;

  return (
    <div className="jeg-modal-root">
      <button
        type="button"
        className="jeg-modal-backdrop"
        aria-label="Закрыть диаграмму"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="jeg-modal"
        style={layoutCssVars(taskColWidthPx, rowHeightPx)}
        role="dialog"
        aria-modal="true"
        aria-label={`Диаграмма Ганта ${view.epicKey}`}
        tabIndex={-1}
      >
        <GanttHeader data={data} epicKey={view.epicKey} onClose={onClose} />
        {data ? (
          <GanttToolbar
            grouping={grouping}
            zoom={zoom}
            refreshing={refreshing}
            onGroupingChange={setGrouping}
            onZoomChange={setZoom}
            onRefresh={onRefresh}
            onToday={() => timelineRef.current?.scrollToToday()}
          />
        ) : null}

        {loading && !data ? <LoadingState /> : null}
        {showAuth ? <AuthState onLogin={onLogin} /> : null}
        {!showAuth && error && !data ? (
          <ErrorState error={error} onRetry={onRefresh} onLogin={onLogin} />
        ) : null}
        {error && data ? (
          <div className="jeg-state" role="status" style={{ padding: '8px 14px' }}>
            {error.message}{' '}
            <button type="button" className="jeg-btn" onClick={onRefresh}>
              Повторить
            </button>
          </div>
        ) : null}

        {data && partitions ? (
          <div className="jeg-body" ref={bodyRef}>
            <GanttTimeline
              ref={timelineRef}
              tasks={partitions.timelineTasks}
              grouping={grouping}
              zoom={zoom}
              taskColWidthPx={taskColWidthPx}
              rowHeightPx={rowHeightPx}
              scrollContainerRef={bodyRef}
              onTaskColWidthChange={setTaskColWidthPx}
              onRowHeightChange={setRowHeightPx}
              onOpenIssue={onOpenIssue}
            />
            <RequiresEstimation
              tasks={partitions.estimationTasks}
              onOpenIssue={onOpenIssue}
            />
            <InvalidDates tasks={partitions.invalidTasks} onOpenIssue={onOpenIssue} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
