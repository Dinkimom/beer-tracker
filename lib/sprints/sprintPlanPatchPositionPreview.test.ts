import { describe, expect, it } from 'vitest';

import {
  buildPlanPatchPositionPreviews,
  joinPlanPatchChangeLabels,
  normalizePlanPatchPositionPreview,
  planPatchPreviewCaptionText,
  type PlanPatchPreviewSourcePosition,
} from './sprintPlanPatchPositionPreview';

const LABELS = {
  add: 'Agent',
  and: 'and',
  duration: 'Change duration',
  remove: 'Remove from sprint',
  schedule: 'Move dates',
  segments: 'Split into segments',
};

function placed(taskId: string, patch: Partial<PlanPatchPreviewSourcePosition> = {}): PlanPatchPreviewSourcePosition {
  return {
    assigneeId: 'dev-a',
    duration: 3,
    startDay: 1,
    startPart: 0,
    taskId,
    ...patch,
  };
}

describe('buildPlanPatchPositionPreviews', () => {
  it('draws a new placement when the task is not on the board', () => {
    expect(
      buildPlanPatchPositionPreviews({
        current: [],
        ops: [
          {
            assigneeId: 'dev-a',
            duration: 2,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 1,
            taskId: 'T-1',
          },
        ],
      })
    ).toEqual([
      {
        assigneeId: 'dev-a',
        changes: [],
        duration: 2,
        remove: false,
        startDay: 0,
        startPart: 1,
        taskId: 'T-1',
      },
    ]);
  });

  it('keeps syncToTracker so approve adds the issue to the tracker sprint', () => {
    const previews = buildPlanPatchPositionPreviews({
      current: [placed('same')],
      ops: [
        {
          assigneeId: 'dev-a',
          duration: 2,
          op: 'upsertPosition',
          startDay: 0,
          startPart: 0,
          syncToTracker: true,
          taskId: 'T-1',
        },
        {
          assigneeId: 'dev-a',
          duration: 3,
          op: 'upsertPosition',
          startDay: 1,
          startPart: 0,
          syncToTracker: true,
          taskId: 'same',
        },
      ],
    });
    expect(previews.map((preview) => [preview.taskId, preview.syncToTracker])).toEqual([
      ['T-1', true],
      ['same', true],
    ]);
  });

  it('draws a new placement already split into segments', () => {
    const segments = [
      { duration: 1, startDay: 0, startPart: 0 },
      { duration: 1, startDay: 2, startPart: 1 },
    ];
    expect(
      buildPlanPatchPositionPreviews({
        current: [],
        ops: [
          {
            assigneeId: 'dev-a',
            duration: 2,
            op: 'upsertPosition',
            segments,
            startDay: 0,
            startPart: 0,
            syncToTracker: true,
            taskId: 'T-new',
          },
        ],
      })
    ).toEqual([
      {
        assigneeId: 'dev-a',
        changes: [],
        duration: 2,
        remove: false,
        segments,
        startDay: 0,
        startPart: 0,
        syncToTracker: true,
        taskId: 'T-new',
      },
    ]);
  });

  it('labels a date move and a duration change, and skips an identical upsert', () => {
    const current = [placed('move'), placed('grow'), placed('same')];
    const previews = buildPlanPatchPositionPreviews({
      current,
      ops: [
        {
          assigneeId: 'dev-b',
          duration: 3,
          op: 'upsertPosition',
          startDay: 2,
          startPart: 1,
          taskId: 'move',
        },
        {
          assigneeId: 'dev-a',
          duration: 5,
          op: 'upsertPosition',
          startDay: 1,
          startPart: 0,
          taskId: 'grow',
        },
        {
          assigneeId: 'dev-a',
          duration: 3,
          op: 'upsertPosition',
          startDay: 1,
          startPart: 0,
          taskId: 'same',
        },
      ],
    });
    expect(previews).toEqual([
      {
        assigneeId: 'dev-b',
        changes: ['schedule'],
        duration: 3,
        remove: false,
        startDay: 2,
        startPart: 1,
        taskId: 'move',
      },
      {
        assigneeId: 'dev-a',
        changes: ['duration'],
        duration: 5,
        remove: false,
        startDay: 1,
        startPart: 0,
        taskId: 'grow',
      },
    ]);
  });

  it('combines a move and a duration change and treats the last op as final', () => {
    const previews = buildPlanPatchPositionPreviews({
      current: [placed('T-1')],
      ops: [
        {
          assigneeId: 'dev-a',
          duration: 4,
          op: 'upsertPosition',
          startDay: 3,
          startPart: 0,
          taskId: 'T-1',
        },
        { op: 'deletePosition', taskId: 'T-1' },
      ],
    });
    expect(previews).toEqual([
      {
        assigneeId: 'dev-a',
        changes: [],
        duration: 3,
        remove: true,
        startDay: 1,
        startPart: 0,
        taskId: 'T-1',
      },
    ]);
  });

  it('skips a delete for a task that is not on the board', () => {
    expect(
      buildPlanPatchPositionPreviews({
        current: [],
        ops: [{ op: 'deletePosition', taskId: 'missing' }],
      })
    ).toEqual([]);
  });

  it('labels a segment split when envelope stays the same', () => {
    const previews = buildPlanPatchPositionPreviews({
      current: [placed('T-1', { duration: 4, startDay: 0, startPart: 0 })],
      ops: [
        {
          assigneeId: 'dev-a',
          duration: 3,
          op: 'upsertPosition',
          segments: [
            { duration: 2, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 1, startPart: 1 },
          ],
          startDay: 0,
          startPart: 0,
          taskId: 'T-1',
        },
      ],
    });
    expect(previews).toEqual([
      {
        assigneeId: 'dev-a',
        changes: ['duration', 'segments'],
        duration: 3,
        remove: false,
        segments: [
          { duration: 2, startDay: 0, startPart: 0 },
          { duration: 1, startDay: 1, startPart: 1 },
        ],
        startDay: 0,
        startPart: 0,
        taskId: 'T-1',
      },
    ]);
  });

  it('labels clearing segments back to a continuous bar', () => {
    const previews = buildPlanPatchPositionPreviews({
      current: [
        placed('T-1', {
          duration: 3,
          segments: [
            { duration: 2, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 1, startPart: 0 },
          ],
          startDay: 0,
          startPart: 0,
        }),
      ],
      ops: [
        {
          assigneeId: 'dev-a',
          duration: 3,
          op: 'upsertPosition',
          segments: [],
          startDay: 0,
          startPart: 0,
          taskId: 'T-1',
        },
      ],
    });
    expect(previews[0]?.changes).toEqual(['segments']);
    expect(previews[0]?.segments).toEqual([]);
  });
});

