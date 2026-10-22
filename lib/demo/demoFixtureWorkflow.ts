import type { DemoFixtureResult } from './demoFixtureRouterTypes';
import type { TransitionItem } from '@/lib/api/types';
import type { Task } from '@/types';
import type { TaskStatus } from '@/utils/statusMapper';

import { getDemoFixtureStore } from './demoFixtureStore';

interface DemoWorkflowStatus {
  category: TaskStatus;
  display: string;
  key: string;
  /** Куда можно перейти из этого статуса. */
  next: string[];
  statusTypeKey: string;
}

/** Воркфлоу демо: те же статусы, что в истории (`demoFixtureChangelog`). */
const DEMO_WORKFLOW: Record<string, DemoWorkflowStatus> = {
  open: {
    category: 'todo',
    display: 'Open',
    key: 'open',
    statusTypeKey: 'new',
    next: ['inProgress', 'needInfo', 'closed'],
  },
  inProgress: {
    category: 'in-progress',
    display: 'In progress',
    key: 'inProgress',
    statusTypeKey: 'inProgress',
    next: ['inReview', 'blocked', 'needInfo', 'open'],
  },
  inReview: {
    category: 'in-progress',
    display: 'In review',
    key: 'inReview',
    statusTypeKey: 'inProgress',
    next: ['readyForTest', 'inProgress'],
  },
  readyForTest: {
    category: 'in-progress',
    display: 'Ready for test',
    key: 'readyForTest',
    statusTypeKey: 'inProgress',
    next: ['inTesting', 'inProgress'],
  },
  inTesting: {
    category: 'in-progress',
    display: 'In testing',
    key: 'inTesting',
    statusTypeKey: 'inProgress',
    next: ['closed', 'inProgress'],
  },
  blocked: {
    category: 'paused',
    display: 'Blocked',
    key: 'blocked',
    statusTypeKey: 'paused',
    next: ['inProgress', 'open'],
  },
  needInfo: {
    category: 'paused',
    display: 'Need info',
    key: 'needInfo',
    statusTypeKey: 'paused',
    next: ['open', 'inProgress'],
  },
  closed: {
    category: 'done',
    display: 'Closed',
    key: 'closed',
    statusTypeKey: 'done',
    next: ['open'],
  },
};

const TRANSITION_ID_PREFIX = 'demo-to-';

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function findDemoIssue(issueKey: string): Task | undefined {
  const store = getDemoFixtureStore();
  return [...store.tasks, ...store.nextSprintTasks, ...store.backlogTasks].find(
    (t) => t.id === issueKey
  );
}

function demoIssueTransitions(statusKey: string | undefined): TransitionItem[] {
  const current = statusKey ? DEMO_WORKFLOW[statusKey] : undefined;
  if (!current) return [];
  return current.next.map((key) => {
    const target = DEMO_WORKFLOW[key];
    return {
      display: target.display,
      id: `${TRANSITION_ID_PREFIX}${target.key}`,
      to: {
        display: target.display,
        id: target.key,
        key: target.key,
        statusTypeKey: target.statusTypeKey,
      },
    };
  });
}

/** Перевести задачу фикстуры: доска после refetch видит новый статус. */
function applyDemoIssueTransition(issueKey: string, transitionId: string): DemoFixtureResult {
  const issue = findDemoIssue(issueKey);
  const allowed = demoIssueTransitions(issue?.originalStatus).some((t) => t.id === transitionId);
  if (!issue || !allowed) {
    return ok({ error: 'Transition is not available' }, 409);
  }
  const target = DEMO_WORKFLOW[transitionId.slice(TRANSITION_ID_PREFIX.length)];
  // Новый объект: прежний мог уйти в кэш React Query как ответ `/tracker`.
  const moved: Task = {
    ...issue,
    originalStatus: target.key,
    originalStatusDisplay: target.display,
    originalStatusId: target.key,
    status: target.category,
    statusTypeKey: target.statusTypeKey,
  };
  const store = getDemoFixtureStore();
  store.tasks = store.tasks.map((t) => (t === issue ? moved : t));
  store.nextSprintTasks = store.nextSprintTasks.map((t) => (t === issue ? moved : t));
  store.backlogTasks = store.backlogTasks.map((t) => (t === issue ? moved : t));
  return ok({ success: true });
}

function handleTransitionsBatch(body: unknown): DemoFixtureResult {
  const issueKeys = (body as { issueKeys?: unknown } | undefined)?.issueKeys;
  const result: Record<string, TransitionItem[]> = {};
  if (Array.isArray(issueKeys)) {
    for (const key of issueKeys) {
      if (typeof key === 'string') {
        result[key] = demoIssueTransitions(findDemoIssue(key)?.originalStatus);
      }
    }
  }
  return ok(result);
}

/** Переходы по статусам в `/demo/planner`: список, поля перехода (всегда пусто), смена статуса. */
export function handleDemoWorkflow(path: string, method: string, body: unknown): DemoFixtureResult | null {
  if (path === '/issues/transitions/batch' && method === 'post') {
    return handleTransitionsBatch(body);
  }
  const transitions = path.match(/^\/issues\/([^/]+)\/transitions$/);
  if (transitions && method === 'get') {
    return ok(demoIssueTransitions(findDemoIssue(transitions[1])?.originalStatus));
  }
  if (/^\/issues\/[^/]+\/transitions\/[^/]+\/fields$/.test(path) && method === 'get') {
    return ok({ fields: [] });
  }
  const status = path.match(/^\/issues\/([^/]+)\/status$/);
  if (status && method === 'patch') {
    const transitionId = (body as { transitionId?: unknown } | undefined)?.transitionId;
    return applyDemoIssueTransition(status[1], typeof transitionId === 'string' ? transitionId : '');
  }
  return null;
}
