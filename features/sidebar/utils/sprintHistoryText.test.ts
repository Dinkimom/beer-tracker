import type { SprintHistoryBoardEvent, SprintHistoryIssueEvent } from '@/lib/boardHistory/sprintHistoryTypes';

import { describe, expect, it } from 'vitest';

import {
  describeSprintHistoryEvent,
  matchesSprintHistoryFilter,
  sprintHistoryActorLabel,
} from './sprintHistoryText';

const t = (key: string, params?: Record<string, string>) =>
  params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key;

const issue: SprintHistoryIssueEvent = {
  actor: { channel: null, clientBrand: null, id: 'acc', name: 'Ada' },
  at: '2026-10-14T09:00:00.000Z',
  change: 'changed',
  field: 'deadline',
  from: '2026-10-14',
  id: 't:1',
  issueKey: 'DEMO-101',
  source: 'tracker',
  to: null,
};

const note: SprintHistoryBoardEvent = {
  action: 'update',
  actor: { channel: 'agent', clientBrand: 'claude', id: 'u1', name: 'Linus' },
  at: '2026-10-14T10:00:00.000Z',
  changedFields: ['day'],
  done: null,
  id: 'b:1',
  linkEnds: null,
  object: 'note',
  objectId: 'n1',
  previousText: null,
  source: 'board',
  text: 'Blocker',
};

describe('describeSprintHistoryEvent', () => {
  it('shows tracker field changes with short dates and an empty mark', () => {
    expect(describeSprintHistoryEvent(issue, t)).toBe(
      'sidebar.history.events.issue.fieldChange(field=sidebar.history.fields.deadline,from=14.10,to=—)'
    );
    expect(describeSprintHistoryEvent({ ...issue, change: 'added', field: 'sprint' }, t)).toBe(
      'sidebar.history.events.issue.added'
    );
  });

  it('tells a note move from a text edit and a goal check from a rename', () => {
    expect(describeSprintHistoryEvent(note, t)).toBe('sidebar.history.events.note.move');
    expect(describeSprintHistoryEvent({ ...note, changedFields: ['day', 'text'] }, t)).toBe(
      'sidebar.history.events.note.update'
    );
    expect(
      describeSprintHistoryEvent({ ...note, changedFields: ['done'], done: true, object: 'goal' }, t)
    ).toBe('sidebar.history.events.goal.done');
    expect(describeSprintHistoryEvent({ ...note, action: 'delete', object: 'link' }, t)).toBe(
      'sidebar.history.events.link.delete'
    );
  });
});

describe('sprintHistoryActorLabel and filter', () => {
  it('names the agent client and falls back for an unknown author', () => {
    expect(sprintHistoryActorLabel(note, t)).toEqual({
      name: 'Linus',
      via: 'sidebar.history.viaAgentBrand(brand=Claude)',
    });
    expect(sprintHistoryActorLabel({ ...issue, actor: { ...issue.actor, name: null } }, t)).toEqual({
      name: 'sidebar.history.unknownActor',
      via: null,
    });
  });

  it('filters by source and by agent', () => {
    expect(matchesSprintHistoryFilter(issue, 'tasks')).toBe(true);
    expect(matchesSprintHistoryFilter(issue, 'board')).toBe(false);
    expect(matchesSprintHistoryFilter(note, 'agent')).toBe(true);
    expect(matchesSprintHistoryFilter(issue, 'agent')).toBe(false);
  });
});
