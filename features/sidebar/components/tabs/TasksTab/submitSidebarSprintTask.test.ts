import type { Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';
import { addIssueToSprint, createIssue } from '@/lib/api/issues';

import {
  submitSidebarCreatedSprintTask,
  submitSidebarExistingSprintTask,
} from './submitSidebarSprintTask';

vi.mock('@/features/task/hooks/useTasks', () => ({
  upsertSprintTaskInQueries: vi.fn(),
}));

vi.mock('@/lib/api/issues', () => ({
  addIssueToSprint: vi.fn(),
  createIssue: vi.fn(),
}));

const addIssueToSprintMock = vi.mocked(addIssueToSprint);
const createIssueMock = vi.mocked(createIssue);
const upsertSprintTaskInQueriesMock = vi.mocked(upsertSprintTaskInQueries);

const queryClient = {} as QueryClient;

function makeTask(id: string): Task {
  return { id, name: `Task ${id}` } as Task;
}

describe('submitSidebarExistingSprintTask', () => {
  beforeEach(() => {
    addIssueToSprintMock.mockReset();
    upsertSprintTaskInQueriesMock.mockReset();
  });

  it('adds the issue to the sprint and upserts local + query state', async () => {
    const task = makeTask('ABC-1');
    const onUpserted = vi.fn();
    addIssueToSprintMock.mockResolvedValue(true);

    const result = await submitSidebarExistingSprintTask({
      createFailedMessage: 'failed',
      onUpserted,
      queryClient,
      selectedSprintId: 10,
      selectedTask: task,
    });

    expect(result).toEqual({ ok: true, issueKey: 'ABC-1', task });
    expect(addIssueToSprintMock).toHaveBeenCalledWith('ABC-1', 10);
    expect(upsertSprintTaskInQueriesMock).toHaveBeenCalledWith(queryClient, 10, task);
    expect(onUpserted).toHaveBeenCalledWith(task);
  });

  it('returns an error when addIssueToSprint fails', async () => {
    addIssueToSprintMock.mockResolvedValue(false);
    const onUpserted = vi.fn();

    const result = await submitSidebarExistingSprintTask({
      createFailedMessage: 'failed',
      onUpserted,
      queryClient,
      selectedSprintId: 10,
      selectedTask: makeTask('ABC-1'),
    });

    expect(result).toEqual({ ok: false, error: 'failed' });
    expect(onUpserted).not.toHaveBeenCalled();
    expect(upsertSprintTaskInQueriesMock).not.toHaveBeenCalled();
  });
});

describe('submitSidebarCreatedSprintTask', () => {
  beforeEach(() => {
    createIssueMock.mockReset();
    upsertSprintTaskInQueriesMock.mockReset();
  });

  it('creates an issue in the sprint and upserts local + query state', async () => {
    const createdTask = makeTask('ABC-2');
    const onUpserted = vi.fn();
    createIssueMock.mockResolvedValue({
      success: true,
      key: 'ABC-2',
      task: createdTask,
    });

    const result = await submitSidebarCreatedSprintTask({
      createFailedMessage: 'create failed',
      issueType: 'task',
      missingQueueMessage: 'no queue',
      onUpserted,
      queryClient,
      queueKey: 'QUEUE',
      selectedSprintId: 10,
      summary: 'New task',
    });

    expect(result).toEqual({ ok: true, issueKey: 'ABC-2', task: createdTask });
    expect(createIssueMock).toHaveBeenCalledWith({
      summary: 'New task',
      queue: 'QUEUE',
      sprintId: 10,
      type: 'task',
    });
    expect(upsertSprintTaskInQueriesMock).toHaveBeenCalledWith(queryClient, 10, createdTask);
    expect(onUpserted).toHaveBeenCalledWith(createdTask);
  });

  it('returns missingQueueMessage when queue is empty', async () => {
    const onUpserted = vi.fn();

    const result = await submitSidebarCreatedSprintTask({
      createFailedMessage: 'create failed',
      issueType: 'task',
      missingQueueMessage: 'no queue',
      onUpserted,
      queryClient,
      queueKey: '  ',
      selectedSprintId: 10,
      summary: 'New task',
    });

    expect(result).toEqual({ ok: false, error: 'no queue' });
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(onUpserted).not.toHaveBeenCalled();
  });
});
