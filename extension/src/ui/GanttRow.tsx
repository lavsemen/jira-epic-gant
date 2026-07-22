import type { GanttTask } from '@epic-plan/shared';
import type { CalendarDate } from '../gantt/date-utils';
import { taskBarLayout } from '../gantt/timeline-builder';
import { useSafeClick } from './useSafeClick';

interface Props {
  task: GanttTask;
  workingDays: CalendarDate[];
  dayWidth: number;
  onOpenIssue: (key: string) => void;
}

function barClassName(task: GanttTask): string {
  const classes = ['jeg-bar'];
  if (task.isCancelled) classes.push('jeg-bar--cancelled');
  else if (task.isDone) classes.push('jeg-bar--done');
  if (task.isOverdue) classes.push('jeg-bar--overdue');
  return classes.join(' ');
}

export function GanttRow({ task, workingDays, dayWidth, onOpenIssue }: Props) {
  const layout = taskBarLayout(task, workingDays, dayWidth);
  const open = () => onOpenIssue(task.key);
  const linkClick = useSafeClick(open);
  const barClick = useSafeClick(open);

  return (
    <div className="jeg-timeline__row">
      <div className="jeg-col-task">
        <button type="button" className="jeg-task-link" title={task.summary} {...linkClick}>
          <span className="jeg-task-key">{task.key}</span>
          <span className="jeg-task-summary">{task.summary}</span>
        </button>
        {task.isOverdue ? (
          <span className="jeg-overdue-badge" title={`Просрочено · окончание ${task.endDate}`}>
            <span aria-hidden="true">⚠</span>
            <span>Просрочено</span>
          </span>
        ) : null}
      </div>
      <div className="jeg-col-days">
        <div className="jeg-bars" style={{ width: workingDays.length * dayWidth }}>
          {layout ? (
            <button
              type="button"
              className={barClassName(task)}
              style={{ left: layout.left, width: Math.max(layout.width, 8) }}
              title={`${task.key}: ${task.startDate} — ${task.endDate}${task.isOverdue ? ' · Просрочено' : ''}`}
              {...barClick}
            >
              {task.isOverdue ? '⚠' : ''}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
