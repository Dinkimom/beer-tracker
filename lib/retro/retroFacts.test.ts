import type { RetroFactChangelogEntry, RetroFactIssue, RetroFactsSprint } from './retroFacts';
import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { computeRetroFacts, selectRetroFactTasks } from './retroFacts';

function at(year: number, month: number, day: number, hour: number): string {
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

function statusChange(when: string, from: string | null, to: string): RetroFactChangelogEntry {
  return {
    fields: [
      {
        field: { id: 'status' },
        from: from ? { display: from, id: from, key: from } : null,
        to: { display: to, id: to, key: to },
      },
    ],
    updatedAt: when,
  };
}

function issue(overrides: Partial<RetroFactIssue> & Pick<RetroFactIssue, 'id'>): RetroFactIssue {
  return {
    assignee: 'dev-1',
    changelog: [],
    createdAt: at(2026, 5, 20, 10),
    declined: false,
    done: false,
    name: overrides.id,
    ...overrides,
  };
}

const sprint: RetroFactsSprint = {
  endMs: new Date(2026, 5, 12, 18, 0, 0, 0).getTime(),
  open: true,
  startMs: new Date(2026, 5, 1, 9, 0, 0, 0).getTime(),
};

const nowMs = new Date(2026, 5, 10, 12, 0, 0, 0).getTime();

describe('computeRetroFacts', () => {
  it('делит состав по дате создания и не смешивает отказ с поставкой', () => {
    const facts = computeRetroFacts({
      issues: [
        issue({
          changelog: [
            statusChange(at(2026, 6, 1, 9), null, 'inprogress'),
            statusChange(at(2026, 6, 1, 18), 'inprogress', 'done'),
          ],
          done: true,
          id: 'OLD-1',
        }),
        issue({
          createdAt: at(2026, 6, 3, 11),
          id: 'NEW-1',
        }),
        issue({
          declined: true,
          done: false,
          id: 'DROP-1',
          name: 'Отказались',
        }),
        issue({
          createdAt: undefined,
          id: 'NO-DATE',
        }),
      ],
      nowMs,
      sprint,
    });

    expect(facts.committed).toBe(2);
    expect(facts.committedDone).toBe(1);
    expect(facts.addedAfterStart).toBe(1);
    expect(facts.closedTotal).toBe(1);
    expect(facts.declined).toBe(1);
    expect(facts.carryOver).toEqual({ count: 2, kind: 'forecast' });
    expect(facts.dataQuality.missingCreatedAt).toBe(1);
    expect(facts.dataQuality.committedApproximatedByCreatedAt).toBe(true);
  });

  it('на закрытом спринте не выдаёт перенос за ноль', () => {
    const facts = computeRetroFacts({
      issues: [issue({ id: 'OPEN-1' })],
      nowMs,
      sprint: { ...sprint, open: false },
    });

    expect(facts.carryOver).toEqual({ count: 0, kind: 'unavailable' });
  });

  it('считает cycle time средним и p90 и называет хвост', () => {
    const slow = issue({
      changelog: [
        statusChange(at(2026, 6, 1, 9), null, 'inprogress'),
        statusChange(at(2026, 6, 3, 18), 'inprogress', 'done'),
      ],
      done: true,
      id: 'SLOW-1',
      name: 'Долгая задача с очень длинным названием которое надо обрезать до пятидесяти символов',
    });
    const fast = issue({
      changelog: [
        statusChange(at(2026, 6, 1, 9), null, 'inprogress'),
        statusChange(at(2026, 6, 1, 18), 'inprogress', 'done'),
      ],
      done: true,
      id: 'FAST-1',
    });

    const facts = computeRetroFacts({ issues: [slow, fast], nowMs, sprint });

    expect(facts.cycleTime?.sampleSize).toBe(2);
    expect(facts.cycleTime?.meanDays).toBe(2);
    expect(facts.cycleTime?.p90Days).toBeCloseTo(2.8);
    expect(facts.outliers).toEqual([
      { days: 3, id: 'SLOW-1', name: slow.name.slice(0, 50) },
    ]);
  });

  it('называет узким местом очередь, а не работу и не блок', () => {
    const reviewed = issue({
      changelog: [
        statusChange(at(2026, 6, 1, 9), null, 'inprogress'),
        statusChange(at(2026, 6, 1, 18), 'inprogress', 'inreview'),
        statusChange(at(2026, 6, 3, 18), 'inreview', 'done'),
      ],
      done: true,
      id: 'REV-1',
    });
    const blocked = issue({
      changelog: [
        statusChange(at(2026, 6, 1, 9), null, 'inprogress'),
        statusChange(at(2026, 6, 1, 12), 'inprogress', 'blocked'),
        statusChange(at(2026, 6, 5, 18), 'blocked', 'done'),
      ],
      done: true,
      id: 'BLK-1',
    });

    const facts = computeRetroFacts({ issues: [reviewed, blocked], nowMs, sprint });

    expect(facts.bottleneck?.stage).toBe('review');
    expect(facts.bottleneck?.sampleSize).toBe(1);
    expect(facts.bottleneck?.meanDays).toBe(2);
    expect(facts.bottleneckRunnerUp).toBeNull();
  });

  it('считает flow efficiency по закрытым задачам, нули кодинга остаются в выборке', () => {
    const coded = issue({
      changelog: [
        statusChange(at(2026, 6, 1, 9), null, 'inprogress'),
        statusChange(at(2026, 6, 1, 18), 'inprogress', 'readyfortesting'),
        statusChange(at(2026, 6, 2, 18), 'readyfortesting', 'done'),
      ],
      done: true,
      id: 'CODE-1',
    });
    const queuedOnly = issue({
      changelog: [
        statusChange(at(2026, 5, 29, 9), null, 'inprogress'),
        statusChange(at(2026, 5, 29, 18), 'inprogress', 'readyfortesting'),
        statusChange(at(2026, 6, 2, 18), 'readyfortesting', 'done'),
      ],
      done: true,
      id: 'QUEUE-1',
    });

    const facts = computeRetroFacts({ issues: [coded, queuedOnly], nowMs, sprint });

    expect(facts.flow?.population).toBe(2);
    expect(facts.flow?.noCodingCount).toBe(1);
    expect(facts.flow?.efficiencyPercent).toBe(25);
    expect(facts.flow?.coding.meanDays).toBe(0.5);
    expect(facts.flow?.waiting.meanDays).toBe(1.5);
  });

  it('пишет в футер пустого исполнителя и сдвиг оценки', () => {
    const facts = computeRetroFacts({
      issues: [
        issue({
          assignee: '  ',
          changelog: [
            {
              fields: [{ field: { id: 'storyPoints' }, from: 1, to: 2 }],
              updatedAt: at(2026, 5, 20, 10),
            },
          ],
          id: 'SP-1',
          storyPoints: 5,
        }),
      ],
      nowMs,
      sprint,
    });

    expect(facts.dataQuality.unassigned).toBe(1);
    expect(facts.dataQuality.estimateDrift).toEqual({ count: 1, fromSp: 2, toSp: 5 });
  });
});

describe('selectRetroFactTasks', () => {
  it('оставляет продуктовые задачи и убирает QA, эпики и черновики', () => {
    const tasks = [
      { id: 'DEV-1', team: 'Web', type: 'bug' },
      { id: 'QA-1', team: 'QA', type: 'task' },
      { id: 'EPIC-1', team: 'Web', type: 'Epic' },
      { id: 'SUB-1', team: 'Web', type: 'Sub-bug' },
      { id: 'local-1', isLocalTask: true, team: 'Web', type: 'task' },
      { id: 'comment:1', localDraftKind: 'comment', team: 'Back', type: 'task' },
    ] as Task[];

    expect(selectRetroFactTasks(tasks).map((task) => task.id)).toEqual(['DEV-1']);
  });
});
