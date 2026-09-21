import type {
  IssueTrackerCreateChecklistItemInput,
  IssueTrackerCreateIssueInput,
  IssueTrackerCreateIssueResult,
  IssueTrackerCreateRelatedIssueInput,
  IssueTrackerCreateSprintInput,
  IssueTrackerIssueChangelogWithComments,
  IssueTrackerIssuePatch,
  IssueTrackerProviderClient,
  IssueTrackerSprintIssuesOptions,
  IssueTrackerSprintRef,
  IssueTrackerTransitionInput,
  IssueTrackerUpdateChecklistItemInput,
  YandexIssueTrackerProvider,
  YandexTrackerClientConfig,
} from './types';
import type { SprintListItem } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import {
  fetchChildren,
  fetchBurndownIssuesFromTrackerApi,
  fetchIssueChangelogWithCommentsFromTracker,
  fetchIssueChecklist,
  fetchIssueFromTracker,
  fetchIssueTransitions,
  fetchIssuesChangelogBatchFromTracker,
  fetchQueueWorkflowScreens,
  fetchQueueWorkflows,
  fetchSprintInfo,
  fetchTasksInSprintWithParents,
  fetchTrackerIssues,
  fetchTransitionsBatch,
  searchTrackerIssuesOnBoard,
  searchYandexTrackerUsers,
  updateTrackerSprintStatus,
} from '@/lib/trackerApi';
import { fetchBoardParams, fetchTrackerBoardsPaginate } from '@/lib/trackerApi';
import { fetchField, fetchScreen } from '@/lib/trackerApi';
import { fetchTrackerQueueByKey, fetchTrackerQueuesPaginate, searchTrackerQueues } from '@/lib/trackerApi';
import {
  fetchAllIssuesInQueue,
  fetchAllIssuesOnBoard,
  fetchIssuesByQuery,
  fetchIssuesUpdatedInRange,
} from '@/lib/trackerApi/issues';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';
import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

import { yandexIssueUpdateBody } from './issueTrackerIssuePatch';
import { mapIssueTrackerIssueToTask } from './mapIssueTrackerIssueToTask';
import {
  addYandexIssueToSprint,
  createYandexRelatedIssue,
  getYandexScreenFields,
  getYandexTransitionFields,
  normalizeYandexIssue,
  removeYandexIssueFromSprint,
  replaceYandexIssueSprints,
  yandexIssueFromProviderIssue,
} from './yandexTrackerProviderHelpers';

export { normalizeYandexIssue, yandexIssueFromProviderIssue } from './yandexTrackerProviderHelpers';

export function createYandexTrackerClient(
  config: YandexTrackerClientConfig
): ReturnType<typeof createTrackerAxiosInstance> {
  return createTrackerAxiosInstance(config);
}

export async function createYandexTrackerClientFromRequest(
  request: Request
): Promise<ReturnType<typeof createTrackerAxiosInstance>> {
  const config = await resolveTrackerApiConfigFromRequest(request);
  return createYandexTrackerClient({
    apiUrl: config.apiUrl,
    oauthToken: config.oauthToken,
    orgId: config.orgId,
  });
}

