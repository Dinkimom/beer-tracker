import type { SprintPlanPatchOp } from './sprintPlanPatchTypes';

import { describe, expect, it } from 'vitest';

import { collectCreateNoteOps } from './sprintPlanPatchDraftNotes';

describe('collectCreateNoteOps', () => {
  it('keeps createNote ops in order and drops other ops', () => {
    const ops: SprintPlanPatchOp[] = [
      {
        assigneeId: 'staff:a',
        duration: 1,
        op: 'upsertPosition',
        startDay: 0,
        startPart: 0,
        taskId: 'T-1',
      },
      {
        assigneeId: 'staff:a',
        day: 1,
        op: 'createNote',
        part: 0,
        text: 'First',
      },
      { commentId: '11111111-1111-4111-8111-111111111111', op: 'deleteNote' },
      {
        assigneeId: 'staff:b',
        day: 2,
        op: 'createNote',
        part: 1,
        text: 'Second',
      },
    ];
    expect(collectCreateNoteOps(ops).map((op) => op.text)).toEqual(['First', 'Second']);
  });
});
