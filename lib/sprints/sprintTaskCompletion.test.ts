import { describe, expect, it } from 'vitest';

import {
  isStatusKeyCompleted,
  isTaskCompleted,
  sprintTaskCompletionRulesFromStatuses,
  statusTypeKeyForStatus,
} from './sprintTaskCompletion';

const statuses = [
  { id: '1', key: 'open', statusType: { key: 'new' } },
  { id: '2', key: 'inProgress', statusType: { key: 'inProgress' } },
  { id: '3', key: 'rc', statusType: { key: 'inProgress' } },
  { id: '4', key: 'closed', statusType: { key: 'done' } },
  { id: '5', key: 'readyForDev', statusType: { key: 'new' } },
];

const tracker = sprintTaskCompletionRulesFromStatuses('tracker', statuses);
const jira = sprintTaskCompletionRulesFromStatuses('jira-cloud', statuses);

describe('isTaskCompleted', () => {
  it('requires status type done and a resolution in Yandex Tracker', () => {
    expect(isTaskCompleted({ resolution: 'fixed', statusTypeKey: 'done' }, tracker)).toBe(true);
    expect(isTaskCompleted({ statusTypeKey: 'done' }, tracker)).toBe(false);
    expect(isTaskCompleted({ resolution: 'fixed', statusTypeKey: 'inProgress' }, tracker)).toBe(false);
  });

  it('needs only the done status category in Jira', () => {
    expect(isTaskCompleted({ statusTypeKey: 'done' }, jira)).toBe(true);
    expect(isTaskCompleted({ statusTypeKey: 'inProgress' }, jira)).toBe(false);
  });

  it('ignores status names: rc and «готово» are not done unless their type is', () => {
    expect(isTaskCompleted({ originalStatus: 'rc', resolution: 'fixed' }, tracker)).toBe(false);
    expect(isTaskCompleted({ originalStatus: 'готово', statusTypeKey: 'inProgress' }, jira)).toBe(false);
  });

  it('falls back to the status catalog by key or id when the task has no type', () => {
    expect(isTaskCompleted({ originalStatus: 'closed', resolution: 'fixed' }, tracker)).toBe(true);
    expect(isTaskCompleted({ originalStatusId: '4' }, jira)).toBe(true);
    expect(isTaskCompleted({ originalStatus: 'unknown' }, jira)).toBe(false);
  });

  it('without rules checks the type only', () => {
    expect(isTaskCompleted({ statusTypeKey: 'done' }, null)).toBe(true);
    expect(isTaskCompleted({ originalStatus: 'closed' }, null)).toBe(false);
  });
});

describe('isStatusKeyCompleted (changelog replay)', () => {
  it('resolves the type from the catalog, case-insensitively', () => {
    expect(isStatusKeyCompleted('closed', tracker)).toBe(true);
    expect(isStatusKeyCompleted('Closed', tracker)).toBe(true);
    expect(isStatusKeyCompleted('rc', tracker)).toBe(false);
    expect(isStatusKeyCompleted('readyForDev', tracker)).toBe(false);
  });

  it('is false for empty or unknown keys', () => {
    expect(isStatusKeyCompleted('', tracker)).toBe(false);
    expect(isStatusKeyCompleted(undefined, tracker)).toBe(false);
    expect(isStatusKeyCompleted('closed', null)).toBe(false);
  });
});

describe('statusTypeKeyForStatus', () => {
  it('returns the normalized type for optimistic updates', () => {
    expect(statusTypeKeyForStatus('inProgress', tracker)).toBe('inprogress');
    expect(statusTypeKeyForStatus('closed', tracker)).toBe('done');
    expect(statusTypeKeyForStatus('missing', tracker)).toBeUndefined();
  });
});
