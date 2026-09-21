import type { Developer } from '@/types';

import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

function pinFeatureLaneSharedRow(rows: Developer[]): Developer[] {
  const index = rows.findIndex((row) => isTeamSwimlaneAssigneeId(row.id));
  if (index <= 0) {
    return rows;
  }
  const next = [...rows];
  const [team] = next.splice(index, 1);
  return [team, ...next];
}

/**
 * Помнит id исчезнувших строк, чтобы при возврате задач они встали на прежнее место,
 * а не в алфавит / в конец.
 */
export function rememberFeatureSwimlaneRowOrder(
  previousIds: readonly string[],
  currentIds: readonly string[]
): string[] {
  if (previousIds.length === 0) {
    return [...currentIds];
  }
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of previousIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    next.push(id);
  }
  for (const id of currentIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    next.push(id);
  }
  return next;
}

function appendUnseenFeatureLaneRows(
  ordered: Developer[],
  seen: Set<string>,
  byId: Map<string, Developer>,
  candidates: readonly Developer[]
): void {
  for (const candidate of candidates) {
    const row = byId.get(candidate.id);
    if (!row || seen.has(row.id)) {
      continue;
    }
    ordered.push(row);
    seen.add(row.id);
  }
}

export function mergeFeatureSwimlaneBoardRows(input: {
  draftRows: Developer[];
  orderIds: string[];
  previousOrderIds?: readonly string[];
  projectionRows: Developer[];
}): Developer[] {
  const byId = new Map<string, Developer>();
  for (const row of input.projectionRows) {
    byId.set(row.id, row);
  }
  for (const row of input.draftRows) {
    byId.set(row.id, row);
  }
  const orderIds =
    input.orderIds.length > 0 ? input.orderIds : [...(input.previousOrderIds ?? [])];
  if (orderIds.length === 0) {
    const draftIds = new Set(input.draftRows.map((row) => row.id));
    const trackerRows = input.projectionRows.filter((row) => !draftIds.has(row.id));
    const drafts = input.draftRows.flatMap((row) => {
      const current = byId.get(row.id);
      return current ? [current] : [];
    });
    return pinFeatureLaneSharedRow([
      ...trackerRows.map((row) => byId.get(row.id) ?? row),
      ...drafts,
    ]);
  }
  const seen = new Set<string>();
  const ordered: Developer[] = [];
  for (const id of orderIds) {
    const row = byId.get(id);
    if (row) {
      ordered.push(row);
      seen.add(id);
    }
  }
  appendUnseenFeatureLaneRows(ordered, seen, byId, input.projectionRows);
  appendUnseenFeatureLaneRows(ordered, seen, byId, input.draftRows);
  return pinFeatureLaneSharedRow(ordered);
}

export function moveFeatureSwimlaneRowOrder(
  orderIds: string[],
  activeId: string,
  overId: string
): string[] {
  const next = [...orderIds];
  const from = next.indexOf(activeId);
  const to = next.indexOf(overId);
  if (from === -1 || to === -1 || from === to) {
    return orderIds;
  }
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}
