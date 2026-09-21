import type { Task, TaskPosition } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateIssueWorkForPhase } from '@/lib/beerTrackerApi';

import { reconcileTasksAfterPlanHistoryStep } from './reconcileTasksAfterPlanHistoryStep';

vi.mock('@/lib/beerTrackerApi', () => ({
  updateIssueWorkForPhase: vi.fn().mockResolvedValue(true),
}));

const mockUpdateIssue = vi.mocked(updateIssueWorkForPhase);

describe('reconcileTasksAfterPlanHistoryStep', () => {
  beforeEach(() => {
    mockUpdateIssue.mockClear();
  });

  it('при syncEstimates отправляет оценку в трекер и выравнивает SP по длительности фазы', () => {
    const developer = { id: 'Alice', name: 'Alice N.', role: 'developer' as const };
    const task = { id: 'NW-1', storyPoints: 3, assignee: 'Bob' } as Task;
    const tasksMap = new Map<string, Task>([['NW-1', task]]);
    const position: TaskPosition = {
      assignee: 'Alice',
      duration: 6,
      startDay: 0,
      startPart: 0,
      taskId: 'NW-1',
    };
    let nextTasks: Task[] = [task];

    reconcileTasksAfterPlanHistoryStep(
      { saves: [{ isQa: false, position }] },
      { developers: [developer], syncEstimates: true, tasksMap },
      (updater) => {
        nextTasks = typeof updater === 'function' ? updater(nextTasks) : updater;
      }
    );

    expect(mockUpdateIssue).toHaveBeenCalledTimes(1);
    expect(mockUpdateIssue).toHaveBeenCalledWith('NW-1', 8, false);
    expect(nextTasks[0]?.storyPoints).toBe(8);
    expect(nextTasks[0]?.assignee).toBe('Alice');
    expect(nextTasks[0]?.assigneeName).toBe('Alice N.');
  });

  it('без syncEstimates не дергает трекер, но выравнивает локальные очки', () => {
    const task = { id: 'NW-1', storyPoints: 3 } as Task;
    const tasksMap = new Map<string, Task>([['NW-1', task]]);
    const position: TaskPosition = {
      assignee: 'Bob',
      duration: 6,
      startDay: 0,
      startPart: 0,
      taskId: 'NW-1',
    };
    let nextTasks: Task[] = [task];

    reconcileTasksAfterPlanHistoryStep(
      { saves: [{ isQa: false, position }] },
      { developers: [], syncEstimates: false, tasksMap },
      (updater) => {
        nextTasks = typeof updater === 'function' ? updater(nextTasks) : updater;
      }
    );

    expect(mockUpdateIssue).not.toHaveBeenCalled();
    expect(nextTasks[0]?.storyPoints).toBe(8);
  });

  it('обновляет qaEngineer на dev-задаче по фазе QA', () => {
    const devTask = {
      id: 'NW-1',
      qaEngineer: 'Old',
      storyPoints: 5,
      testPoints: 5,
    } as Task;
    const qaTask = {
      id: 'NW-1-qa',
      originalTaskId: 'NW-1',
      team: 'QA',
      testPoints: 5,
    } as Task;
    const tasksMap = new Map<string, Task>([
      ['NW-1', devTask],
      ['NW-1-qa', qaTask],
    ]);
    const position: TaskPosition = {
      assignee: 'QA-Dev',
      duration: 5,
      startDay: 0,
      startPart: 0,
      taskId: 'NW-1-qa',
    };
    let nextTasks: Task[] = [devTask, qaTask];

    reconcileTasksAfterPlanHistoryStep(
      { saves: [{ devTaskKey: 'NW-1', isQa: true, position }] },
      {
        developers: [{ id: 'QA-Dev', name: 'Pat', role: 'tester' as const }],
        syncEstimates: false,
        tasksMap,
      },
      (updater) => {
        nextTasks = typeof updater === 'function' ? updater(nextTasks) : updater;
      }
    );

    const updatedDev = nextTasks.find((t) => t.id === 'NW-1');
    expect(updatedDev?.qaEngineer).toBe('QA-Dev');
    expect(updatedDev?.qaEngineerName).toBe('Pat');
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });
});
