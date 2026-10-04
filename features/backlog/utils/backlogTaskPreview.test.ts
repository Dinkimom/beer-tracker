import { describe, expect, it } from 'vitest';

import {
  backlogSectionCountKey,
  backlogTaskPreviewResetKey,
  previewBacklogTasks,
} from './backlogTaskPreview';

describe('previewBacklogTasks', () => {
  const tasks = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('keeps the first five until the list is opened', () => {
    expect(previewBacklogTasks(tasks, false)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns every task once the list is opened', () => {
    expect(previewBacklogTasks(tasks, true)).toBe(tasks);
  });

  it('does not truncate a short list', () => {
    const short = ['a', 'b'];
    expect(previewBacklogTasks(short, false)).toBe(short);
  });
});

describe('backlogSectionCountKey', () => {
  it('names a trimmed list as visible out of the sprint total', () => {
    expect(backlogSectionCountKey(5, 39)).toEqual({
      key: 'backlog.section.visibleCount',
      params: { total: 39, visible: 5 },
    });
  });

  it('uses the plain count when every task is on screen', () => {
    expect(backlogSectionCountKey(7, 7)).toEqual({
      key: 'backlog.section.taskCount',
      params: { count: 7 },
    });
  });
});

describe('backlogTaskPreviewResetKey', () => {
  it('changes when another person is selected', () => {
    const base = { assigneeIds: new Set<string>(), nameFilter: '', statusFilter: 'all' };
    expect(backlogTaskPreviewResetKey(base)).not.toBe(
      backlogTaskPreviewResetKey({ ...base, assigneeIds: new Set(['user-1']) })
    );
  });
});
