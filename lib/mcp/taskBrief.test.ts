import type {
  SprintContextNote,
  SprintContextPayload,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { buildTaskBriefPlanning } from '@/lib/mcp/taskBrief';
import { SPRINT_CONTEXT_SCHEMA_VERSION } from '@/lib/sprints/sprintContextTypes';

function position(taskId: string, extra: Partial<SprintContextPosition> = {}): SprintContextPosition {
  return {
    assigneeId: 'u1',
    assigneeName: 'Аня',
    duration: 3,
    isQa: false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    startDay: 1,
    startPart: 0,
    summary: `Summary ${taskId}`,
    taskId,
    ...extra,
  };
}

function note(id: string, extra: Partial<SprintContextNote> = {}): SprintContextNote {
  return {
    assigneeId: 'u1',
    authorName: 'Борис',
    day: null,
    height: 1,
    id,
    kind: 'text',
    part: null,
    text: `Note ${id}`,
    width: 2,
    ...extra,
  };
}

function payload(extra: Partial<SprintContextPayload> = {}): SprintContextPayload {
  return {
    agenda: [],
    availability: [],
    featureLanes: null,
    meta: {
      calendarDays: [
        { date: '2026-10-26', day: 0 },
        { date: '2026-10-27', day: 1 },
        { date: '2026-10-28', day: 2 },
      ],
      legend: { day: '', note: '', part: '' },
      organizationId: 'org',
      partsPerDay: 3,
      schemaVersion: SPRINT_CONTEXT_SCHEMA_VERSION,
      sprintId: 7,
      sprintWindow: { endDate: '2026-11-06', name: 'Sprint 31', startDate: '2026-10-26' },
    },
    notes: [],
    positions: [],
    sprintGoals: { delivery: [{ done: false, id: 'g1', text: 'Ship search' }], discovery: [] },
    taskLinks: [],
    ...extra,
  };
}

describe('buildTaskBriefPlanning', () => {
  it('describes where the task sits in the plan', () => {
    const brief = buildTaskBriefPlanning(payload({ positions: [position('BT-1', { parentKey: 'EPIC-1' })] }), 'BT-1');
    expect(brief.plan).toEqual({
      assigneeName: 'Аня',
      isQa: false,
      parentKey: 'EPIC-1',
      schedule: 'BT-1  Аня  2026-10-27 (1/3) – 2026-10-27 (3/3)  1d',
      statusCategory: null,
      statusDisplay: null,
      summary: 'Summary BT-1',
    });
    expect(brief.sprintName).toBe('Sprint 31');
    expect(brief.sprintGoals.delivery).toHaveLength(1);
  });

  it('falls back to the sprint backlog, and to null outside the sprint', () => {
    const context = payload({ unplannedTasks: [{ assigneeName: 'Аня', summary: 'Backlog task', taskId: 'BT-2' }] });
    expect(buildTaskBriefPlanning(context, 'BT-2').plan).toMatchObject({ schedule: null, summary: 'Backlog task' });
    expect(buildTaskBriefPlanning(context, 'BT-404').plan).toBeNull();
  });

  it('splits board arrows into dependsOn and blocks, skipping note ends', () => {
    const brief = buildTaskBriefPlanning(
      payload({
        notes: [note('n1')],
        positions: [position('BT-1'), position('BT-0', { startDay: 0 }), position('BT-3', { startDay: 2 })],
        taskLinks: [
          { fromAnchor: null, fromTaskId: 'BT-0', id: 'l1', toAnchor: null, toTaskId: 'BT-1' },
          { fromAnchor: null, fromTaskId: 'BT-1', id: 'l2', toAnchor: null, toTaskId: 'BT-3' },
          { fromAnchor: null, fromTaskId: 'comment:n1', id: 'l3', toAnchor: null, toTaskId: 'BT-1' },
        ],
      }),
      'BT-1'
    );
    expect(brief.dependsOn.map((item) => item.taskId)).toEqual(['BT-0']);
    expect(brief.blocks.map((item) => item.taskId)).toEqual(['BT-3']);
    expect(brief.notes).toMatchObject([{ id: 'n1', relation: 'linked' }]);
  });

  it('collects the feature from the tracker parent and board feature drafts', () => {
    const brief = buildTaskBriefPlanning(
      payload({
        featureLanes: { draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1', 'BT-9'], name: 'Draft' }], hiddenIds: [], orderIds: [] },
        positions: [position('BT-1', { parentKey: 'EPIC-1' }), position('BT-5', { parentKey: 'EPIC-1' }), position('BT-6')],
        unplannedTasks: [{ parentKey: 'EPIC-1', summary: 'Later', taskId: 'BT-7' }],
      }),
      'BT-1'
    );
    expect(brief.feature.map((item) => item.taskId)).toEqual(['BT-5', 'BT-7', 'BT-9']);
  });

  it('keeps notes about the task, its feature and its time window on the lane', () => {
    const brief = buildTaskBriefPlanning(
      payload({
        notes: [
          note('about-epic', { parent: { display: 'Epic', id: '1', key: 'EPIC-1' } }),
          note('overlaps', { day: 1, part: 2 }),
          note('later', { day: 2, part: 1 }),
          note('other-lane', { assigneeId: 'u2', day: 1, part: 0 }),
          note('draft', { day: 1, part: 0, pendingApproval: true }),
        ],
        positions: [position('BT-1', { parentKey: 'EPIC-1' })],
      }),
      'BT-1'
    );
    expect(brief.notes.map((item) => [item.id, item.relation])).toEqual([
      ['about-epic', 'parent'],
      ['overlaps', 'nearby'],
    ]);
  });
});
