import type {
  QuarterlyPlan,
  QuarterlyPlanAssignment,
  QuarterlyPlanContent,
  QuarterlyPlanEpic,
  QuarterlyPlanLink,
  QuarterlyPlanNote,
  QuarterlyPlanEpicStatus,
  QuarterlyPlanSprint,
  QuarterlyPlanTeam,
  QuarterlyPlanTrackerEpic,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { Developer } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { buildQuarterWeeks, type QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';

import {
  DEMO_BOARD_ID,
  DEMO_DEV_ALICE,
  DEMO_DEV_BOB,
  DEMO_DEV_CAROL,
  DEMO_DEV_DANA,
  DEMO_DEV_ERIN,
} from './demoIds';

const DEMO_PLATFORM_BOARD_ID = 43;
const DEMO_TEAM_ID = 'demo-team';
const PLATFORM_TEAM_ID = 'platform-team';

const GRACE = 'demo-grace';
const DENNIS = 'demo-dennis';
const BARBARA = 'demo-barbara';
const DONALD = 'demo-donald';

/** Вторая команда существует только на квартальной доске: у неё свой сдвиг спринтов. */
const PLATFORM_MEMBERS: Developer[] = [
  { id: GRACE, name: 'Grace Hopper', platforms: ['back'], role: 'developer', roleTitle: 'Backend' },
  { id: DENNIS, name: 'Dennis Ritchie', platforms: ['back'], role: 'developer', roleTitle: 'Backend' },
  { id: BARBARA, name: 'Barbara Liskov', platforms: ['web'], role: 'developer', roleTitle: 'Frontend' },
  { id: DONALD, name: 'Donald Knuth', role: 'tester', roleTitle: 'QA' },
];

const DEMO_QUARTER: QuarterRef = { quarter: 4, year: 2026 };
/** В квартале 13–14 недель, спринт — две: на столько сдвигается номер первого спринта. */
const SPRINTS_PER_QUARTER = 7;

function buildSprints(
  weeks: readonly QuarterWeek[],
  options: { firstNumber: number; firstSprintWeeks: 1 | 2; idBase: number }
): QuarterlyPlanSprint[] {
  const sprints: QuarterlyPlanSprint[] = [];
  let startWeek = 0;
  let length: number = options.firstSprintWeeks;
  while (startWeek < weeks.length) {
    const lastWeek = Math.min(weeks.length - 1, startWeek + length - 1);
    sprints.push({
      endDate: weeks[lastWeek]!.endDate,
      id: options.idBase + sprints.length,
      name: `Sprint ${options.firstNumber + sprints.length}`,
      startDate: weeks[startWeek]!.startDate,
    });
    startWeek = lastWeek + 1;
    length = 2;
  }
  return sprints;
}

function buildTeams(ref: QuarterRef, demoDevelopers: Developer[]): QuarterlyPlanTeam[] {
  const weeks = buildQuarterWeeks(ref);
  // Нумерация спринтов продолжается от квартала к кварталу, а не начинается заново.
  const quarterOffset = (ref.year - DEMO_QUARTER.year) * 4 + ref.quarter - DEMO_QUARTER.quarter;
  const numberShift = quarterOffset * SPRINTS_PER_QUARTER;
  return [
    {
      boardId: DEMO_BOARD_ID,
      id: DEMO_TEAM_ID,
      members: demoDevelopers,
      sprints: buildSprints(weeks, { firstNumber: Math.max(1, 14 + numberShift), firstSprintWeeks: 2, idBase: 1400 }),
      title: 'Demo Team',
    },
    {
      boardId: DEMO_PLATFORM_BOARD_ID,
      id: PLATFORM_TEAM_ID,
      members: PLATFORM_MEMBERS,
      sprints: buildSprints(weeks, { firstNumber: Math.max(1, 21 + numberShift), firstSprintWeeks: 1, idBase: 2100 }),
      title: 'Platform Team',
    },
  ];
}

type SeedAssignment = [memberId: string, startWeek: number, weeks: number];

interface SeedEpic {
  assignments?: SeedAssignment[];
  issueKey?: string;
  status: QuarterlyPlanEpicStatus;
  title: string;
}

interface SeedDirection {
  /** Проработка фичи в строке самого направления (QG2). */
  discovery?: SeedAssignment[];
  epics: SeedEpic[];
  teamId: string;
  title: string;
}

/** Недели — индексы Q4 2026: 0 = 28.09, 2 = 12.10 («сегодня» демо), 13 = 28.12. */
const SEED_DIRECTIONS: SeedDirection[] = [
  {
    teamId: DEMO_TEAM_ID,
    title: 'Checkout redesign',
    epics: [
      { assignments: [[DEMO_DEV_BOB, 0, 2]], issueKey: 'DEMO-103', status: 'done', title: 'Cart summary & promo field' },
      { assignments: [[DEMO_DEV_ALICE, 1, 3]], issueKey: 'DEMO-101', status: 'in_progress', title: 'Payment step API' },
      { assignments: [[DEMO_DEV_BOB, 2, 3]], issueKey: 'DEMO-102', status: 'in_progress', title: 'Payment step UI' },
      { assignments: [[DEMO_DEV_CAROL, 5, 2]], status: 'backlog', title: 'Regression & staged rollout' },
    ],
  },
  {
    discovery: [[DEMO_DEV_DANA, 2, 2]],
    teamId: DEMO_TEAM_ID,
    title: 'Promo codes v2',
    epics: [
      { assignments: [[DEMO_DEV_DANA, 4, 3]], status: 'backlog', title: 'Stackable discounts engine' },
      {
        assignments: [
          [DEMO_DEV_ERIN, 5, 2],
          [DEMO_DEV_BOB, 7, 2],
        ],
        status: 'backlog',
        title: 'Admin: promo rules editor',
      },
    ],
  },
  {
    teamId: DEMO_TEAM_ID,
    title: 'Receipts & invoices',
    epics: [
      { assignments: [[DEMO_DEV_ERIN, 0, 3]], issueKey: 'DEMO-104', status: 'test', title: 'PDF receipts' },
      { assignments: [[DEMO_DEV_ALICE, 3, 2]], status: 'backlog', title: 'Fiscal export fixes' },
      { status: 'backlog', title: 'Invoice email templates' },
      { status: 'backlog', title: 'Talk to legal about receipt copy' },
    ],
  },
  {
    teamId: DEMO_TEAM_ID,
    title: 'Tech debt',
    epics: [
      { assignments: [[DEMO_DEV_DANA, 9, 2]], status: 'backlog', title: 'Migrate CI runners' },
      { assignments: [[DEMO_DEV_ALICE, 10, 3]], status: 'backlog', title: 'Drop legacy checkout' },
    ],
  },
  // Проработка кончилась в прошлом спринте, поставка не запланирована: сигнал «проработано, не разбито» (QG4).
  {
    discovery: [[DEMO_DEV_DANA, 0, 2]],
    teamId: DEMO_TEAM_ID,
    title: 'Loyalty program',
    epics: [],
  },
  {
    teamId: PLATFORM_TEAM_ID,
    title: 'Public API v3',
    epics: [
      { assignments: [[GRACE, 0, 2]], status: 'done', title: 'Access context refactoring' },
      { assignments: [[DENNIS, 1, 3]], status: 'in_progress', title: 'Cursor pagination & formats' },
      { assignments: [[GRACE, 2, 4]], issueKey: 'PLAT-48', status: 'backlog', title: 'OAuth clients & scopes' },
      { assignments: [[BARBARA, 3, 3]], status: 'backlog', title: 'Developer portal: API keys' },
    ],
  },
  {
    teamId: PLATFORM_TEAM_ID,
    title: 'Notifications hub',
    epics: [
      { assignments: [[DENNIS, 4, 4]], status: 'in_progress', title: 'Channel routing service' },
      { assignments: [[BARBARA, 6, 3]], status: 'backlog', title: 'Templates editor' },
      { assignments: [[DONALD, 8, 3]], status: 'backlog', title: 'Delivery analytics' },
    ],
  },
  {
    teamId: PLATFORM_TEAM_ID,
    title: 'Reports builder',
    epics: [
      { assignments: [[GRACE, 8, 4]], status: 'backlog', title: 'Query engine MVP' },
      { assignments: [[BARBARA, 9, 4]], status: 'backlog', title: 'Report canvas UI' },
      { status: 'blocked', title: 'Export to XLSX' },
    ],
  },
];

/** Заметки по одной на каждый вид строки: команда, отпуска, направление, эпик. */
const SEED_NOTES: QuarterlyPlanNote[] = [
  {
    color: 'pink',
    id: 'demo-quarter-note-release',
    row: { id: DEMO_TEAM_ID, kind: 'team' },
    rows: 2,
    startWeek: 5,
    text: 'Release 2.0: code freeze on Wed',
    weeks: 2,
  },
  {
    color: 'yellow',
    id: 'demo-quarter-note-holidays',
    row: { id: PLATFORM_TEAM_ID, kind: 'absence' },
    rows: 1,
    startWeek: 12,
    text: 'Holidays: on-call only',
    weeks: 2,
  },
  {
    color: 'blue',
    id: 'demo-quarter-note-promo',
    row: { id: 'demo-direction-2', kind: 'direction' },
    rows: 1,
    startWeek: 3,
    text: 'Black Friday promo must be live by 23.11',
    weeks: 3,
  },
  {
    color: 'yellow',
    id: 'demo-quarter-note-contract',
    row: { id: 'demo-direction-1-epic-3', kind: 'epic' },
    rows: 2,
    startWeek: 2,
    text: 'Waiting for the payments API contract',
    weeks: 2,
  },
];

/**
 * Зависимости в Checkout redesign: UI ждёт API (порядок нарушен — UI начинается раньше, чем
 * закончится API), регресс ждёт UI (порядок соблюдён).
 */
const SEED_LINKS: QuarterlyPlanLink[] = [
  { fromId: 'demo-direction-1-epic-2-a1', id: 'demo-quarter-link-api-ui', toId: 'demo-direction-1-epic-3-a1' },
  { fromId: 'demo-direction-1-epic-3-a1', id: 'demo-quarter-link-ui-regress', toId: 'demo-direction-1-epic-4-a1' },
];

function buildSeedContent(): QuarterlyPlanContent {
  const content: QuarterlyPlanContent = {
    assignments: [],
    directions: [],
    epics: [],
    links: SEED_LINKS,
    notes: SEED_NOTES,
  };
  SEED_DIRECTIONS.forEach((direction, directionIndex) => {
    const directionId = `demo-direction-${directionIndex + 1}`;
    content.directions.push({ id: directionId, teamId: direction.teamId, title: direction.title });
    (direction.discovery ?? []).forEach(([memberId, startWeek, weeks], index) => {
      content.assignments.push({ directionId, id: `${directionId}-d${index + 1}`, memberId, phase: 'discovery', startWeek, weeks });
    });
    direction.epics.forEach((epic, epicIndex) => {
      const planEpic: QuarterlyPlanEpic = {
        directionId,
        id: `${directionId}-epic-${epicIndex + 1}`,
        issueKey: epic.issueKey,
        status: epic.status,
        title: epic.title,
      };
      content.epics.push(planEpic);
      (epic.assignments ?? []).forEach(([memberId, startWeek, weeks], index) => {
        const assignment: QuarterlyPlanAssignment = {
          id: `${planEpic.id}-a${index + 1}`,
          epicId: planEpic.id,
          memberId,
          startWeek,
          weeks,
        };
        content.assignments.push(assignment);
      });
    });
  });
  return content;
}

/** Содержимое плана: Q4 2026 заполнен, остальные кварталы пустые. */
export function buildDemoQuarterlyPlanContent(ref: QuarterRef): QuarterlyPlanContent {
  if (ref.year === DEMO_QUARTER.year && ref.quarter === DEMO_QUARTER.quarter) {
    return buildSeedContent();
  }
  return { assignments: [], directions: [], epics: [], links: [], notes: [] };
}

export function buildDemoQuarterlyPlan(
  ref: QuarterRef,
  content: QuarterlyPlanContent,
  demoDevelopers: Developer[]
): QuarterlyPlan {
  const trackerEpics = Object.fromEntries(
    content.epics.flatMap((epic) => {
      const tracked = DEMO_TRACKER_EPICS.find((item) => item.issueKey === epic.issueKey);
      return tracked ? [[tracked.issueKey, demoTrackerEpic(tracked)]] : [];
    })
  );
  return { ...ref, ...content, teams: buildTeams(ref, demoDevelopers), trackerEpics };
}

const DUTY_ROTATION: Array<[memberId: string, memberName: string]> = [
  [GRACE, 'Grace Hopper'],
  [DENNIS, 'Dennis Ritchie'],
  [BARBARA, 'Barbara Liskov'],
  [DONALD, 'Donald Knuth'],
  [GRACE, 'Grace Hopper'],
  [BARBARA, 'Barbara Liskov'],
];

/**
 * Отсутствия для квартальной доски. Дежурят и уходят в отпуск здесь только люди
 * второй команды и только вне дат демо-спринтов — доска спринта остаётся прежней.
 */
export function buildDemoQuarterAvailabilityEvents(bob: {
  memberName: string;
}): BoardAvailabilityEvent[] {
  const weeks = buildQuarterWeeks(DEMO_QUARTER);
  const duty: BoardAvailabilityEvent[] = DUTY_ROTATION.map(([memberId, memberName], index) => ({
    endDate: weeks[index]!.endDate,
    eventType: 'duty',
    id: `demo-duty-${index}`,
    memberId,
    memberName,
    startDate: weeks[index]!.startDate,
  }));
  return [
    ...duty,
    {
      endDate: '2026-11-27',
      eventType: 'vacation',
      id: 'demo-vacation-bob',
      memberId: DEMO_DEV_BOB,
      memberName: bob.memberName,
      startDate: '2026-11-16',
    },
    {
      endDate: '2026-11-06',
      eventType: 'vacation',
      id: 'demo-vacation-dennis',
      memberId: DENNIS,
      memberName: 'Dennis Ritchie',
      startDate: '2026-11-04',
    },
    {
      endDate: '2026-12-31',
      eventType: 'vacation',
      id: 'demo-vacation-grace',
      memberId: GRACE,
      memberName: 'Grace Hopper',
      startDate: '2026-12-21',
    },
    {
      endDate: '2026-10-09',
      eventType: 'sick_leave',
      id: 'demo-sick-donald',
      memberId: DONALD,
      memberName: 'Donald Knuth',
      startDate: '2026-10-07',
    },
  ];
}

type DemoTrackerStatus = 'closed' | 'inprogress' | 'intesting' | 'open';

const DEMO_STATUS_DISPLAY: Record<DemoTrackerStatus, string> = {
  closed: 'Closed',
  inprogress: 'In progress',
  intesting: 'Testing',
  open: 'Open',
};

/** Статус эпика «в трекере» → то, что план показывает у привязанной строки (QE7). */
function demoTrackerEpic(epic: { status?: DemoTrackerStatus; title: string }): QuarterlyPlanTrackerEpic {
  const status = epic.status ?? 'open';
  return {
    done: status === 'closed',
    statusColorKey: status === 'open' ? 'backlog' : status,
    statusDisplay: DEMO_STATUS_DISPLAY[status],
    title: epic.title,
  };
}

/** Эпики «в трекере» для поиска при привязке; часть из них ещё не стоит в плане. */
export const DEMO_TRACKER_EPICS: Array<{ issueKey: string; status?: DemoTrackerStatus; title: string }> = [
  { issueKey: 'DEMO-101', status: 'inprogress', title: 'Payment step API' },
  { issueKey: 'DEMO-102', status: 'inprogress', title: 'Payment step UI' },
  { issueKey: 'DEMO-103', status: 'closed', title: 'Cart summary & promo field' },
  { issueKey: 'DEMO-104', status: 'intesting', title: 'PDF receipts' },
  { issueKey: 'DEMO-110', title: 'Checkout analytics events' },
  { issueKey: 'DEMO-215', title: 'Stackable discounts engine' },
  { issueKey: 'DEMO-217', title: 'Promo usage report' },
  { issueKey: 'DEMO-231', title: 'Fiscal export fixes' },
  { issueKey: 'DEMO-233', title: 'Credit notes' },
  { issueKey: 'PLAT-48', title: 'OAuth clients & scopes' },
  { issueKey: 'PLAT-50', title: 'Rate limiting' },
  { issueKey: 'PLAT-61', title: 'Channel routing service' },
];
