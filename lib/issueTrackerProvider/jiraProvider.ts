import type { IssueTrackerProviderClient } from './types';
import type { JiraIssueTrackerProvider, JiraTrackerClientConfig } from './types';
import type { AxiosInstance } from 'axios';

import { getIssueTrackerProviderKind } from '@/lib/env';
import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

import { UnsupportedIssueTrackerOperationError } from './errors';
import { createJiraAxiosInstance } from './jiraAxios';
import { fetchJiraBoardParams } from './jiraBoardParams';
import { fetchJiraBoardsForCatalog, fetchJiraProjectsAsQueues } from './jiraCatalog';
import {
  addJiraIssueComment,
  fetchJiraBurndownIssuesForKeys,
  fetchJiraIssueChangelogWithComments,
  fetchJiraIssuesChangelogBatch,
} from './jiraChangelog';
import { createJiraIssue } from './jiraIssueCreate';
import { listJiraIssuesForBoard, listJiraIssuesForQueue, listJiraIssuesUpdatedInRange } from './jiraIssueList';
import { fetchJiraIssue, normalizeJiraIssue, searchJiraIssuesInSprint } from './jiraIssues';
import { searchJiraIssuesOnBoard } from './jiraIssueSearch';
import {
  addJiraIssueToSprint,
  removeJiraIssueFromSprint,
  replaceJiraIssueSprints,
} from './jiraIssueSprintMembership';
import { updateJiraIssue } from './jiraIssueUpdate';
import { fetchJiraCurrentUser } from './jiraMyself';
import { fetchJiraQueueByKey, fetchJiraQueueWorkflows, searchJiraQueues } from './jiraQueues';
import { createJiraSprint, fetchJiraSprintInfo, listJiraSprints, updateJiraSprintStatus } from './jiraSprints';
import {
  fetchJiraIssueTransitions,
  fetchJiraIssueTransitionsBatch,
  fetchJiraQueueWorkflowScreens,
  fetchJiraTransitionFields,
  transitionJiraIssue,
} from './jiraTransitions';
import { searchJiraUsers } from './jiraUserSearch';
import { mapIssueTrackerIssueToTask } from './mapIssueTrackerIssueToTask';

const JIRA_PROVIDER_KIND = 'jira' as const;

export const JIRA_IMPLEMENTED_PROVIDER_METHODS = [
  'addIssueComment',
  'addIssueToSprint',
  'createIssue',
  'createSprint',
  'getBoard',
  'getBurndownIssuesForKeys',
  'getCurrentUser',
  'getIssue',
  'getIssueChangelogWithComments',
  'getIssuesChangelogBatch',
  'getIssueTransitions',
  'getQueue',
  'getQueueWorkflowScreens',
  'getQueueWorkflows',
  'getSprint',
  'getTasksInSprintWithParents',
  'getTransitionFields',
  'listBoards',
  'listIssueTransitionsBatch',
  'listIssuesForBoard',
  'listIssuesForQueue',
  'listIssuesUpdatedInRange',
  'listQueues',
  'listSprintIssues',
  'listSprints',
  'mapIssueToTask',
  'removeIssueFromSprint',
  'replaceIssueSprints',
  'searchIssuesOnBoard',
  'searchQueues',
  'searchUsers',
  'transitionIssue',
  'updateIssue',
  'updateSprintStatus',
] as const satisfies ReadonlyArray<keyof IssueTrackerProviderClient>;

/** Иначе `return proxy` из async-функции ждёт `.then` и валит клиент как thenable. */
const JIRA_PROXY_PASSTHROUGH = new Set(['catch', 'finally', 'then']);

function createJiraClientProxy(
  implemented: Partial<IssueTrackerProviderClient>
): IssueTrackerProviderClient {
  const client = {} as IssueTrackerProviderClient;
  return new Proxy(client, {
    get(_target, prop) {
      if (typeof prop !== 'string' || JIRA_PROXY_PASSTHROUGH.has(prop)) {
        return undefined;
      }
      const method = implemented[prop as keyof IssueTrackerProviderClient];
      if (typeof method === 'function') {
        return method;
      }
      return (..._args: unknown[]) =>
        Promise.reject(new UnsupportedIssueTrackerOperationError(prop, JIRA_PROVIDER_KIND));
    },
  });
}

export function createJiraUnsupportedProviderClient(): IssueTrackerProviderClient {
  return createJiraClientProxy({});
}

async function listNormalizedJiraSprintIssues(
  api: AxiosInstance,
  sprintId: number,
  cacheOnly?: boolean
) {
  if (cacheOnly) {
    return [];
  }
  const issues = await searchJiraIssuesInSprint(api, sprintId);
  return issues.map(normalizeJiraIssue);
}

