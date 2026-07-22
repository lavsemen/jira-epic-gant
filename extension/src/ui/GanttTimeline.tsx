import { useMemo, useImperativeHandle, forwardRef, type RefObject } from 'react';
import type { GanttGrouping, GanttTask, GanttZoom } from '@epic-plan/shared';
import { formatDayLabel, formatDayLabelFull } from '../gantt/date-utils';
import { groupTasks } from '../gantt/grouping';
import { buildTimeline } from '../gantt/timeline-builder';
import { GanttColumnHeader } from './GanttColumnHeader';
import { GanttGroup } from './GanttGroup';

export interface GanttTimelineHandle {
  scrollToToday: () => void;
}

interface Props {
  tasks: GanttTask[];
  grouping: GanttGrouping;
  zoom: GanttZoom;
  taskColWidthPx: number;
  rowHeightPx: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onTaskColWidthChange: (value: number) => void;
  onRowHeightChange: (value: number) => void;
  onOpenIssue: (key: string) => void;
}

export const GanttTimeline = forwardRef<GanttTimelineHandle, Props>(function GanttTimeline(
  {
    tasks,
    grouping,
    zoom,
    taskColWidthPx,
    rowHeightPx,
    scrollContainerRef,
    onTaskColWidthChange,
    onRowHeightChange,
    onOpenIssue,
  },
  ref,
) {
  const timeline = useMemo(() => buildTimeline(tasks, zoom), [tasks, zoom]);
  const groups = useMemo(() => groupTasks(tasks, grouping), [tasks, grouping]);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      const el = scrollContainerRef.current;
      if (!el || !timeline.todayMarker) {
        return;
      }
      const left = taskColWidthPx + timeline.todayMarker.index * timeline.dayWidth;
      el.scrollTo({
        left: Math.max(0, left - el.clientWidth / 3),
        behavior: 'smooth',
      });
    },
  }));

  if (!timeline.hasScheduledTasks) {
    return (
      <>
        <GanttColumnHeader
          taskColWidthPx={taskColWidthPx}
          rowHeightPx={rowHeightPx}
          onTaskColWidthChange={onTaskColWidthChange}
          onRowHeightChange={onRowHeightChange}
        />
        <div className="jeg-state">Нет задач с корректными датами для отображения на шкале.</div>
      </>
    );
  }

  const { workingDays, dayWidth, todayMarker } = timeline;
  const todayLeft =
    todayMarker == null
      ? null
      : todayMarker.edge === 'before'
        ? todayMarker.index * dayWidth
        : todayMarker.index * dayWidth + dayWidth / 2;

  return (
    <div
      className="jeg-timeline"
      style={{
        width: taskColWidthPx + workingDays.length * dayWidth,
        position: 'relative',
      }}
    >
      <GanttColumnHeader
        taskColWidthPx={taskColWidthPx}
        rowHeightPx={rowHeightPx}
        onTaskColWidthChange={onTaskColWidthChange}
        onRowHeightChange={onRowHeightChange}
      >
        <div
          className="jeg-days-scale"
          style={{
            gridTemplateColumns: `repeat(${workingDays.length}, ${dayWidth}px)`,
            width: workingDays.length * dayWidth,
          }}
        >
            {workingDays.map((day, index) => {
              const previous = index > 0 ? workingDays[index - 1]! : null;
              const label = formatDayLabel(day, { dayWidth, previous });
              const monthStart =
                !previous || previous.year !== day.year || previous.month !== day.month;
              return (
                <div
                  key={`${day.year}-${day.month}-${day.day}`}
                  className={`jeg-day-cell${monthStart ? ' jeg-day-cell--month' : ''}`}
                  title={formatDayLabelFull(day)}
                >
                  {label}
                </div>
              );
            })}
        </div>
      </GanttColumnHeader>

      {groups.map((group) => (
        <GanttGroup
          key={group.id}
          label={group.label}
          tasks={group.tasks}
          workingDays={workingDays}
          dayWidth={dayWidth}
          onOpenIssue={onOpenIssue}
        />
      ))}

      {todayLeft !== null ? (
        <div
          className="jeg-today-line"
          style={{ left: taskColWidthPx + todayLeft }}
          title={todayMarker?.tooltip ?? 'Сегодня'}
        />
      ) : null}
    </div>
  );
});
