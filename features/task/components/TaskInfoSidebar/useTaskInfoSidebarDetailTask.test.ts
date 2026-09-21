import type { IssueResponse } from '@/types';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  applyTaskInfoSavedFields,
  issueDetailQueryKey,
  patchIssueDetailQueryFields,
} from './useTaskInfoSidebarDetailTask';

const listTask = {
  id: 'VER-1',
  name: 'Task',
  team: 'Back' as const,
  link: 'https://tracker.yandex.ru/VER-1',
};

const detail: IssueResponse = {
  checklistDone: 0,
  checklistItems: [],
  checklistTotal: 0,
  description: 'From detail',
  key: 'VER-1',
  originalStatus: 'open',
  status: null,
  statusKey: 'open',
  summary: 'Task',
};

describe('applyTaskInfoSavedFields', () => {
  it('returns the same task when nothing was saved', () => {
    expect(applyTaskInfoSavedFields(listTask, {})).toBe(listTask);
  });

  it('overlays a saved description onto the merged task', () => {
    expect(applyTaskInfoSavedFields(listTask, { description: 'Saved' }).description).toBe('Saved');
  });

  it('overlays a saved title onto the merged task', () => {
    expect(applyTaskInfoSavedFields(listTask, { name: 'New title' }).name).toBe('New title');
  });
});

describe('patchIssueDetailQueryFields', () => {
  it('updates description and summary in the issue-detail cache', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(issueDetailQueryKey('VER-1'), detail);

    patchIssueDetailQueryFields(queryClient, 'VER-1', {
      description: 'Saved locally',
      name: 'New title',
    });

    expect(queryClient.getQueryData<IssueResponse>(issueDetailQueryKey('VER-1'))).toMatchObject({
      description: 'Saved locally',
      summary: 'New title',
    });
  });

  it('does nothing when the issue-detail cache is empty', () => {
    const queryClient = new QueryClient();
    patchIssueDetailQueryFields(queryClient, 'VER-1', { description: 'Saved locally' });
    expect(queryClient.getQueryData(issueDetailQueryKey('VER-1'))).toBeUndefined();
  });
});