function createJiraProviderClientWithApi(api: AxiosInstance): IssueTrackerProviderClient {
  return createJiraClientProxy({
    addIssueComment: (issueKey, text) => addJiraIssueComment(api, issueKey, text),
    addIssueToSprint: (issueKey: string, sprintId: number) =>
      addJiraIssueToSprint(api, issueKey, sprintId),
    createIssue: (input) => createJiraIssue(api, input),
    createSprint: (input) => createJiraSprint(api, input),
    getBurndownIssuesForKeys: (issueKeys, sprint, issueByKey) =>
      fetchJiraBurndownIssuesForKeys(api, issueKeys, sprint, issueByKey),
    getBoard: (boardId) => fetchJiraBoardParams(api, boardId),
    getCurrentUser: () => fetchJiraCurrentUser(api),
    getIssue: (issueKey: string) => fetchJiraIssue(api, issueKey),
    getIssueChangelogWithComments: (issueKey) =>
      fetchJiraIssueChangelogWithComments(api, issueKey),
    getIssuesChangelogBatch: (issueKeys) => fetchJiraIssuesChangelogBatch(api, issueKeys),
    getIssueTransitions: (issueKey: string) => fetchJiraIssueTransitions(api, issueKey),
    getQueue: (queueKey: string) => fetchJiraQueueByKey(api, queueKey),
    getQueueWorkflowScreens: fetchJiraQueueWorkflowScreens,
    getQueueWorkflows: (queueKey: string) => fetchJiraQueueWorkflows(api, queueKey),
    getSprint: (sprintId) => fetchJiraSprintInfo(api, sprintId),
    getTasksInSprintWithParents: async (sprintId, options) => {
      const issues = await listNormalizedJiraSprintIssues(api, sprintId, options?.cacheOnly);
      return issues.filter((issue) => issue.type?.key === 'task' || issue.type?.key === 'bug');
    },
    getTransitionFields: (issueKey: string, transitionId: string) =>
      fetchJiraTransitionFields(api, issueKey, transitionId),
    listBoards: () => fetchJiraBoardsForCatalog(api),
    listIssueTransitionsBatch: (issueKeys: string[]) =>
      fetchJiraIssueTransitionsBatch(api, issueKeys),
    listIssuesForBoard: (boardId, options) =>
      listJiraIssuesForBoard(api, boardId, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeJiraIssue),
        truncated,
      })),
    listIssuesForQueue: (queueKey, options) =>
      listJiraIssuesForQueue(api, queueKey, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeJiraIssue),
        truncated,
      })),
    listIssuesUpdatedInRange: (since, until, options) =>
      listJiraIssuesUpdatedInRange(api, since, until, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeJiraIssue),
        truncated,
      })),
    listQueues: () => fetchJiraProjectsAsQueues(api),
    listSprintIssues: (sprintId, options) =>
      listNormalizedJiraSprintIssues(api, sprintId, options?.cacheOnly),
    listSprints: (boardId: number) => listJiraSprints(api, boardId),
    mapIssueToTask: (issue, integration) => mapIssueTrackerIssueToTask(issue, integration),
    removeIssueFromSprint: (issueKey: string, sprintId: string) =>
      removeJiraIssueFromSprint(api, issueKey, sprintId),
    replaceIssueSprints: (issueKey: string, sprints) =>
      replaceJiraIssueSprints(api, issueKey, sprints),
    searchIssuesOnBoard: (boardId, query, options) =>
      searchJiraIssuesOnBoard(api, boardId, query, options).then((issues) =>
        issues.map(normalizeJiraIssue)
      ),
    searchQueues: (query: string) => searchJiraQueues(api, query),
    searchUsers: (query: string) =>
      searchJiraUsers(api, query, getIssueTrackerProviderKind()),
    transitionIssue: (issueKey, transitionId, input) =>
      transitionJiraIssue(api, issueKey, transitionId, input),
    updateIssue: (issueKey, patch) => updateJiraIssue(api, issueKey, patch),
    updateSprintStatus: (sprintId, status) => updateJiraSprintStatus(api, sprintId, status),
  });
}

export function createJiraProviderClient(
  config: JiraTrackerClientConfig
): IssueTrackerProviderClient {
  return createJiraProviderClientWithApi(createJiraAxiosInstance(config));
}

async function createJiraProviderClientFromRequest(
  request: Request
): Promise<IssueTrackerProviderClient> {
  const config = await resolveTrackerApiConfigFromRequest(request);
  return createJiraProviderClient({
    apiToken: config.oauthToken,
    apiUrl: config.apiUrl,
    email: config.jiraEmail,
  });
}

export const jiraTrackerProvider: JiraIssueTrackerProvider = {
  createProviderClient: createJiraProviderClient,
  createProviderClientFromRequest: createJiraProviderClientFromRequest,
  kind: JIRA_PROVIDER_KIND,
};
