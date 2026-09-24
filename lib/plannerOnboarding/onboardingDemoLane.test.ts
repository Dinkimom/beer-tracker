import { describe, expect, it } from 'vitest';

import { createTeamSwimlaneDeveloper } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  ONBOARDING_ASSIGNEE_ID,
  ONBOARDING_DEMO_LINK_ID,
  ONBOARDING_DRAG_SHIFT_PARTS,
  ONBOARDING_SAMPLE_TASK_ID,
  ONBOARDING_SAMPLE_TASK_KEY,
  buildOnboardingSamplePosition,
  insertOnboardingAssigneeRow,
  pickOnboardingSampleDayIndex,
  resolveOnboardingLinkedCardStart,
  taskLinksForOnboardingArrows,
  withOnboardingSample,
} from './onboardingDemoLane';

const DEMO_NAMES = { assigneeName: 'Пивчик', secondAssigneeName: 'Сливчик' };

describe('onboarding demo lane', () => {
  it('inserts Пивчик directly under the team row', () => {
    const rows = insertOnboardingAssigneeRow(
      [
        createTeamSwimlaneDeveloper('Общее'),
        { id: 'dev-1', name: 'Ada', role: 'developer' },
      ],
      false,
      DEMO_NAMES
    );
    expect(rows.map((row) => row.id)).toEqual(['__team__', ONBOARDING_ASSIGNEE_ID, 'dev-1']);
    expect(rows[1]?.name).toBe('Пивчик');
  });

  it('inserts Сливчик under Пивчик only for the handoff step', () => {
    const rows = insertOnboardingAssigneeRow(
      [
        createTeamSwimlaneDeveloper('Общее'),
        { id: 'dev-1', name: 'Ada', role: 'developer' },
      ],
      true,
      DEMO_NAMES
    );
    expect(rows.map((row) => row.name)).toEqual(['Общее', 'Пивчик', 'Сливчик', 'Ada']);
  });

  it('picks today, otherwise the first sprint day', () => {
    expect(pickOnboardingSampleDayIndex(5, (day) => day === 3)).toBe(3);
    expect(pickOnboardingSampleDayIndex(5, () => false)).toBe(0);
  });

  it('places a full-day BT-1 task on the demo assignee', () => {
    const overlaid = withOnboardingSample({
      dayIndex: 2,
      durationParts: 3,
      positions: new Map(),
      startPart: ONBOARDING_DRAG_SHIFT_PARTS,
      taskName: 'Онбординг',
      tasks: new Map(),
    });
    expect(overlaid.positions.get(ONBOARDING_SAMPLE_TASK_ID)).toEqual(
      buildOnboardingSamplePosition(2, 3, ONBOARDING_DRAG_SHIFT_PARTS)
    );
    const task = overlaid.tasks.get(ONBOARDING_SAMPLE_TASK_ID);
    expect(task?.name).toBe('Онбординг');
    expect(task?.originalTaskId).toBe(ONBOARDING_SAMPLE_TASK_KEY);
    expect(overlaid.link).toBeNull();
  });

  it('places the linked card at least a full day to the right', () => {
    expect(
      resolveOnboardingLinkedCardStart({
        dayCount: 5,
        dayIndex: 1,
        durationParts: 3,
        partsPerDay: 3,
        startPart: 0,
      })
    ).toEqual({ startDay: 3, startPart: 0 });
  });

  it('places a second card on Сливчик and a link from Пивчик', () => {
    const overlaid = withOnboardingSample({
      dayCount: 5,
      dayIndex: 1,
      durationParts: 3,
      includeSecondCard: true,
      partsPerDay: 3,
      positions: new Map(),
      taskName: 'Онбординг',
      tasks: new Map(),
    });
    const second = [...overlaid.positions.values()].find(
      (position) => position.assignee !== 'onboarding-pivchik'
    );
    expect(second).toMatchObject({
      assignee: 'onboarding-slivchik',
      duration: 3,
      startDay: 3,
      startPart: 0,
    });
    expect(overlaid.tasks.get(second?.taskId ?? '')?.originalTaskId).toBe('BT-2');
    expect(overlaid.link).toEqual({
      fromTaskId: ONBOARDING_SAMPLE_TASK_ID,
      id: ONBOARDING_DEMO_LINK_ID,
      toTaskId: second?.taskId,
    });
  });

  it('keeps only the demo arrow when links are hidden', () => {
    const demo = {
      fromTaskId: 'a',
      id: ONBOARDING_DEMO_LINK_ID,
      toTaskId: 'b',
    };
    const user = { fromTaskId: 'c', id: 'user-link', toTaskId: 'd' };
    expect(taskLinksForOnboardingArrows(true, [user, demo])).toEqual([user, demo]);
    expect(taskLinksForOnboardingArrows(false, [user, demo])).toEqual([demo]);
  });
});
