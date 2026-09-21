import type { FeatureSwimlaneRowMeta } from './featureSwimlaneRows';
import type { Developer, TaskParent } from '@/types';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import { isFeatureLaneDraftParent, resolveFeatureLaneRowIssueType } from './featureSwimlaneRowIssueType';

export interface FeatureLaneRowTitleParts {
  issueType: string | null;
  key: string | null;
  title: string;
}

export interface FeatureLaneBoardLabels {
  noParentLabel: string;
  teamLaneLabel: string;
}

export function formatFeatureSwimlaneRowName(
  parent: TaskParent | null,
  fallbackId: string
): string {
  if (!parent) return fallbackId;
  if (isFeatureLaneDraftParent(parent)) {
    return parent.display?.trim() || fallbackId;
  }
  const key = parent.key?.trim();
  const display = parent.display?.trim();
  if (key && display && !display.includes(key)) {
    return `${key} · ${display}`;
  }
  return display || key || fallbackId;
}

export function resolveFeatureSwimlaneRowTitleParts(
  parent: TaskParent | null,
  fallbackTitle: string
): Omit<FeatureLaneRowTitleParts, 'issueType'> {
  if (!parent || isFeatureLaneDraftParent(parent)) {
    return { key: null, title: parent?.display?.trim() || fallbackTitle };
  }
  const key = parent.key?.trim() || null;
  const display = parent.display?.trim() || '';
  if (!key) {
    return { key: null, title: display || fallbackTitle };
  }
  if (!display) {
    return { key, title: fallbackTitle };
  }
  if (display.startsWith(key)) {
    const stripped = display.slice(key.length).replace(/^[·.\s-]+/, '').trim();
    return { key, title: stripped || display };
  }
  return { key, title: display };
}

export function buildFeatureLaneRowTitleById(
  rows: Developer[],
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>,
  labels: FeatureLaneBoardLabels,
  trackerTypes?: ReadonlyMap<string, string>
): Map<string, FeatureLaneRowTitleParts> {
  const next = new Map<string, FeatureLaneRowTitleParts>();
  for (const row of rows) {
    const meta = rowMetaById.get(row.id);
    const issueType = resolveFeatureLaneRowIssueType({
      parent: meta?.parent ?? null,
      parentSource: meta?.parentSource,
      rowId: row.id,
      trackerTypes,
    });
    if (isTeamSwimlaneAssigneeId(row.id)) {
      next.set(row.id, { issueType, key: null, title: labels.teamLaneLabel });
      continue;
    }
    if (row.id === TASK_GROUP_KEY_NO_PARENT) {
      next.set(row.id, { issueType, key: null, title: labels.noParentLabel });
      continue;
    }
    if (isFeatureLaneDraftRowId(row.id)) {
      next.set(row.id, { issueType, key: null, title: row.name });
      continue;
    }
    const parent = meta?.parent ?? null;
    next.set(row.id, { ...resolveFeatureSwimlaneRowTitleParts(parent, row.name), issueType });
  }
  return next;
}
