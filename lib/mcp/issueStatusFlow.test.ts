import type { FlowStatus } from '@/lib/mcp/issueStatusFlow';
import type { ChangelogEntry } from '@/types/tracker';
import type { TaskStatus } from '@/utils/statusMapper';

import { describe, expect, it } from 'vitest';

import { learnIssueStatusFlow, sameFlowStatus } from '@/lib/mcp/issueStatusFlow';

const CATEGORY: Record<string, TaskStatus> = {
  closed: 'done',
  inProgress: 'in-progress',
  onHold: 'paused',
  open: 'todo',
  readyForDev: 'todo',
  review: 'in-progress',
  testing: 'in-progress',
};

const categoryOf = (status: FlowStatus) => CATEGORY[status.key] ?? 'todo';

/** История задачи по цепочке статусов: open → … */
function history(...keys: string[]): ChangelogEntry[] {
  return keys.slice(1).map((key, index) => ({
    fields: [
      {
        field: { display: 'Status', id: 'status' },
        from: { display: keys[index]!, id: `id-${keys[index]}`, key: keys[index]! },
        to: { display: key, id: `id-${key}`, key },
      },
    ],
    id: `${index}`,
    type: 'IssueWorkflow',
    // Перемешанный порядок записей: история сортируется по времени.
    updatedAt: `2026-10-${String(20 + index).padStart(2, '0')}T10:00:00Z`,
  })).reverse();
}

function statusKey(step: ReturnType<typeof learnIssueStatusFlow>['review']): string | null {
  return 'status' in step ? step.status.key : null;
}

describe('learnIssueStatusFlow', () => {
  it('learns the start status and the step after it', () => {
    const flow = learnIssueStatusFlow(
      [
        history('open', 'readyForDev', 'inProgress', 'review', 'closed'),
        history('open', 'inProgress', 'review', 'testing', 'closed'),
        history('open', 'inProgress', 'onHold', 'inProgress', 'review'),
        history('open', 'inProgress', 'closed'),
      ],
      categoryOf
    );
    expect(statusKey(flow.inProgress)).toBe('inProgress');
    // Пауза — не шаг вперёд: у третьей задачи следующий шаг ищется дальше.
    expect(flow.review).toEqual({ samples: 4, share: 0.75, status: { display: 'review', id: 'id-review', key: 'review' } });
    expect(flow.sampleSize).toBe(4);
  });

  it('refuses to guess on thin history', () => {
    const flow = learnIssueStatusFlow([history('open', 'inProgress', 'review'), []], categoryOf);
    expect(flow.inProgress).toMatchObject({ reason: 'not_enough_history', samples: 1 });
    expect(flow.review).toMatchObject({ reason: 'not_enough_history' });
  });

  it('reports a split flow as ambiguous', () => {
    const flow = learnIssueStatusFlow(
      [
        history('open', 'inProgress', 'review'),
        history('open', 'inProgress', 'testing'),
        history('open', 'inProgress', 'closed'),
      ],
      categoryOf
    );
    expect(statusKey(flow.inProgress)).toBe('inProgress');
    expect(flow.review).toMatchObject({ reason: 'ambiguous', samples: 3 });
  });

  it('detects a team without a review stage', () => {
    const flow = learnIssueStatusFlow(
      [
        history('open', 'inProgress', 'closed'),
        history('open', 'inProgress', 'closed'),
        history('open', 'inProgress', 'review'),
      ],
      categoryOf
    );
    expect(flow.review).toMatchObject({ candidates: [{ samples: 2 }], reason: 'no_review_stage' });
  });

  it('matches statuses by id first, by key when an id is missing', () => {
    expect(sameFlowStatus({ id: '3', key: 'В работе' }, { id: '3', key: 'inprogress' })).toBe(true);
    expect(sameFlowStatus({ id: '3', key: 'review' }, { id: '4', key: 'review' })).toBe(false);
    expect(sameFlowStatus({ id: null, key: 'review' }, { id: '4', key: 'review' })).toBe(true);
  });
});
