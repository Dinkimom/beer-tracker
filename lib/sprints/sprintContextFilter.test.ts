import type { SprintContextNote, SprintContextPosition } from './sprintContextTypes';

import { describe, expect, it } from 'vitest';

import {
  dateRangesOverlap,
  expandLinkScopeWithNotes,
  expandScopeWithParentMap,
  filterFeatureLanesForFeature,
  filterLinksByFeatureScope,
  filterNotesByFeatureScope,
  filterPositionsByFeatureScope,
  resolveFeatureScopeTaskIds,
  toIsoDateOnly,
} from './sprintContextFilter';
import { SPRINT_CONTEXT_SCHEMA_VERSION } from './sprintContextTypes';

describe('sprintContextFilter', () => {
  const lanes = {
    draftRows: [
      { id: 'feature-draft:1', issueKeys: ['BT-10', 'BT-11'], name: 'Draft' },
      { id: 'feature-draft:2', name: 'Other' },
    ],
    hiddenIds: ['feature-draft:2'],
    orderIds: ['feature-draft:1', 'FEAT-1', 'feature-draft:2'],
  };

  it('resolves draft issueKeys into the feature scope set', () => {
    expect([...resolveFeatureScopeTaskIds(lanes, 'feature-draft:1')].sort()).toEqual([
      'BT-10',
      'BT-11',
      'feature-draft:1',
    ]);
  });

  it('expands scope with tracker parent map', () => {
    const scope = resolveFeatureScopeTaskIds(lanes, 'FEAT-1');
    const expanded = expandScopeWithParentMap(scope, 'FEAT-1', {
      'BT-20': 'FEAT-1',
      'BT-21': 'OTHER',
    });
    expect([...expanded].sort()).toEqual(['BT-20', 'FEAT-1']);
  });

  it('filters positions and links by scope', () => {
    const positions: SprintContextPosition[] = [
      {
        assigneeId: 'u1',
        duration: 2,
        isQa: false,
        plannedDuration: null,
        plannedStartDay: null,
        plannedStartPart: null,
        startDay: 0,
        startPart: 0,
        taskId: 'BT-10',
      },
      {
        assigneeId: 'u1',
        duration: 1,
        isQa: false,
        plannedDuration: null,
        plannedStartDay: null,
        plannedStartPart: null,
        startDay: 1,
        startPart: 0,
        taskId: 'BT-99',
      },
    ];
    const scope = resolveFeatureScopeTaskIds(lanes, 'feature-draft:1');
    expect(filterPositionsByFeatureScope(positions, scope).map((p) => p.taskId)).toEqual([
      'BT-10',
    ]);
    expect(
      filterLinksByFeatureScope(
        [
          { fromAnchor: null, fromTaskId: 'BT-10', id: 'l1', toAnchor: null, toTaskId: 'BT-11' },
          { fromAnchor: null, fromTaskId: 'BT-10', id: 'l2', toAnchor: null, toTaskId: 'BT-99' },
        ],
        scope
      ).map((l) => l.id)
    ).toEqual(['l1']);
  });

  it('keeps note arrows when the note is in the feature scope', () => {
    const scope = expandLinkScopeWithNotes(new Set(['BT-10']), [{ id: 'n1' }]);
    expect(
      filterLinksByFeatureScope(
        [
          { fromAnchor: null, fromTaskId: 'BT-10', id: 'to-note', toAnchor: null, toTaskId: 'comment:n1' },
          { fromAnchor: null, fromTaskId: 'BT-10', id: 'raw-note', toAnchor: null, toTaskId: 'n1' },
        ],
        scope
      ).map((link) => link.id)
    ).toEqual(['to-note', 'raw-note']);
  });

  it('keeps notes bound to the feature parent or lane assignee', () => {
    const notes: SprintContextNote[] = [
      {
        assigneeId: 'u1',
        authorName: null,
        day: 0,
        id: 'n1',
        kind: 'text',
        parent: { display: 'Feat', id: '1', key: 'FEAT-1' },
        part: 0,
        text: 'on feature',
      },
      {
        assigneeId: 'FEAT-1',
        authorName: null,
        day: 0,
        id: 'n2',
        kind: 'text',
        part: 0,
        text: 'on lane',
      },
      {
        assigneeId: 'u2',
        authorName: null,
        day: 0,
        id: 'n3',
        kind: 'text',
        part: 0,
        text: 'other',
      },
    ];
    const scope = new Set(['FEAT-1', 'BT-20']);
    expect(filterNotesByFeatureScope(notes, 'FEAT-1', scope).map((n) => n.id)).toEqual([
      'n1',
      'n2',
    ]);
  });

  it('narrows feature lanes to the requested feature id', () => {
    expect(filterFeatureLanesForFeature(lanes, 'feature-draft:1')).toEqual({
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-10', 'BT-11'], name: 'Draft' }],
      hiddenIds: [],
      orderIds: ['feature-draft:1'],
    });
  });

  it('detects inclusive date overlap and formats ISO dates', () => {
    expect(dateRangesOverlap('2026-01-01', '2026-01-10', '2026-01-10', '2026-01-20')).toBe(true);
    expect(dateRangesOverlap('2026-01-01', '2026-01-05', '2026-01-06', '2026-01-20')).toBe(false);
    expect(toIsoDateOnly('2026-09-21T12:00:00.000Z')).toBe('2026-09-21');
  });

  it('exports schema version 2 for agent payload meta', () => {
    expect(SPRINT_CONTEXT_SCHEMA_VERSION).toBe(2);
  });
});
