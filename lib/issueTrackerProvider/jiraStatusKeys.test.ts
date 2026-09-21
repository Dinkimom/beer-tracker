import { describe, expect, it } from 'vitest';

import { jiraNameKey, mapJiraStatus, mapJiraStatusCategory } from './jiraStatusKeys';

describe('jiraNameKey', () => {
  it('lowercases and strips spaces', () => {
    expect(jiraNameKey('In Progress')).toBe('inprogress');
    expect(jiraNameKey('To Do')).toBe('todo');
  });
});

describe('mapJiraStatusCategory', () => {
  it('maps Jira categories onto app status keys', () => {
    expect(mapJiraStatusCategory({ key: 'done', name: 'Done' })).toEqual({
      display: 'Done',
      key: 'done',
    });
    expect(mapJiraStatusCategory({ key: 'indeterminate' })).toEqual({
      display: 'In Progress',
      key: 'inProgress',
    });
    expect(mapJiraStatusCategory({ key: 'new', name: 'To Do' })).toEqual({
      display: 'To Do',
      key: 'new',
    });
  });
});

describe('mapJiraStatus', () => {
  it('prefers status name for kanban matching and keeps category for palette', () => {
    expect(
      mapJiraStatus({ name: 'In Progress', statusCategory: { key: 'indeterminate' } })
    ).toEqual({ display: 'In Progress', key: 'inprogress', statusTypeKey: 'inProgress' });
    expect(mapJiraStatus({ name: 'Open', statusCategory: { key: 'new' } })).toEqual({
      display: 'Open',
      key: 'open',
      statusTypeKey: 'new',
    });
    expect(
      mapJiraStatus({ name: 'Тестирование', statusCategory: { key: 'indeterminate' } })
    ).toEqual({
      display: 'Тестирование',
      key: 'тестирование',
      statusTypeKey: 'inProgress',
    });
  });

  it('falls back to category when name is missing', () => {
    expect(mapJiraStatus({ statusCategory: { key: 'done' } })).toEqual({
      display: 'Done',
      key: 'done',
      statusTypeKey: 'done',
    });
  });
});
