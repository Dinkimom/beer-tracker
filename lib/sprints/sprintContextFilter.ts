import type {
  SprintContextNote,
  SprintContextPosition,
  SprintContextTaskLink,
} from '@/lib/sprints/sprintContextTypes';

import { parseCommentParent } from '@/lib/comments/commentParent';
import { toPlannerCommentTaskId } from '@/lib/planner/plannerLinkEndpoint';
import {
  emptyFeatureLanesDocument,
  type FeatureLanesDocument,
} from '@/lib/sprints/featureLanesDocument';

/** Task keys in scope for a feature lane (lane id + draft issueKeys). */
export function resolveFeatureScopeTaskIds(
  lanes: FeatureLanesDocument | null,
  featureId: string
): Set<string> {
  const trimmed = featureId.trim();
  const scope = new Set<string>();
  if (!trimmed) {
    return scope;
  }
  scope.add(trimmed);
  const draft = lanes?.draftRows.find((row) => row.id === trimmed);
  for (const key of draft?.issueKeys ?? []) {
    const issueKey = key.trim();
    if (issueKey) {
      scope.add(issueKey);
    }
  }
  return scope;
}

export function filterFeatureLanesForFeature(
  lanes: FeatureLanesDocument | null,
  featureId: string
): FeatureLanesDocument | null {
  if (!lanes) {
    return null;
  }
  const trimmed = featureId.trim();
  if (!trimmed) {
    return emptyFeatureLanesDocument();
  }
  const draftRows = lanes.draftRows.filter((row) => row.id === trimmed);
  const orderIds = lanes.orderIds.filter((id) => id === trimmed);
  const hiddenIds = lanes.hiddenIds.filter((id) => id === trimmed);
  if (draftRows.length === 0 && orderIds.length === 0 && !lanes.orderIds.includes(trimmed)) {
    return {
      draftRows: [],
      hiddenIds,
      orderIds: [trimmed],
    };
  }
  return {
    draftRows,
    hiddenIds,
    orderIds: orderIds.length > 0 ? orderIds : [trimmed],
  };
}

export function filterPositionsByFeatureScope(
  positions: SprintContextPosition[],
  scopeTaskIds: Set<string>
): SprintContextPosition[] {
  if (scopeTaskIds.size === 0) {
    return [];
  }
  return positions.filter((position) => scopeTaskIds.has(position.taskId));
}

export function filterLinksByFeatureScope(
  links: SprintContextTaskLink[],
  scopeTaskIds: Set<string>
): SprintContextTaskLink[] {
  if (scopeTaskIds.size === 0) {
    return [];
  }
  return links.filter(
    (link) => scopeTaskIds.has(link.fromTaskId) && scopeTaskIds.has(link.toTaskId)
  );
}

/** Note arrows use `comment:{id}` (and raw UUID from older MCP writes). */
export function expandLinkScopeWithNotes(
  scopeTaskIds: Set<string>,
  notes: readonly Pick<SprintContextNote, 'id'>[]
): Set<string> {
  const next = new Set(scopeTaskIds);
  for (const note of notes) {
    next.add(note.id);
    next.add(toPlannerCommentTaskId(note.id));
  }
  return next;
}

export function filterNotesByFeatureScope(
  notes: SprintContextNote[],
  featureId: string,
  scopeTaskIds: Set<string>
): SprintContextNote[] {
  return notes.filter((note) => noteMatchesFeatureScope(note, featureId, scopeTaskIds));
}

function noteMatchesFeatureScope(
  note: SprintContextNote,
  featureId: string,
  scopeTaskIds: Set<string>
): boolean {
  const trimmed = featureId.trim();
  if (!trimmed) {
    return false;
  }
  if (note.assigneeId === trimmed) {
    return true;
  }
  if (note.parent && (note.parent.key === trimmed || note.parent.id === trimmed)) {
    return true;
  }
  if (scopeTaskIds.has(note.assigneeId)) {
    return true;
  }
  return false;
}

/** Expand scope with tasks whose tracker parent key matches featureId. */
export function expandScopeWithParentMap(
  scopeTaskIds: Set<string>,
  featureId: string,
  taskIdToParentKey: Record<string, string> | undefined
): Set<string> {
  const trimmed = featureId.trim();
  if (!trimmed || !taskIdToParentKey) {
    return scopeTaskIds;
  }
  const next = new Set(scopeTaskIds);
  for (const [taskId, parentKey] of Object.entries(taskIdToParentKey)) {
    if (parentKey === trimmed && taskId.trim()) {
      next.add(taskId.trim());
    }
  }
  return next;
}

export function parseNoteParentFromRow(parent: unknown): SprintContextNote['parent'] {
  const parsed = parseCommentParent(parent);
  if (!parsed) {
    return undefined;
  }
  return parsed.self
    ? { display: parsed.display, id: parsed.id, key: parsed.key, self: parsed.self }
    : { display: parsed.display, id: parsed.id, key: parsed.key };
}

export function toIsoDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value ?? '');
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Inclusive date-only overlap (YYYY-MM-DD). */
export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && startB <= endA;
}
