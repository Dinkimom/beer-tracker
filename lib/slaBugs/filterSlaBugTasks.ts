import type { Task } from '@/types';

import { isSlaBugTask, parseSlaPriority } from './parseSlaBugFields';

type SlaBugTaskClassification = 'include' | 'no-severity' | 'not-bug';

function classifySlaBugTask(task: Task): SlaBugTaskClassification {
  if ((task.type ?? '').toLowerCase() !== 'bug') {
    return 'not-bug';
  }
  if (parseSlaPriority(task.incidentSeverity) == null || !isSlaBugTask(task)) {
    return 'no-severity';
  }
  return 'include';
}

interface SlaBugFilterStats {
  excludedNoSeverity: number;
  excludedNotBug: number;
  included: number;
}

export function filterSlaBugTasks(tasks: Task[]): { stats: SlaBugFilterStats; tasks: Task[] } {
  let excludedNoSeverity = 0;
  let excludedNotBug = 0;
  const included: Task[] = [];

  for (const task of tasks) {
    const classification = classifySlaBugTask(task);
    if (classification === 'not-bug') {
      excludedNotBug += 1;
      continue;
    }
    if (classification === 'no-severity') {
      excludedNoSeverity += 1;
      continue;
    }
    included.push(task);
  }

  return {
    tasks: included,
    stats: {
      excludedNoSeverity,
      excludedNotBug,
      included: included.length,
    },
  };
}
