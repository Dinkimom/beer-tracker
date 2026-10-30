import type { SprintContextPayload, SprintContextPosition } from '@/lib/sprints/sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { buildDelegateShortlist } from '@/lib/mcp/delegateShortlist';

function card(taskId: string, extra: Partial<SprintContextPosition> = {}): SprintContextPosition {
  return {
    assigneeId: 'u1',
    duration: 3,
    isQa: false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    startDay: 0,
    startPart: 0,
    statusCategory: 'todo',
    taskId,
    ...extra,
  };
}

function sprint(extra: Partial<SprintContextPayload>): SprintContextPayload {
  return {
    meta: { partsPerDay: 3 },
    positions: [],
    taskLinks: [],
    ...extra,
  } as SprintContextPayload;
}

const ids = (shortlist: ReturnType<typeof buildDelegateShortlist>) => shortlist.eligible.map((task) => task.taskId);

describe('buildDelegateShortlist', () => {
  it('keeps not started sprint work, smallest first, board and backlog alike', () => {
    const shortlist = buildDelegateShortlist(
      sprint({
        positions: [card('BT-1', { duration: 6 }), card('BT-2', { duration: 2 }), card('BT-2-qa', { isQa: true })],
        unplannedTasks: [
          { statusCategory: 'todo', storyPoints: 1, summary: 'Backlog', taskId: 'BT-3' },
          { statusCategory: 'todo', summary: 'No estimate', taskId: 'BT-4' },
        ],
      })
    );
    expect(ids(shortlist)).toEqual(['BT-2', 'BT-3', 'BT-1', 'BT-4']);
    expect(shortlist.eligible[0]).toMatchObject({ onBoard: true, size: { days: 0.7 } });
    expect(shortlist.eligible[1]).toMatchObject({ onBoard: false, size: { storyPoints: 1 } });
    expect(shortlist.excluded).toEqual([]);
  });

  it('says why the rest is left out', () => {
    const shortlist = buildDelegateShortlist(
      sprint({
        positions: [
          card('BT-1', { inTrackerSprint: false }),
          card('BT-2', { statusCategory: 'in-progress' }),
          card('BT-3', { statusCategory: 'done' }),
          card('BT-4'),
          card('BT-5'),
        ],
        taskLinks: [
          { fromAnchor: null, fromTaskId: 'BT-2', id: 'l1', toAnchor: null, toTaskId: 'BT-4' },
          { fromAnchor: null, fromTaskId: 'BT-3', id: 'l2', toAnchor: null, toTaskId: 'BT-5' },
        ],
      })
    );
    // BT-5 ждёт только закрытую BT-3 — её можно брать.
    expect(ids(shortlist)).toEqual(['BT-5']);
    expect(shortlist.excluded).toEqual([
      { reason: 'not_this_sprint', taskId: 'BT-1' },
      { reason: 'started', taskId: 'BT-2' },
      { reason: 'done', taskId: 'BT-3' },
      { blockedBy: ['BT-2'], reason: 'blocked', taskId: 'BT-4' },
    ]);
  });

  it('narrows to one assignee for scope «mine»', () => {
    const shortlist = buildDelegateShortlist(sprint({ positions: [card('BT-1'), card('BT-2', { assigneeId: 'u2' })] }), 'u2');
    expect(ids(shortlist)).toEqual(['BT-2']);
    expect(shortlist.excluded).toEqual([{ reason: 'not_assignee', taskId: 'BT-1' }]);
  });
});