describe('planPatchPreviewCaptionText', () => {
  it('joins two changes with and', () => {
    expect(
      planPatchPreviewCaptionText({ changes: ['duration', 'schedule'], remove: false }, LABELS)
    ).toBe('Move dates and Change duration');
  });

  it('uses the removal and add labels', () => {
    expect(planPatchPreviewCaptionText({ changes: [], remove: true }, LABELS)).toBe('Remove from sprint');
    expect(planPatchPreviewCaptionText({ changes: [], remove: false }, LABELS)).toBe('Agent');
  });

  it('keeps the add label when a new placement already has segments', () => {
    expect(
      planPatchPreviewCaptionText(
        {
          changes: [],
          remove: false,
        },
        LABELS
      )
    ).toBe('Agent');
    expect(
      planPatchPreviewCaptionText({ changes: ['segments'], remove: false }, LABELS)
    ).toBe('Split into segments');
  });

  it('joins three labels with a comma and a final and', () => {
    expect(joinPlanPatchChangeLabels(['A', 'B', 'C'], 'and')).toBe('A, B and C');
  });
});

describe('normalizePlanPatchPositionPreview', () => {
  it('drops a payload without geometry', () => {
    expect(normalizePlanPatchPositionPreview({ taskId: 'T-1' })).toBeNull();
  });

  it('keeps known change kinds in display order', () => {
    expect(
      normalizePlanPatchPositionPreview({
        assigneeId: 'dev-a',
        changes: ['duration', 'nope', 'schedule', 'segments'],
        duration: 2,
        remove: false,
        segments: [{ duration: 1, startDay: 0, startPart: 0 }],
        startDay: 0,
        startPart: 0,
        taskId: 'T-1',
      })?.changes
    ).toEqual(['schedule', 'duration', 'segments']);
  });
});
