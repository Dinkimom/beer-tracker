import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleApiError } from '@/lib/api-error-handler';

import { UnsupportedIssueTrackerOperationError } from '../errors';
import { createJiraProviderClient, JIRA_IMPLEMENTED_PROVIDER_METHODS } from '../jiraProvider';
import { createYandexProviderClient } from '../yandexTrackerProvider';

import {
  ISSUE_TRACKER_PROVIDER_CLIENT_METHODS,
  ISSUE_TRACKER_PROVIDER_CLIENT_METHODS_EXHAUSTIVE,
} from './issueTrackerProviderClientMethodCatalog';

describe('IssueTrackerProviderClient surface contract', () => {
  it('keeps the method catalog exhaustive for TypeScript', () => {
    expect(ISSUE_TRACKER_PROVIDER_CLIENT_METHODS_EXHAUSTIVE).toBe(true);
  });

  it('implements every catalogued method on the Yandex client', () => {
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const methods = Object.entries(client)
      .filter(([, value]) => typeof value === 'function')
      .map(([key]) => key);
    expect(methods.sort()).toEqual([...ISSUE_TRACKER_PROVIDER_CLIENT_METHODS].sort());
  });

  it('carries the tracker kind and issue web base on the client', () => {
    const yandex = createYandexProviderClient({ oauthToken: 'token-1', orgId: 'org-1' });
    expect(yandex.providerKind).toBe('tracker');
    expect(yandex.webBaseUrl).toBe('https://tracker.yandex.ru');

    const jira = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
      kind: 'jira-onprem',
      webBaseUrl: 'https://jira.example.com',
    });
    expect(jira.providerKind).toBe('jira-onprem');
    expect(jira.webBaseUrl).toBe('https://jira.example.com');
  });

  it('rejects unimplemented catalogued methods on the Jira adapter', async () => {
    const client = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
      kind: 'jira-cloud',
      webBaseUrl: 'https://example.atlassian.net',
    });

    for (const method of ISSUE_TRACKER_PROVIDER_CLIENT_METHODS) {
      if ((JIRA_IMPLEMENTED_PROVIDER_METHODS as readonly string[]).includes(method)) {
        continue;
      }
      const impl = client[method] as (...args: never[]) => unknown;
      await expect(Promise.resolve(impl('BT-1' as never, 'x' as never, {} as never))).rejects.toMatchObject({
        operation: method,
        providerKind: 'jira',
        status: 422,
      });
    }
  });

  it('implements getIssue, transitions, updateIssue, listSprints and searchUsers on the Jira adapter', async () => {
    const client = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
      kind: 'jira-cloud',
      webBaseUrl: 'https://example.atlassian.net',
    });
    await expect(client.searchUsers('a')).resolves.toEqual([]);
    expect(typeof client.getCurrentUser).toBe('function');
    expect(typeof client.getIssue).toBe('function');
    expect(typeof client.getIssueTransitions).toBe('function');
    expect(typeof client.getQueue).toBe('function');
    expect(typeof client.getQueueWorkflowScreens).toBe('function');
    expect(typeof client.getQueueWorkflows).toBe('function');
    expect(typeof client.getTransitionFields).toBe('function');
    expect(typeof client.listIssueTransitionsBatch).toBe('function');
    expect(typeof client.updateIssue).toBe('function');
    expect(typeof client.listSprints).toBe('function');
    expect(typeof client.listSprintIssues).toBe('function');
    expect(typeof client.mapIssueToTask).toBe('function');
    expect(typeof client.searchIssuesOnBoard).toBe('function');
    expect(typeof client.transitionIssue).toBe('function');
  });

  it('is not thenable so async factories can return the client', async () => {
    const client = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
      kind: 'jira-cloud',
      webBaseUrl: 'https://example.atlassian.net',
    });
    expect(Reflect.get(client, 'then')).toBeUndefined();
    await expect(Promise.resolve(client)).resolves.toBe(client);
  });
});

describe('unsupported tracker operation HTTP contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 422 with issue_tracker_unsupported_operation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = handleApiError(
      new UnsupportedIssueTrackerOperationError('listBoards', 'jira'),
      'fetch boards'
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      code: 'issue_tracker_unsupported_operation',
      error: 'Issue tracker provider "jira" does not support "listBoards" yet.',
      operation: 'listBoards',
      provider: 'jira',
    });
  });
});
