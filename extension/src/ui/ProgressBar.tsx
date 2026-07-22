import type { GanttTask } from '@jira-epic-gantt/shared';
import { computeEpicProgress } from '../gantt/status-utils';

interface Props {
  tasks: GanttTask[];
}

export function ProgressBar({ tasks }: Props) {
  if (tasks.length === 0) {
    return <div className="jeg-progress__label">В эпике пока нет дочерних задач</div>;
  }

  const { done, total, percent } = computeEpicProgress(tasks);

  return (
    <div className="jeg-progress">
      <div className="jeg-progress__label">
        Готово {done} из {total} задач · {percent}%
      </div>
      <div className="jeg-progress__track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="jeg-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
