import type { TaskLink, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  countHiddenIdleLinksByTaskId,
  isTaskLinkScheduleViolated,
  isTaskLinkVisibleWhenIdle,
} from '@/features/swimlane/utils/task-arrows/taskLinkIdleVisibility';

function pos(startDay: number, duration: number): TaskPosition {
  return { assignee: 'u1', duration, startDay, startPart: 0, taskId: '' };
}

function trackerLink(relationship: string, id = 'l1'): TaskLink {
  return { fromTaskId: 'a', id, origin: 'tracker', relationship, toTaskId: 'b' };
}

/** a стоит раньше b — порядок соблюдён. */
const ordered = new Map<string, TaskPosition>([
  ['a', pos(0, 2)],
  ['b', pos(3, 2)],
]);

/** b стоит раньше a. */
const reversed = new Map<string, TaskPosition>([
  ['a', pos(3, 2)],
  ['b', pos(0, 2)],
]);

describe('isTaskLinkScheduleViolated', () => {
  it('blocks: блокер кончается после старта заблокированной', () => {
    expect(isTaskLinkScheduleViolated(trackerLink('blocks'), ordered)).toBe(false);
    expect(isTaskLinkScheduleViolated(trackerLink('blocks'), reversed)).toBe(true);
  });

  it('blocked_by: направление зависимости обратное', () => {
    expect(isTaskLinkScheduleViolated(trackerLink('blocked_by'), ordered)).toBe(true);
    expect(isTaskLinkScheduleViolated(trackerLink('blocked_by'), reversed)).toBe(false);
  });

  it('relates не бывает нарушенной', () => {
    expect(isTaskLinkScheduleViolated(trackerLink('relates'), reversed)).toBe(false);
  });

  it('стык без зазора — не нарушение', () => {
    const adjacent = new Map<string, TaskPosition>([
      ['a', pos(0, 3)],
      ['b', { ...pos(0, 3), startPart: 3 }],
    ]);
    expect(isTaskLinkScheduleViolated(trackerLink('blocks'), adjacent)).toBe(false);
  });
});

describe('isTaskLinkVisibleWhenIdle', () => {
  const plannerLink: TaskLink = { fromTaskId: 'a', id: 'p1', origin: 'planner', toTaskId: 'b' };
  const devQa: TaskLink = { fromTaskId: 'a', id: 'dev-qa-a', toTaskId: 'b' };

  it('all — всё видно', () => {
    expect(isTaskLinkVisibleWhenIdle(trackerLink('relates'), 'all', ordered)).toBe(true);
    expect(isTaskLinkVisibleWhenIdle(devQa, 'all', ordered)).toBe(true);
  });

  it('important — блокировки и планерные, без relates и dev → QA', () => {
    expect(isTaskLinkVisibleWhenIdle(trackerLink('blocks'), 'important', ordered)).toBe(true);
    expect(isTaskLinkVisibleWhenIdle(trackerLink('blocked_by'), 'important', reversed)).toBe(true);
    expect(isTaskLinkVisibleWhenIdle(plannerLink, 'important', ordered)).toBe(true);
    expect(isTaskLinkVisibleWhenIdle(trackerLink('relates'), 'important', ordered)).toBe(false);
    expect(isTaskLinkVisibleWhenIdle(trackerLink('duplicates'), 'important', ordered)).toBe(false);
    expect(isTaskLinkVisibleWhenIdle(devQa, 'important', ordered)).toBe(false);
  });

  it('hover — только нарушенные', () => {
    expect(isTaskLinkVisibleWhenIdle(trackerLink('blocks'), 'hover', ordered)).toBe(false);
    expect(isTaskLinkVisibleWhenIdle(trackerLink('blocks'), 'hover', reversed)).toBe(true);
    expect(isTaskLinkVisibleWhenIdle(plannerLink, 'hover', ordered)).toBe(false);
  });
});

describe('countHiddenIdleLinksByTaskId', () => {
  it('считает оба конца и пропускает dev → QA', () => {
    const counts = countHiddenIdleLinksByTaskId([
      trackerLink('relates', 'l1'),
      { fromTaskId: 'a', id: 'l2', toTaskId: 'c' },
      { fromTaskId: 'a', id: 'dev-qa-a', toTaskId: 'qa' },
    ]);
    expect(Object.fromEntries(counts)).toEqual({ a: 2, b: 1, c: 1 });
  });
});
