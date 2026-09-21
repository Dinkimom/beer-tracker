import { describe, expect, it } from 'vitest';

import {
  isIssueSnapshotStoredEnvelope,
  issueFieldsFromStoredSnapshot,
  unwrapIssueSnapshotPayload,
  wrapIssueSnapshotForStorage,
} from './snapshotEnvelope';

describe('snapshotEnvelope', () => {
  it('wraps issue payload with provider metadata', () => {
    const envelope = wrapIssueSnapshotForStorage('yandex-tracker', {
      key: 'BT-1',
      summary: 'Task',
    });

    expect(envelope).toEqual({
      payload: { key: 'BT-1', summary: 'Task' },
      provider: 'yandex-tracker',
      schemaVersion: 1,
    });
    expect(isIssueSnapshotStoredEnvelope(envelope)).toBe(true);
  });

  it('unwraps envelope payload', () => {
    const envelope = wrapIssueSnapshotForStorage('jira', { key: 'JIRA-1' });
    expect(unwrapIssueSnapshotPayload(envelope)).toEqual({
      payload: { key: 'JIRA-1' },
      provider: 'jira',
    });
  });

  it('treats legacy flat payload as default provider issue', () => {
    const legacy = { key: 'BT-LEGACY', summary: 'Old row' };
    expect(unwrapIssueSnapshotPayload(legacy)).toEqual({
      payload: legacy,
      provider: 'yandex-tracker',
    });
    expect(isIssueSnapshotStoredEnvelope(legacy)).toBe(false);
  });

  it('returns inner issue fields for both envelope and legacy payload', () => {
    const issue = { key: 'BT-1', summary: 'Task' };
    expect(issueFieldsFromStoredSnapshot(issue)).toEqual(issue);
    expect(
      issueFieldsFromStoredSnapshot(wrapIssueSnapshotForStorage('yandex-tracker', issue))
    ).toEqual(issue);
  });
});
