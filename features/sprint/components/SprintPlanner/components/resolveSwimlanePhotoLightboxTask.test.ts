import type { Comment, Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { resolveSwimlanePhotoLightboxTask } from './resolveSwimlanePhotoLightboxTask';

function photoComment(overrides: Partial<Comment> = {}): Comment {
  return {
    assigneeId: 'dev-1',
    day: 0,
    height: 1,
    id: 'c1',
    imageUrl: '/api/sprints/1/comments/c1/image',
    kind: 'image',
    part: 0,
    text: 'Caption',
    width: 1,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function localPhotoTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'local-task-1',
    imageUrl: 'blob:draft',
    isLocalTask: true,
    link: '#',
    localDraftKind: 'image',
    name: 'Draft',
    team: 'Back',
    ...overrides,
  };
}

describe('resolveSwimlanePhotoLightboxTask', () => {
  it('resolves saved comment photos from comments, not sprintTasks', () => {
    const task = resolveSwimlanePhotoLightboxTask('comment:c1', {
      comments: [photoComment()],
      sprintTasks: [],
    });

    expect(task?.id).toBe('comment:c1');
    expect(task?.imageUrl).toBe('/api/sprints/1/comments/c1/image');
    expect(task?.name).toBe('Caption');
  });

  it('resolves local photo drafts from sprintTasks', () => {
    const draft = localPhotoTask();
    const task = resolveSwimlanePhotoLightboxTask(draft.id, {
      comments: [],
      sprintTasks: [draft],
    });

    expect(task).toEqual(draft);
  });

  it('prefers tasksMap when it already contains the photo task', () => {
    const mapped = localPhotoTask({ id: 'local-task-2', name: 'From map' });
    const task = resolveSwimlanePhotoLightboxTask(mapped.id, {
      comments: [],
      sprintTasks: [],
      tasksMap: new Map([[mapped.id, mapped]]),
    });

    expect(task?.name).toBe('From map');
  });
});
