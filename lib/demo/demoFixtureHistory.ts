/**
 * История спринта на демо (`GET /sprints/:id/history`): статичная лента текущего спринта.
 * Люди — персонажи фикстуры; часть правок — агент от имени человека, одна — без автора.
 */

import type {
  SprintHistoryActor,
  SprintHistoryBoardEvent,
  SprintHistoryEvent,
  SprintHistoryIssueEvent,
} from '@/lib/boardHistory/sprintHistoryTypes';

import { DEMO_DEV_DISPLAY } from './demoFixtureSeedTasks';
import { DEMO_DEV_ALICE, DEMO_DEV_BOB, DEMO_DEV_CAROL, DEMO_DEV_DANA, DEMO_DEV_ERIN, DEMO_SPRINT_ID } from './demoIds';

const person = (id: string, name: string): SprintHistoryActor => ({ channel: 'ui', clientBrand: null, id, name });
const viaClaude = (actor: SprintHistoryActor): SprintHistoryActor => ({ ...actor, channel: 'agent', clientBrand: 'claude' });

const LINUS = person(DEMO_DEV_ALICE, DEMO_DEV_DISPLAY.alice.name);
const GUIDO = person(DEMO_DEV_BOB, DEMO_DEV_DISPLAY.bob.name);
const MARGARET = person(DEMO_DEV_CAROL, DEMO_DEV_DISPLAY.carol.name);
const JOHN = person(DEMO_DEV_DANA, DEMO_DEV_DISPLAY.dana.name);
const KEN = person(DEMO_DEV_ERIN, DEMO_DEV_DISPLAY.erin.name);
const NOBODY: SprintHistoryActor = { channel: null, clientBrand: null, id: null, name: null };

/** Местное время в октябре 2026 (часы демо — 16.10, полдень). */
const at = (day: number, hour: number, minute: number) => new Date(2026, 9, day, hour, minute).toISOString();

function issue(
  id: string,
  actor: SprintHistoryActor,
  when: string,
  patch: Partial<SprintHistoryIssueEvent> & Pick<SprintHistoryIssueEvent, 'field' | 'issueKey'>
): SprintHistoryIssueEvent {
  return { actor, at: when, change: 'changed', from: null, id, source: 'tracker', to: null, ...patch };
}

function board(
  id: string,
  actor: SprintHistoryActor,
  when: string,
  patch: Partial<SprintHistoryBoardEvent> & Pick<SprintHistoryBoardEvent, 'action' | 'object' | 'objectId'>
): SprintHistoryBoardEvent {
  return {
    actor,
    at: when,
    changedFields: [],
    done: null,
    id,
    linkEnds: null,
    previousText: null,
    source: 'board',
    text: null,
    ...patch,
  };
}

function buildDemoSprintHistory(): SprintHistoryEvent[] {
  return [
    issue('h-1', viaClaude(LINUS), at(16, 11, 40), { field: 'deadline', from: '2026-10-20', issueKey: 'DEMO-111', to: '2026-10-22' }),
    board('h-2', viaClaude(LINUS), at(16, 11, 40), {
      action: 'update',
      changedFields: ['day'],
      object: 'note',
      objectId: 'demo-note-2',
      text: 'Pair on refund edge cases after standup',
    }),
    board('h-3', GUIDO, at(16, 10, 15), {
      action: 'update',
      changedFields: ['done'],
      done: true,
      object: 'goal',
      objectId: 'goal-del-2',
      text: 'No P0 payment bugs',
    }),
    issue('h-4', MARGARET, at(15, 17, 5), {
      field: 'assignee',
      from: DEMO_DEV_DISPLAY.dana.name,
      issueKey: 'DEMO-108',
      to: DEMO_DEV_DISPLAY.carol.name,
    }),
    issue('h-5', viaClaude(LINUS), at(15, 16, 30), { change: 'added', field: 'sprint', issueKey: 'DEMO-112', to: 'Sprint 15 — Checkout' }),
    board('h-6', JOHN, at(15, 9, 20), {
      action: 'create',
      object: 'note',
      objectId: 'demo-note-1',
      text: 'Blocker: promo API contract still TBD',
    }),
    issue('h-7', KEN, at(14, 14, 0), { field: 'status', from: 'Open', issueKey: 'DEMO-109', to: 'In progress' }),
    issue('h-8', LINUS, at(14, 12, 0), { change: 'removed', field: 'sprint', issueKey: 'DEMO-204', from: 'Sprint 15 — Checkout' }),
    board('h-9', MARGARET, at(14, 11, 30), {
      action: 'update',
      changedFields: ['text'],
      object: 'goal',
      objectId: 'goal-del-1',
      previousText: 'Checkout MVP',
      text: 'Checkout MVP behind flag',
    }),
    board('h-10', LINUS, at(13, 10, 0), {
      action: 'create',
      linkEnds: { from: 'demo-note-1', to: 'DEMO-104' },
      object: 'link',
      objectId: 'demo-link-1',
    }),
    issue('h-11', NOBODY, at(13, 9, 30), { field: 'storyPoints', from: '3', issueKey: 'DEMO-105', to: '5' }),
    issue('h-12', LINUS, at(10, 15, 0), { change: 'added', field: 'sprint', issueKey: 'DEMO-101', to: 'Sprint 15 — Checkout' }),
  ];
}

/** Лента истории для спринта: у текущего — фикстура, у остальных — пусто. */
export function demoSprintHistory(sprintId: number): SprintHistoryEvent[] {
  return sprintId === DEMO_SPRINT_ID ? buildDemoSprintHistory() : [];
}
