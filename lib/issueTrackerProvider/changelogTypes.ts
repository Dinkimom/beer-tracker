import type { ChangelogEntry } from '@/types/tracker';

/** Нормализованная запись changelog для UI и replay (provider-neutral). */
export type IssueTrackerChangelogEntry = ChangelogEntry;

/** Одна сырая запись changelog для burndown replay (from/to — произвольные provider shapes). */
export interface IssueTrackerBurndownChangelogEntry {
  fields?: Array<{
    field: { display?: string; id: string };
    from?: unknown;
    to?: unknown;
  }>;
  id?: string;
  type?: string;
  updatedAt: string;
}

/** Задача с changelog для burndown (provider-neutral контракт). */
export interface IssueTrackerBurndownIssue {
  changelog: Array<{
    date: string;
    isDone: boolean;
  }>;
  inCurrentSprint: boolean;
  issueKey: string;
  rawChangelog: IssueTrackerBurndownChangelogEntry[];
  statusKey: string;
  storyPoints: number;
  testPoints: number;
}