function createYandexIssueTrackerProviderClient(api: AxiosInstance): IssueTrackerProviderClient {
  return {
    addIssueToSprint(issueKey: string, sprintId: number) {
      return addYandexIssueToSprint(api, issueKey, sprintId);
    },

    async createChecklistItem(
      issueKey: string,
      input: IssueTrackerCreateChecklistItemInput
    ): Promise<unknown> {
      const { data } = await api.post(`/issues/${issueKey}/checklistItems`, input);
      return data;
    },

    async createIssue(input: IssueTrackerCreateIssueInput): Promise<IssueTrackerCreateIssueResult> {
      const { data } = await api.post<IssueTrackerCreateIssueResult>('/issues', input);
      return data;
    },

    createRelatedIssue(sourceIssueKey: string, input: IssueTrackerCreateRelatedIssueInput) {
      return createYandexRelatedIssue(api, sourceIssueKey, input);
    },

    async createSprint(input: IssueTrackerCreateSprintInput): Promise<unknown> {
      const { data } = await api.post('/sprints', {
        name: input.name,
        board: {
          id: input.boardId.toString(),
        },
        startDate: input.startDate,
        endDate: input.endDate,
      });
      return data;
    },

    async deleteChecklist(issueKey: string): Promise<void> {
      await api.delete(`/issues/${issueKey}/checklistItems`);
    },

    async deleteChecklistItem(issueKey: string, itemId: string): Promise<void> {
      await api.delete(`/issues/${issueKey}/checklistItems/${itemId}`);
    },

    getBoard(boardId: number): Promise<unknown> {
      return fetchBoardParams(boardId, api);
    },

    async getCurrentUser() {
      const { data } = await api.get('/myself');
      return data;
    },

    getField(fieldId: string): Promise<unknown | null> {
      return fetchField(fieldId, api);
    },

    getIssue(issueKey: string) {
      return fetchIssueFromTracker(issueKey, api).then((issue) =>
        issue ? normalizeYandexIssue(issue) : null
      );
    },

    getIssueChangelogWithComments(issueKey: string) {
      return fetchIssueChangelogWithCommentsFromTracker(issueKey, api);
    },

    getIssueChecklist(issueKey: string) {
      return fetchIssueChecklist(issueKey, api);
    },

    getIssueChildren(parentKey: string, boardId: number) {
      return fetchChildren(parentKey, boardId, api).then((issues) =>
        issues.map(normalizeYandexIssue)
      );
    },

    getIssueTransitions(issueKey: string) {
      return fetchIssueTransitions(issueKey, api);
    },

    getBurndownIssuesForKeys(issueKeys, sprint, issueByKey) {
      const trackerIssueByKey = new Map(
        [...issueByKey.entries()].map(([key, issue]) => [
          key,
          yandexIssueFromProviderIssue(issue),
        ])
      );
      return fetchBurndownIssuesFromTrackerApi(
        issueKeys,
        sprint,
        trackerIssueByKey,
        api
      );
    },

    async getIssuesChangelogBatch(issueKeys: string[]) {
      const dataMap = await fetchIssuesChangelogBatchFromTracker(issueKeys, api);
      const out: Record<string, IssueTrackerIssueChangelogWithComments> = {};
      for (const key of issueKeys) {
        out[key] = dataMap.get(key) ?? { changelog: [], comments: [] };
      }
      return out;
    },

    getQueue(queueKey: string) {
      return fetchTrackerQueueByKey(queueKey, api);
    },

    getQueueWorkflowScreens(queueKey: string) {
      return fetchQueueWorkflowScreens(queueKey, api);
    },

    getQueueWorkflows(queueKey: string) {
      return fetchQueueWorkflows(queueKey, api);
    },

    getScreen(screenId: string): Promise<unknown> {
      return fetchScreen(screenId, api);
    },

    getScreenFields(screenId: string) {
      return getYandexScreenFields(screenId, api);
    },

    getSprint(sprintId: number) {
      return fetchSprintInfo(sprintId, api);
    },

    getTransitionFields(issueKey: string, transitionId: string) {
      return getYandexTransitionFields(issueKey, transitionId, api);
    },

    getTasksInSprintWithParents(
      sprintId: number,
      options?: IssueTrackerSprintIssuesOptions
    ) {
      return fetchTasksInSprintWithParents(sprintId, api, options).then((issues) =>
        issues.map(normalizeYandexIssue)
      );
    },

    listBoards() {
      return fetchTrackerBoardsPaginate(api);
    },

    listQueues() {
      return fetchTrackerQueuesPaginate(api);
    },

    listIssuesForBoard(boardId: number, options) {
      return fetchAllIssuesOnBoard(boardId, api, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeYandexIssue),
        truncated,
      }));
    },

    listIssuesForQueue(queueKey: string, options) {
      return fetchAllIssuesInQueue(queueKey, api, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeYandexIssue),
        truncated,
      }));
    },

    listIssuesByQuery(query: string, options) {
      return fetchIssuesByQuery(query, api, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeYandexIssue),
        truncated,
      }));
    },

    listIssuesUpdatedInRange(since, until, options) {
      return fetchIssuesUpdatedInRange(api, since, until, options).then(({ issues, truncated }) => ({
        issues: issues.map(normalizeYandexIssue),
        truncated,
      }));
    },

    listIssueTransitionsBatch(issueKeys: string[]) {
      return fetchTransitionsBatch(issueKeys, api);
    },

    listSprintIssues(sprintId: number, options) {
      return fetchTrackerIssues(sprintId, api, options).then((issues) =>
        issues.map(normalizeYandexIssue)
      );
    },

    async listSprints(boardId: number): Promise<SprintListItem[]> {
      const { data } = await api.get(`/boards/${boardId}/sprints`);
      return Array.isArray(data) ? (data as SprintListItem[]) : [];
    },

    mapIssueToTask(issue, integration) {
      return mapIssueTrackerIssueToTask(issue, integration);
    },

    async replaceChecklistItems(issueKey: string, items: unknown[]): Promise<unknown> {
      const { data } = await api.put(`/issues/${issueKey}/checklistItems`, items);
      return data;
    },

    removeIssueFromSprint(issueKey: string, sprintId: string) {
      return removeYandexIssueFromSprint(api, issueKey, sprintId);
    },

    replaceIssueSprints(issueKey: string, sprints: IssueTrackerSprintRef[]) {
      return replaceYandexIssueSprints(api, issueKey, sprints);
    },

    searchIssuesOnBoard(boardId: number, query: string) {
      return searchTrackerIssuesOnBoard(boardId, query, api).then((issues) =>
        issues.map(normalizeYandexIssue)
      );
    },

    searchQueues(query: string) {
      return searchTrackerQueues(query, api);
    },

    searchUsers(query: string) {
      return searchYandexTrackerUsers(api, query);
    },

    async transitionIssue(
      issueKey: string,
      transitionId: string,
      input: IssueTrackerTransitionInput
    ): Promise<void> {
      await api.post(
        `https://api.tracker.yandex.net/v3/issues/${issueKey}/transitions/${transitionId}/_execute`,
        input
      );
    },

    async updateChecklistItem(
      issueKey: string,
      itemId: string,
      input: IssueTrackerUpdateChecklistItemInput
    ): Promise<void> {
      await api.patch(`/issues/${issueKey}/checklistItems/${itemId}`, input);
    },

    async addIssueComment(issueKey: string, text: string): Promise<void> {
      await api.post(`/issues/${issueKey}/comments`, { text });
    },

    async updateIssue(issueKey: string, patch: IssueTrackerIssuePatch): Promise<unknown> {
      const { data } = await api.patch(`/issues/${issueKey}`, yandexIssueUpdateBody(patch));
      return data;
    },

    updateSprintStatus(sprintId, status, version) {
      return updateTrackerSprintStatus(sprintId, status, version, api);
    },
  };
}

export function createYandexProviderClient(
  config: YandexTrackerClientConfig
): IssueTrackerProviderClient {
  return createYandexIssueTrackerProviderClient(createYandexTrackerClient(config));
}

async function createYandexProviderClientFromRequest(
  request: Request
): Promise<IssueTrackerProviderClient> {
  return createYandexIssueTrackerProviderClient(
    await createYandexTrackerClientFromRequest(request)
  );
}

export const yandexTrackerProvider: YandexIssueTrackerProvider = {
  createClient: createYandexTrackerClient,
  createClientFromRequest: createYandexTrackerClientFromRequest,
  createProviderClient: createYandexProviderClient,
  createProviderClientFromRequest: createYandexProviderClientFromRequest,
  kind: 'yandex-tracker',
};
