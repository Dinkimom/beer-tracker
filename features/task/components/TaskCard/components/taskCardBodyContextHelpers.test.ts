import type { Developer, Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { resolveTaskCardBodyContext } from './taskCardBodyContextHelpers';

const t = (key: string) => key;

const developers: Developer[] = [{ id: 'dev-1', name: 'Елена Шилова', role: 'developer' }];

function task(partial: Partial<Task> = {}): Task {
  return {
    id: 't1',
    link: '',
    name: 'Task',
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

function context(input: { assigneeName?: string; task: Task }) {
  return resolveTaskCardBodyContext({
    assigneeName: input.assigneeName,
    developers,
    displayDuration: 3,
    t,
    task: input.task,
    variant: 'swimlane',
  });
}

describe('resolveTaskCardBodyContext assignee display name', () => {
  it('uses the person name when the swimlane row id is passed as assigneeName', () => {
    const result = context({
      assigneeName: 'feature-draft:lwd7ec931-dlfe-4990-9',
      task: task({
        assignee: 'dev-1',
        localDraftKind: 'comment',
        parent: {
          display: 'feature-draft:lwd7ec931-dlfe-4990-9',
          id: 'feature-draft:lwd7ec931-dlfe-4990-9',
          key: 'feature-draft:lwd7ec931-dlfe-4990-9',
        },
      }),
    });
    expect(result.assigneeDisplayName).toBe('Елена Шилова');
  });

  it('does not show the parent title as the assignee', () => {
    const result = context({
      assigneeName: 'Миграция платформы',
      task: task({
        assignee: 'dev-1',
        parent: { display: 'Миграция платформы', id: 'ST-9', key: 'ST-9' },
      }),
    });
    expect(result.assigneeDisplayName).toBe('Елена Шилова');
  });

  it('hides a draft row id when there is no person', () => {
    const result = context({
      assigneeName: 'feature-draft:abc',
      task: task({
        localDraftKind: 'comment',
        parent: { display: 'feature-draft:abc', id: 'feature-draft:abc', key: 'feature-draft:abc' },
      }),
    });
    expect(result.assigneeDisplayName).toBeUndefined();
  });

  it('falls back to the note author when the assignee is not in developers', () => {
    const result = context({
      assigneeName: 'feature-draft:abc',
      task: task({
        assignee: 'missing-dev',
        localDraftKind: 'comment',
        parent: { display: 'Story', id: 's1', key: 'ST-1' },
        stickyNoteAuthorName: 'Иван Иванов',
      }),
    });
    expect(result.assigneeDisplayName).toBe('Иван Иванов');
  });
});
