import { describe, expect, it } from 'vitest';

import {
  buildPendingPlanPatchView,
  droppedPendingLines,
  pendingPlanPatchViewLines,
} from './sprintPlanPatchPendingView';

describe('buildPendingPlanPatchView', () => {
  it('describes committed dates beside the pending placement', () => {
    const view = buildPendingPlanPatchView({
      calendarDays: [
        { date: '2026-10-27', day: 6 },
        { date: '2026-10-28', day: 7 },
      ],
      goalPreviews: [
        {
          action: 'update',
          done: false,
          goalId: '22222222-2222-4222-8222-222222222222',
          goalType: 'delivery',
          text: 'Edited goal',
        },
      ],
      goals: new Map([['22222222-2222-4222-8222-222222222222', { text: 'Old goal' }]]),
      notes: [
        {
          assigneeId: 'staff:a',
          authorName: null,
          day: 1,
          id: '11111111-1111-4111-8111-111111111111',
          height: 1,
          kind: 'text',
          part: 0,
          pendingApproval: true,
          text: 'Draft note',
          width: 2,
        },
      ],
      partsPerDay: 2,
      positionPreviews: [
        {
          assigneeId: 'staff:a',
          changes: ['schedule'],
          duration: 2,
          remove: false,
          startDay: 7,
          startPart: 0,
          taskId: 'RND-1779',
        },
      ],
      positions: [
        {
          assigneeId: 'staff:a',
          assigneeName: 'Nikita',
          duration: 2,
          isQa: false,
          plannedDuration: null,
          plannedStartDay: null,
          plannedStartPart: null,
          startDay: 6,
          startPart: 0,
          taskId: 'RND-1779',
        },
      ],
      proposalId: 'aa44abc5eae0',
    });
    expect(view?.proposalId).toBe('aa44abc5eae0');
    expect(view?.positions[0]?.beforeSchedule).toContain('2026-10-27');
    expect(view?.positions[0]?.afterSchedule).toContain('2026-10-28');
    expect(view?.goals[0]).toMatchObject({ beforeText: 'Old goal', afterText: 'Edited goal' });
    expect(pendingPlanPatchViewLines(view!)).toEqual([
      expect.stringContaining('position RND-1779:'),
      'goal update delivery 22222222-2222-4222-8222-222222222222: "Old goal" → "Edited goal"',
      'draft note 11111111-1111-4111-8111-111111111111: "Draft note"',
    ]);
    expect(view?.hint).toContain('replacePending=true');
  });

  it('returns null when nothing is pending', () => {
    expect(
      buildPendingPlanPatchView({
        calendarDays: [],
        goalPreviews: [],
        goals: new Map(),
        notes: [],
        partsPerDay: 2,
        positionPreviews: [],
        positions: [],
        proposalId: null,
      })
    ).toBeNull();
  });
});

describe('droppedPendingLines', () => {
  const view = {
    draftNotes: [
      { id: 'n1', text: 'Tail of RND-1 goes to sprint 37' },
      { id: 'n2', replaceAction: 'update' as const, replacesNoteId: 'c9', text: 'Edited' },
    ],
    goals: [
      { action: 'create' as const, afterText: 'Ship checkout', beforeText: null, goalType: 'delivery' as const, id: 'g-new' },
      { action: 'update' as const, afterText: 'New', beforeText: 'Old', goalType: 'delivery' as const, id: 'g1' },
    ],
    hint: '',
    positions: [
      { afterSchedule: 'Tue', beforeSchedule: 'Mon', taskId: 'RND-1' },
      { afterSchedule: 'Wed', beforeSchedule: null, taskId: 'RND-2' },
    ],
    proposalId: 'p1',
  };

  it('lists what the new ops do not carry over from the pending proposal', () => {
    const lines = droppedPendingLines(view, [
      { assigneeId: 'staff:a', duration: 2, op: 'upsertPosition', startDay: 3, startPart: 0, taskId: 'RND-1' },
      { goalType: 'delivery', op: 'createGoal', text: ' Ship checkout ' },
      { commentId: 'c9', op: 'deleteNote' },
    ]);
    expect(lines).toEqual([
      'position RND-2: (none) → Wed',
      'goal update delivery g1: "Old" → "New"',
      'draft note n1: "Tail of RND-1 goes to sprint 37"',
    ]);
  });

  it('is empty when every pending item is still addressed', () => {
    expect(
      droppedPendingLines(view, [
        { op: 'deletePosition', taskId: 'RND-1' },
        { op: 'deletePosition', taskId: 'RND-2' },
        { goalType: 'delivery', op: 'createGoal', text: 'Ship checkout' },
        { id: 'g1', op: 'deleteGoal' },
        { assigneeId: 'staff:a', day: 1, op: 'createNote', part: 0, text: 'Tail of RND-1 goes to sprint 37' },
        { commentId: 'c9', op: 'updateNote', text: 'Edited again' },
      ])
    ).toEqual([]);
  });
});
