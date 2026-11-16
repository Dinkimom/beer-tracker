import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import {
  mergesIntoLatestVersion,
  QUARTER_VERSION_MERGE_WINDOW_MS,
  summarizeQuarterlyPlanVersion,
} from './quarterlyPlanVersions';

const at = new Date('2026-11-16T12:00:00Z');
const minutesBefore = (minutes: number) => new Date(at.getTime() - minutes * 60 * 1000);

describe('склейка правок в версию (QH2)', () => {
  const latest = { authorId: 'alice', source: 'user' as const, updatedAt: minutesBefore(3) };

  it('правки одного человека подряд — одна версия', () => {
    expect(mergesIntoLatestVersion(latest, { authorId: 'alice', at, source: 'user' })).toBe(true);
  });

  it('другой человек, пауза дольше окна, агент или откат — новая версия', () => {
    expect(mergesIntoLatestVersion(latest, { authorId: 'bob', at, source: 'user' })).toBe(false);
    const stale = { ...latest, updatedAt: new Date(at.getTime() - QUARTER_VERSION_MERGE_WINDOW_MS) };
    expect(mergesIntoLatestVersion(stale, { authorId: 'alice', at, source: 'user' })).toBe(false);
    expect(mergesIntoLatestVersion(latest, { authorId: 'alice', at, source: 'agent' })).toBe(false);
    expect(mergesIntoLatestVersion({ ...latest, source: 'restore' }, { authorId: 'alice', at, source: 'user' })).toBe(false);
    expect(mergesIntoLatestVersion(null, { authorId: 'alice', at, source: 'user' })).toBe(false);
  });
});

describe('сводка версии (QH3)', () => {
  const epic = (id: string, parentEpicId?: string) => ({
    directionId: 'd1',
    id,
    ...(parentEpicId ? { parentEpicId } : {}),
    status: 'backlog' as const,
    title: id,
  });
  const before: QuarterlyPlanContent = {
    assignments: [{ epicId: 'e1', id: 'a1', memberId: 'alice', startWeek: 0, weeks: 1 }],
    directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
    epics: [epic('e1'), epic('t1', 'e1')],
    links: [],
    notes: [{ color: 'yellow', id: 'n1', row: { id: 'e1', kind: 'epic' }, rows: 1, startWeek: 0, text: 'x', weeks: 1 }],
  };

  it('считает добавленное, изменённое и убранное по видам; эпик и задача — разные виды', () => {
    const after: QuarterlyPlanContent = {
      ...before,
      assignments: [
        { epicId: 'e1', id: 'a1', memberId: 'alice', startWeek: 1, weeks: 1 },
        { epicId: 't1', id: 'a2', memberId: 'bob', startWeek: 0, weeks: 1 },
      ],
      epics: [epic('e1'), epic('t1', 'e1'), epic('t2', 'e1')],
      notes: [],
    };
    expect(summarizeQuarterlyPlanVersion(before, after)).toEqual([
      { added: 1, changed: 0, kind: 'task', removed: 0 },
      { added: 1, changed: 1, kind: 'assignment', removed: 0 },
      { added: 0, changed: 0, kind: 'note', removed: 1 },
    ]);
  });

  it('без изменений — пустая сводка', () => {
    expect(summarizeQuarterlyPlanVersion(before, before)).toEqual([]);
  });
});
