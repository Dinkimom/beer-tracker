import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildSwimlaneInProgressFactSegmentsForAssignee } from './mergeInProgressDurationsForAssignee';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    ...partial,
    id: partial.id,
    link: partial.link ?? '',
    name: partial.name ?? partial.id,
    team: partial.team ?? 'Web',
  };
}

function duration(statusKey: string, statusName: string): StatusDuration {
  return {
    durationMs: 3_600_000,
    endTime: null,
    endTimeMs: 1_700_000_000_000,
    startTime: '2026-09-22T10:00:00.000Z',
    startTimeMs: 1_700_000_000_000 - 3_600_000,
    statusKey,
    statusName,
  };
}

function position(taskId: string): TaskPosition {
  return {
    assignee: 'dev-1',
    duration: 2,
    startDay: 0,
    startPart: 0,
    taskId,
  };
}

describe('buildSwimlaneInProgressFactSegmentsForAssignee closing statuses', () => {
  it('draws a Jira Done phase as the closed checkmark marker', () => {
    const issue = task({ id: 'PROJ-1', originalStatus: 'done', status: 'done', statusTypeKey: 'done' });
    const segments = buildSwimlaneInProgressFactSegmentsForAssignee(
      'dev-1',
      'developer',
      new Map([[issue.id, position(issue.id)]]),
      new Map([[issue.id, [duration('done', 'Done')]]]),
      new Map([[issue.id, issue]])
    );
    expect(segments.map((segment) => segment.statusKey)).toEqual(['closed']);
    expect(segments[0]?.statusName).toBe('Done');
  });

  it('draws a custom Jira done-category status as the closed marker', () => {
    const issue = task({
      id: 'PROJ-2',
      originalStatus: 'releasedtoprod',
      status: 'done',
      statusTypeKey: 'done',
    });
    const segments = buildSwimlaneInProgressFactSegmentsForAssignee(
      'dev-1',
      'developer',
      new Map([[issue.id, position(issue.id)]]),
      new Map([[issue.id, [duration('releasedtoprod', 'Released to prod')]]]),
      new Map([[issue.id, issue]])
    );
    expect(segments.map((segment) => segment.statusKey)).toEqual(['closed']);
    expect(segments[0]?.statusName).toBe('Released to prod');
  });

  it('does not turn Tracker rc into a close marker', () => {
    const issue = task({ id: 'BT-1', originalStatus: 'rc', status: 'done', statusTypeKey: 'done' });
    const segments = buildSwimlaneInProgressFactSegmentsForAssignee(
      'dev-1',
      'developer',
      new Map([[issue.id, position(issue.id)]]),
      new Map([[issue.id, [duration('rc', 'RC'), duration('inprogress', 'In Progress')]]]),
      new Map([[issue.id, issue]])
    );
    expect(segments.map((segment) => segment.statusKey)).toEqual(['inprogress']);
  });
});

describe('buildSwimlaneInProgressFactSegmentsForAssignee tester swimlane', () => {
  const history = [duration('inprogress', 'In Progress'), duration('done', 'Done')];

  it('shows work phases of a tester-owned SP task (AQA/MQA) without readyfortest/intesting', () => {
    const issue = task({ id: 'AQA-363', storyPoints: 2, team: 'QA' });
    const segments = buildSwimlaneInProgressFactSegmentsForAssignee(
      'dev-1',
      'tester',
      new Map([[issue.id, position(issue.id)]]),
      new Map([[issue.id, history]]),
      new Map([[issue.id, issue]])
    );
    expect(segments.map((segment) => segment.statusKey).sort()).toEqual(['closed', 'inprogress']);
  });

  it('hides dev phases on the QA copy of a developer task', () => {
    const dev = task({ id: 'WEB-1', qaEngineer: 'dev-1', storyPoints: 3, testPoints: 1 });
    const qa = task({ id: 'qa-web-1', originalTaskId: dev.id, storyPoints: 0, team: 'QA', testPoints: 1 });
    const segments = buildSwimlaneInProgressFactSegmentsForAssignee(
      'dev-1',
      'tester',
      new Map([[qa.id, position(qa.id)]]),
      new Map([[qa.id, history]]),
      new Map([
        [dev.id, dev],
        [qa.id, qa],
      ])
    );
    expect(segments.map((segment) => segment.statusKey)).toEqual(['closed']);
  });
});
