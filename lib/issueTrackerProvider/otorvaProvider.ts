/**
 * Встроенный трекер otorva (`services/otorva`): REST `…/api/v1`, JWT пользователя по email и паролю.
 * Веб-интерфейса у трекера нет — `webBaseUrl` пустой, ссылок «открыть в трекере» нет.
 * Нереализованные методы контракта отклоняются `UnsupportedIssueTrackerOperationError`.
 */
import type {
  IssueTrackerProviderClient,
  OtorvaIssueTrackerProvider,
  OtorvaProviderClientConfig,
} from './types';

import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

import { mapIssueTrackerIssueToTask } from './mapIssueTrackerIssueToTask';
import { createOtorvaAxiosInstance, createOtorvaCatalog, OTORVA_DEFAULT_API_URL } from './otorvaApi';
import {
  getOtorvaBurndownIssues,
  getOtorvaChangelogBatch,
  getOtorvaIssue,
  getOtorvaIssueTransitions,
  listOtorvaIssueLinks,
  listOtorvaIssues,
  otorvaQueueId,
  withoutEpics,
} from './otorvaIssues';
import {
  getOtorvaBoard,
  getOtorvaCurrentUser,
  getOtorvaQueueWorkflows,
  getOtorvaSprint,
  listOtorvaBoards,
  listOtorvaQueues,
  listOtorvaSprints,
  listOtorvaStatuses,
  searchOtorvaQueues,
  searchOtorvaUsers,
} from './otorvaPlanning';
import {
  addOtorvaIssueToSprint,
  createOtorvaIssue,
  createOtorvaIssueLink,
  createOtorvaSprint,
  deleteOtorvaIssueLink,
  removeOtorvaIssueFromSprint,
  replaceOtorvaIssueSprints,
  transitionOtorvaIssue,
  updateOtorvaIssue,
  updateOtorvaSprintGoal,
  updateOtorvaSprintStatus,
} from './otorvaWrites';
import { createPartialProviderClient } from './partialProviderClient';

const OTORVA_PROVIDER_KIND = 'otorva' as const;


export const OTORVA_IMPLEMENTED_PROVIDER_METHODS = [
  'addIssueToSprint',
  'createIssue',
  'createIssueLink',
  'createSprint',
  'deleteIssueLink',
  'getBoard',
  'getBurndownIssuesForKeys',
  'getCurrentUser',
  'getIssue',
  'getIssueChangelogWithComments',
  'getIssueChildren',
  'getIssuesChangelogBatch',
  'getIssueTransitions',
  'getQueue',
  'getQueueWorkflowScreens',
  'getQueueWorkflows',
  'getSprint',
  'getTasksInSprintWithParents',
  'listBoards',
  'listIssueLinks',
  'listIssueLinksBatch',
  'listIssueTransitionsBatch',
  'listIssuesForBoard',
  'listIssuesForQueue',
  'listIssuesUpdatedInRange',
  'listQueues',
  'listSprintIssues',
  'listSprints',
  'listStatuses',
  'mapIssueToTask',
  'searchIssuesOnBoard',
  'searchQueues',
  'searchUsers',
  'removeIssueFromSprint',
  'replaceIssueSprints',
  'transitionIssue',
  'updateIssue',
  'updateSprintGoal',
  'updateSprintStatus',
] as const satisfies ReadonlyArray<keyof IssueTrackerProviderClient>;

/** Выборка по ключам задач, по одному запросу на ключ (журнал и связи otorva — по задаче). */
async function byKeys<T>(keys: string[], load: (key: string) => Promise<T>): Promise<Record<string, T>> {
  const entries = await Promise.all(keys.map(async (key) => [key, await load(key)] as const));
  return Object.fromEntries(entries);
}

