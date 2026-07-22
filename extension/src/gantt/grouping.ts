import type { GanttGrouping, GanttTask } from '@epic-plan/shared';

export interface TaskGroup {
  id: string;
  label: string;
  tasks: GanttTask[];
}

function sortTasks(tasks: GanttTask[]): GanttTask[] {
  return [...tasks].sort((a, b) => {
    if (a.startDate && b.startDate) {
      if (a.startDate !== b.startDate) {
        return a.startDate < b.startDate ? -1 : 1;
      }
    } else if (a.startDate && !b.startDate) {
      return -1;
    } else if (!a.startDate && b.startDate) {
      return 1;
    }
    return a.rankIndex - b.rankIndex;
  });
}

export function groupTasks(tasks: GanttTask[], grouping: GanttGrouping): TaskGroup[] {
  if (grouping === 'none') {
    return [{ id: 'all', label: '', tasks: sortTasks(tasks) }];
  }

  const map = new Map<string, TaskGroup>();

  for (const task of tasks) {
    let id: string;
    let label: string;
    switch (grouping) {
      case 'status':
        id = `status:${task.status.id || task.status.name}`;
        label = task.status.name || 'Без статуса';
        break;
      case 'assignee':
        id = task.assignee ? `assignee:${task.assignee.accountId}` : 'assignee:unassigned';
        label = task.assignee?.displayName ?? 'Не назначено';
        break;
      case 'issueType':
        id = `type:${task.issueType.id || task.issueType.name}`;
        label = task.issueType.name || 'Без типа';
        break;
      default:
        id = 'all';
        label = '';
    }

    const existing = map.get(id);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(id, { id, label, tasks: [task] });
    }
  }

  return [...map.values()].map((group) => ({
    ...group,
    tasks: sortTasks(group.tasks),
  }));
}

export function splitByDateState(tasks: GanttTask[]): {
  scheduled: GanttTask[];
  requiresEstimation: GanttTask[];
  invalidDates: GanttTask[];
} {
  return {
    scheduled: tasks.filter((t) => t.state === 'scheduled'),
    requiresEstimation: tasks.filter((t) => t.state === 'requires-estimation'),
    invalidDates: tasks.filter((t) => t.state === 'invalid-dates'),
  };
}
