import type { GanttTask } from '@jira-epic-gantt/shared';

interface Props {
  tasks: GanttTask[];
  onOpenIssue: (key: string) => void;
}

export function InvalidDates({ tasks, onOpenIssue }: Props) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="jeg-section">
      <div className="jeg-section__title">Некорректные даты — {tasks.length}</div>
      {tasks.map((task) => (
        <div key={task.id} className="jeg-section__row">
          <div className="jeg-col-task">
            <button
              type="button"
              className="jeg-task-link"
              title={task.summary}
              onClick={() => onOpenIssue(task.key)}
            >
              <span className="jeg-task-key">{task.key}</span>
              <span className="jeg-task-summary">{task.summary}</span>
            </button>
          </div>
          <div className="jeg-section__meta">
            <span className="jeg-section__reason">
              {task.startDate} → {task.endDate}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
