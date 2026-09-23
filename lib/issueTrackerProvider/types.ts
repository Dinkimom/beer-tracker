import type { IssueTrackerBurndownIssue } from './changelogTypes';
import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { Task } from '@/types';
import type {
  ChecklistItem,
  IssueChangelogWithComments,
  SprintInfo,
  SprintListItem,
} from '@/types/tracker';
import type { AxiosInstance } from 'axios';

export const DEFAULT_ISSUE_TRACKER_PROVIDER_KIND = 'tracker';
export const ISSUE_TRACKER_PROVIDER_KINDS = [
  DEFAULT_ISSUE_TRACKER_PROVIDER_KIND,
  'jira-onprem',
  'jira-cloud',
] as const;
export type IssueTrackerProviderKind = (typeof ISSUE_TRACKER_PROVIDER_KINDS)[number];

/** Адаптер и payload снимков: Yandex Tracker vs Jira (Cloud и DC — один REST-адаптер). */
export type IssueTrackerStoredProvider = 'jira' | 'yandex-tracker';

export function isJiraProviderKind(kind: IssueTrackerProviderKind): boolean {
  return kind === 'jira-cloud' || kind === 'jira-onprem';
}

export function issueTrackerStoredProvider(
  kind: IssueTrackerProviderKind
): IssueTrackerStoredProvider {
  return isJiraProviderKind(kind) ? 'jira' : 'yandex-tracker';
}

export function issueTrackerProviderI18nSuffix(
  kind: IssueTrackerProviderKind
): IssueTrackerStoredProvider {
  return issueTrackerStoredProvider(kind);
}

/**
 * Jira Server/Data Center не имеет Cloud Organization ID.
 * Колонка `organizations.tracker_org_id` всё ещё NOT NULL-по смыслу готовности —
 * пишем этот sentinel, если поле в форме скрыто.
 */
export const JIRA_EXTERNAL_ORG_ID_FALLBACK = 'jira';

interface IssueTrackerEntityRef {
  display?: string;
  id: string;
  key?: string;
  self?: string;
}

export interface IssueTrackerIssue {
  assignee?: IssueTrackerEntityRef;
  createdAt?: string;
  customFields?: Record<string, unknown>;
  dangerousRelease?: boolean | number | string | { display?: string; key?: string } | null;
  /** Дедлайн (YYYY-MM-DD или datetime). */
  deadline?: string;
  description?: string;
  epic?: IssueTrackerEntityRef | null;
  functionalTeam?: string;
  id: string;
  incidentSeverity?: string | { display?: string; key?: string };
  key: string;
  mergeRequestLink?: string;
  parent?: IssueTrackerEntityRef;
  priority?: { display?: string; key?: string };
  productTeam?: string[];
  provider: IssueTrackerStoredProvider;
  qaEngineer?: IssueTrackerEntityRef;
  raw?: unknown;
  self?: string;
  sprint?: Array<{ display?: string; id: string }> | string | { display?: string; id: string };
  stage?: string;
  /** Дата начала (YYYY-MM-DD или datetime). */
  start?: string;
  status?: { display?: string; id?: string; key: string };
  statusType?: { display?: string; key: string };
  storyPoints?: number;
  summary: string;
  testPoints?: number;
  type?: { display?: string; key: string };
  updatedAt?: string;
}

interface IssueTrackerBoardListItem {
  id: number;
  name: string;
  self?: string;
}

interface IssueTrackerQueueListItem {
  id?: number;
  key: string;
  name: string;
}

interface IssueTrackerQueueWorkflowIssueType {
  display?: string;
  id: string;
  key: string;
}

type IssueTrackerQueueWorkflows = Record<string, IssueTrackerQueueWorkflowIssueType[]>;

export type IssueTrackerScreenFieldOption = string | { label: string; value: string };

export interface IssueTrackerScreenField {
  display: string;
  id: string;
  options?: IssueTrackerScreenFieldOption[];
  required: boolean;
  /** Тип элементов массива из schema.items (user, string...) */
  schemaItems?: string;
  schemaType?: string;
}

interface IssueTrackerTransitionItem {
  display?: string;
  id: string;
  screen?: { display?: string; id: string };
  to: { display?: string; id?: string; key: string; statusTypeKey?: string };
}

export interface IssueTrackerCreateSprintInput {
  boardId: number;
  endDate: string;
  name: string;
  startDate: string;
}

export type IssueTrackerSprintStatus = 'archived' | 'draft' | 'in_progress' | 'released';

type IssueTrackerSprintStatusUpdateResult = SprintInfo & { boardId?: number };

export interface IssueTrackerCreateIssueInput {
  assignee?: string;
  description?: string;
  parent?: string;
  priority?: string;
  queue: string;
  sprint?: number;
  summary: string;
  type?: string;
}

export type IssueTrackerCreateIssueResult = Record<string, unknown> & {
  id?: number | string;
  key: string;
  self?: string;
};

export interface IssueTrackerCreateRelatedIssueInput {
  assignee?: string;
  functionalTeam?: string;
  parent?: string;
  priority?: string;
  productTeam?: string[];
  sprintId?: number | null;
  stage?: string;
  storyPoints?: number | null;
  testPoints?: number | null;
  title: string;
  type?: string;
}

