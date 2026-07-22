import type { GanttTask } from '@epic-plan/shared';
import type { CalendarDate } from '../gantt/date-utils';
import { GanttRow } from './GanttRow';

interface Props {
  label: string;
  tasks: GanttTask[];
  workingDays: CalendarDate[];
  dayWidth: number;
  onOpenIssue: (key: string) => void;
}

export function GanttGroup({ label, tasks, workingDays, dayWidth, onOpenIssue }: Props) {
  return (
    <>
      {label ? <div className="jeg-group-header">{label}</div> : null}
      {tasks.map((task) => (
        <GanttRow
          key={task.id}
          task={task}
          workingDays={workingDays}
          dayWidth={dayWidth}
          onOpenIssue={onOpenIssue}
        />
      ))}
    </>
  );
}
