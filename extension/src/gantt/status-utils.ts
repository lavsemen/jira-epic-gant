import type { GanttTask } from '@jira-epic-gantt/shared';

export function computeEpicProgress(tasks: GanttTask[]): {
  done: number;
  total: number;
  percent: number;
} {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status.categoryKey === 'done').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

export function estimationReason(task: GanttTask): string {
  switch (task.scheduleGapReason) {
    case 'missing-start':
      return 'Не переводилась в In Progress';
    case 'missing-estimate':
      return 'Нет исходной оценки';
    case 'missing-both':
      return 'Нет даты взятия в работу и исходной оценки';
    default:
      return 'Недостаточно данных для расписания';
  }
}
