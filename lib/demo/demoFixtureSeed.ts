import type { SprintPlanAnchor } from '@/lib/api/sprints';
import type { BoardListItem, SprintScoreResponse } from '@/lib/api/types';
import type { RetroBoard } from '@/lib/retro/retroBoardShared';
import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';
import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';
import type { Developer, SprintCommentsResponse, SprintTasksResponse, Task } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { BoardParams, ChecklistItem, SprintListItem } from '@/types/tracker';

import {
  assigneeVelocityNameKey,
  type AssigneeVelocityResponse,
} from '@/lib/sprints/assigneeVelocity';
import { emptyFeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';

import { buildDemoRetroBoards } from './demoFixtureSeedRetro';
import {
  DEMO_DEV_DISPLAY,
  buildDemoBacklogTasks,
  buildDemoDevelopers,
  buildDemoSprintTasks,
} from './demoFixtureSeedTasks';
import {
  DEMO_BOARD_ID,
  DEMO_DEV_ALICE,
  DEMO_DEV_BOB,
  DEMO_DEV_CAROL,
  DEMO_DEV_DANA,
  DEMO_DEV_ERIN,
  DEMO_ORG_ID,
  DEMO_SPRINT_ID,
  DEMO_SPRINT_NEXT_ID,
  DEMO_SPRINT_PREV_ID,
} from './demoIds';

type DemoCommentRow = SprintCommentsResponse['comments'][number];

const BOARD_SELF = `https://demo.local/boards/${DEMO_BOARD_ID}`;

const SPRINT_START = '2026-10-13';
const SPRINT_END = '2026-10-24';
const PREV_START = '2026-09-29';
const PREV_END = '2026-10-10';
const NEXT_START = '2026-10-27';
const NEXT_END = '2026-11-07';

function sprintListItem(opts: {
  archived: boolean;
  endDate: string;
  id: number;
  name: string;
  startDate: string;
  status: string;
}): SprintListItem {
  return {
    archived: opts.archived,
    board: { display: 'Demo Board', id: String(DEMO_BOARD_ID), self: BOARD_SELF },
    createdAt: `${opts.startDate}T09:00:00.000Z`,
    createdBy: {
      cloudUid: 'demo',
      display: 'Demo User',
      id: 'demo-user',
      passportUid: 0,
      self: 'https://demo.local/users/demo-user',
    },
    endDate: opts.endDate,
    endDateTime: `${opts.endDate}T18:00:00.000Z`,
    id: opts.id,
    name: opts.name,
    quarter: null,
    self: `https://demo.local/sprints/${opts.id}`,
    startDate: opts.startDate,
    startDateTime: `${opts.startDate}T09:00:00.000Z`,
    status: opts.status,
    version: 1,
  };
}

interface DemoPositionRow {
  assignee_id: string;
  duration: number;
  is_qa?: boolean;
  planned_duration?: number | null;
  planned_start_day?: number | null;
  planned_start_part?: number | null;
  start_day: number;
  start_part: number;
  task_id: string;
}

export interface DemoFixtureState {
  assigneeVelocity: AssigneeVelocityResponse;
  availabilityEvents: BoardAvailabilityEvent[];
  backlogTasks: Task[];
  board: BoardListItem;
  boardParams: BoardParams;
  comments: DemoCommentRow[];
  developers: Developer[];
  featureLanes: FeatureLanesDocument;
  goals: {
    delivery: ChecklistItem[];
    discovery: ChecklistItem[];
  };
  links: Array<{
    from_task_id: string;
    id: string;
    to_task_id: string;
  }>;
  /** Задачи следующего спринта (draft); туда переносят из меню «Спринт». */
  nextSprintTasks: Task[];
  orgId: string;
  planAnchors: SprintPlanAnchor[];
  positions: DemoPositionRow[];
  retroBoards: Record<string, RetroBoard>;
  score: SprintScoreResponse;
  sprintInfo: NonNullable<SprintTasksResponse['sprintInfo']>;
  sprints: SprintListItem[];
  tasks: Task[];
}

function buildDemoPositions(): DemoPositionRow[] {
  return [
    {
      task_id: 'DEMO-101',
      assignee_id: DEMO_DEV_ALICE,
      start_day: 0,
      start_part: 0,
      duration: 6,
      planned_start_day: 0,
      planned_start_part: 0,
      planned_duration: 6,
    },
    {
      task_id: 'DEMO-102',
      assignee_id: DEMO_DEV_BOB,
      start_day: 1,
      start_part: 0,
      duration: 9,
      planned_start_day: 1,
      planned_start_part: 0,
      planned_duration: 9,
    },
    {
      task_id: 'DEMO-103',
      assignee_id: DEMO_DEV_CAROL,
      start_day: 2,
      start_part: 0,
      duration: 6,
      is_qa: true,
      planned_start_day: 2,
      planned_start_part: 0,
      planned_duration: 6,
    },
    {
      task_id: 'DEMO-104',
      assignee_id: DEMO_DEV_BOB,
      start_day: 0,
      start_part: 0,
      duration: 3,
      planned_start_day: 0,
      planned_start_part: 0,
      planned_duration: 3,
    },
    {
      task_id: 'DEMO-106',
      assignee_id: DEMO_DEV_ALICE,
      start_day: 3,
      start_part: 0,
      duration: 3,
      planned_start_day: 3,
      planned_start_part: 0,
      planned_duration: 3,
    },
    {
      task_id: 'DEMO-107',
      assignee_id: DEMO_DEV_DANA,
      start_day: 0,
      start_part: 0,
      duration: 6,
      planned_start_day: 0,
      planned_start_part: 0,
      planned_duration: 6,
    },
    {
      task_id: 'DEMO-108',
      assignee_id: DEMO_DEV_DANA,
      start_day: 3,
      start_part: 0,
      duration: 6,
      planned_start_day: 3,
      planned_start_part: 0,
      planned_duration: 6,
    },
    {
      task_id: 'DEMO-109',
      assignee_id: DEMO_DEV_ERIN,
      start_day: 0,
      start_part: 0,
      duration: 6,
      planned_start_day: 0,
      planned_start_part: 0,
      planned_duration: 6,
    },
    {
      task_id: 'DEMO-110',
      assignee_id: DEMO_DEV_ERIN,
      start_day: 3,
      start_part: 0,
      duration: 12,
      planned_start_day: 3,
      planned_start_part: 0,
      planned_duration: 12,
    },
    {
      task_id: 'DEMO-112',
      assignee_id: DEMO_DEV_ERIN,
      start_day: 8,
      start_part: 0,
      duration: 3,
      planned_start_day: 8,
      planned_start_part: 0,
      planned_duration: 3,
    },
  ];
}

/**
 * План на старте работы для задач Ken Thompson — все варианты расхождения:
 * DEMO-109 сделали на день быстрее (стоимость снята), DEMO-110 оценили в день, а делают четыре
 * (стоимость добавлена), DEMO-112 поставили на паузу и перенесли без переоценки.
 * DEMO-111 не размещена на доске и без якоря — ещё не в работе.
 */
function buildDemoPlanAnchors(): SprintPlanAnchor[] {
  const anchor = (
    taskId: string,
    anchoredAt: string,
    geometry: Pick<SprintPlanAnchor, 'duration' | 'startDay' | 'startPart'>
  ): SprintPlanAnchor => ({
    anchoredAt,
    assigneeId: DEMO_DEV_ERIN,
    segments: null,
    taskId,
    ...geometry,
  });
  return [
    anchor('DEMO-109', `${SPRINT_START}T06:00:00.000Z`, { duration: 9, startDay: 0, startPart: 0 }),
    anchor('DEMO-110', '2026-10-16T06:00:00.000Z', { duration: 3, startDay: 3, startPart: 0 }),
    anchor('DEMO-112', `${SPRINT_START}T07:00:00.000Z`, { duration: 3, startDay: 6, startPart: 1 }),
  ];
}

function buildDemoComments(): DemoCommentRow[] {
  return [
    {
      id: 'demo-note-1',
      assignee_id: DEMO_DEV_ALICE,
      author_name: 'Demo User',
      color: 'yellow',
      created_at: `${SPRINT_START}T10:00:00.000Z`,
      day: 2,
      height: 1,
      kind: 'text',
      part: 0,
      text: 'Blocker: promo API contract still TBD with payments',
      width: 4,
      x: 0,
      y: 0,
    },
    {
      id: 'demo-note-2',
      assignee_id: DEMO_DEV_BOB,
      author_name: 'Demo User',
      color: 'blue',
      created_at: `${SPRINT_START}T11:00:00.000Z`,
      day: 3,
      height: 1,
      kind: 'text',
      part: 0,
      text: 'Align receipt copy with legal before merge',
      width: 4,
      x: 0,
      y: 0,
    },
  ];
}

function buildDemoAvailabilityEvents(): BoardAvailabilityEvent[] {
  return [
    {
      id: 'demo-vacation-carol',
      memberId: DEMO_DEV_CAROL,
      memberName: DEMO_DEV_DISPLAY.carol.name,
      eventType: 'vacation',
      startDate: SPRINT_START,
      endDate: '2026-10-14',
    },
  ];
}

/** Synthetic averages over the last finished sprints (header velocity readout). */
function buildDemoAssigneeVelocity(): AssigneeVelocityResponse {
  const byAssignee: AssigneeVelocityResponse['byAssignee'] = {
    [DEMO_DEV_ALICE]: {
      averageSp: 5.3,
      averageTp: 1.7,
      spSprintCount: 3,
      tpSprintCount: 3,
    },
    [DEMO_DEV_BOB]: {
      averageSp: 7,
      averageTp: 2.3,
      spSprintCount: 3,
      tpSprintCount: 3,
    },
    [DEMO_DEV_CAROL]: {
      averageSp: 2,
      averageTp: 6.7,
      spSprintCount: 2,
      tpSprintCount: 3,
    },
    [DEMO_DEV_DANA]: {
      averageSp: 4.7,
      averageTp: 1.7,
      spSprintCount: 3,
      tpSprintCount: 3,
    },
    [DEMO_DEV_ERIN]: {
      averageSp: 6,
      averageTp: 2,
      spSprintCount: 3,
      tpSprintCount: 3,
    },
  };
  const byName: AssigneeVelocityResponse['byName'] = {
    [assigneeVelocityNameKey(DEMO_DEV_DISPLAY.alice.name)]: byAssignee[DEMO_DEV_ALICE]!,
    [assigneeVelocityNameKey(DEMO_DEV_DISPLAY.bob.name)]: byAssignee[DEMO_DEV_BOB]!,
    [assigneeVelocityNameKey(DEMO_DEV_DISPLAY.carol.name)]: byAssignee[DEMO_DEV_CAROL]!,
    [assigneeVelocityNameKey(DEMO_DEV_DISPLAY.dana.name)]: byAssignee[DEMO_DEV_DANA]!,
    [assigneeVelocityNameKey(DEMO_DEV_DISPLAY.erin.name)]: byAssignee[DEMO_DEV_ERIN]!,
  };
  return { byAssignee, byName, sprintCount: 3 };
}

export function createDemoFixtureSeed(): DemoFixtureState {
  return {
    orgId: DEMO_ORG_ID,
    assigneeVelocity: buildDemoAssigneeVelocity(),
    availabilityEvents: buildDemoAvailabilityEvents(),
    board: {
      id: DEMO_BOARD_ID,
      name: 'Demo Board',
      queue: 'DEMO',
      team: 'demo-team',
      teamTitle: 'Demo Team',
    },
    boardParams: {
      id: DEMO_BOARD_ID,
      name: 'Demo Board',
      self: BOARD_SELF,
      columns: [
        { id: 'open', display: 'Open', statusKeys: ['open'] },
        { id: 'inProgress', display: 'In progress', statusKeys: ['inProgress'] },
        { id: 'inReview', display: 'In review', statusKeys: ['inReview'] },
        { id: 'tested', display: 'Tested', statusKeys: ['tested'] },
        { id: 'closed', display: 'Closed', statusKeys: ['closed'] },
      ],
    },
    sprints: [
      sprintListItem({
        id: DEMO_SPRINT_PREV_ID,
        name: 'Sprint 14',
        startDate: PREV_START,
        endDate: PREV_END,
        status: 'archived',
        archived: true,
      }),
      sprintListItem({
        id: DEMO_SPRINT_ID,
        name: 'Sprint 15 — Checkout',
        startDate: SPRINT_START,
        endDate: SPRINT_END,
        status: 'in_progress',
        archived: false,
      }),
      sprintListItem({
        id: DEMO_SPRINT_NEXT_ID,
        name: 'Sprint 16 — Payments',
        startDate: NEXT_START,
        endDate: NEXT_END,
        status: 'draft',
        archived: false,
      }),
    ],
    developers: buildDemoDevelopers(),
    tasks: buildDemoSprintTasks(),
    backlogTasks: buildDemoBacklogTasks(),
    nextSprintTasks: [],
    planAnchors: buildDemoPlanAnchors(),
    positions: buildDemoPositions(),
    links: [
      { id: 'link-1', from_task_id: 'DEMO-101', to_task_id: 'DEMO-103' },
      { id: 'link-2', from_task_id: 'DEMO-102', to_task_id: 'DEMO-103' },
    ],
    comments: buildDemoComments(),
    featureLanes: emptyFeatureLanesDocument(),
    goals: {
      delivery: [
        {
          id: 'goal-del-1',
          text: 'Checkout MVP behind flag',
          checked: false,
          checklistItemType: 'delivery',
        },
        {
          id: 'goal-del-2',
          text: 'No P0 payment bugs',
          checked: true,
          checklistItemType: 'delivery',
        },
      ],
      discovery: [
        {
          id: 'goal-dis-1',
          text: 'Validate saved-methods scope',
          checked: false,
          checklistItemType: 'discovery',
        },
      ],
    },
    retroBoards: buildDemoRetroBoards(),
    score: {
      testingFlowMode: 'embedded_in_dev',
      rows: [
        {
          team: 'Demo Team',
          sprint_id: DEMO_SPRINT_ID,
          sname: 'Sprint 15 — Checkout',
          goals_done: 1,
          goals_total: 3,
          goals_percent: 33,
          sp_done: 3,
          sp_left: 23,
          sp_total: 26,
          sp_done_percent: 12,
          sp_drop: 0,
          qa_done: 1,
          qa_left: 15,
          qa_total: 16,
          tp_done_percent: 6,
          tp_drop: 0,
          mark: 3,
          mark_emoji: '🍺',
          mark_goals: 1,
          mark_sp: 1,
          mark_tp: 1,
        },
      ],
    },
    sprintInfo: {
      id: DEMO_SPRINT_ID,
      name: 'Sprint 15 — Checkout',
      startDate: SPRINT_START,
      endDate: SPRINT_END,
      startDateTime: `${SPRINT_START}T09:00:00.000Z`,
      endDateTime: `${SPRINT_END}T18:00:00.000Z`,
      status: 'in_progress',
      version: 1,
    },
  };
}

export function demoPlannerIntegrationRules(): PlannerIntegrationRulesDto {
  return {
    configRevision: 1,
    estimateFields: { devMapped: true, qaMapped: true },
    flags: { zeroDevPositiveQaRule: true },
    releaseReadiness: { readyStatusKey: 'tested' },
    statusDefaultsByTrackerStatusType: {
      new: 'todo',
      inProgress: 'in-progress',
      paused: 'paused',
      done: 'done',
    },
    statusOverridesByStatusKey: {},
    testingFlowMode: 'embedded_in_dev',
    validationThresholds: {},
  };
}
