import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildContextMenuParentOptions,
  contextMenuParentMatchesQuery,
  formatContextMenuParentLabel,
  hasLocalContextMenuParentMatch,
  resolveContextMenuCurrentParentLabel,
  resolveTaskParentForMenu,
  taskParentFromIssueSearchItem,
} from './buildContextMenuParentOptions';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    link: '#',
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

describe('buildContextMenuParentOptions', () => {
  it('includes unique sprint parents and current parent if missing', () => {
    const current = task({
      id: 'T-1',
      name: 'Current',
      parent: { display: 'Orphan Parent', id: '9', key: 'OR-9' },
    });
    const options = buildContextMenuParentOptions(
      [
        task({
          id: 'T-2',
          name: 'Other',
          parent: { display: 'Story A', id: '1', key: 'ST-1' },
        }),
      ],
      current
    );

    expect(options.map((p) => p.key).sort()).toEqual(['OR-9', 'ST-1']);
  });

  it('resolveTaskParentForMenu prefers parent over epic', () => {
    expect(
      resolveTaskParentForMenu(
        task({
          id: 'T-1',
          name: 'A',
          epic: { display: 'Epic', id: 'e', key: 'EP-1' },
          parent: { display: 'Story', id: 's', key: 'ST-1' },
        })
      )
    ).toEqual({ display: 'Story', id: 's', key: 'ST-1' });
  });

  it('formatContextMenuParentLabel joins key and display', () => {
    expect(
      formatContextMenuParentLabel({ display: 'Story One', id: '1', key: 'ST-1' })
    ).toBe('ST-1 — Story One');
  });

  it('formatContextMenuParentLabel shows only the draft feature name', () => {
    expect(
      formatContextMenuParentLabel({
        display: 'Пупи',
        id: 'feature-draft:44e9e359-5402-4d8d-af89-4',
        key: 'feature-draft:44e9e359-5402-4d8d-af89-4',
      })
    ).toBe('Пупи');
  });

  it('does not show a raw feature-draft id as the parent label', () => {
    expect(
      formatContextMenuParentLabel({
        display: 'feature-draft:44e9e359-5402-4d8d-af89-4',
        id: 'feature-draft:44e9e359-5402-4d8d-af89-4',
        key: 'feature-draft:44e9e359-5402-4d8d-af89-4',
      })
    ).toBe('');
  });

  it('resolveTaskParentForMenu keeps the draft display name and not the row id', () => {
    expect(
      resolveTaskParentForMenu(
        task({
          id: 'comment:1',
          name: 'Note',
          parent: {
            display: 'Пупи',
            id: 'feature-draft:44e9e359-5402-4d8d-af89-4',
            key: 'feature-draft:44e9e359-5402-4d8d-af89-4',
          },
        })
      )
    ).toEqual({
      display: 'Пупи',
      id: 'feature-draft:44e9e359-5402-4d8d-af89-4',
      key: 'feature-draft:44e9e359-5402-4d8d-af89-4',
    });
  });

  it('does not add a nameless feature-draft parent to menu options', () => {
    const current = task({
      id: 'comment:1',
      name: 'Note',
      parent: {
        display: 'feature-draft:1',
        id: 'feature-draft:1',
        key: 'feature-draft:1',
      },
    });
    expect(buildContextMenuParentOptions([], current)).toEqual([]);
  });

  it('resolves a draft parent label from sprint options when the task only has the row id', () => {
    expect(
      resolveContextMenuCurrentParentLabel(
        task({
          id: 'comment:1',
          name: 'Note',
          parent: {
            display: 'feature-draft:1',
            id: 'feature-draft:1',
            key: 'feature-draft:1',
          },
        }),
        [{ display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' }]
      )
    ).toBe('Пупи');
  });

  it('matches parents by key or display for local search', () => {
    const parent = { display: 'Story One', id: '1', key: 'ST-1' };
    expect(contextMenuParentMatchesQuery(parent, 'story')).toBe(true);
    expect(contextMenuParentMatchesQuery(parent, 'st-1')).toBe(true);
    expect(contextMenuParentMatchesQuery(parent, 'missing')).toBe(false);
    expect(hasLocalContextMenuParentMatch([parent], 'CM-999')).toBe(false);
    expect(hasLocalContextMenuParentMatch([parent], 'ST-1')).toBe(true);
  });

  it('maps issue search items to TaskParent', () => {
    expect(taskParentFromIssueSearchItem({ key: 'CM-1', summary: 'Remote story' })).toEqual({
      display: 'Remote story',
      id: 'CM-1',
      key: 'CM-1',
    });
  });
});
