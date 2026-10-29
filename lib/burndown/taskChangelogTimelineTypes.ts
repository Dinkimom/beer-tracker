import type { BurndownCompletionRules } from './burndownStatusDone';

export type TaskChangelogTimelineItem =
  {
      type: 'status_change';
      issueKey: string;
      fromId?: string;
      fromKey?: string;
      toId?: string;
      toKey?: string;
    } | { type: 'reestimated'; issueKey: string; deltaSP: number; deltaTP: number } | { type: 'sprint_added'; issueKey: string } | { type: 'sprint_removed'; issueKey: string };

export interface BuildTaskChangelogTimelineOptions {
  sprintId?: string;
  sprintName: string;
  windowEndMs?: number;
  windowStartMs?: number;
}

export interface SprintTimelineTotals {
  doneSP: number;
  doneTP: number;
  remainingSP: number;
  remainingTP: number;
  totalSP: number;
  totalTP: number;
}

export interface ComputeSprintTimelineTotalsOptions extends BuildTaskChangelogTimelineOptions {
  /** Правила завершения организации (SP/TP раздельно); без них — эвристика по ключу статуса. */
  completionRules?: BurndownCompletionRules;
  sprintStartTime: number;
}
