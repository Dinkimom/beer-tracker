import type { AppLanguage } from '@/lib/i18n/model';
import type { Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { type StatusPhaseCell, formatDuration } from '@/lib/planner-timeline';
import { formatSignedPointsDeltaForDisplay } from '@/lib/pointsUtils';
import { getNextWorkingDay, isWeekend } from '@/utils/dateUtils';

/** Допуск по времени границы фазы (мс) — сопоставление с changelog.updatedAt */
const PHASE_BOUNDARY_MATCH_MS = 2000;

const FACT_TIMELINE_COPY_PREFIX = 'sprintPlanner.swimlane.factTimeline';

type FactTimelineTranslate = (key: string) => string;

export function factTimelineDateLocale(language: AppLanguage): string {
  return language === 'ru' ? 'ru-RU' : 'en-US';
}

export function formatFactTimelineDuration(
  durationMs: number,
  t: FactTimelineTranslate
): string {
  return formatDuration(durationMs, {
    day: t(`${FACT_TIMELINE_COPY_PREFIX}.day`),
    hour: t(`${FACT_TIMELINE_COPY_PREFIX}.hour`),
    minute: t(`${FACT_TIMELINE_COPY_PREFIX}.minute`),
    zero: t(`${FACT_TIMELINE_COPY_PREFIX}.zero`),
  });
}

export function formatFactPhaseDateTime(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFactPhaseTaskLine(taskId: string, tasksMap: Map<string, Task>): string {
  const t = tasksMap.get(taskId);
  if (!t) return taskId;
  const issueKey = (t as Task & { key?: string }).key ?? t.id;
  return `${issueKey}: ${t.name}`;
}

export function collectCommentsInPhaseWindow(
  comments: IssueComment[],
  phaseStartMs: number,
  phaseEndMs: number
): IssueComment[] {
  return comments
    .filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= phaseStartMs && t <= phaseEndMs;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function normalizeFactStatusKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '');
}

const FACT_PHASE_CANONICAL_BY_TRACKER_KEY: Record<string, string> = {
  blocked: 'blocked',
  closed: 'closed',
  defect: 'defect',
  inprogress: 'inprogress',
  inreview: 'review',
  in_review: 'review',
  intesting: 'intesting',
  readyfortest: 'readyfortest',
  readyfortesting: 'readyfortest',
  review: 'review',
};

/**
 * Канонический ключ статуса для сопоставления changelog ↔ колбаса (как в mergeInProgressDurationsForAssignee).
 */
function factPhaseCanonicalFromTrackerKey(statusKey: string): string {
  const n = normalizeFactStatusKey(statusKey);
  return FACT_PHASE_CANONICAL_BY_TRACKER_KEY[n] ?? n;
}

function changelogStatusMatchesPhase(phaseStatusKey: string, changelogStatusKey: string): boolean {
  return (
    factPhaseCanonicalFromTrackerKey(changelogStatusKey) ===
    factPhaseCanonicalFromTrackerKey(phaseStatusKey)
  );
}

/** Как {@link mapHistoryItemToDuration}: старт фазы на таймлайне может быть сдвинут с выходных. */
function durationStartMsFromChangelogEntryUpdatedAt(iso: string): number {
  const startDate = new Date(iso);
  const normalizedStartDate = isWeekend(startDate) ? getNextWorkingDay(startDate) : startDate;
  return normalizedStartDate.getTime();
}

function parsePointsChangelogObjectValue(v: object): number {
  if (!('key' in v)) return 0;
  const n = parseInt(String((v as { key?: unknown }).key), 10);
  return Number.isNaN(n) ? 0 : n;
}

function parsePointsChangelogValue(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (v != null && typeof v === 'object') return parsePointsChangelogObjectValue(v);
  return 0;
}

function formatReestimationLine(deltaSP: number, deltaTP: number): string {
  return [
    formatSignedPointsDeltaForDisplay(deltaSP, 'sp'),
    formatSignedPointsDeltaForDisplay(deltaTP, 'tp'),
  ]
    .filter((part): part is string => part != null)
    .join(' ');
}

export interface PhaseStatusTransition {
  entry: ChangelogEntry;
  fromStatusKey: string | null;
  fromStatusName: string | null;
  timestamp: string;
  toStatusKey: string;
  toStatusName: string;
}

export function collectStatusTransitionsForPhase(
  changelog: ChangelogEntry[],
  phase: StatusPhaseCell
): PhaseStatusTransition[] {
  const transitions: PhaseStatusTransition[] = [];

  const phaseStartMs = new Date(phase.startTime).getTime();
  const phaseEndMs = phase.endTime ? new Date(phase.endTime).getTime() : null;

  for (const entry of changelog) {
    const transition = statusTransitionFromChangelogEntry(entry, phase, phaseStartMs, phaseEndMs);
    if (transition) {
      transitions.push(transition);
    }
  }

  transitions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return transitions;
}

function statusTransitionFromChangelogEntry(
  entry: ChangelogEntry,
  phase: StatusPhaseCell,
  phaseStartMs: number,
  phaseEndMs: number | null
): PhaseStatusTransition | null {
  const statusField = entry.fields?.find((f) => f.field.id === 'status');
  if (!statusField?.to) return null;

  const fromStatusKey = statusField.from?.key || null;
  const fromStatusName = statusField.from?.display || null;
  const toStatusKey = statusField.to.key;
  const toStatusName = statusField.to.display;
  const entryTimeMs = new Date(entry.updatedAt).getTime();
  const entryAlignedStartMs = durationStartMsFromChangelogEntryUpdatedAt(entry.updatedAt);

  if (isPhaseStartTransition(phase.statusKey, toStatusKey, entryAlignedStartMs, phaseStartMs)) {
    return {
      entry,
      fromStatusKey,
      fromStatusName,
      toStatusKey,
      toStatusName,
      timestamp: entry.updatedAt,
    };
  }

  if (isPhaseEndTransition(phase.statusKey, fromStatusKey, entryTimeMs, phaseEndMs)) {
    return {
      entry,
      fromStatusKey,
      fromStatusName,
      toStatusKey,
      toStatusName,
      timestamp: entry.updatedAt,
    };
  }

  return null;
}

function isPhaseStartTransition(
  phaseStatusKey: string,
  toStatusKey: string,
  entryAlignedStartMs: number,
  phaseStartMs: number
): boolean {
  return (
    changelogStatusMatchesPhase(phaseStatusKey, toStatusKey) &&
    Math.abs(entryAlignedStartMs - phaseStartMs) < PHASE_BOUNDARY_MATCH_MS
  );
}

function isPhaseEndTransition(
  phaseStatusKey: string,
  fromStatusKey: string | null,
  entryTimeMs: number,
  phaseEndMs: number | null
): boolean {
  return (
    fromStatusKey != null &&
    changelogStatusMatchesPhase(phaseStatusKey, fromStatusKey) &&
    phaseEndMs !== null &&
    Math.abs(entryTimeMs - phaseEndMs) < PHASE_BOUNDARY_MATCH_MS
  );
}

export interface PhaseReestimationEvent {
  createdBy?: ChangelogEntry['createdBy'];
  label: string;
  updatedAt: string;
}

export function collectReestimationsInPhaseWindow(
  changelog: ChangelogEntry[],
  phaseStartMs: number,
  phaseEndMs: number
): PhaseReestimationEvent[] {
  const out: PhaseReestimationEvent[] = [];

  for (const entry of changelog) {
    const event = reestimationEventFromChangelogEntry(entry, phaseStartMs, phaseEndMs);
    if (event) {
      out.push(event);
    }
  }

  out.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  return out;
}

function reestimationEventFromChangelogEntry(
  entry: ChangelogEntry,
  phaseStartMs: number,
  phaseEndMs: number
): PhaseReestimationEvent | null {
  const t = new Date(entry.updatedAt).getTime();
  if (t < phaseStartMs || t > phaseEndMs) return null;

  const { deltaSP, deltaTP } = sumPointsDeltasFromChangelogFields(entry.fields ?? []);
  if (deltaSP === 0 && deltaTP === 0) return null;

  return {
    createdBy: entry.createdBy,
    label: formatReestimationLine(deltaSP, deltaTP),
    updatedAt: entry.updatedAt,
  };
}

function pointsDeltaFromChangelogField(
  field: NonNullable<ChangelogEntry['fields']>[number]
): { deltaSP: number; deltaTP: number } {
  const fid = field.field.id;
  if (field.from == null || field.to == null) {
    return { deltaSP: 0, deltaTP: 0 };
  }
  const delta = parsePointsChangelogValue(field.to) - parsePointsChangelogValue(field.from);
  if (fid === 'storyPoints' || fid === 'story_points') {
    return { deltaSP: delta, deltaTP: 0 };
  }
  if (fid === 'testPoints' || fid === 'test_points') {
    return { deltaSP: 0, deltaTP: delta };
  }
  return { deltaSP: 0, deltaTP: 0 };
}

function sumPointsDeltasFromChangelogFields(
  fields: NonNullable<ChangelogEntry['fields']>
): { deltaSP: number; deltaTP: number } {
  let deltaSP = 0;
  let deltaTP = 0;

  for (const field of fields) {
    const { deltaSP: sp, deltaTP: tp } = pointsDeltaFromChangelogField(field);
    deltaSP += sp;
    deltaTP += tp;
  }

  return { deltaSP, deltaTP };
}