export interface IssueTrackerSprintRef {
  id: string;
}

export interface IssueTrackerSprintMembershipUpdateResult {
  affectedSprintIds: number[];
  backlogBoardIds: number[];
}

export interface IssueTrackerCreateChecklistItemInput {
  checked?: boolean;
  text: string;
}

export interface IssueTrackerUpdateChecklistItemInput {
  checked?: boolean;
  text?: string;
}

export interface IssueTrackerUser {
  avatarUrl?: string | null;
  displayName: string;
  email?: string | null;
  trackerId: string;
}

export interface IssueTrackerIssuePatch {
  assigneeField?: string;
  assigneeId?: string;
  customFields?: Record<string, unknown>;
  description?: string;
  isQa?: boolean;
  parent?: string | null;
  storyPoints?: number | null;
  summary?: string;
  tags?: string[];
  testPoints?: number | null;
}
export type IssueTrackerTransitionInput = Record<string, unknown>;

type IssueTrackerCurrentUser = Record<string, unknown> & {
  trackerUid?: number | string;
  uid?: number | string;
};

export interface IssueTrackerSprintIssuesOptions {
  cacheOnly?: boolean;
  forceRefresh?: boolean;
  sprintStatus?: string;
}

export type IssueTrackerIssueChangelogWithComments = IssueChangelogWithComments;

export interface IssueTrackerBurndownSprintContext {
  sprintId?: string;
  sprintName: string;
}

interface IssueTrackerIssuesUpdatedInRangeOptions {
  maxIssues?: number;
  perPage?: number;
  /** Ограничить поиск очередями команд; пустой массив — без задач, не весь инстанс. */
  queueKeys?: string[];
}

interface IssueTrackerIssuesUpdatedInRangeResult {
  issues: IssueTrackerIssue[];
  truncated: boolean;
}

interface IssueTrackerBoardIssuesCheckpoint {
  boardId: number;
  page: number;
  totalIssues: number;
  totalPages: number;
}

interface IssueTrackerListBoardIssuesOptions {
  maxTotalIssues?: number;
  perPage?: number;
  queryExtra?: string;
  onCheckpoint?: (
    info: IssueTrackerBoardIssuesCheckpoint
  ) => Promise<void> | void;
}

interface IssueTrackerListBoardIssuesResult {
  issues: IssueTrackerIssue[];
  truncated: boolean;
}

interface IssueTrackerQueueIssuesCheckpoint {
  page: number;
  queueKey: string;
  totalIssues: number;
  totalPages: number;
}

interface IssueTrackerListQueueIssuesOptions {
  maxTotalIssues?: number;
  perPage?: number;
  onCheckpoint?: (info: IssueTrackerQueueIssuesCheckpoint) => Promise<void> | void;
}

interface IssueTrackerListIssuesByQueryCheckpoint {
  page: number;
  totalIssues: number;
  totalPages: number;
}

interface IssueTrackerListIssuesByQueryOptions {
  maxTotalIssues?: number;
  perPage?: number;
  onCheckpoint?: (
    info: IssueTrackerListIssuesByQueryCheckpoint
  ) => Promise<void> | void;
}

interface IssueTrackerListIssuesByQueryResult {
  issues: IssueTrackerIssue[];
  truncated: boolean;
}

export interface IssueTrackerIssueSearchOptions {
  parentCandidates?: boolean;
}

