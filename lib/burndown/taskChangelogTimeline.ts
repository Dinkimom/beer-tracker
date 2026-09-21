/**
 * Разбор raw changelog одной задачи в события по календарным дням
 * (добавление/снятие со спринта, переоценка SP/TP, смены статусов).
 * Логика полей согласована с {@link ./burndownFromChangelogReplay}.
 */

import type { YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

export type { SprintTimelineTotals } from './taskChangelogTimelineTypes';

export {
  parseChangelogEntryToTimelineItems,
  rollupTaskDayEventsForEndOfDayView,
  rollupTaskDayReestimatesToOne,
} from './taskChangelogTimelineHelpers';

import type {
  BuildTaskChangelogTimelineOptions,
  ComputeSprintTimelineTotalsOptions,
} from './taskChangelogTimelineTypes';

import {
  collectSprintChangelogRows,
  computeSprintTimelineTotalsFromRows,
  groupChangelogRowsIntoTaskDays,
} from './taskChangelogTimelineHelpers';

export function computeSprintTimelineTotals(
  issues: YtrackerBurndownIssue[],
  options: ComputeSprintTimelineTotalsOptions
) {
  const rows = collectSprintChangelogRows(issues, options);
  return computeSprintTimelineTotalsFromRows(issues, options, rows);
}

export function buildTaskChangelogTimelineByDay(
  issue: YtrackerBurndownIssue,
  options: BuildTaskChangelogTimelineOptions
) {
  return groupChangelogRowsIntoTaskDays(collectSprintChangelogRows([issue], options));
}

export function buildSprintChangelogTimelineByDay(
  issues: YtrackerBurndownIssue[],
  options: BuildTaskChangelogTimelineOptions
) {
  return groupChangelogRowsIntoTaskDays(collectSprintChangelogRows(issues, options));
}
