import { describe, expect, it } from 'vitest';

import {
  decidePlanAnchorWrite,
  findWorkStartInSprint,
  sprintWindowBounds,
  workStatusChangesFromChangelog,
  type PlanCaptureGeometry,
} from './planAnchorCapture';

const SPRINT_START = Date.parse('2026-10-06T00:00:00.000Z');
const SPRINT_END = Date.parse('2026-10-17T23:59:59.000Z');

function geometry(startDay: number): PlanCaptureGeometry {
  return {
    assigneeId: 'dev',
    duration: 6,
    segments: null,
    startDay,
    startPart: 0,
  };
}

function change(iso: string, inWork: boolean) {
  return { atMs: Date.parse(iso), inWork };
}

describe('sprintWindowBounds', () => {
  it('extends a date-only end through that calendar day', () => {
    const bounds = sprintWindowBounds('2026-10-06', '2026-10-17');
    expect(bounds?.startMs).toBe(Date.parse('2026-10-06T00:00:00.000Z'));
    expect(bounds?.endMs).toBe(Date.parse('2026-10-17T23:59:59.999Z'));
  });
});

describe('workStatusChangesFromChangelog', () => {
  it('keeps status changes and ignores other fields', () => {
    const changes = workStatusChangesFromChangelog([
      {
        id: '1',
        type: 'IssueWorkflow',
        updatedAt: '2026-10-07T08:00:00.000Z',
        fields: [
          {
            field: { display: 'Status', id: 'status' },
            from: { display: 'Open', id: '1', key: 'open' },
            to: { display: 'In Progress', id: '2', key: 'inProgress' },
          },
        ],
      },
      {
        id: '2',
        type: 'IssueUpdate',
        updatedAt: '2026-10-07T09:00:00.000Z',
        fields: [
          {
            field: { display: 'Story points', id: 'storyPoints' },
            from: null,
            to: { display: '3', id: '3', key: '3' },
          },
        ],
      },
    ]);
    expect(changes).toEqual([{ atMs: Date.parse('2026-10-07T08:00:00.000Z'), inWork: true }]);
  });
});

describe('findWorkStartInSprint', () => {
  it('ignores a transition that happened before the sprint', () => {
    const started = findWorkStartInSprint(
      [change('2026-10-01T08:00:00.000Z', true)],
      SPRINT_START,
      SPRINT_END
    );
    expect(started).toBeNull();
  });

  it('uses the first entry into work inside the sprint', () => {
    const started = findWorkStartInSprint(
      [
        change('2026-10-07T08:00:00.000Z', false),
        change('2026-10-07T11:00:00.000Z', true),
        change('2026-10-08T11:00:00.000Z', true),
      ],
      SPRINT_START,
      SPRINT_END
    );
    expect(started).toBe(Date.parse('2026-10-07T11:00:00.000Z'));
  });

  it('waits for a new entry when the task was already in work at sprint start', () => {
    const started = findWorkStartInSprint(
      [
        change('2026-10-01T08:00:00.000Z', true),
        change('2026-10-08T08:00:00.000Z', false),
        change('2026-10-09T08:00:00.000Z', true),
      ],
      SPRINT_START,
      SPRINT_END
    );
    expect(started).toBe(Date.parse('2026-10-09T08:00:00.000Z'));
  });
});

describe('decidePlanAnchorWrite', () => {
  const base = {
    currentStatusKey: 'open',
    draft: geometry(1),
    hasAnchor: false,
    position: geometry(1),
    sprintEndMs: SPRINT_END,
    sprintStartMs: SPRINT_START,
    workStatusChanges: [] as Array<{ atMs: number; inWork: boolean }>,
  };

  it('refreshes the draft while the task is not in work', () => {
    const decision = decidePlanAnchorWrite({ ...base, position: geometry(4) });
    expect(decision).toEqual({ type: 'draft', geometry: geometry(4) });
  });

  it('skips a draft write when the geometry did not change', () => {
    expect(decidePlanAnchorWrite(base)).toBeNull();
  });

  it('freezes the existing draft at the work-start time and ignores the current position', () => {
    const decision = decidePlanAnchorWrite({
      ...base,
      position: geometry(8),
      workStatusChanges: [change('2026-10-07T11:00:00.000Z', true)],
    });
    expect(decision).toEqual({
      type: 'anchor',
      anchoredAtMs: Date.parse('2026-10-07T11:00:00.000Z'),
      geometry: geometry(1),
    });
  });

  it('does not invent an anchor when work started before any draft existed', () => {
    const decision = decidePlanAnchorWrite({
      ...base,
      draft: null,
      position: geometry(8),
      workStatusChanges: [change('2026-10-07T11:00:00.000Z', true)],
    });
    expect(decision).toBeNull();
  });

  it('does not move a draft after the task is already in work without a sprint entry', () => {
    const decision = decidePlanAnchorWrite({
      ...base,
      currentStatusKey: 'inProgress',
      position: geometry(8),
      workStatusChanges: [change('2026-10-01T11:00:00.000Z', true)],
    });
    expect(decision).toBeNull();
  });

  it('leaves an existing anchor untouched', () => {
    const decision = decidePlanAnchorWrite({
      ...base,
      hasAnchor: true,
      position: geometry(8),
      workStatusChanges: [change('2026-10-07T11:00:00.000Z', true)],
    });
    expect(decision).toBeNull();
  });
});
