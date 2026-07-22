import type { GanttTask } from '@epic-plan/shared';

export function partitionVisibleTasks(tasks: GanttTask[]): {
  timelineTasks: GanttTask[];
  estimationTasks: GanttTask[];
  invalidTasks: GanttTask[];
} {
  return {
    timelineTasks: tasks.filter((task) => task.state === 'scheduled'),
    estimationTasks: tasks.filter((task) => task.state === 'requires-estimation'),
    invalidTasks: tasks.filter((task) => task.state === 'invalid-dates'),
  };
}
