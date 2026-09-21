import type { SlaBugsBySection, SlaPriority } from './types';
import type { Task } from '@/types';

import { parseSlaPriority } from './parseSlaBugFields';
import { parseDateMs } from './slaBugMetrics';

export const SLA_BUG_CHART_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'] as const satisfies readonly SlaPriority[];

export type SlaBugChartPriority = (typeof SLA_BUG_CHART_PRIORITIES)[number];

type SlaBugPriorityCounts = Record<SlaBugChartPriority, number>;

export interface SlaBugChartTaskRef {
  id: string;
  link: string;
  name: string;
}

type SlaBugTasksByPriority = Record<SlaBugChartPriority, SlaBugChartTaskRef[]>;

export interface SlaBugWeeklyBucketStats {
  byPriority: SlaBugPriorityCounts;
  tasksByPriority: SlaBugTasksByPriority;
  total: number;
}

export interface SlaBugSidebarStats {
  arrivedThisWeek: SlaBugWeeklyBucketStats;
  closedThisWeek: SlaBugWeeklyBucketStats;
  slaRiskCount: number;
}

export function emptySlaBugPriorityCounts(): SlaBugPriorityCounts {
  return { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
}

function emptySlaBugTasksByPriority(): SlaBugTasksByPriority {
  return { P0: [], P1: [], P2: [], P3: [], P4: [] };
}

function toChartTaskRef(task: Task): SlaBugChartTaskRef {
  return {
    id: task.id,
    link: task.link,
    name: task.name,
  };
}

export function groupSlaBugTasksByPriority(tasks: Task[]): SlaBugTasksByPriority {
  const grouped = emptySlaBugTasksByPriority();
  for (const task of tasks) {
    const priority = parseSlaPriority(task.incidentSeverity);
    if (priority && priority in grouped) {
      grouped[priority as SlaBugChartPriority].push(toChartTaskRef(task));
    }
  }
  for (const priority of SLA_BUG_CHART_PRIORITIES) {
    grouped[priority].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }
  return grouped;
}

export function countSlaBugTasksByPriority(tasks: Task[]): SlaBugPriorityCounts {
  const counts = emptySlaBugPriorityCounts();
  for (const task of tasks) {
    const priority = parseSlaPriority(task.incidentSeverity);
    if (priority && priority in counts) {
      counts[priority as SlaBugChartPriority] += 1;
    }
  }
  return counts;
}

function totalFromPriorityCounts(counts: SlaBugPriorityCounts): number {
  return SLA_BUG_CHART_PRIORITIES.reduce((sum, key) => sum + counts[key], 0);
}

function isOnOrAfterUtcDay(value: string | undefined, since: Date): boolean {
  const ms = parseDateMs(value);
  if (ms == null) {
    return false;
  }
  return ms >= since.getTime();
}

/** Баги, созданные не раньше начала периода (UTC, включительно). */
export function filterTasksCreatedSince(tasks: Task[], since: Date): Task[] {
  return tasks.filter((task) => isOnOrAfterUtcDay(task.createdAt, since));
}

/** Баги, закрытые (resolved) не раньше начала периода (UTC, включительно). */
export function filterTasksResolvedSince(tasks: Task[], since: Date): Task[] {
  return tasks.filter((task) => isOnOrAfterUtcDay(task.resolvedAt, since));
}

function buildWeeklyBucketStats(tasks: Task[]): SlaBugWeeklyBucketStats {
  const byPriority = countSlaBugTasksByPriority(tasks);
  return {
    byPriority,
    tasksByPriority: groupSlaBugTasksByPriority(tasks),
    total: totalFromPriorityCounts(byPriority),
  };
}

export function computeSlaRiskCount(grouped: SlaBugsBySection): number {
  return grouped.take_now.length;
}

export function buildSlaBugSidebarStats(
  openTasks: Task[],
  arrivedTasks: Task[],
  closedTasks: Task[],
  grouped: SlaBugsBySection
): SlaBugSidebarStats {
  return {
    arrivedThisWeek: buildWeeklyBucketStats(arrivedTasks),
    closedThisWeek: buildWeeklyBucketStats(closedTasks),
    slaRiskCount: computeSlaRiskCount(grouped),
  };
}
