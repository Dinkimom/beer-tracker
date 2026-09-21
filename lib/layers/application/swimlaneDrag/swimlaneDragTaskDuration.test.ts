import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { swimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';

import { getTaskDuration, resolveActiveDragDurationParts } from './swimlaneDragTaskDuration';

function positionWithSegments(
  taskId: string,
  segments: Array<{ duration: number; startDay: number; startPart: number }>
): TaskPosition {
  const first = segments[0]!;
  return {
    assignee: 'dev',
    duration: segments.reduce((sum, s) => sum + s.duration, 0),
    segments,
    startDay: first.startDay,
    startPart: first.startPart,
    taskId,
  };
}

describe('resolveActiveDragDurationParts', () => {
  const taskId = 'task-1';
  const positions = new Map<string, TaskPosition>([
    [
      taskId,
      positionWithSegments(taskId, [
        { duration: 5, startDay: 0, startPart: 0 },
        { duration: 1, startDay: 1, startPart: 2 },
      ]),
    ],
  ]);
  const tasks: Task[] = [{ id: taskId, storyPoints: 6 } as Task];

  it('returns segment duration when dragging a specific segment', () => {
    expect(
      resolveActiveDragDurationParts(
        taskId,
        swimlaneTaskDraggableId(taskId, 1),
        positions,
        tasks
      )
    ).toBe(1);
  });

  it('returns first segment duration when dragging segment 0', () => {
    expect(
      resolveActiveDragDurationParts(
        taskId,
        swimlaneTaskDraggableId(taskId, 0),
        positions,
        tasks
      )
    ).toBe(5);
  });

  it('falls back to total position duration without segment id', () => {
    expect(getTaskDuration(taskId, positions, tasks)).toBe(6);
    expect(resolveActiveDragDurationParts(taskId, taskId, positions, tasks)).toBe(6);
  });

  it('returns null when drag is inactive', () => {
    expect(resolveActiveDragDurationParts(null, null, positions, tasks)).toBeNull();
  });
});
