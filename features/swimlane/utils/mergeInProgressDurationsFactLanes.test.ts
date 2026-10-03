import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildSwimlaneInProgressFactSegmentsForAssignee } from './mergeInProgressDurationsForAssignee';

function task(id: string): Task {
  return {
    id,
    link: '',
    name: id,
    originalStatus: 'inprogress',
    status: 'in-progress',
    team: 'Web',
  };
}

function phase(statusKey: string, startMs: number, endMs: number): StatusDuration {
  return {
    durationMs: endMs - startMs,
    endTime: new Date(endMs).toISOString(),
    endTimeMs: endMs,
    startTime: new Date(startMs).toISOString(),
    startTimeMs: startMs,
    statusKey,
    statusName: statusKey,
  };
}

function position(taskId: string): TaskPosition {
  return { assignee: 'dev-1', duration: 2, startDay: 0, startPart: 0, taskId };
}

function lanesFor(
  issues: Array<{ id: string; phases: StatusDuration[] }>
): Array<{ lane: number; status: string; taskId: string }> {
  const segments = buildSwimlaneInProgressFactSegmentsForAssignee(
    'dev-1',
    'developer',
    new Map(issues.map((issue) => [issue.id, position(issue.id)])),
    new Map(issues.map((issue) => [issue.id, issue.phases])),
    new Map(issues.map((issue) => [issue.id, task(issue.id)]))
  );
  return segments.map((segment) => ({
    lane: segment.laneIndex,
    status: segment.statusKey,
    taskId: segment.taskId,
  }));
}

describe('fact timeline lanes', () => {
  it('keeps one task on a single lane even when another task sits in a gap', () => {
    expect(
      lanesFor([
        {
          id: 'A',
          phases: [phase('inprogress', 0, 10), phase('review', 20, 30)],
        },
        { id: 'B', phases: [phase('inprogress', 12, 18)] },
      ])
    ).toEqual([
      { lane: 0, status: 'inprogress', taskId: 'A' },
      { lane: 0, status: 'review', taskId: 'A' },
      { lane: 1, status: 'inprogress', taskId: 'B' },
    ]);
  });

  it('shares a lane when task timelines do not overlap', () => {
    expect(
      lanesFor([
        { id: 'A', phases: [phase('inprogress', 0, 10)] },
        { id: 'B', phases: [phase('inprogress', 20, 30)] },
      ]).map((segment) => segment.lane)
    ).toEqual([0, 0]);
  });

  it('puts overlapping tasks on different lanes', () => {
    const lanes = lanesFor([
      { id: 'A', phases: [phase('inprogress', 0, 20)] },
      { id: 'B', phases: [phase('inprogress', 10, 30)] },
    ]);
    expect(new Set(lanes.map((segment) => segment.lane)).size).toBe(2);
  });
});
