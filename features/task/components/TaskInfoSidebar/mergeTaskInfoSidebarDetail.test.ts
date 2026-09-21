import type { IssueResponse, Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { mergeTaskInfoSidebarDetail } from './mergeTaskInfoSidebarDetail';

const listTask: Task = {
  id: 'VER-1',
  name: 'Task',
  team: 'Back',
  link: 'https://tracker.yandex.ru/VER-1',
  createdAt: '2026-08-01T00:00:00.000+0000',
};

const detail: IssueResponse = {
  checklistDone: 0,
  checklistItems: [],
  checklistTotal: 0,
  createdAt: '2026-08-01T00:00:00.000+0000',
  description: 'From detail',
  key: 'VER-1',
  originalStatus: 'open',
  resolvedAt: '2026-08-21T00:00:00.000+0000',
  status: null,
  statusKey: 'open',
  summary: 'Task',
  updatedAt: '2026-08-20T00:00:00.000+0000',
};

describe('mergeTaskInfoSidebarDetail', () => {
  it('keeps the list task until detail has been fetched', () => {
    expect(mergeTaskInfoSidebarDetail(listTask, detail, false).description).toBeUndefined();
  });

  it('fills description and timestamps from the issue payload', () => {
    const merged = mergeTaskInfoSidebarDetail(listTask, detail, true);
    expect(merged.description).toBe('From detail');
    expect(merged.updatedAt).toBe('2026-08-20T00:00:00.000+0000');
    expect(merged.resolvedAt).toBe('2026-08-21T00:00:00.000+0000');
    expect(merged.createdAt).toBe('2026-08-01T00:00:00.000+0000');
  });

  it('treats a missing detail payload as an empty description', () => {
    expect(mergeTaskInfoSidebarDetail(listTask, null, true).description).toBe('');
  });

  it('keeps a locally saved description over stale detail cache', () => {
    const local = { ...listTask, description: 'Saved locally' };
    expect(mergeTaskInfoSidebarDetail(local, detail, true).description).toBe('Saved locally');
  });

  it('keeps an empty locally saved description instead of filling from detail', () => {
    const local = { ...listTask, description: '' };
    expect(mergeTaskInfoSidebarDetail(local, detail, true).description).toBe('');
  });
});
