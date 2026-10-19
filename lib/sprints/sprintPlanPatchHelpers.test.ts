import type { SprintContextPosition } from './sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { buildSprintContextCapacity } from './sprintContextCapacity';
import {
  mergeFeatureDraftIntoDocument,
  simulatePositionsAfterPatch,
  summarizeSprintPlanPatchOps,
} from './sprintPlanPatchHelpers';

function position(partial: Partial<SprintContextPosition> & Pick<SprintContextPosition, 'taskId'>): SprintContextPosition {
  return {
    assigneeId: 'staff:a',
    duration: 1,
    isQa: false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    startDay: 0,
    startPart: 0,
    ...partial,
  };
}

describe('mergeFeatureDraftIntoDocument', () => {
  it('adds a draft without wiping existing ones', () => {
    const merged = mergeFeatureDraftIntoDocument(
      {
        draftRows: [{ id: 'feature-draft:1', name: 'Existing' }],
        hiddenIds: [],
        orderIds: ['feature-draft:1'],
      },
      { id: 'feature-draft:2', name: 'New', issueKeys: ['T-1'] }
    );
    expect(merged.draftRows).toEqual([
      { id: 'feature-draft:1', name: 'Existing' },
      { id: 'feature-draft:2', name: 'New', issueKeys: ['T-1'] },
    ]);
    expect(merged.orderIds).toEqual(['feature-draft:1', 'feature-draft:2']);
  });

  it('updates an existing draft name and preserves issueKeys when omitted', () => {
    const merged = mergeFeatureDraftIntoDocument(
      {
        draftRows: [{ id: 'feature-draft:1', name: 'Old', issueKeys: ['T-1'] }],
        hiddenIds: [],
        orderIds: ['feature-draft:1'],
      },
      { id: 'feature-draft:1', name: 'Renamed' }
    );
    expect(merged.draftRows).toEqual([
      { id: 'feature-draft:1', name: 'Renamed', issueKeys: ['T-1'] },
    ]);
  });
});

describe('simulatePositionsAfterPatch', () => {
  it('previews overlaps after upserts', () => {
    const simulated = simulatePositionsAfterPatch(
      [position({ taskId: 'T-1', startDay: 0, startPart: 0, duration: 1 })],
      [
        {
          assigneeId: 'staff:a',
          duration: 1,
          op: 'upsertPosition',
          startDay: 0,
          startPart: 0,
          taskId: 'T-2',
        },
      ]
    );
    const report = buildSprintContextCapacity({
      availability: [],
      meta: {
        calendarDays: [{ date: '2026-09-07', day: 0 }],
        legend: { day: 'd', part: 'p' },
        organizationId: 'org-1',
        partsPerDay: 3,
        schemaVersion: 2,
        sprintId: 1,
      },
      positions: simulated,
    });
    expect(report.people[0]?.overlaps).toHaveLength(1);
    expect(report.summary).toContain('overlap');
  });

  it('applies deletes', () => {
    const simulated = simulatePositionsAfterPatch(
      [position({ taskId: 'T-1' }), position({ taskId: 'T-2' })],
      [{ op: 'deletePosition', taskId: 'T-1' }]
    );
    expect(simulated.map((p) => p.taskId)).toEqual(['T-2']);
  });
});

describe('summarizeSprintPlanPatchOps', () => {
  it('builds human bullets', () => {
    expect(
      summarizeSprintPlanPatchOps([
        {
          assigneeId: 'staff:a',
          day: 2,
          op: 'createNote',
          part: 1,
          text: 'Hello world',
        },
      ])
    ).toEqual(['createNote @staff:a day 2 part 1: Hello world']);
  });

  it('notes segments and syncToTracker on upsertPosition', () => {
    expect(
      summarizeSprintPlanPatchOps([
        {
          assigneeId: 'staff:a',
          duration: 2,
          op: 'upsertPosition',
          segments: [
            { duration: 1, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 1, startPart: 0 },
          ],
          startDay: 0,
          startPart: 0,
          syncToTracker: true,
          taskId: 'RND-1',
        },
      ])
    ).toEqual([
      'upsertPosition RND-1: (none) → staff:a day 0 part 0 dur 2 (2 segments) +syncToTracker',
    ]);
  });

  it('includes was → became when current positions are provided', () => {
    expect(
      summarizeSprintPlanPatchOps(
        [
          {
            assigneeId: 'staff:b',
            duration: 4,
            op: 'upsertPosition',
            startDay: 2,
            startPart: 1,
            taskId: 'RND-1',
          },
        ],
        [
          {
            assigneeId: 'staff:a',
            duration: 2,
            isQa: false,
            plannedDuration: null,
            plannedStartDay: null,
            plannedStartPart: null,
            startDay: 0,
            startPart: 0,
            taskId: 'RND-1',
          },
        ]
      )
    ).toEqual([
      'upsertPosition RND-1: staff:a day 0 part 0 dur 2 → staff:b day 2 part 1 dur 4',
    ]);
  });

  it('shows note and goal text before the new text', () => {
    expect(
      summarizeSprintPlanPatchOps(
        [
          {
            commentId: '11111111-1111-4111-8111-111111111111',
            op: 'updateNote',
            text: 'After',
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            op: 'updateGoal',
            text: 'New goal',
          },
        ],
        undefined,
        {
          goals: new Map([['22222222-2222-4222-8222-222222222222', 'Old goal']]),
          notes: new Map([['11111111-1111-4111-8111-111111111111', 'Old note']]),
        }
      )
    ).toEqual([
      'updateNote 11111111-1111-4111-8111-111111111111: "Old note" → "After"',
      'updateGoal 22222222-2222-4222-8222-222222222222: "Old goal" → "New goal"',
    ]);
  });
});