export function createOtorvaProviderClient(config: OtorvaProviderClientConfig): IssueTrackerProviderClient {
  const api = createOtorvaAxiosInstance(config.apiUrl.trim() || OTORVA_DEFAULT_API_URL, config.token);
  const catalog = createOtorvaCatalog(api);
  const web = { kind: OTORVA_PROVIDER_KIND, organizationId: config.organizationId, webBaseUrl: '' };
  const listByQueue = async (queueKey: string, maxItems?: number) => {
    const queueId = await otorvaQueueId(catalog, queueKey);
    return queueId ? listOtorvaIssues(api, catalog, { queue_id: queueId }, maxItems) : { issues: [], truncated: false };
  };
  return createPartialProviderClient(OTORVA_PROVIDER_KIND, web, {
    addIssueToSprint: (key, sprintId) => addOtorvaIssueToSprint(api, catalog, key, sprintId),
    createIssue: (input) => createOtorvaIssue(api, catalog, input),
    createIssueLink: (key, input) => createOtorvaIssueLink(api, key, input),
    createSprint: (input) => createOtorvaSprint(api, input),
    deleteIssueLink: (_key, linkId) => deleteOtorvaIssueLink(api, linkId),
    getBoard: (boardId) => getOtorvaBoard(api, catalog, boardId),
    getBurndownIssuesForKeys: (keys, sprint, issueByKey) => getOtorvaBurndownIssues(api, keys, sprint, issueByKey),
    getCurrentUser: () => getOtorvaCurrentUser(api),
    getIssue: (key) => getOtorvaIssue(api, catalog, key),
    getIssueChangelogWithComments: async (key) =>
      (await getOtorvaChangelogBatch(api, [key]))[key.trim().toUpperCase()] ?? { changelog: [], comments: [] },
    getIssueChildren: async (parentKey, boardId) => {
      const parent = await getOtorvaIssue(api, catalog, parentKey);
      if (!parent) {
        return [];
      }
      return (await listOtorvaIssues(api, catalog, { board_id: boardId, parent_id: parent.id })).issues;
    },
    getIssuesChangelogBatch: (keys) => getOtorvaChangelogBatch(api, keys),
    getIssueTransitions: (key) => getOtorvaIssueTransitions(api, catalog, key),
    getQueue: async (queueKey) =>
      (await listOtorvaQueues(catalog)).find((q) => q.key === queueKey.trim().toUpperCase()) ?? null,
    // Экранов перехода (обязательных полей) в otorva нет: модалка перехода не нужна, как у Jira без полей.
    getQueueWorkflowScreens: () => Promise.resolve({}),
    getQueueWorkflows: () => getOtorvaQueueWorkflows(catalog),
    getSprint: (sprintId) => getOtorvaSprint(api, sprintId),
    getTasksInSprintWithParents: async (sprintId) =>
      withoutEpics((await listOtorvaIssues(api, catalog, { sprint_id: sprintId })).issues),
    listBoards: () => listOtorvaBoards(api),
    listIssueLinks: (key) => listOtorvaIssueLinks(api, catalog, key),
    listIssueLinksBatch: (keys) => byKeys(keys, (key) => listOtorvaIssueLinks(api, catalog, key)),
    listIssueTransitionsBatch: (keys) => byKeys(keys, (key) => getOtorvaIssueTransitions(api, catalog, key)),
    listIssuesForBoard: (boardId, options) =>
      listOtorvaIssues(api, catalog, { board_id: boardId }, options?.maxTotalIssues),
    listIssuesForQueue: (queueKey, options) => listByQueue(queueKey, options?.maxTotalIssues),
    listIssuesUpdatedInRange: async (since, until, options) => {
      const { issues, truncated } = await listOtorvaIssues(
        api,
        catalog,
        { sort: 'updated_asc', updated_since: since.toISOString(), updated_until: until.toISOString() },
        options?.maxIssues
      );
      const queues = options?.queueKeys?.map((k) => k.trim().toUpperCase());
      const inQueues = queues?.length
        ? issues.filter((issue) => queues.includes(issue.key.split('-')[0] ?? ''))
        : issues;
      return { issues: inQueues, truncated };
    },
    listQueues: () => listOtorvaQueues(catalog),
    listSprintIssues: async (sprintId) => (await listOtorvaIssues(api, catalog, { sprint_id: sprintId })).issues,
    listSprints: (boardId) => listOtorvaSprints(api, catalog, boardId),
    listStatuses: () => listOtorvaStatuses(catalog),
    mapIssueToTask: (issue, integration) => mapIssueTrackerIssueToTask(issue, web, integration),
    searchIssuesOnBoard: async (boardId, query, options) =>
      (await listOtorvaIssues(api, catalog, options?.anyBoard ? { q: query } : { board_id: boardId, q: query }, 50))
        .issues,
    searchQueues: (query) => searchOtorvaQueues(catalog, query),
    searchUsers: (query) => searchOtorvaUsers(catalog, query),
    removeIssueFromSprint: (key, sprintId) => removeOtorvaIssueFromSprint(api, catalog, key, sprintId),
    replaceIssueSprints: (key, sprints) => replaceOtorvaIssueSprints(api, catalog, key, sprints),
    transitionIssue: (key, transitionId) => transitionOtorvaIssue(api, key, transitionId),
    updateIssue: (key, patch) => updateOtorvaIssue(api, key, patch),
    updateSprintGoal: (sprintId, goal) => updateOtorvaSprintGoal(api, sprintId, goal),
    updateSprintStatus: (sprintId, status, version) => updateOtorvaSprintStatus(api, sprintId, status, version),
  });
}

async function createOtorvaProviderClientFromRequest(request: Request): Promise<IssueTrackerProviderClient> {
  const config = await resolveTrackerApiConfigFromRequest(request);
  if (config.providerKind !== OTORVA_PROVIDER_KIND) {
    throw new Error(`Organization tracker is ${config.providerKind}, not the built-in tracker`);
  }
  return createOtorvaProviderClient({
    apiUrl: config.apiUrl,
    organizationId: config.organizationId,
    token: config.oauthToken,
  });
}

export const otorvaTrackerProvider: OtorvaIssueTrackerProvider = {
  createProviderClient: createOtorvaProviderClient,
  createProviderClientFromRequest: createOtorvaProviderClientFromRequest,
  kind: OTORVA_PROVIDER_KIND,
};
