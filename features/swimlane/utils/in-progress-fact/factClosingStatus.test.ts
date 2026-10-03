import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  doneFactStatusKeysFromTasks,
  isClosingFactStatusKey,
} from './factClosingStatus';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    ...partial,
    id: partial.id,
    link: partial.link ?? '',
    name: partial.name ?? partial.id,
    team: partial.team ?? 'Web',
  };
}

describe('isClosingFactStatusKey', () => {
  it('keeps the Tracker closed marker and ignores release-candidate', () => {
    expect(isClosingFactStatusKey('closed')).toBe(true);
    expect(isClosingFactStatusKey(' Closed ')).toBe(true);
    expect(isClosingFactStatusKey('rc')).toBe(false);
    expect(isClosingFactStatusKey('inProgress')).toBe(false);
  });

  it('treats Jira done-category names as the close marker', () => {
    expect(isClosingFactStatusKey('done')).toBe(true);
    expect(isClosingFactStatusKey('Done')).toBe(true);
    expect(isClosingFactStatusKey('resolved')).toBe(true);
    expect(isClosingFactStatusKey('готово')).toBe(true);
    expect(isClosingFactStatusKey('закрыто')).toBe(true);
  });

  it('accepts a custom Jira status that the sprint already classifies as done', () => {
    const keys = doneFactStatusKeysFromTasks([
      task({
        id: 'PROJ-1',
        originalStatus: 'releasedtoprod',
        status: 'done',
        statusTypeKey: 'done',
      }),
      task({ id: 'PROJ-2', originalStatus: 'inprogress', status: 'in-progress' }),
    ]);
    expect(keys.has('releasedtoprod')).toBe(true);
    expect(keys.has('inprogress')).toBe(false);
    expect(isClosingFactStatusKey('releasedtoprod', keys)).toBe(true);
    expect(isClosingFactStatusKey('releasedtoprod')).toBe(false);
  });
});
