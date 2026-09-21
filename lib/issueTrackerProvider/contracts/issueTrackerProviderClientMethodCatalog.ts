import type { IssueTrackerProviderClient } from '../types';

/**
 * Полный список методов провайдера. Новый метод на `IssueTrackerProviderClient`
 * без записи сюда ломает `tsc`. Реализация Yandex без ключа ломает contract-тест.
 */
export const ISSUE_TRACKER_PROVIDER_CLIENT_METHODS = [
  'addIssueComment',
  'addIssueToSprint',
  'createChecklistItem',
  'createIssue',
  'createRelatedIssue',
  'createSprint',
  'deleteChecklist',
  'deleteChecklistItem',
  'getBoard',
  'getBurndownIssuesForKeys',
  'getCurrentUser',
  'getField',
  'getIssue',
  'getIssueChangelogWithComments',
  'getIssueChecklist',
  'getIssueChildren',
  'getIssuesChangelogBatch',
  'getIssueTransitions',
  'getQueue',
  'getQueueWorkflowScreens',
  'getQueueWorkflows',
  'getScreen',
  'getScreenFields',
  'getSprint',
  'getTasksInSprintWithParents',
  'getTransitionFields',
  'listBoards',
  'listIssueTransitionsBatch',
  'listIssuesByQuery',
  'listIssuesForBoard',
  'listIssuesForQueue',
  'listIssuesUpdatedInRange',
  'listQueues',
  'listSprintIssues',
  'listSprints',
  'mapIssueToTask',
  'removeIssueFromSprint',
  'replaceChecklistItems',
  'replaceIssueSprints',
  'searchIssuesOnBoard',
  'searchQueues',
  'searchUsers',
  'transitionIssue',
  'updateChecklistItem',
  'updateIssue',
  'updateSprintStatus',
] as const satisfies ReadonlyArray<keyof IssueTrackerProviderClient>;

type IssueTrackerProviderClientMethod =
  (typeof ISSUE_TRACKER_PROVIDER_CLIENT_METHODS)[number];

type MissingClientMethod = Exclude<
  keyof IssueTrackerProviderClient,
  IssueTrackerProviderClientMethod
>;
type ExtraClientMethod = Exclude<
  IssueTrackerProviderClientMethod,
  keyof IssueTrackerProviderClient
>;

type AssertIssueTrackerProviderClientMethodsExhaustive = [
  MissingClientMethod,
] extends [never]
  ? [ExtraClientMethod] extends [never]
    ? true
    : ExtraClientMethod
  : MissingClientMethod;

export const ISSUE_TRACKER_PROVIDER_CLIENT_METHODS_EXHAUSTIVE: AssertIssueTrackerProviderClientMethodsExhaustive =
  true;