export interface IssueTrackerProviderClient {
  addIssueComment(issueKey: string, text: string): Promise<void>;
  addIssueToSprint(
    issueKey: string,
    sprintId: number
  ): Promise<IssueTrackerSprintMembershipUpdateResult>;
  createChecklistItem(
    issueKey: string,
    input: IssueTrackerCreateChecklistItemInput
  ): Promise<unknown>;
  createIssue(input: IssueTrackerCreateIssueInput): Promise<IssueTrackerCreateIssueResult>;
  createRelatedIssue(
    sourceIssueKey: string,
    input: IssueTrackerCreateRelatedIssueInput
  ): Promise<unknown>;
  createSprint(input: IssueTrackerCreateSprintInput): Promise<unknown>;
  deleteChecklist(issueKey: string): Promise<void>;
  deleteChecklistItem(issueKey: string, itemId: string): Promise<void>;
  getBoard(boardId: number): Promise<unknown>;
  getBurndownIssuesForKeys(
    issueKeys: string[],
    sprint: IssueTrackerBurndownSprintContext | undefined,
    issueByKey: ReadonlyMap<string, IssueTrackerIssue>
  ): Promise<IssueTrackerBurndownIssue[]>;
  getCurrentUser(): Promise<IssueTrackerCurrentUser>;
  getField(fieldId: string): Promise<unknown | null>;
  getIssue(issueKey: string): Promise<IssueTrackerIssue | null>;
  getIssueChangelogWithComments(
    issueKey: string
  ): Promise<IssueTrackerIssueChangelogWithComments>;
  getIssueChecklist(issueKey: string): Promise<ChecklistItem[]>;
  getIssueChildren(parentKey: string, boardId: number): Promise<IssueTrackerIssue[]>;
  getIssuesChangelogBatch(
    issueKeys: string[]
  ): Promise<Record<string, IssueTrackerIssueChangelogWithComments>>;
  getIssueTransitions(issueKey: string): Promise<IssueTrackerTransitionItem[]>;
  getQueue(queueKey: string): Promise<IssueTrackerQueueListItem | null>;
  getQueueWorkflows(queueKey: string): Promise<IssueTrackerQueueWorkflows>;
  getQueueWorkflowScreens(
    queueKey: string
  ): Promise<Record<string, Record<string, IssueTrackerScreenField[]>>>;
  getScreen(screenId: string): Promise<unknown>;
  getScreenFields(screenId: string): Promise<IssueTrackerScreenField[]>;
  getSprint(sprintId: number): Promise<SprintInfo>;
  getTasksInSprintWithParents(
    sprintId: number,
    options?: IssueTrackerSprintIssuesOptions
  ): Promise<IssueTrackerIssue[]>;
  getTransitionFields(issueKey: string, transitionId: string): Promise<IssueTrackerScreenField[]>;
  listBoards(): Promise<IssueTrackerBoardListItem[]>;
  listIssuesByQuery(
    query: string,
    options?: IssueTrackerListIssuesByQueryOptions
  ): Promise<IssueTrackerListIssuesByQueryResult>;
  listIssuesForBoard(
    boardId: number,
    options?: IssueTrackerListBoardIssuesOptions
  ): Promise<IssueTrackerListBoardIssuesResult>;
  listIssuesForQueue(
    queueKey: string,
    options?: IssueTrackerListQueueIssuesOptions
  ): Promise<IssueTrackerListBoardIssuesResult>;
  listIssuesUpdatedInRange(
    since: Date,
    until: Date,
    options?: IssueTrackerIssuesUpdatedInRangeOptions
  ): Promise<IssueTrackerIssuesUpdatedInRangeResult>;
  listIssueTransitionsBatch(
    issueKeys: string[]
  ): Promise<Record<string, IssueTrackerTransitionItem[]>>;
  listQueues(): Promise<IssueTrackerQueueListItem[]>;
  listSprintIssues(
    sprintId: number,
    options?: IssueTrackerSprintIssuesOptions
  ): Promise<IssueTrackerIssue[]>;
  listSprints(boardId: number): Promise<SprintListItem[]>;
  mapIssueToTask(
    issue: IssueTrackerIssue,
    integration?: TrackerIntegrationStored | null
  ): Task;
  removeIssueFromSprint(
    issueKey: string,
    sprintId: string
  ): Promise<IssueTrackerSprintMembershipUpdateResult>;
  replaceChecklistItems(issueKey: string, items: unknown[]): Promise<unknown>;
  replaceIssueSprints(
    issueKey: string,
    sprints: IssueTrackerSprintRef[]
  ): Promise<IssueTrackerSprintMembershipUpdateResult>;
  searchIssuesOnBoard(
    boardId: number,
    query: string,
    options?: IssueTrackerIssueSearchOptions
  ): Promise<IssueTrackerIssue[]>;
  searchQueues(query: string): Promise<IssueTrackerQueueListItem[]>;
  searchUsers(query: string): Promise<IssueTrackerUser[]>;
  transitionIssue(
    issueKey: string,
    transitionId: string,
    input: IssueTrackerTransitionInput
  ): Promise<void>;
  updateChecklistItem(
    issueKey: string,
    itemId: string,
    input: IssueTrackerUpdateChecklistItemInput
  ): Promise<void>;
  updateIssue(issueKey: string, patch: IssueTrackerIssuePatch): Promise<unknown>;
  updateSprintStatus(
    sprintId: number,
    status: IssueTrackerSprintStatus,
    version?: number
  ): Promise<IssueTrackerSprintStatusUpdateResult | null>;
}

export interface YandexTrackerClientConfig {
  apiUrl?: string;
  oauthToken: string;
  orgId: string;
}

/** Skeleton config; поля будут расширены при реализации Jira REST. */
export interface JiraTrackerClientConfig {
  apiToken: string;
  apiUrl?: string;
  /** Jira Cloud Basic auth; пусто — Bearer PAT. */
  email?: string;
}

interface IssueTrackerProviderBase {
  kind: IssueTrackerStoredProvider;
  createProviderClientFromRequest(request: Request): Promise<IssueTrackerProviderClient>;
}

export interface YandexIssueTrackerProvider extends IssueTrackerProviderBase {
  kind: 'yandex-tracker';
  createClient(config: YandexTrackerClientConfig): AxiosInstance;
  createClientFromRequest(request: Request): Promise<AxiosInstance>;
  createProviderClient(config: YandexTrackerClientConfig): IssueTrackerProviderClient;
}

export interface JiraIssueTrackerProvider extends IssueTrackerProviderBase {
  kind: 'jira';
  createProviderClient(config: JiraTrackerClientConfig): IssueTrackerProviderClient;
}

export type IssueTrackerProvider = JiraIssueTrackerProvider | YandexIssueTrackerProvider;
