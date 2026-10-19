import { describe, expect, it } from 'vitest';

import {
  buildPendingPlanPatchView,
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
          kind: 'text',
          part: 0,
          pendingApproval: true,
          text: 'Draft note',
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
